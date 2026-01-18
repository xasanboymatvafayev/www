
import React, { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEY, INITIAL_STATE } from './constants';
import { AppState, User, Course, Role } from './types';
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

/**
 * GLOBAL_DATABASE_ID: Bu barcha foydalanuvchilar uchun umumiy backend kanali.
 * Barcha qurilmalar shu ID orqali bir-biri bilan gaplashadi.
 */
const GLOBAL_DATABASE_ID = 'edusync_global_backend_v110_shared';
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

  // SERVERDAN MA'LUMOTNI OLISH (FRESH DATA)
  const fetchFromCloud = async (): Promise<AppState | null> => {
    try {
      const response = await fetch(`${API_URL}/${GLOBAL_DATABASE_ID}?nocache=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        return result.data as AppState;
      }
    } catch (e) {
      console.error("Backend Connection Error:", e);
    }
    return null;
  };

  // SERVERGA MA'LUMOTNI SAQLASH
  const pushToCloud = async (newState: AppState) => {
    try {
      const payload = {
        name: "EduSync_Global_DB",
        data: { ...newState, lastUpdated: Date.now() }
      };

      const putRes = await fetch(`${API_URL}/${GLOBAL_DATABASE_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      // Agar baza hali yaratilmagan bo'lsa (birinchi marta)
      if (putRes.status === 404) {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: GLOBAL_DATABASE_ID, ...payload })
        });
      }
      setIsOnline(true);
    } catch (e) {
      setIsOnline(false);
    }
  };

  /**
   * SMART SYNC: Serverdagi ma'lumotni bizdagidan yangi bo'lsagina oladi.
   */
  const syncWithBackend = useCallback(async (force = false) => {
    if (isSyncing && !force) return;
    const cloudData = await fetchFromCloud();
    if (cloudData) {
      if (force || cloudData.lastUpdated > state.lastUpdated) {
        setState(cloudData);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudData));
      }
      setIsOnline(true);
    }
  }, [state.lastUpdated, isSyncing]);

  // ILOVA YUKLANGANDA GLOBAL BAZAGA ULANISH
  useEffect(() => {
    const initBackend = async () => {
      setIsSyncing(true);
      const cloud = await fetchFromCloud();
      let activeState = cloud || INITIAL_STATE;
      
      // Agar server bo'm-bo'sh bo'lsa, uni boshlang'ich ma'lumot bilan to'ldiramiz
      if (!cloud) {
        await pushToCloud(INITIAL_STATE);
      }

      setState(activeState);
      
      // Sessiyani tiklash
      const savedUser = localStorage.getItem(SESSION_KEY);
      if (savedUser && activeState.users[savedUser]) {
        setCurrentUser(activeState.users[savedUser]);
      }
      setIsSyncing(false);
    };
    initBackend();
  }, []);

  // REAL-TIME POLLING: Har 3 soniyada o'zgarishlarni tekshiradi
  useEffect(() => {
    const timer = setInterval(() => syncWithBackend(), 3000);
    const onFocus = () => syncWithBackend(true);
    window.addEventListener('focus', onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, [syncWithBackend]);

  /**
   * ATOMIC UPDATE: Har qanday o'zgarishdan oldin serverni tekshiradi,
   * yangilikni qo'shadi va qayta serverga yuboradi.
   * Bu "Everyone" (Hamma uchun) ishlashini ta'minlaydi.
   */
  const performAction = async (updater: (prev: AppState) => AppState) => {
    setIsSyncing(true);
    // 1. Avval serverdagi eng yangi holatni olamiz
    const cloud = await fetchFromCloud();
    const currentState = cloud || state;

    // 2. Yangi holatni hisoblaymiz
    const nextState = { ...updater(currentState), lastUpdated: Date.now() };

    // 3. Bir vaqtda ham ekranni, ham serverni yangilaymiz
    setState(nextState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
    await pushToCloud(nextState);
    setIsSyncing(false);
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

    await performAction(prev => ({
      ...prev,
      users: { ...prev.users, [cleanUsername]: newUser }
    }));
    
    setCurrentUser(newUser);
    localStorage.setItem(SESSION_KEY, cleanUsername);
    return true;
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} onReset={() => {localStorage.clear(); window.location.reload();}} lang={lang} setLang={setLang} />;
  }

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100">
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
          onManualSync={() => syncWithBackend(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {!isOnline && (
              <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase animate-pulse">
                <i className="fas fa-wifi-slash"></i> Offline - Server bilan aloqa uzildi
              </div>
            )}
            
            {currentView === 'dashboard' && <Dashboard state={state} currentUser={currentUser} lang={lang} />}
            {currentView === 'courses' && (
              <CourseList 
                courses={Object.values(state.courses)} currentUser={currentUser} 
                onEnroll={id => performAction(p => {
                  const u = p.users[currentUser.username];
                  const c = p.courses[id];
                  if(!u || !c || u.courses.includes(id)) return p;
                  return {
                    ...p,
                    users: { ...p.users, [u.username]: { ...u, courses: [...u.courses, id] } },
                    courses: { ...p.courses, [id]: { ...c, studentUsernames: [...c.studentUsernames, u.username] } }
                  };
                })} 
                onAddCourse={c => performAction(p => ({...p, courses: {...p.courses, [c.id]: c}}))} 
                lang={lang} 
              />
            )}
            {currentView === 'tasks' && (
              <TaskList 
                tasks={Object.values(state.tasks)} courses={state.courses} submissions={state.submissions} currentUser={currentUser} 
                onSubmit={s => performAction(p => ({...p, submissions: {...p.submissions, [s.id]: s}}))} 
                onAddTask={t => performAction(p => ({...p, tasks: {...p.tasks, [t.id]: t}}))} 
                onUpdateTask={(id, u) => performAction(p => ({...p, tasks: { ...p.tasks, [id]: p.tasks[id] ? { ...p.tasks[id], ...u } : p.tasks[id] } }))} 
                lang={lang} 
              />
            )}
            {currentView === 'submissions' && (
               <SubmissionManager 
                submissions={Object.values(state.submissions)} tasks={state.tasks} currentUser={currentUser} 
                onGrade={(id, g, c) => performAction(prev => {
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
                onDelete={u => performAction(p => {
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
                onPasswordChange={(u,h) => performAction(p => ({...p, users: {...p.users, [u]: {...p.users[u], passwordHash: h}}}))} 
                lang={lang} state={state} onImport={s => performAction(() => s)} 
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
