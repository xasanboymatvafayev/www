
import React, { useState } from 'react';
import { Submission, Task, User } from '../types';
import { Language, translations } from '../translations';

// Fix: Add lang to SubmissionManagerProps to match the usage in App.tsx
interface SubmissionManagerProps {
  submissions: Submission[];
  tasks: Record<string, Task>;
  currentUser: User;
  onGrade: (id: string, grade: number, comment: string) => void;
  lang: Language;
}

const SubmissionManager: React.FC<SubmissionManagerProps> = ({ submissions, tasks, currentUser, onGrade, lang }) => {
  const isAdmin = currentUser.role === 'admin';
  const t = translations[lang];
  const filteredSubmissions = isAdmin 
    ? submissions 
    : submissions.filter(s => s.username === currentUser.username);

  const [gradingId, setGradingId] = useState<string | null>(null);
  const [gradeInput, setGradeInput] = useState(0);
  const [commentInput, setCommentInput] = useState('');

  const handleGrade = (e: React.FormEvent) => {
    e.preventDefault();
    if (gradingId) {
      onGrade(gradingId, gradeInput, commentInput);
      setGradingId(null);
      setCommentInput('');
      setGradeInput(0);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">{isAdmin ? t.grading : t.myResults}</h2>
        <p className="text-slate-400">{isAdmin ? 'Review and grade student submissions.' : 'Check the status of your assignments.'}</p>
      </div>

      <div className="bg-[#1e293b] rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-800/50 text-slate-400 text-xs font-bold uppercase tracking-wider">
                <th className="px-6 py-4">Task</th>
                {isAdmin && <th className="px-6 py-4">Student</th>}
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Grade</th>
                <th className="px-6 py-4">Submitted</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredSubmissions.length === 0 && (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No submissions yet.</td></tr>
              )}
              {filteredSubmissions.map(sub => {
                const task = tasks[sub.taskId];
                return (
                  <tr key={sub.id} className="text-sm hover:bg-slate-800/30 transition-all">
                    <td className="px-6 py-4">
                      <p className="font-bold">{task?.title || 'Unknown'}</p>
                      <p className="text-xs text-slate-500 uppercase">{sub.type}</p>
                    </td>
                    {isAdmin && <td className="px-6 py-4 text-slate-300 font-medium">{sub.username}</td>}
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase border ${
                        sub.status === 'pending' 
                        ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' 
                        : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                      }`}>
                        {sub.status === 'pending' ? t.pending : t.completed}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-mono">
                      {sub.grade !== undefined ? (
                        <span className="text-emerald-400 font-bold">{sub.grade} / {task?.maxPoints}</span>
                      ) : '--'}
                    </td>
                    <td className="px-6 py-4 text-slate-400">{new Date(sub.submissionTime).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      {isAdmin && sub.status === 'pending' ? (
                        <button 
                          onClick={() => {
                            setGradingId(sub.id);
                            setGradeInput(task?.maxPoints || 0);
                          }}
                          className="px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-lg text-xs font-bold transition-all"
                        >
                          {t.gradeNow}
                        </button>
                      ) : (
                        <button 
                          onClick={() => alert(`Submission Details:\n\nAnswer: ${sub.answerText}\n\nAdmin Comment: ${sub.adminComment || 'No comment yet.'}`)}
                          className="text-slate-400 hover:text-white"
                        >
                          <i className="fas fa-eye"></i> {t.view}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {gradingId && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-700 p-8 shadow-2xl">
             <h3 className="text-xl font-bold mb-6">Grade Submission</h3>
             <div className="mb-4 p-4 bg-slate-900 rounded-xl border border-slate-700 italic text-slate-400 text-sm">
                "{submissions.find(s => s.id === gradingId)?.answerText}"
             </div>
             <form onSubmit={handleGrade} className="space-y-4">
                <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Score (out of {tasks[submissions.find(s => s.id === gradingId)!.taskId]?.maxPoints})</label>
                   <input required type="number" className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:border-blue-500 outline-none"
                    value={gradeInput} onChange={e => setGradeInput(parseInt(e.target.value))} />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-400 mb-1">Admin Feedback</label>
                   <textarea rows={3} className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 focus:border-blue-500 outline-none resize-none"
                    value={commentInput} onChange={e => setCommentInput(e.target.value)} />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setGradingId(null)} className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 rounded-xl font-bold text-slate-300">{t.cancel}</button>
                  <button type="submit" className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold text-white transition-all">{t.save}</button>
                </div>
             </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubmissionManager;