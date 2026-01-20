
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

const API_URL = 'https://api.restful-api.dev/objects';
const SESSION_KEY = 'edusync_active_session';
const CLOUD_ID_KEY = 'edusync_cloud_channel_id';

const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL_STATE);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 768);
  const [isMentorOpen, setIsMentorOpen] = useState(false);
  const [lang, setLang] = useState<Language>('uz');
  
  // Shaxsiy kanal ID - bu orqali bir nechta qurilmani bog'lash mumkin
  const [cloudId, setCloudId] = useState(localStorage.getItem(CLOUD_ID_KEY) || 'edusync_default_channel');

  const mergeStates = (local: AppState, cloud: AppState): AppState => {
    return {
      users: { ...local.users, ...cloud.users },
      courses: { ...local.courses, ...cloud.courses },
      tasks: { ...local.tasks, ...cloud.tasks },
      submissions: { ...local.submissions, ...cloud.submissions },
      lastUpdated: Math.max(local.lastUpdated, cloud.lastUpdated)
    };
  };

  const fetchFromCloud = async (): Promise<AppState | null> => {
    try {
      const response = await fetch(`${API_URL}/${cloudId}?nocache=${Date.now()}`);
      if (response.ok) {
        const result = await response.json();
        return result.data as AppState;
      }
    } catch (e) {
      console.error("Cloud Fetch Error:", e);
    }
    return null;
  };

  const pushToCloud = async (newState: AppState) => {
    try {
      const payload = {
        name: `EduSync_DB_${cloudId}`,
        data: newState
      };
      const putRes = await fetch(`${API_URL}/${cloudId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (putRes.status === 404) {
        await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: cloudId, ...payload })
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
    if (cloudData) {
      setState(prev => {
        if (force || cloudData.lastUpdated > prev.lastUpdated) {
          return mergeStates(prev, cloudData);
        }
        return prev;
      });
      setIsOnline(true);
    } else if (force) {
      // Agar bulutda ma'lumot yo'q bo'lsa, joriy holatni yuklaymiz
      await pushToCloud(state);
    }
  }, [cloudId, isSyncing, state]);

  const performAction = async (updater: (prev: AppState) => AppState) => {
    setIsSyncing(true);
    const cloud = await fetchFromCloud();
    const currentState = cloud ? mergeStates(state, cloud) : state;
    const nextState = { ...updater(currentState), lastUpdated: Date.now() };
    setState(nextState);
    await pushToCloud(nextState);
    setIsSyncing(false);
  };

  const handleSubmission = async (submission: Submission) => {
    await performAction(p => ({
      ...p,
      submissions: { ...p.submissions, [submission.id]: submission }
    }));

    const task = state.tasks[submission.taskId];
    if (task && (task.type === 'text' || task.type === 'lesson') && submission.answerText) {
      const aiResult = await evaluateSubmission(task, submission.answerText, task.maxPoints, lang);
      await performAction(p => ({
        ...p,
        users: {
          ...p.users,
          [submission.username]: {
            ...p.users[submission.username],
            totalScore: (p.users[submission.username]?.totalScore || 0) + aiResult.score
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
    const init = async () => {
      setIsSyncing(true);
      const cloud = await fetchFromCloud();
      if (cloud) {
        setState(cloud);
      } else {
        await pushToCloud(INITIAL_STATE);
        setState(INITIAL_STATE);
      }
      
      const savedUser = localStorage.getItem(SESSION_KEY);
      if (savedUser && state.users[savedUser]) {
        setCurrentUser(state.users[savedUser]);
      }
      setIsSyncing(false);
    };
    init();
  }, [cloudId]);

  useEffect(() => {
    const timer = setInterval(() => syncWithBackend(), 10000);
    return () => clearInterval(timer);
  }, [syncWithBackend]);

  const updateCloudId = (newId: string) => {
    const cleanId = newId.trim().replace(/\s+/g, '_').toLowerCase();
    localStorage.setItem(CLOUD_ID_KEY, cleanId);
    setCloudId(cleanId);
    window.location.reload(); // To'liq yangilash kerak
  };

  if (!currentUser) return <Login onLogin={(u,p,r) => {
    const user = state.users[u.toLowerCase().trim()];
    if (user && user.role === r && user.passwordHash === p) {
      setCurrentUser(user);
      localStorage.setItem(SESSION_KEY, user.username);
      return true;
    }
    return false;
  }} onRegister={async (u,p) => {
    const name = u.toLowerCase().trim();
    if (state.users[name]) return false;
    const newUser: User = { username: name, passwordHash: p, role: 'user', courses: [], totalScore: 0, rating: 0, registrationDate: new Date().toISOString() };
    await performAction(p => ({ ...p, users: { ...p.users, [name]: newUser } }));
    setCurrentUser(newUser);
    localStorage.setItem(SESSION_KEY, name);
    return true;
  }} onReset={() => {localStorage.clear(); window.location.reload();}} lang={lang} setLang={setLang} />;

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
            {currentView === 'submissions' && <SubmissionManager submissions={Object.values(state.submissions)} tasks={state.tasks} currentUser={currentUser} onGrade={(id, g, c) => performAction(p => ({ ...p, users: { ...p.users, [p.submissions[id].username]: { ...p.users[p.submissions[id].username], totalScore: (p.users[p.submissions[id].username]?.totalScore || 0) + g } }, submissions: { ...p.submissions, [id]: { ...p.submissions[id], status: 'approved', grade: g, adminComment: c } } }))} lang={lang} />}
            {currentView === 'users' && <UserManagement users={Object.values(state.users)} onDelete={u => performAction(p => { const n = {...p.users}; delete n[u]; return {...p, users: n}; })} lang={lang} />}
            {currentView === 'settings' && <Settings user={currentUser} onPasswordChange={(u,h) => performAction(p => ({...p, users: {...p.users, [u]: {...p.users[u], passwordHash: h}}}))} lang={lang} state={state} onImport={s => performAction(() => s)} cloudId={cloudId} onUpdateCloudId={updateCloudId} />}
            {currentView === 'leaderboard' && <Leaderboard state={state} lang={lang} />}
          </div>
        </main>
        <MentorChat isOpen={isMentorOpen} setIsOpen={setIsMentorOpen} lang={lang} />
      </div>
    </div>
  );
};

export default App;
