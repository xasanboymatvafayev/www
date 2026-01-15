
import React from 'react';
import { AppState, User } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Language, translations } from '../translations';

interface DashboardProps {
  state: AppState;
  currentUser: User;
  lang: Language;
}

const Dashboard: React.FC<DashboardProps> = ({ state, currentUser, lang }) => {
  const isAdmin = currentUser.role === 'admin';
  const t = translations[lang] || translations['uz'];
  
  const stats = [
    { label: t.activeCourses, value: isAdmin ? Object.keys(state.courses || {}).length : currentUser.courses.length, icon: 'fa-book', color: 'text-blue-500' },
    { label: t.totalTasks, value: Object.keys(state.tasks || {}).length, icon: 'fa-tasks', color: 'text-purple-500' },
    { label: t.submissions, value: Object.keys(state.submissions || {}).length, icon: 'fa-upload', color: 'text-emerald-500' },
    { label: t.totalScore, value: isAdmin ? '--' : currentUser.totalScore, icon: 'fa-star', color: 'text-amber-500' },
  ];

  const chartData = [
    { name: '1', score: 40 },
    { name: '2', score: 70 },
    { name: '3', score: 10 },
    { name: '4', score: 90 },
    { name: '5', score: 65 },
  ];

  const COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b'];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
          {t.welcome}, {currentUser.username}!
        </h1>
        <p className="text-slate-400 mt-2">{t.newsDesc}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <div key={i} className="bg-[#1e293b] p-6 rounded-2xl border border-slate-800 shadow-lg group hover:border-blue-500/50 transition-all">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-3xl font-bold mt-1">{stat.value}</h3>
              </div>
              <div className={`p-3 rounded-xl bg-slate-900/50 ${stat.color} group-hover:scale-110 transition-transform`}>
                <i className={`fas ${stat.icon} text-xl`}></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-[#1e293b] p-6 rounded-2xl border border-slate-800">
          <h3 className="text-sm font-black text-slate-500 uppercase tracking-widest mb-6">{t.activityChart}</h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px' }}
                />
                <Bar dataKey="score" radius={[6, 6, 0, 0]}>
                   {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600/10 to-indigo-600/10 p-8 rounded-3xl border border-blue-500/20 flex flex-col justify-center items-center space-y-4 text-center">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-900/20">
               <i className="fas fa-bullhorn text-2xl text-white"></i>
            </div>
            <h3 className="text-xl font-bold text-white">{t.platformNews}</h3>
            <p className="text-slate-400 text-sm leading-relaxed">{t.newsDesc}</p>
            <div className="pt-4 flex gap-2">
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
               <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
            </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
