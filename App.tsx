
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

// BU ID NI O'ZGARTIRMANG! Barcha qurilmalaringizda bir xil bo'lishi shart.
const GLOBAL_DATABASE_ID = 'edusync_enterprise_cloud_v105_unique'; 
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

  // Serverdan ma'lumotni keshsiz (fresh) olish
  const fetchLatestFromServer = async (): Promise<AppState | null> => {
    try {
      // ?nocache=... qo'shish brauzerni eski ma'lumotni ko'rsatishdan to'xtatadi
      const response = await fetch(`${API_URL}/${GLOBAL_DATABASE_ID}?t=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        return result.data as AppState;
      }
    } catch (e) {
      console.error("Cloud Fetch Error:", e);
    }
    return null;
  };

  // Ma'lumotni serverga yuborish
  const pushToServer = async (newState: AppState) => {
    try {
      const payload = {
        name: "EduSync_Global_Storage",
        data: { ...newState, lastUpdated: Date.now() }
      };

      const putRes = await fetch(`${API_URL}/${GLOBAL_DATABASE_ID}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (putRes.status === 404) {
        // Agar hali baza yaratilmagan bo'lsa
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

  // 1. Sinxronizatsiya (PULL)
  const syncWithCloud = useCallback(async (force = false) => {
    if (isSyncing && !force) return;
    setIsSyncing(true);
    const cloud = await fetchLatestFromServer();
    if (cloud) {
      // Serverdagi ma'lumot bizdagidan yangiroq bo'lsa yoki "force" bo'lsa yangilaymiz
      if (force || cloud.lastUpdated > state.lastUpdated) {
        setState(cloud);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cloud));
      }
      setIsOnline(true);
    }
    setIsSyncing(false);
  }, [state.lastUpdated, isSyncing]);

  // Ilova yuklanganda
  useEffect(() => {
    const initApp = async () => {
      setIsSyncing(true);
      const cloud = await fetchLatestFromServer();
      let activeState = INITIAL_STATE;

      if (cloud) {
        activeState = cloud;
      } else {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) activeState = JSON.parse(local);
      }

      setState(activeState);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(activeState));

      // Sessiyani tiklash
      const savedUser = localStorage.getItem(SESSION_KEY);
      if (savedUser && activeState.users[savedUser]) {
        setCurrentUser(activeState.users[savedUser]);
      }
      setIsSyncing(false);
    };
    initApp();
  }, []);

  // Har 4 soniyada avtomatik sinxronizatsiya (Aqlli tekshirish)
  useEffect(() => {
    const interval = setInterval(() => syncWithCloud(), 4000);
    // Qurilma fokusga qaytganda ham yangilash (masalan, telefon blokdan ochilganda)
    const handleFocus = () => syncWithCloud(true);
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [syncWithCloud]);

  // ASOSIY FUNKSIYA: O'zgarishlarni ziddiyatsiz saqlash
  const performUpdate = async (updater: (prev: AppState) => AppState) => {
    setIsSyncing(true);
    
    // 1. Avval serverdan eng so'nggi holatni olamiz (bu juda muhim!)
    const cloud = await fetchLatestFromServer();
    const currentState = cloud || state;

    // 2. Yangi holatni hisoblaymiz
    const updatedState = { ...updater(currentState), lastUpdated: Date.now() };

    // 3. Lokal va Serverni bir vaqtda yangilaymiz
    setState(updatedState);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
    await pushToServer(updatedState);
    
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
    
    // Ro'yxatdan o'tishdan oldin serverni tekshiramiz
    const cloud = await fetchLatestFromServer();
    const currentUsers = cloud ? cloud.users : state.users;

    if (currentUsers[cleanUsername]) return false;

    const newUser: User = {
      username: cleanUsername,
      passwordHash,
      role: 'user',
      courses: [],
      totalScore: 0,
      rating: 0,
      registrationDate: new Date().toISOString()
    };

    await performUpdate(prev => ({
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
      <div className="flex-1 flex flex-col overflow-hidden relative text-slate-100">
        <Header 
          user={currentUser} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          lang={lang} setLang={setLang} isSynced={isOnline} isSyncing={isSyncing}
          onManualSync={() => syncWithCloud(true)}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {!isOnline && (
              <div className="bg-red-500/20 border border-red-500/50 p-4 rounded-2xl flex items-center gap-3 text-red-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                <i className="fas fa-wifi-slash"></i>
                Internet yo'q! O'zgarishlar saqlanmasligi mumkin.
              </div>
            )}
            
            {currentView === 'dashboard' && <Dashboard state={state} currentUser={currentUser} lang={lang} />}
            {currentView === 'courses' && (
              <CourseList 
                courses={Object.values(state.courses)} currentUser={currentUser} 
                onEnroll={id => performUpdate(p => {
                  const u = p.users[currentUser.username];
                  const c = p.courses[id];
                  if(!u || !c || u.courses.includes(id)) return p;
                  return {
                    ...p,
                    users: { ...p.users, [u.username]: { ...u, courses: [...u.courses, id] } },
                    courses: { ...p.courses, [id]: { ...c, studentUsernames: [...c.studentUsernames, u.username] } }
                  };
                })} 
                onAddCourse={c => performUpdate(p => ({...p, courses: {...p.courses, [c.id]: c}}))} 
                lang={lang} 
              />
            )}
            {currentView === 'tasks' && (
              <TaskList 
                tasks={Object.values(state.tasks)} courses={state.courses} submissions={state.submissions} currentUser={currentUser} 
                onSubmit={s => performUpdate(p => ({...p, submissions: {...p.submissions, [s.id]: s}}))} 
                onAddTask={t => performUpdate(p => ({...p, tasks: {...p.tasks, [t.id]: t}}))} 
                onUpdateTask={(id, u) => performUpdate(p => ({...p, tasks: { ...p.tasks, [id]: p.tasks[id] ? { ...p.tasks[id], ...u } : p.tasks[id] } }))} 
                lang={lang} 
              />
            )}
            {currentView === 'submissions' && (
               <SubmissionManager 
                submissions={Object.values(state.submissions)} tasks={state.tasks} currentUser={currentUser} 
                onGrade={(id, g, c) => performUpdate(prev => {
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
                onDelete={u => performUpdate(p => {
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
                onPasswordChange={(u,h) => performUpdate(p => ({...p, users: {...p.users, [u]: {...p.users[u], passwordHash: h}}}))} 
                lang={lang} state={state} onImport={s => performUpdate(() => s)} 
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
