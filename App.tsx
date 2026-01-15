
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

// O'ta unikal ID - ma'lumotlar aralashib ketmasligi uchun
const GLOBAL_CLOUD_ID = 'edusync_ultra_v10_master_db';
const CLOUD_API_URL = 'https://api.restful-api.dev/objects';
const SESSION_KEY = 'edusync_active_session_user';

const App: React.FC = () => {
  // 1. Asosiy ma'lumotlar holati (LocalStorage dan yuklash)
  const [state, setState] = useState<AppState>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_STATE;
    } catch (e) {
      return INITIAL_STATE;
    }
  });

  // 2. Foydalanuvchi seansini saqlab qolish
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUsername = localStorage.getItem(SESSION_KEY);
      if (savedUsername) {
        // LocalStorage dagi ma'lumotni eng yangisini olish uchun STORAGE_KEY ni qayta tekshiramiz
        const localData = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
        const users = localData.users || INITIAL_STATE.users;
        return users[savedUsername] || null;
      }
    } catch (e) {
      return null;
    }
    return null;
  });

  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [lang, setLang] = useState<Language>('uz');

  const skipPushOnce = useRef(false);
  const lastCloudStateStr = useRef('');

  // 3. Bulutdan ma'lumotlarni tortish (Pull)
  const pullFromCloud = useCallback(async () => {
    setIsSyncing(true);
    try {
      // Barcha obyektlarni olamiz (API cheklovi sababli shunday qilish xavfsizroq)
      const response = await fetch(CLOUD_API_URL);
      if (!response.ok) throw new Error('Network error');
      const results = await response.json();
      
      if (results && Array.isArray(results)) {
        // Bizning ID ga mos keladigan eng oxirgi obyektni topamiz
        const ourObjects = results.filter(obj => obj.name === GLOBAL_CLOUD_ID);
        if (ourObjects.length > 0) {
          const latestEntry = ourObjects[ourObjects.length - 1];
          const cloudData = latestEntry.data as AppState;
          const cloudDataStr = JSON.stringify(cloudData);
          const currentStateStr = JSON.stringify(state);

          // Agar bulutdagi ma'lumot mahalliy ma'lumotdan farq qilsa, yangilaymiz
          if (cloudDataStr !== currentStateStr && cloudDataStr !== lastCloudStateStr.current) {
            console.log("Cloud Sync: Local state updated from cloud.");
            skipPushOnce.current = true;
            setState(cloudData);
            setLastSyncTime(new Date().toLocaleTimeString());
            lastCloudStateStr.current = cloudDataStr;

            // Agar joriy foydalanuvchi ma'lumoti o'zgargan bo'lsa (masalan, ball qo'shilgan bo'lsa)
            if (currentUser) {
              const updatedUser = cloudData.users[currentUser.username];
              if (updatedUser) {
                setCurrentUser(updatedUser);
              }
            }
          }
        }
      }
    } catch (e) {
      console.error('Cloud Pull error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [state, currentUser]);

  // 4. Bulutga ma'lumotlarni yuborish (Push)
  const pushToCloud = useCallback(async (newState: AppState) => {
    if (skipPushOnce.current) {
      skipPushOnce.current = false;
      return;
    }
    
    const newStateStr = JSON.stringify(newState);
    if (newStateStr === lastCloudStateStr.current) return;

    setIsSyncing(true);
    try {
      await fetch(CLOUD_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: GLOBAL_CLOUD_ID,
          data: newState
        })
      });
      console.log("Cloud Sync: Pushed to cloud.");
      setLastSyncTime(new Date().toLocaleTimeString());
      lastCloudStateStr.current = newStateStr;
    } catch (e) {
      console.error('Cloud Push error:', e);
    } finally {
      setIsSyncing(false);
    }
  }, []);

  // Effekt: Har safar state o'zgarganda LocalStorage ga saqlash va bulutga yuborish
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    const timer = setTimeout(() => pushToCloud(state), 3000);
    return () => clearTimeout(timer);
  }, [state, pushToCloud]);

  // Effekt: Avtomatik sinxronizatsiya (har 5 soniyada)
  useEffect(() => {
    pullFromCloud();
    const interval = setInterval(pullFromCloud, 5000);
    return () => clearInterval(interval);
  }, [pullFromCloud]);

  const handleLogin = (username: string, passwordHash: string, role: Role) => {
    const cleanUsername = username.toLowerCase().trim();
    const user = state.users?.[cleanUsername];
    if (user && user.role === role && user.passwordHash === passwordHash) {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, cleanUsername);
      return true;
    }
    return false;
  };

  const handleRegister = (username: string, passwordHash: string) => {
    const cleanUsername = username.toLowerCase().trim();
    if (state.users?.[cleanUsername]) return false;
    
    const newUser: User = {
      username: cleanUsername,
      passwordHash,
      role: 'user',
      courses: [],
      totalScore: 0,
      rating: 0,
      registrationDate: new Date().toISOString()
    };
    
    setState(prev => ({
      ...prev,
      users: { ...prev.users, [cleanUsername]: newUser }
    }));
    setCurrentUser(newUser);
    localStorage.setItem(SESSION_KEY, cleanUsername);
    return true;
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem(SESSION_KEY);
    setCurrentView('dashboard');
  };

  const deleteUser = (username: string) => {
    if (username === 'admin') return; 
    setState(prev => {
      const newUsers = { ...prev.users };
      delete newUsers[username];
      return { ...prev, users: newUsers };
    });
  };

  const changePassword = (username: string, newHash: string) => {
    setState(prev => {
       const user = prev.users?.[username];
       if (!user) return prev;
       return {
         ...prev,
         users: {
           ...prev.users,
           [username]: { ...user, passwordHash: newHash }
         }
       };
    });
    return true;
  };

  const enrollInCourse = (courseId: string) => {
    if (!currentUser) return;
    setState(prev => {
      const user = prev.users?.[currentUser.username];
      const course = prev.courses?.[courseId];
      if (!user || !course || user.courses.includes(courseId)) return prev;

      return {
        ...prev,
        users: { ...prev.users, [user.username]: { ...user, courses: [...user.courses, courseId] } },
        courses: { ...prev.courses, [courseId]: { ...course, studentUsernames: [...course.studentUsernames, user.username] } }
      };
    });
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} onRegister={handleRegister} onReset={() => {localStorage.clear(); window.location.reload();}} lang={lang} setLang={setLang} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard state={state} currentUser={currentUser} lang={lang} />;
      case 'courses':
        return <CourseList courses={Object.values(state.courses || {})} currentUser={currentUser} onEnroll={enrollInCourse} onAddCourse={(c) => setState(p => ({...p, courses: {...p.courses, [c.id]: c}}))} lang={lang} />;
      case 'tasks':
        return <TaskList tasks={Object.values(state.tasks || {})} courses={state.courses || {}} submissions={state.submissions || {}} currentUser={currentUser} onSubmit={(s) => setState(p => ({...p, submissions: {...p.submissions, [s.id]: s}}))} onAddTask={(t) => setState(p => ({...p, tasks: {...p.tasks, [t.id]: t}}))} onUpdateTask={(id, u) => setState(p => ({...p, tasks: {...p.tasks, [id]: {...p.tasks[id], ...u}}}))} lang={lang} />;
      case 'submissions':
        return <SubmissionManager submissions={Object.values(state.submissions || {})} tasks={state.tasks || {}} currentUser={currentUser} onGrade={(id, g, c) => {
           setState(prev => {
             const sub = prev.submissions?.[id];
             if (!sub) return prev;
             const user = prev.users?.[sub.username];
             if (!user) return prev;
             return {
               ...prev,
               users: { ...prev.users, [sub.username]: { ...user, totalScore: user.totalScore + g } },
               submissions: { ...prev.submissions, [id]: { ...sub, status: 'approved', grade: g, adminComment: c } }
             };
           });
        }} lang={lang} />;
      case 'users':
        return <UserManagement users={Object.values(state.users || {})} onDelete={deleteUser} lang={lang} />;
      case 'settings':
        return (
          <Settings 
            user={currentUser} 
            onPasswordChange={changePassword} 
            lang={lang} 
            state={state} 
            onImport={(s) => { skipPushOnce.current = false; setState(s); }}
            syncId={GLOBAL_CLOUD_ID}
            onSyncIdChange={() => {}}
            isSynced={true}
            isSyncing={isSyncing}
            lastSyncTime={lastSyncTime}
          />
        );
      case 'leaderboard':
        return <Leaderboard state={state} lang={lang} />;
      default:
        return <Dashboard state={state} currentUser={currentUser} lang={lang} />;
    }
  };

  return (
    <div className="flex h-screen bg-[#0f172a]">
      <Sidebar 
        isOpen={isSidebarOpen} 
        setIsOpen={setIsSidebarOpen} 
        role={currentUser.role} 
        currentView={currentView}
        setView={setCurrentView}
        onLogout={logout}
        lang={lang}
      />
      <div className="flex-1 flex flex-col overflow-hidden relative">
        <Header 
          user={currentUser} 
          toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} 
          lang={lang}
          setLang={setLang}
          isSynced={true}
          isSyncing={isSyncing}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
        <MentorChat isOpen={isMentorOpen} setIsOpen={setIsMentorOpen} lang={lang} />
      </div>
    </div>
  );
};

export default App;
