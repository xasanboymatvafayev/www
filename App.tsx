
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

const CLOUD_API_URL = 'https://api.restful-api.dev/objects';
const SESSION_KEY = 'edusync_session_v10';
const CLOUD_ID_STORAGE = 'edusync_cloud_id_v10';

const App: React.FC = () => {
  // 1. Local storage-dan yuklash (darhol ko'rinishi uchun)
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STATE;
    } catch (e) {
      return INITIAL_STATE;
    }
  });

  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUsername = localStorage.getItem(SESSION_KEY);
      if (savedUsername) {
        const localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        return localData.users?.[savedUsername] || null;
      }
    } catch (e) {}
    return null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [cloudId, setCloudId] = useState<string | null>(localStorage.getItem(CLOUD_ID_STORAGE));
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [lang, setLang] = useState<Language>('uz');

  const lastProcessedHash = useRef<string>('');

  // 2. Bulutga ma'lumot yuborish (Faqat bitta ID orqali)
  const pushToCloud = useCallback(async (data: AppState) => {
    if (!cloudId) return;
    const currentHash = JSON.stringify(data);
    if (currentHash === lastProcessedHash.current) return;

    setIsSyncing(true);
    try {
      await fetch(`${CLOUD_API_URL}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: "EduSync_User_Data",
          data: { ...data, lastUpdated: Date.now() }
        })
      });
      lastProcessedHash.current = currentHash;
      setLastSyncTime(new Date().toLocaleTimeString());
    } catch (e) {
      console.warn("Cloud push failed");
    } finally {
      setIsSyncing(false);
    }
  }, [cloudId]);

  // 3. Bulutdan ma'lumotni olish
  const pullFromCloud = useCallback(async () => {
    if (!cloudId || isSyncing) return;
    try {
      const res = await fetch(`${CLOUD_API_URL}/${cloudId}`);
      if (res.status === 404) return; // ID xato bo'lsa
      const result = await res.json();
      const cloudData = result.data as AppState;

      if (cloudData && cloudData.lastUpdated > state.lastUpdated) {
        lastProcessedHash.current = JSON.stringify(cloudData);
        setState(cloudData);
        setLastSyncTime(new Date().toLocaleTimeString());
        
        if (currentUser) {
          const updated = cloudData.users[currentUser.username];
          if (updated) setCurrentUser(updated);
        }
      }
    } catch (e) {
      console.warn("Cloud pull failed");
    }
  }, [cloudId, state.lastUpdated, isSyncing, currentUser]);

  // 4. Yangi Cloud ID yaratish (Birinchi marta)
  const createNewCloudId = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "EduSync_User_Data", data: state })
      });
      const result = await res.json();
      setCloudId(result.id);
      localStorage.setItem(CLOUD_ID_STORAGE, result.id);
    } catch (e) {
      alert("Internet aloqasini tekshiring!");
    } finally {
      setIsSyncing(false);
    }
  };

  // Effektlar
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (cloudId) {
      const interval = setInterval(pullFromCloud, 4000); // 4 soniyada bir tekshirish
      return () => clearInterval(interval);
    }
  }, [pullFromCloud, cloudId]);

  const updateState = (updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const next = { ...updater(prev), lastUpdated: Date.now() };
      pushToCloud(next);
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

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} onReset={() => {localStorage.clear(); window.location.reload();}} lang={lang} setLang={setLang} />;
  }

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} 
        role={currentUser.role} currentView={currentView} setView={setCurrentView} onLogout={() => {setCurrentUser(null); localStorage.removeItem(SESSION_KEY);}} lang={lang}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          user={currentUser} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          lang={lang} setLang={setLang} isSynced={!!cloudId} isSyncing={isSyncing}
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
                syncId={cloudId || ''} onSyncIdChange={id => { setCloudId(id); localStorage.setItem(CLOUD_ID_STORAGE, id); }} 
                isSynced={!!cloudId} isSyncing={isSyncing} lastSyncTime={lastSyncTime} 
              />
            )}
            {currentView === 'leaderboard' && <Leaderboard state={state} lang={lang} />}
          </div>
        </main>
        {/* Sinxronizatsiya tugmasi agar ulanmagan bo'lsa */}
        {!cloudId && (
          <button 
            onClick={createNewCloudId}
            className="fixed bottom-24 right-6 bg-emerald-600 text-white px-6 py-3 rounded-full shadow-2xl font-bold animate-bounce z-50"
          >
            <i className="fas fa-cloud-upload-alt mr-2"></i> Sinxronizatsiyani yoqish
          </button>
        )}
        <MentorChat isOpen={isMentorOpen} setIsOpen={setIsMentorOpen} lang={lang} />
      </div>
    </div>
  );
};

export default App;
