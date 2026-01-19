
import React, { useState, useEffect, useCallback } from 'react';
import { STORAGE_KEY, INITIAL_STATE } from './constants.ts';
import { AppState, User, Course, Role, Submission } from './types.ts';
import Sidebar from './components/Sidebar.tsx';
import Header from './components/Header.tsx';
import Dashboard from './components/Dashboard.tsx';
import CourseList from './components/CourseList.tsx';
import TaskList from './components/TaskList.tsx';
import SubmissionManager from './components/SubmissionManager.tsx';
import Login from './components/Login.tsx';
import UserManagement from './components/UserManagement.tsx';
import Settings from './components/Settings.tsx';
import Leaderboard from './components/Leaderboard.tsx';
import MentorChat from './components/MentorChat.tsx';
import { Language } from './translations.ts';
import { evaluateSubmission } from './geminiService.ts';

const GLOBAL_DATABASE_ID = 'edusync_global_backend_v110_shared';
const API_URL = 'https://api.restful-api.dev/objects';
const SESSION_KEY = 'edusync_active_session';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [lang, setLang] = useState<Language>('uz');

  const fetchFromCloud = async (): Promise<AppState | null> => {
    try {
      const response = await fetch(`${API_URL}/${GLOBAL_DATABASE_ID}?nocache=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        return result.data as AppState;
      }
    } catch (e) {
      console.error("Cloud Error:", e);
    }
    return null;
  };

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

  const syncWithBackend = useCallback(async (force = false) => {
    if (isSyncing && !force) return;
    const cloudData = await fetchFromCloud();
    if (cloudData && (force || cloudData.lastUpdated > state.lastUpdated)) {
      setState(cloudData);
      setIsOnline(true);
    }
  }, [state.lastUpdated, isSyncing]);

  const performAction = async (updater: (prev: AppState) => AppState) => {
    setIsSyncing(true);
    const cloud = await fetchFromCloud();
    const currentState = cloud || state;
    const nextState = { ...updater(currentState), lastUpdated: Date.now() };
    setState(nextState);
    await pushToCloud(nextState);
    setIsSyncing(false);
  };

  const handleSubmission = async (submission: Submission) => {
    // 1. Dastlab topshiriqni 'pending' holatda saqlaymiz
    await performAction(p => ({
      ...p,
      submissions: { ...p.submissions, [submission.id]: submission }
    }));

    const task = state.tasks[submission.taskId];
    if (task && (task.type === 'text' || task.type === 'lesson') && submission.answerText) {
      // 2. AI orqali tekshirishni boshlaymiz
      const aiResult = await evaluateSubmission(task, submission.answerText, task.maxPoints, lang);
      
      // 3. AI natijasini bazaga yozamiz
      await performAction(p => ({
        ...p,
        users: {
          ...p.users,
          [submission.username]: {
            ...p.users[submission.username],
            totalScore: p.users[submission.username].totalScore + aiResult.score
          }
        },
        submissions: {
          ...p.submissions,
          [submission.id]: {
            ...p.submissions[submission.id],
            status: 'approved',
            grade: aiResult.score,
            adminComment: `[AI Mentor]: ${aiResult.feedback}`
          }
        }
      }));
    }
  };

  useEffect(() => {
    const initTelegram = async () => {
      // @ts-ignore
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.expand();
        tg.ready();
        
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
          const username = `tg_${tgUser.id}`;
          const cloud = await fetchFromCloud();
          const currentState = cloud || state;
          
          if (currentState.users[username]) {
            setCurrentUser(currentState.users[username]);
            localStorage.setItem(SESSION_KEY, username);
          } else {
            const newUser: User = { 
              username, 
              passwordHash: "telegram_auth", 
              role: 'user', 
              courses: [], 
              totalScore: 0, 
              rating: 0, 
              registrationDate: new Date().toISOString() 
            };
            await performAction(p => ({ ...p, users: { ...p.users, [username]: newUser } }));
            setCurrentUser(newUser);
            localStorage.setItem(SESSION_KEY, username);
          }
        }
      }
    };

    const init = async () => {
      setIsSyncing(true);
      const cloud = await fetchFromCloud();
      const activeState = cloud || INITIAL_STATE;
      if (!cloud) await pushToCloud(INITIAL_STATE);
      setState(activeState);
      
      const savedUser = localStorage.getItem(SESSION_KEY);
      if (savedUser && activeState.users[savedUser]) {
        setCurrentUser(activeState.users[savedUser]);
      } else {
        await initTelegram();
      }
      setIsSyncing(false);
    };
    init();
  }, []);

  useEffect(() => {
    const timer = setInterval(() => syncWithBackend(), 5000);
    return () => clearInterval(timer);
  }, [syncWithBackend]);

  const handleLogin = (username: string, passwordHash: string, role: Role) => {
    const user = state.users[username.toLowerCase().trim()];
    if (user && user.role === role && user.passwordHash === passwordHash) {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, user.username);
      return true;
    }
    return false;
  };

  const handleRegister = async (username: string, passwordHash: string) => {
    const name = username.toLowerCase().trim();
    if (state.users[name]) return false;
    const newUser: User = { username: name, passwordHash, role: 'user', courses: [], totalScore: 0, rating: 0, registrationDate: new Date().toISOString() };
    await performAction(p => ({ ...p, users: { ...p.users, [name]: newUser } }));
    setCurrentUser(newUser);
    localStorage.setItem(SESSION_KEY, name);
    return true;
  };

  if (!currentUser) return <Login onLogin={handleLogin} onRegister={handleRegister} onReset={() => {localStorage.clear(); window.location.reload();}} lang={lang} setLang={setLang} />;

  return (
    <div className="flex h-screen bg-[#0f172a] text-slate-100 overflow-hidden">
      <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} role={currentUser.role} currentView={currentView} setView={setCurrentView} onLogout={() => {setCurrentUser(null); localStorage.removeItem(SESSION_KEY);}} lang={lang} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header user={currentUser} toggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} lang={lang} setLang={setLang} isSynced={isOnline} isSyncing={isSyncing} onManualSync={() => syncWithBackend(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            {currentView === 'dashboard' && <Dashboard state={state} currentUser={currentUser} lang={lang} />}
            {currentView === 'courses' && <CourseList courses={Object.values(state.courses)} currentUser={currentUser} onEnroll={id => performAction(p => ({ ...p, users: { ...p.users, [currentUser.username]: { ...p.users[currentUser.username], courses: [...p.users[currentUser.username].courses, id] } }, courses: { ...p.courses, [id]: { ...p.courses[id], studentUsernames: [...p.courses[id].studentUsernames, currentUser.username] } } }))} onAddCourse={c => performAction(p => ({...p, courses: {...p.courses, [c.id]: c}}))} lang={lang} />}
            {currentView === 'tasks' && <TaskList tasks={Object.values(state.tasks)} courses={state.courses} submissions={state.submissions} currentUser={currentUser} onSubmit={handleSubmission} onAddTask={t => performAction(p => ({...p, tasks: {...p.tasks, [t.id]: t}}))} onUpdateTask={(id, u) => performAction(p => ({...p, tasks: { ...p.tasks, [id]: { ...p.tasks[id], ...u } } }))} lang={lang} />}
            {currentView === 'submissions' && <SubmissionManager submissions={Object.values(state.submissions)} tasks={state.tasks} currentUser={currentUser} onGrade={(id, g, c) => performAction(p => ({ ...p, users: { ...p.users, [p.submissions[id].username]: { ...p.users[p.submissions[id].username], totalScore: p.users[p.submissions[id].username].totalScore + g } }, submissions: { ...p.submissions, [id]: { ...p.submissions[id], status: 'approved', grade: g, adminComment: c } } }))} lang={lang} />}
            {currentView === 'users' && <UserManagement users={Object.values(state.users)} onDelete={u => performAction(p => { const n = {...p.users}; delete n[u]; return {...p, users: n}; })} lang={lang} />}
            {currentView === 'settings' && <Settings user={currentUser} onPasswordChange={(u,h) => performAction(p => ({...p, users: {...p.users, [u]: {...p.users[u], passwordHash: h}}}))} lang={lang} state={state} onImport={s => performAction(() => s)} />}
            {currentView === 'leaderboard' && <Leaderboard state={state} lang={lang} />}
          </div>
        </main>
        <MentorChat isOpen={isMentorOpen} setIsOpen={setIsMentorOpen} lang={lang} />
      </div>
    </div>
  );
};

export default App;
