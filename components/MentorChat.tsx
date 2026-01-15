
import React, { useState, useRef, useEffect } from 'react';
import { getMentorResponse } from '../geminiService';
import { Language, translations } from '../translations';

// Fix: Add lang to MentorChatProps to match the usage in App.tsx
interface MentorChatProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  lang: Language;
}

const MentorChat: React.FC<MentorChatProps> = ({ isOpen, setIsOpen, lang }) => {
  const t = translations[lang];
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', text: string }[]>([
    { role: 'ai', text: t.mentorGreeting }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Update greeting when language changes
  useEffect(() => {
    setMessages(prev => {
        if (prev.length === 1 && prev[0].role === 'ai') {
            return [{ role: 'ai', text: t.mentorGreeting }];
        }
        return prev;
    });
  }, [lang, t.mentorGreeting]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    const context = "User is using an education platform. They might ask about programming, tasks, or course content.";
    const response = await getMentorResponse(userMsg, context);
    
    setMessages(prev => [...prev, { role: 'ai', text: response }]);
    setIsLoading(false);
  };

  return (
    <div className={`fixed bottom-6 right-6 z-[200] flex flex-col items-end`}>
      {isOpen && (
        <div className="w-[350px] sm:w-[400px] h-[500px] bg-[#1e293b] rounded-2xl border border-slate-700 shadow-2xl flex flex-col mb-4 overflow-hidden animate-in slide-in-from-bottom-10 duration-300">
          <div className="p-4 bg-gradient-to-r from-blue-600 to-indigo-600 flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <i className="fas fa-robot text-white text-sm"></i>
              </div>
              <span className="font-bold text-white tracking-tight">{t.mentorTitle}</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
              <i className="fas fa-times"></i>
            </button>
          </div>
          
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-900/20">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-4 py-2 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                  ? 'bg-blue-600 text-white rounded-br-none shadow-md shadow-blue-900/20' 
                  : 'bg-slate-800 text-slate-200 rounded-bl-none border border-slate-700'
                }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 px-4 py-2 rounded-2xl text-xs text-slate-400 border border-slate-700 animate-pulse flex items-center gap-2">
                  <span className="flex gap-1">
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1 h-1 bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                  {t.mentorThinking}
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSend} className="p-4 border-t border-slate-800 bg-slate-900/50 flex gap-2">
            <input 
              type="text" 
              placeholder={t.mentorPlaceholder} 
              className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:border-blue-500 outline-none transition-all placeholder:text-slate-600"
              value={input}
              onChange={e => setInput(e.target.value)}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl flex items-center justify-center transition-all disabled:opacity-50 disabled:bg-slate-700 shadow-lg shadow-blue-900/20">
              <i className="fas fa-paper-plane"></i>
            </button>
          </form>
        </div>
      )}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-14 h-14 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-blue-900/50 hover:scale-110 transition-transform active:scale-95 group relative"
      >
        <i className={`fas ${isOpen ? 'fa-comment-slash' : 'fa-robot'} text-white text-xl`}></i>
        {!isOpen && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 border-2 border-[#0f172a] rounded-full"></span>
        )}
      </button>
    </div>
  );
};

export default MentorChat;