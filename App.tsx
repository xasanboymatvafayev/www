
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

const SYNC_KEY_NAME = 'EDUSYNC_REALTIME_V10_PRO';
const CLOUD_API_URL = 'https://api.restful-api.dev/objects';
const SESSION_KEY = 'edusync_session_v10';
const CLOUD_ID_STORAGE = 'edusync_cloud_object_id';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : INITIAL_STATE;
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const savedUsername = localStorage.getItem(SESSION_KEY);
    if (savedUsername) {
      const localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      return localData.users?.[savedUsername] || null;
    }
    return null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudObjectId, setCloudObjectId] = useState<string | null>(localStorage.getItem(CLOUD_ID_STORAGE));
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [lang, setLang] = useState<Language>('uz');

  const skipNextPush = useRef(false);

  // 1. Bulutda biz uchun bitta doimiy joy (obyekt) topish yoki yaratish
  const initCloud = useCallback(async () => {
    if (cloudObjectId) return;
    
    try {
      // Avval barcha obyektlar orasidan biznikini qidiramiz
      const res = await fetch(CLOUD_API_URL);
      const data = await res.json();
      const existing = Array.isArray(data) ? data.find(obj => obj.name === SYNC_KEY_NAME) : null;

      if (existing) {
        setCloudObjectId(existing.id);
        localStorage.setItem(CLOUD_ID_STORAGE, existing.id);
      } else {
        // Agar yo'q bo'lsa, yangi yaratamiz
        const createRes = await fetch(CLOUD_API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: SYNC_KEY_NAME, data: state })
        });
        const newObj = await createRes.json();
        setCloudObjectId(newObj.id);
        localStorage.setItem(CLOUD_ID_STORAGE, newObj.id);
      }
    } catch (e) { console.error("Init Cloud error", e); }
  }, [cloudObjectId, state]);

  // 2. Bulutdan ma'lumotlarni tortish va birlashtirish
  const pull = useCallback(async () => {
    if (!cloudObjectId || isSyncing) return;
    
    try {
      const res = await fetch(`${CLOUD_API_URL}/${cloudObjectId}`);
      if (!res.ok) {
        // Agar obyekt o'chib ketgan bo'lsa, qaytadan init qilamiz
        if (res.status === 404) {
          localStorage.removeItem(CLOUD_ID_STORAGE);
          setCloudObjectId(null);
          return;
        }
        throw new Error();
      }
      
      const cloudObj = await res.json();
      const cloudState = cloudObj.data as AppState;

      if (cloudState && cloudState.lastUpdated > state.lastUpdated) {
        console.log("Cloud is newer! Syncing...");
        skipNextPush.current = true;
        setState(cloudState);
        setLastSyncTime(new Date().toLocaleTimeString());
        
        // Agar user ma'lumoti o'zgargan bo'lsa yangilash
        if (currentUser) {
          const updatedUser = cloudState.users[currentUser.username];
          if (updatedUser) setCurrentUser(updatedUser);
        }
      }
    } catch (e) { console.warn("Pull error"); }
  }, [cloudObjectId, state.lastUpdated, isSyncing, currentUser]);

  // 3. Bulutga ma'lumot yuborish (Faqat mahalliy o'zgarish bo'lsa)
  const push = useCallback(async (newState: AppState) => {
    if (!cloudObjectId || skipNextPush.current) {
      skipNextPush.current = false;
      return;
    }

    setIsSyncing(true);
    try {
      await fetch(`${CLOUD_API_URL}/${cloudObjectId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: SYNC_KEY_NAME, data: { ...newState, lastUpdated: Date.now() } })
      });
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) { console.warn("Push error"); }
    finally { setIsSyncing(false); }
  }, [cloudObjectId]);

  // Effektlar
  useEffect(() => { initCloud(); }, [initCloud]);
  
  useEffect(() => {
    const interval = setInterval(pull, 3000); // Har 3 soniyada tekshirish
    return () => clearInterval(interval);
  }, [pull]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Helper: State o'zgarganda push qilish
  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = { ...updater(prev), lastUpdated: Date.now() };
      push(next);
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

  const handleRegister = (username: string, passwordHash: string) => {
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
    updateState(prev => ({ ...prev, users: { ...prev.users, [cleanUsername]: newUser } }));
    setCurrentUser(newUser);
    localStorage.setItem(SESSION_KEY, cleanUsername);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setCurrentView('dashboard');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} onReset={() => {localStorage.clear(); window.location.reload();}} lang={lang} setLang={setLang} />;
  }

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} 
        role={currentUser.role} currentView={currentView} setView={setCurrentView} onLogout={logout} lang={lang}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          user={currentUser} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          lang={lang} setLang={setLang} isSynced={!!cloudObjectId} isSyncing={isSyncing}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
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
                onUpdateTask={(id, u) => updateState(p => ({...p, tasks: {...p.tasks, [id]: {...p.tasks[id], ...u}}}))} 
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
            {currentView === 'users' && <UserManagement users={Object.values(state.users)} onDelete={u => updateState(p => {const n={...p.users}; delete n[u]; return {...p, users:n}})} lang={lang} />}
            {currentView === 'settings' && (
              <Settings 
                user={currentUser} 
                onPasswordChange={(u,h) => updateState(p => ({...p, users: {...p.users, [u]: {...p.users[u], passwordHash: h}}}))} 
                lang={lang} state={state} onImport={s => updateState(() => s)} 
                syncId={SYNC_KEY_NAME} onSyncIdChange={() => {}} 
                isSynced={!!cloudObjectId} isSyncing={isSyncing} lastSyncTime={lastSyncTime} 
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
