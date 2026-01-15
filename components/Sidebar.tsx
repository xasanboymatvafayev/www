
import React from 'react';
import { Role } from '../types';
import { Language, translations } from '../translations';

interface SidebarProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  role: Role;
  currentView: string;
  setView: (view: string) => void;
  onLogout: () => void;
  lang: Language;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, role, currentView, setView, onLogout, lang }) => {
  const t = translations[lang];
  
  const menuItems = [
    { id: 'dashboard', label: t.dashboard, icon: 'fa-chart-pie' },
    { id: 'leaderboard', label: t.leaderboard, icon: 'fa-trophy' },
    { id: 'courses', label: t.courses, icon: 'fa-book-open' },
    { id: 'tasks', label: t.assignments, icon: 'fa-tasks' },
    { id: 'submissions', label: role === 'admin' ? t.grading : t.myResults, icon: 'fa-check-circle' },
  ];

  if (role === 'admin') {
    menuItems.push({ id: 'users', label: t.users, icon: 'fa-user-friends' });
  }

  menuItems.push({ id: 'settings', label: t.settings, icon: 'fa-cog' });

  return (
    <aside className={`${isOpen ? 'w-64' : 'w-20'} transition-all duration-300 bg-[#1e293b] border-r border-slate-800 flex flex-col z-50`}>
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
          <i className="fas fa-graduation-cap text-white text-sm"></i>
        </div>
        {isOpen && <span className="font-bold text-xl tracking-tight whitespace-nowrap">EduSync AI</span>}
      </div>

      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {menuItems.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all ${
              currentView === item.id 
                ? 'bg-blue-600/20 text-blue-400 border border-blue-600/30' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'
            }`}
          >
            <i className={`fas ${item.icon} w-5 text-center`}></i>
            {isOpen && <span className="font-medium whitespace-nowrap">{item.label}</span>}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-3 py-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
        >
          <i className="fas fa-sign-out-alt w-5 text-center"></i>
          {isOpen && <span className="font-medium">{t.logout}</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
