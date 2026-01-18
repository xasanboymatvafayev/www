
import React from 'react';
import { User } from '../types';
import { Language, translations } from '../translations';

interface HeaderProps {
  user: User;
  toggleSidebar: () => void;
  lang: Language;
  setLang: (l: Language) => void;
  isSynced?: boolean;
  isSyncing?: boolean;
  onManualSync?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, toggleSidebar, lang, setLang, isSynced, isSyncing, onManualSync }) => {
  const t = translations[lang] as any;

  return (
    <header className="h-16 bg-[#1e293b]/90 backdrop-blur-xl border-b border-slate-800 px-6 flex items-center justify-between z-40 sticky top-0 shadow-2xl">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-slate-800">
          <i className="fas fa-bars text-xl"></i>
        </button>
        
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300 ${
            isSyncing 
              ? 'bg-blue-500/20 border-blue-500/40 text-blue-400' 
              : isSynced 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' 
                : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isSyncing ? 'bg-blue-500 animate-spin' : isSynced ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-red-500'} `}></span>
            <span className="text-[10px] font-black uppercase tracking-widest hidden xs:block">
              {isSyncing ? 'Syncing...' : isSynced ? 'Live Cloud' : 'Offline'}
            </span>
          </div>
          
          <button 
            onClick={onManualSync}
            className="p-2 text-slate-500 hover:text-white transition-all active:rotate-180 duration-500"
          >
            <i className="fas fa-sync-alt text-xs"></i>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex bg-slate-900/80 rounded-xl p-1 border border-slate-800">
          {(['uz', 'en', 'ru'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase transition-all ${
                lang === l ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-bold text-white leading-tight">{user.username}</p>
            <p className="text-[9px] text-slate-500 uppercase font-black tracking-tighter">{user.role}</p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center border border-white/10 shadow-lg group">
            <span className="text-sm font-black uppercase group-hover:scale-110 transition-transform">{user.username.charAt(0)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
