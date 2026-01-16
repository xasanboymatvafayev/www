
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { STORAGE_KEY, INITIAL_STATE } from './constants';
import { AppState, User, Task, Course, Submission, Role } from './types';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import CourseList from './components/CourseList';
import TaskList from './components/TaskList';
import SubmissionManager from './components/SubmissionManager';
import Login from './components/Login';
import UserManagement from './components/UserManagement';
import Settings from './components/Settings';
import Leaderboard from './components/Leaderboard';
import MentorChat from './components/MentorChat';
import { Language } from './translations';

const GLOBAL_DATABASE_ID = 'edusync_v22_global_secure_db'; 
const API_URL = 'https://api.restful-api.dev/objects';
const SESSION_KEY = 'edusync_active_session';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [lang, setLang] = useState<Language>('uz');

  const lastSyncHash = useRef<string>('');

  // 1. Serverdan ma'lumotlarni olish va birlashtirish
  const pullData = useCallback(async (): Promise<AppState | null> => {
    setIsSyncing(true);
    try {
      const res = await fetch(`${API_URL}/${GLOBAL_DATABASE_ID}`);
      if (res.ok) {
        const result = await res.json();
        const serverData = result.data as AppState;
        
        // Serverdagi ma'lumot yangiroq bo'lsa yoki bizda hali ma'lumot bo'lmasa
        if (serverData && serverData.lastUpdated > state.lastUpdated) {
          setState(prev => {
            const merged = {
              ...serverData,
              // Lokal o'zgarishlarni yo'qotmaslik uchun ehtiyotkorona birlashtirish
              users: { ...serverData.users, ...prev.users },
              courses: { ...serverData.courses, ...prev.courses },
              tasks: { ...serverData.tasks, ...prev.tasks },
              submissions: { ...serverData.submissions, ...prev.submissions },
              lastUpdated: Math.max(serverData.lastUpdated, prev.lastUpdated)
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
            return merged;
          });
          setIsOnline(true);
          return serverData;
        }
        setIsOnline(true);
      } else if (res.status === 404) {
        // Baza hali mavjud emas bo'lsa, yaratish uchun push qilamiz
        await pushData(state);
      }
    } catch (e) {
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
    return null;
  }, [state.lastUpdated]);

  // 2. Ma'lumotlarni serverga yuborish (PUT ishlatiladi)
  const pushData = useCallback(async (data: AppState) => {
    setIsSyncing(true);
    try {
      // restful-api.dev da mavjud obyektni yangilash uchun PUT ishlatiladi
      const res = await fetch(`${API_URL}/${GLOBAL_DATABASE_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: "EduSync_Global_Store", 
          data: { ...data, lastUpdated: Date.now() } 
        })
      });

      // Agar PUT 404 bersa (baza hali yaratilmagan), POST bilan yaratamiz
      if (res.status === 404) {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            id: GLOBAL_DATABASE_ID,
            name: "EduSync_Global_Store", 
            data: { ...data, lastUpdated: Date.now() } 
          })
        });
      }
      setIsOnline(true);
    } catch (e) {
      setIsOnline(false);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Ilova yuklanganda eng oxirgi ma'lumotni olish
  useEffect(() => {
    pullData();
    const savedUsername = localStorage.getItem(SESSION_KEY);
    if (savedUsername) {
      // LocalStorage dagi ma'lumotni ham tekshirib olish
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.users[savedUsername]) {
          setCurrentUser(parsed.users[savedUsername]);
          setState(parsed);
        }
      }
    }
  }, []);

  // Har 10 soniyada avtomatik sinxronizatsiya
  useEffect(() => {
    const interval = setInterval(pullData, 10000);
    return () => clearInterval(interval);
  }, [pullData]);

  // Har qanday state o'zgarishidan oldin PULL qilish
  const updateState = async (updater: (prev: AppState) => AppState) => {
    // 1. Avval serverdan eng yangisini olamiz
    await pullData();
    
    // 2. Keyin yangilaymiz
    setState(prev => {
      const next = { ...updater(prev), lastUpdated: Date.now() };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      // 3. Darhol serverga yuboramiz
      pushData(next);
      return next;
    });
  };

  const handleLogin = (username: string, passwordHash: string, role: Role) => {
    const cleanUsername = username.toLowerCase().trim();
    const user = state.users[cleanUsername];
    if (user && user.role === role && user.passwordHash === passwordHash) {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, cleanUsername);
      return true;
    }
    return false;
  };

  const handleRegister = async (username: string, passwordHash: string) => {
    const cleanUsername = username.toLowerCase().trim();
    
    // Ro'yxatdan o'tishdan oldin bazani serverdan yangilab olamiz
    await pullData();

    if (state.users[cleanUsername]) return false;

    const newUser: User = {
      username: cleanUsername,
      passwordHash,
      role: 'user',
      courses: [],
      totalScore: 0,
      rating: 0,
      registrationDate: new Date().toISOString()
    };

    updateState(prev => ({ 
      ...prev, 
      users: { ...prev.users, [cleanUsername]: newUser } 
    }));
    
    setCurrentUser(newUser);
    localStorage.setItem(SESSION_KEY, cleanUsername);
    return true;
  };

  if (!currentUser) {
    return (
      <Login 
        onLogin={handleLogin} 
        onRegister={handleRegister} 
        onReset={() => {localStorage.clear(); window.location.reload();}} 
        lang={lang} 
        setLang={setLang} 
      />
    );
  }

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} 
        role={currentUser.role} currentView={currentView} setView={setCurrentView} 
        onLogout={() => {setCurrentUser(null); localStorage.removeItem(SESSION_KEY);}} 
        lang={lang}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          user={currentUser} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          lang={lang} setLang={setLang} isSynced={isOnline} isSyncing={isSyncing}
          onManualSync={() => pullData()}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {!isOnline && (
              <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                <i className="fas fa-wifi"></i>
                Internet bilan aloqa yo'q. Ma'lumotlar faqat lokal saqlanmoqda.
              </div>
            )}
            
            {currentView === 'dashboard' && <Dashboard state={state} currentUser={currentUser} lang={lang} />}
            {currentView === 'courses' && (
              <CourseList 
                courses={Object.values(state.courses)} currentUser={currentUser} 
                onEnroll={id => updateState(p => {
                  const u = p.users[currentUser.username];
                  const c = p.courses[id];
                  if(!u || !c || u.courses.includes(id)) return p;
                  return {
                    ...p,
                    users: { ...p.users, [u.username]: { ...u, courses: [...u.courses, id] } },
                    courses: { ...p.courses, [id]: { ...c, studentUsernames: [...c.studentUsernames, u.username] } }
                  };
                })} 
                onAddCourse={c => updateState(p => ({...p, courses: {...p.courses, [c.id]: c}}))} 
                lang={lang} 
              />
            )}
            {currentView === 'tasks' && (
              <TaskList 
                tasks={Object.values(state.tasks)} courses={state.courses} submissions={state.submissions} currentUser={currentUser} 
                onSubmit={s => updateState(p => ({...p, submissions: {...p.submissions, [s.id]: s}}))} 
                onAddTask={t => updateState(p => ({...p, tasks: {...p.tasks, [t.id]: t}}))} 
                onUpdateTask={(id, u) => updateState(p => ({...p, tasks: { ...p.tasks, [id]: p.tasks[id] ? { ...p.tasks[id], ...u } : p.tasks[id] } }))} 
                lang={lang} 
              />
            )}
            {currentView === 'submissions' && (
               <SubmissionManager 
                submissions={Object.values(state.submissions)} tasks={state.tasks} currentUser={currentUser} 
                onGrade={(id, g, c) => updateState(prev => {
                  const sub = prev.submissions[id];
                  const user = prev.users[sub.username];
                  return {
                    ...prev,
                    users: { ...prev.users, [sub.username]: { ...user, totalScore: user.totalScore + g } },
                    submissions: { ...prev.submissions, [id]: { ...sub, status: 'approved', grade: g, adminComment: c } }
                  };
                })} 
                lang={lang} 
               />
            )}
            {currentView === 'users' && (
              <UserManagement 
                users={Object.values(state.users)} 
                onDelete={u => updateState(p => {
                  const n = {...p.users}; 
                  delete n[u]; 
                  return {...p, users: n};
                })} 
                lang={lang} 
              />
            )}
            {currentView === 'settings' && (
              <Settings 
                user={currentUser} 
                onPasswordChange={(u,h) => updateState(p => ({...p, users: {...p.users, [u]: {...p.users[u], passwordHash: h}}}))} 
                lang={lang} state={state} onImport={s => updateState(() => s)} 
              />
            )}
            {currentView === 'leaderboard' && <Leaderboard state={state} lang={lang} />}
          </div>
        </main>
        
        <MentorChat isOpen={isMentorOpen} setIsOpen={setIsMentorOpen} lang={lang} />
      </div>
    </div>
  );
};

export default App;
