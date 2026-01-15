
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
  isRateLimited?: boolean;
  onManualSync?: () => void;
}

const Header: React.FC<HeaderProps> = ({ user, toggleSidebar, lang, setLang, isSynced, isSyncing, isRateLimited, onManualSync }) => {
  const t = translations[lang] as any;

  return (
    <header className="h-16 bg-[#1e293b]/50 backdrop-blur-md border-b border-slate-800 px-6 flex items-center justify-between z-40">
      <div className="flex items-center gap-4">
        <button onClick={toggleSidebar} className="text-slate-400 hover:text-white transition-colors">
          <i className="fas fa-bars text-xl"></i>
        </button>
        
        <div className="hidden md:flex items-center gap-3">
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <i className="fas fa-home"></i>
            <span>/</span>
            <span className="capitalize">{user.role} {t.dashboard}</span>
          </div>
          
          <div 
            onClick={!isSyncing ? onManualSync : undefined}
            title={isRateLimited ? "Limit to'lgan! Yangi ID yaratish uchun bosing." : "Sinxronlash"}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter border transition-all shadow-sm cursor-pointer hover:scale-105 active:scale-95 group ${
            isSyncing 
              ? 'bg-blue-500/10 text-blue-500 border-blue-500/20 animate-pulse' 
              : isRateLimited
                ? 'bg-amber-500 text-black border-amber-600 animate-bounce'
                : isSynced 
                  ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20' 
                  : 'bg-red-500/10 text-red-500 border-red-500/20'
          }`}>
            <i className={`fas ${isSyncing ? 'fa-sync-alt fa-spin' : isRateLimited ? 'fa-bolt' : isSynced ? 'fa-cloud' : 'fa-cloud-slash'} text-[8px]`}></i>
            {isSyncing ? t.syncing : isRateLimited ? "Tiklash" : (isSynced ? "Onlayn" : t.disconnected)}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex bg-slate-900/50 rounded-full p-1 border border-slate-800">
          {(['uz', 'en', 'ru'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase transition-all ${
                lang === l ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-4 pl-4 border-l border-slate-800">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-slate-100">{user.username}</p>
            <p className="text-[10px] text-slate-500 uppercase tracking-tighter font-black">{user.role}</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center border-2 border-slate-700 shadow-lg">
            <span className="text-sm font-bold uppercase">{user.username.charAt(0)}</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
