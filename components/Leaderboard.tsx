
import React, { useState } from 'react';
import { AppState, User, Course } from '../types';
import { Language, translations } from '../translations';

interface LeaderboardProps {
  state: AppState;
  lang: Language;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ state, lang }) => {
  const t = translations[lang];
  const [filterCourse, setFilterCourse] = useState<string>('all');

  // Fix: Explicitly cast Object.values(state.users) to User[] for TypeScript compatibility
  const students = (Object.values(state.users) as User[])
    .filter(u => u.role === 'user')
    .filter(u => filterCourse === 'all' || u.courses.includes(filterCourse))
    .sort((a, b) => b.totalScore - a.totalScore);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t.leaderboard}</h2>
          <p className="text-slate-400">Top achieving students on the platform.</p>
        </div>
        <div className="flex items-center gap-2">
          <i className="fas fa-filter text-slate-500"></i>
          <select 
            className="bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-white text-sm outline-none focus:border-blue-500 transition-all"
            value={filterCourse}
            onChange={(e) => setFilterCourse(e.target.value)}
          >
            <option value="all">{t.allCourses}</option>
            {/* Fix: Explicitly cast Object.values(state.courses) to Course[] for TypeScript compatibility */}
            {(Object.values(state.courses) as Course[]).map(c => (
              <option key={c.id} value={c.id}>{c.title}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-2xl">
        <table className="w-full text-left">
          <thead className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <tr>
              <th className="px-8 py-4 w-20">{t.rank}</th>
              <th className="px-6 py-4">{t.student}</th>
              <th className="px-6 py-4">{t.courses}</th>
              <th className="px-8 py-4 text-right">{t.score}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {students.length === 0 && (
              <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No students found.</td></tr>
            )}
            {students.map((u, index) => {
              const rank = index + 1;
              const isTop3 = rank <= 3;
              return (
                <tr key={u.username} className={`hover:bg-slate-800/30 transition-all ${isTop3 ? 'bg-blue-500/5' : ''}`}>
                  <td className="px-8 py-5">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      rank === 1 ? 'bg-amber-500 text-black' :
                      rank === 2 ? 'bg-slate-300 text-black' :
                      rank === 3 ? 'bg-amber-700 text-white' :
                      'text-slate-500'
                    }`}>
                      {rank}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-blue-500">
                        {u.username.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-white">{u.username}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex flex-wrap gap-1">
                      {u.courses.slice(0, 2).map(cid => (
                        <span key={cid} className="px-2 py-0.5 bg-slate-900 border border-slate-700 rounded text-[10px] uppercase text-slate-400">
                          {state.courses[cid]?.title.split(' ')[0] || 'Course'}
                        </span>
                      ))}
                      {u.courses.length > 2 && <span className="text-[10px] text-slate-500">+{u.courses.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right font-mono text-xl font-black text-emerald-400">
                    {u.totalScore}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Leaderboard;
