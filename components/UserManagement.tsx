
import React from 'react';
import { User } from '../types';
import { Language, translations } from '../translations';

interface UserManagementProps {
  users: User[];
  onDelete: (username: string) => void;
  lang: Language;
}

const UserManagement: React.FC<UserManagementProps> = ({ users, onDelete, lang }) => {
  const t = translations[lang];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold">{t.users}</h2>
        <p className="text-slate-400">Manage all registered accounts.</p>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Username</th>
                <th className="px-6 py-4">Role</th>
                <th className="px-6 py-4">Courses</th>
                <th className="px-6 py-4">Total Score</th>
                <th className="px-6 py-4">Registration</th>
                <th className="px-6 py-4 text-center">{t.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(u => (
                <tr key={u.username} className="hover:bg-slate-800/30 transition-all text-sm">
                  <td className="px-6 py-4 font-bold text-white">{u.username}</td>
                  <td className="px-6 py-4 uppercase text-[10px] font-black">
                    <span className={`px-2 py-1 rounded ${u.role === 'admin' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'}`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">{u.courses.length}</td>
                  <td className="px-6 py-4 font-mono font-bold text-emerald-400">{u.totalScore}</td>
                  <td className="px-6 py-4 text-slate-500">{new Date(u.registrationDate).toLocaleDateString()}</td>
                  <td className="px-6 py-4 text-center">
                    {u.role !== 'admin' && (
                      <button 
                        onClick={() => { if(confirm(`${u.username}ni o'chirmoqchimisiz?`)) onDelete(u.username); }}
                        className="p-2 text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                        title={t.delete}
                      >
                        <i className="fas fa-trash-alt"></i>
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
