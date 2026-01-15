
import React, { useState, useRef } from 'react';
import { User, AppState } from '../types';
import { Language, translations } from '../translations';

interface SettingsProps {
  user: User;
  onPasswordChange: (username: string, newHash: string) => void;
  lang: Language;
  state: AppState;
  onImport: (newState: AppState) => void;
  syncId: string;
  onSyncIdChange: (id: string) => void;
  isSynced: boolean;
  isSyncing?: boolean;
  lastSyncTime?: string | null;
}

const Settings: React.FC<SettingsProps> = ({ 
  user, onPasswordChange, lang, state, onImport, isSyncing, lastSyncTime, syncId, onSyncIdChange 
}) => {
  const t = translations[lang];
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [tempSyncId, setTempSyncId] = useState(syncId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hashPassword = (p: string) => {
    let hash = 0;
    for (let i = 0; i < p.length; i++) {
        hash = ((hash << 5) - hash) + p.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
  };

  const handleUpdate = (e: React.FormEvent) => {
    e.preventDefault();
    if (hashPassword(oldPassword) !== user.passwordHash) {
      setError(lang === 'uz' ? "Eski parol noto'g'ri!" : "Current password incorrect!");
      return;
    }
    onPasswordChange(user.username, hashPassword(newPassword));
    setMessage(t.success);
    setOldPassword('');
    setNewPassword('');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold">{t.settings}</h2>
      </div>

      <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-800 shadow-2xl space-y-10">
        
        {/* REAL-TIME SYNC SECTION */}
        <section className="space-y-6">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">
            <i className="fas fa-cloud mr-2 text-blue-500"></i> Bulutli Sinxronizatsiya
          </h4>
          
          <div className="space-y-4 bg-slate-900/50 p-6 rounded-2xl border border-slate-800">
            <p className="text-xs text-slate-400">
              Ushbu kodni boshqa qurilmaga (telefonga) kiritsangiz, hamma ma'lumotlar birlashadi.
            </p>
            
            <div className="flex gap-2">
              <input 
                type="text"
                placeholder="Sync ID kiriting..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white font-mono text-sm"
                value={tempSyncId}
                onChange={e => setTempSyncId(e.target.value)}
              />
              <button 
                onClick={() => onSyncIdChange(tempSyncId)}
                className="bg-blue-600 px-4 py-2 rounded-xl text-white text-xs font-bold"
              >
                Ulanish
              </button>
            </div>
            
            {syncId && (
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <span className="text-[10px] text-slate-500 font-bold uppercase">ID: {syncId}</span>
                <button 
                  onClick={() => { navigator.clipboard.writeText(syncId); alert("Kod ko'chirildi!"); }}
                  className="text-blue-400 text-[10px] font-bold"
                >
                  Nusxa olish
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Password Section */}
        <section className="space-y-6 border-t border-slate-800 pt-10">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">
            <i className="fas fa-lock mr-2 text-amber-500"></i> {t.changePassword}
          </h4>
          <form onSubmit={handleUpdate} className="space-y-4">
            <input required type="password" placeholder={t.currentPassword} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            <input required type="password" placeholder={t.newPassword} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            {error && <p className="text-red-500 text-[10px] text-center">{error}</p>}
            {message && <p className="text-emerald-500 text-[10px] text-center">{message}</p>}
            <button type="submit" className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-white">{t.save}</button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Settings;
