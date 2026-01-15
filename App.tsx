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
import { Language, translations } from './translations';

const CLOUD_API_URL = 'https://api.restful-api.dev/objects';
const SESSION_KEY = 'edusync_session_v10';
const CLOUD_ID_STORAGE = 'edusync_cloud_id_v10';
const SYNC_INTERVAL = 120000; // 2 minut

const App: React.FC = () => {
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
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [isLimitBannerDismissed, setIsLimitBannerDismissed] = useState(false);
  
  const [cloudId, setCloudId] = useState<string | null>(() => {
    const saved = localStorage.getItem(CLOUD_ID_STORAGE);
    return (saved && saved !== 'undefined' && saved !== 'null' && saved.trim().length > 3) ? saved : null;
  });

  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [lang, setLang] = useState<Language>('uz');

  const lastProcessedHash = useRef<string>('');
  const consecutiveFailures = useRef<number>(0);

  const checkRateLimit = (text: string) => {
    if (text.toLowerCase().includes("limit") || text.toLowerCase().includes("reached your limit") || text.includes("100 requests")) {
      setIsRateLimited(true);
      return true;
    }
    return false;
  };

  const pushToCloud = useCallback(async (data: AppState, force = false) => {
    if (!cloudId || cloudId === 'undefined') return;
    if (isRateLimited && !force) return;

    const currentHash = JSON.stringify(data);
    if (!force && currentHash === lastProcessedHash.current) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`${CLOUD_API_URL}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: "EduSync_User_Data",
          data: { ...data, lastUpdated: Date.now() }
        })
      });
      
      const text = await res.text();
      if (!res.ok) {
        if (checkRateLimit(text)) return;
        throw new Error("Push failed");
      }

      lastProcessedHash.current = currentHash;
      setLastSyncTime(new Date().toLocaleTimeString());
      consecutiveFailures.current = 0;
      setIsRateLimited(false);
    } catch (e) {
      console.warn("Cloud push failed");
    } finally {
      setIsSyncing(false);
    }
  }, [cloudId, isRateLimited]);

  const pullFromCloud = useCallback(async (force = false) => {
    if (!cloudId || cloudId === 'undefined') return;
    if (isSyncing && !force) return;
    if (isRateLimited && !force) return;

    setIsSyncing(true);
    try {
      const res = await fetch(`${CLOUD_API_URL}/${cloudId}`);
      
      if (res.status === 429) {
          setIsRateLimited(true);
          return;
      }

      const text = await res.text();
      if (!res.ok) {
          if (checkRateLimit(text)) return;
          if (res.status === 404) {
              consecutiveFailures.current += 1;
              if (consecutiveFailures.current > 5) {
                setCloudId(null);
                localStorage.removeItem(CLOUD_ID_STORAGE);
              }
          }
          return;
      }
      
      const result = JSON.parse(text);
      if (!result.data) return;
      
      const cloudData = result.data as AppState;
      consecutiveFailures.current = 0;
      setIsRateLimited(false);

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
    } finally {
      setIsSyncing(false);
    }
  }, [cloudId, state.lastUpdated, isSyncing, currentUser, isRateLimited]);

  const createNewCloudId = async () => {
    setIsSyncing(true);
    setIsRateLimited(false); // Reset limited state to try fresh
    try {
      const res = await fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            name: "EduSync_User_Data", 
            data: { ...state, lastUpdated: Date.now() } 
        })
      });
      
      const text = await res.text();
      if (!res.ok) {
        checkRateLimit(text);
        return;
      }

      const result = JSON.parse(text);
      if (result && result.id) {
        setCloudId(result.id);
        localStorage.setItem(CLOUD_ID_STORAGE, result.id);
        lastProcessedHash.current = JSON.stringify(state);
        consecutiveFailures.current = 0;
        setIsRateLimited(false);
        setIsLimitBannerDismissed(false);
        setLastSyncTime(new Date().toLocaleTimeString());
        alert("Sinxronizatsiya muvaffaqiyatli tiklandi!");
      }
    } catch (e) {
      console.error("Sync creation error:", e);
      setIsRateLimited(true);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    if (cloudId && cloudId !== 'undefined' && !isRateLimited) {
      const interval = setInterval(pullFromCloud, SYNC_INTERVAL);
      return () => clearInterval(interval);
    }
  }, [pullFromCloud, cloudId, isRateLimited]);

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

  const hasCloudConnection = cloudId !== null && cloudId !== 'undefined' && cloudId.length > 3;

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar 
        isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} 
        role={currentUser.role} currentView={currentView} setView={setCurrentView} onLogout={() => {setCurrentUser(null); localStorage.removeItem(SESSION_KEY);}} lang={lang}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          user={currentUser} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          lang={lang} setLang={setLang} isSynced={hasCloudConnection} isSyncing={isSyncing} isRateLimited={isRateLimited}
          onManualSync={() => { 
            if (isRateLimited) {
                createNewCloudId();
            } else {
                pullFromCloud(true).then(() => pushToCloud(state, true)); 
            }
          }}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {isRateLimited && !isLimitBannerDismissed && (
              <div className="bg-amber-500/10 border border-amber-500/20 p-6 rounded-3xl flex flex-col md:flex-row items-center gap-6 animate-in fade-in slide-in-from-top-4 duration-500 shadow-2xl shadow-amber-900/10">
                <div className="w-14 h-14 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-lg shadow-amber-900/20">
                  <i className="fas fa-bolt text-2xl"></i>
                </div>
                <div className="flex-1 text-center md:text-left">
                  <p className="text-amber-500 font-black text-sm uppercase tracking-widest">Hozirda Sinxronizatsiya To'xtadi</p>
                  <p className="text-slate-300 text-xs mt-1 leading-relaxed">
                    Sizda ma'lumotlar saqlanishi davom etmoqda. Agarda bulutli xotira <b>hozir kerak bo'lsa</b>, yangi ulanishni yarating.
                  </p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 w-full md:w-auto">
                    <button 
                        onClick={createNewCloudId}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-black uppercase rounded-xl transition-all shadow-xl active:scale-95"
                    >
                        <i className="fas fa-magic mr-2"></i> Hozir tiklash
                    </button>
                    <button 
                        onClick={() => setIsLimitBannerDismissed(true)}
                        className="px-6 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase rounded-xl border border-slate-700 transition-all"
                    >
                        Keyinroq
                    </button>
                </div>
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
                // Fix: Correctly update the tasks record by targeting the specific task ID instead of incorrectly spreading the task object itself into the record
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
            {currentView === 'users' && <UserManagement users={Object.values(state.users)} onDelete={u => updateState(p => {const n={...p.users}; delete n[u]; return {...p, users:n}})} lang={lang} />}
            {currentView === 'settings' && (
              <Settings 
                user={currentUser} 
                onPasswordChange={(u,h) => updateState(p => ({...p, users: {...p.users, [u]: {...p.users[u], passwordHash: h}}}))} 
                lang={lang} state={state} onImport={s => updateState(() => s)} 
                syncId={hasCloudConnection ? cloudId : ''} 
                onSyncIdChange={id => { 
                    if(!id || id.trim() === '') {
                        setCloudId(null);
                        localStorage.removeItem(CLOUD_ID_STORAGE);
                    } else {
                        const cleanId = id.trim();
                        setCloudId(cleanId); 
                        localStorage.setItem(CLOUD_ID_STORAGE, cleanId); 
                        setIsRateLimited(false);
                        pullFromCloud(true);
                    }
                }} 
                isSynced={hasCloudConnection} isSyncing={isSyncing} lastSyncTime={lastSyncTime} isRateLimited={isRateLimited}
              />
            )}
            {currentView === 'leaderboard' && <Leaderboard state={state} lang={lang} />}
          </div>
        </main>
        
        {!hasCloudConnection && (
          <button 
            onClick={createNewCloudId}
            disabled={isSyncing}
            className={`fixed bottom-24 right-6 px-6 py-4 rounded-full shadow-2xl font-black uppercase text-[10px] transition-all z-50 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500 animate-bounce tracking-widest text-white`}
          >
            <i className={`fas ${isSyncing ? 'fa-sync fa-spin' : 'fa-cloud-upload-alt'} mr-2`}></i> 
            Sinxronizatsiyani Yoqish
          </button>
        )}
        <MentorChat isOpen={isMentorOpen} setIsOpen={setIsMentorOpen} lang={lang} />
      </div>
    </div>
  );
};

export default App;