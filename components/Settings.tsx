
import React, { useState, useRef } from 'react';
import { User, AppState } from '../types';
import { Language, translations } from '../translations';

interface SettingsProps {
  user: User;
  onPasswordChange: (username: string, newHash: string) => void;
  lang: Language;
  state: AppState;
  onImport: (newState: AppState) => void;
  cloudId: string;
  onUpdateCloudId: (id: string) => void;
}

const Settings: React.FC<SettingsProps> = ({ 
  user, onPasswordChange, lang, state, onImport, cloudId, onUpdateCloudId
}) => {
  const t = translations[lang] as any;
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [newCloudId, setNewCloudId] = useState(cloudId);
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

  const handleExport = () => {
    const dataStr = JSON.stringify(state, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edusync_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!confirm(t.importWarning)) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const newState = JSON.parse(event.target?.result as string);
        onImport(newState);
        alert(t.success);
      } catch (err) {
        alert(t.error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4 duration-500 pb-20">
      <div className="text-center">
        <h2 className="text-3xl font-bold">{t.settings}</h2>
        <p className="text-slate-500 text-sm mt-2">Barcha qurilmalarni bitta kanal orqali sinxronlang.</p>
      </div>

      <div className="bg-[#1e293b] p-8 rounded-[2rem] border border-slate-800 shadow-2xl space-y-10">
        
        {/* Cloud Channel ID Section */}
        <section className="space-y-4">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">
            <i className="fas fa-cloud mr-2 text-blue-500"></i> Cloud Channel ID
          </h4>
          <p className="text-xs text-slate-400">Bu ID-ni noutbuk va telefoningizda bir xil qilsangiz, ma'lumotlar sinxron bo'ladi.</p>
          <div className="flex gap-2">
            <input 
              type="text" 
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none" 
              value={newCloudId} 
              onChange={e => setNewCloudId(e.target.value)} 
            />
            <button 
              onClick={() => onUpdateCloudId(newCloudId)}
              className="px-6 py-4 bg-blue-600 hover:bg-blue-700 rounded-2xl font-black text-white text-xs uppercase"
            >
              Ulash
            </button>
          </div>
        </section>

        {/* Profile Info */}
        <section className="space-y-4 border-t border-slate-800 pt-10">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">
            <i className="fas fa-user-circle mr-2 text-blue-500"></i> {t.username}
          </h4>
          <div className="bg-slate-900/50 p-6 rounded-2xl border border-slate-800 flex items-center justify-between">
             <span className="text-white font-bold">{user.username}</span>
             <span className="text-[10px] font-black uppercase text-slate-500 bg-slate-800 px-3 py-1 rounded-full">{user.role}</span>
          </div>
        </section>

        {/* Password Section */}
        <section className="space-y-6 border-t border-slate-800 pt-10">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">
            <i className="fas fa-lock mr-2 text-amber-500"></i> {t.changePassword}
          </h4>
          <form onSubmit={handleUpdate} className="space-y-4">
            <input required type="password" placeholder={t.currentPassword} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
            <input required type="password" placeholder={t.newPassword} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none transition-all" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
            {error && <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}
            {message && <p className="text-emerald-500 text-[10px] text-center font-black uppercase tracking-widest">{message}</p>}
            <button type="submit" className="w-full py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-white uppercase tracking-widest text-xs transition-all">{t.save}</button>
          </form>
        </section>

        {/* Data Portability */}
        <section className="space-y-6 border-t border-slate-800 pt-10">
          <h4 className="text-sm font-black text-slate-500 uppercase tracking-widest">
            <i className="fas fa-file-export mr-2 text-emerald-500"></i> {t.dataPortability}
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <button onClick={handleExport} className="py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-slate-300 uppercase tracking-widest text-xs transition-all">
              <i className="fas fa-download mr-2"></i> {t.exportData}
            </button>
            <button onClick={() => fileInputRef.current?.click()} className="py-4 bg-slate-800 hover:bg-slate-700 rounded-2xl font-black text-slate-300 uppercase tracking-widest text-xs transition-all">
              <i className="fas fa-upload mr-2"></i> {t.importData}
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImport} className="hidden" accept=".json" />
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
