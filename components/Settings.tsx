
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
  user, onPasswordChange, lang, state, onImport, isSyncing, lastSyncTime 
}) => {
  const t = translations[lang];
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
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
    setError('');
    setMessage('');

    if (hashPassword(oldPassword) !== user.passwordHash) {
      setError(lang === 'uz' ? "Eski parol noto'g'ri!" : "Current password incorrect!");
      return;
    }

    if (newPassword.length < 4) {
      setError(lang === 'uz' ? "Yangi parol kamida 4 ta belgidan iborat bo'lishi kerak!" : "New password must be at least 4 characters!");
      return;
    }

    onPasswordChange(user.username, hashPassword(newPassword));
    setMessage(t.success);
    setOldPassword('');
    setNewPassword('');
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edusync_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (confirm(t.importWarning)) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.users && json.courses && json.tasks) {
          onImport(json);
          alert(t.success);
        } else {
          alert("Noma'lum fayl formati!");
        }
      } catch (err) {
        alert("Faylni o'qishda xatolik!");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold">{t.settings}</h2>
        <p className="text-slate-400 mt-2">Manage your account and real-time cloud sync status.</p>
      </div>

      <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-800 shadow-2xl space-y-10">
        
        {/* Automatic Cloud Sync Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
             <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
                <i className="fas fa-cloud-upload-alt mr-2"></i> {t.cloudSync}
             </h4>
             <div className="flex items-center gap-3">
               <div className={`px-3 py-1 rounded-full text-[10px] font-black border transition-all bg-emerald-500/10 text-emerald-500 border-emerald-500/20`}>
                  {isSyncing ? t.syncing : t.connected}
               </div>
             </div>
          </div>

          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500/10 rounded-full flex items-center justify-center text-emerald-500">
                <i className={`fas fa-sync-alt text-xl ${isSyncing ? 'animate-spin' : ''}`}></i>
              </div>
              <div>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">{t.cloudDesc}</p>
                {lastSyncTime && (
                  <p className="text-[10px] text-slate-500 font-black uppercase mt-1">
                    {t.lastSync}: {lastSyncTime}
                  </p>
                )}
              </div>
            </div>
            <div className="p-3 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
               <p className="text-[10px] text-emerald-400 font-black uppercase text-center tracking-widest">
                  <i className="fas fa-check-circle mr-1"></i> Global Instance Active
               </p>
            </div>
          </div>
        </section>

        {/* Password Change Section */}
        <section className="space-y-6 border-t border-slate-800 pt-10">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
            <i className="fas fa-lock mr-2"></i> {t.changePassword}
          </h4>
          
          <form onSubmit={handleUpdate} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold ml-1">{t.currentPassword}</label>
              <input 
                required
                type="password" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all"
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <label className="text-xs text-slate-400 font-bold ml-1">{t.newPassword}</label>
              <input 
                required
                type="password" 
                className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>

            {error && <p className="text-red-500 text-[10px] font-black uppercase text-center">{error}</p>}
            {message && <p className="text-emerald-500 text-[10px] font-black uppercase text-center">{message}</p>}

            <button type="submit" className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-white transition-all">
              {t.save}
            </button>
          </form>
        </section>

        {/* Export/Import Section */}
        <section className="space-y-6 border-t border-slate-800 pt-10">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-[0.2em]">
            <i className="fas fa-file-archive mr-2"></i> {t.dataPortability}
          </h4>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={handleExport}
              className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all"
            >
              <i className="fas fa-download mr-2"></i> {t.exportData}
            </button>
            <button 
              onClick={handleImportClick}
              className="py-3 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold transition-all"
            >
              <i className="fas fa-upload mr-2"></i> {t.importData}
            </button>
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
          </div>
        </section>

      </div>
    </div>
  );
};

export default Settings;
