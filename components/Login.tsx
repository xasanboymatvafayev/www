
import React, { useState } from 'react';
import { Role } from '../types';
import { Language, translations } from '../translations';

interface LoginProps {
  onLogin: (u: string, p: string, r: Role) => boolean;
  // Updated onRegister to accept Promise<boolean> or boolean to fix the type mismatch in App.tsx
  onRegister: (u: string, p: string) => Promise<boolean> | boolean;
  onReset: () => void;
  lang: Language;
  setLang: (l: Language) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin, onRegister, onReset, lang, setLang }) => {
  const t = translations[lang];
  const [isRegistering, setIsRegistering] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [adminSecret, setAdminSecret] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const hashPassword = (p: string) => {
    let hash = 0;
    for (let i = 0; i < p.length; i++) {
        hash = ((hash << 5) - hash) + p.charCodeAt(i);
        hash |= 0;
    }
    return hash.toString();
  };

  const handleAdminSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const pHash = hashPassword(adminSecret.trim());
    const success = onLogin('admin', pHash, 'admin');
    if (!success) {
      setError(t.incorrectSecret);
    }
  };

  // Made handleSubmit async to correctly await the onRegister promise
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const cleanUsername = username.trim().toLowerCase();
    const cleanPassword = password.trim();
    if (!cleanUsername || !cleanPassword) return;

    const pHash = hashPassword(cleanPassword);
    if (isRegistering) {
      // Awaiting the result of onRegister which returns a Promise<boolean> in App.tsx
      const success = await onRegister(cleanUsername, pHash);
      if (!success) {
        setError(t.loginTaken);
      }
    } else {
      const success = onLogin(cleanUsername, pHash, 'user');
      if (!success) setError(t.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4">
      <div className="mb-8 flex bg-slate-900/50 rounded-full p-1 border border-slate-800">
        {(['uz', 'en', 'ru'] as Language[]).map(l => (
          <button key={l} onClick={() => setLang(l)} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${lang === l ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
            {l}
          </button>
        ))}
      </div>

      <div className="w-full max-w-md bg-[#0f172a] rounded-[3rem] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-700 relative">
        <button onClick={() => { setIsAdminMode(!isAdminMode); setError(''); }} className="absolute top-8 right-8 text-slate-800 hover:text-amber-500/50 transition-colors z-20">
          <i className="fas fa-key text-xs"></i>
        </button>

        <div className="p-12 space-y-10">
          <div className="text-center space-y-3">
            <h1 className="text-5xl font-black text-white tracking-tighter italic">EduSync<span className="text-blue-500">AI</span></h1>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] bg-slate-900/50 py-2 rounded-full inline-block px-8 border border-slate-800/50">
              {isAdminMode ? t.adminSecret : t.welcome}
            </p>
          </div>

          {isAdminMode ? (
            <form onSubmit={handleAdminSubmit} className="space-y-6 animate-in slide-in-from-right-4 duration-300">
               <div className="space-y-2 text-center">
                  <div className="w-14 h-14 bg-amber-500/10 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-4 border border-amber-500/20">
                    <i className="fas fa-shield-alt text-xl"></i>
                  </div>
                  <input autoFocus required type="password" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-5 text-white text-center focus:border-amber-500 outline-none font-bold tracking-[0.5em] text-lg" value={adminSecret} onChange={e => setAdminSecret(e.target.value)} placeholder="••••••" />
               </div>
               {error && <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}
               <div className="flex gap-3">
                 <button type="button" onClick={() => setIsAdminMode(false)} className="flex-1 py-4 bg-slate-800 rounded-2xl font-black text-slate-400 text-xs uppercase tracking-widest">{t.cancel}</button>
                 <button type="submit" className="flex-[2] py-4 bg-amber-600 rounded-2xl font-black text-white shadow-xl shadow-amber-900/20 text-xs uppercase tracking-widest">{t.login}</button>
               </div>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6 animate-in slide-in-from-left-4 duration-300">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">{t.username}</label>
                <input required type="text" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none font-medium" value={username} onChange={e => setUsername(e.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">{t.password}</label>
                <div className="relative">
                  <input required type={showPassword ? "text" : "password"} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-500 outline-none font-medium" value={password} onChange={e => setPassword(e.target.value)} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-6 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"><i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i></button>
                </div>
              </div>
              {error && <p className="text-red-500 text-[10px] text-center font-black uppercase tracking-widest">{error}</p>}
              <button type="submit" className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl font-black text-white shadow-2xl uppercase tracking-widest text-xs">
                 {isRegistering ? t.createAccount : t.login}
              </button>
            </form>
          )}

          {!isAdminMode && (
            <div className="text-center pt-2">
               <button onClick={() => setIsRegistering(!isRegistering)} className="text-slate-600 hover:text-blue-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all">
                  {isRegistering ? t.login : t.register}
               </button>
            </div>
          )}
        </div>
        <div className="bg-slate-900/50 p-6 border-t border-slate-800/30 flex justify-center">
           <button type="button" onClick={onReset} className="text-[9px] text-slate-800 hover:text-red-600 font-bold uppercase tracking-[0.3em] transition-all">{t.resetSystem}</button>
        </div>
      </div>
    </div>
  );
};

export default Login;
