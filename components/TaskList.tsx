
import React, { useState, useEffect } from 'react';
import { Task, Course, User, Submission, TaskType } from '../types';
import { Language, translations } from '../translations';

interface TaskListProps {
  tasks: Task[];
  courses: Record<string, Course>;
  submissions: Record<string, Submission>;
  currentUser: User;
  onSubmit: (sub: Submission) => void;
  onAddTask: (task: Task) => void;
  onUpdateTask: (id: string, updates: Partial<Task>) => void;
  lang: Language;
}

const TaskList: React.FC<TaskListProps> = ({ tasks, courses, submissions, currentUser, onSubmit, onAddTask, onUpdateTask, lang }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [globalTimeLeft, setGlobalTimeLeft] = useState<Record<string, number>>({});
  const [lessonAnswer, setLessonAnswer] = useState('');
  
  const isAdmin = currentUser.role === 'admin';
  const t = translations[lang];

  const [newTaskData, setNewTaskData] = useState({
    title: '',
    description: '',
    type: 'text' as TaskType,
    courseId: Object.keys(courses)[0] || '',
    maxPoints: 100,
    deadline: '',
    textContent: '',
    timeLimit: 5
  });

  // Effect to calculate remaining time for all active global tasks
  useEffect(() => {
    const timer = setInterval(() => {
      const newTimes: Record<string, number> = {};
      
      tasks.forEach(task => {
        if (task.lessonStatus === 'active' && task.lessonStartTime) {
          const startTime = new Date(task.lessonStartTime).getTime();
          const duration = (task.timeLimit || 5) * 60 * 1000;
          const now = new Date().getTime();
          const elapsed = now - startTime;
          const remaining = Math.max(0, duration - elapsed);
          
          newTimes[task.id] = Math.floor(remaining / 1000);

          // Auto-finalize if time is exactly 0 and it was active
          if (remaining <= 0 && task.lessonStatus === 'active') {
            onUpdateTask(task.id, { lessonStatus: 'completed' });
          }
        }
      });
      
      setGlobalTimeLeft(newTimes);
    }, 1000);

    return () => clearInterval(timer);
  }, [tasks, onUpdateTask]);

  const startGlobalLesson = (taskId: string) => {
    if (!isAdmin) return;
    onUpdateTask(taskId, { 
      lessonStatus: 'active', 
      lessonStartTime: new Date().toISOString() 
    });
  };

  const finalizeStudentSubmission = (taskId: string) => {
    const submission: Submission = {
      id: 'sub_' + Date.now(),
      username: currentUser.username,
      taskId: taskId,
      type: 'lesson',
      answerText: lessonAnswer,
      status: 'pending',
      submissionTime: new Date().toISOString()
    };
    onSubmit(submission);
    setActiveLessonId(null);
    setLessonAnswer('');
    alert(t.success);
  };

  const filteredTasks = tasks.filter(task => isAdmin || currentUser.courses.includes(task.courseId));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t.assignments}</h2>
          <p className="text-slate-400">Track tasks and synchronized timed challenges.</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-900/20"
          >
            <i className="fas fa-plus"></i> New Assignment
          </button>
        )}
      </div>

      <div className="space-y-4">
        {filteredTasks.map(task => {
          const course = courses[task.courseId];
          // Fix: Explicitly cast Object.values(submissions) to Submission[] for TypeScript compatibility
          const hasSubmitted = (Object.values(submissions) as Submission[]).some(s => s.username === currentUser.username && s.taskId === task.id);
          const isTimed = task.type === 'lesson';
          const secondsLeft = globalTimeLeft[task.id] || 0;
          const isExamActive = task.lessonStatus === 'active';
          const isExamEnded = task.lessonStatus === 'completed';

          return (
            <div key={task.id} className={`bg-[#1e293b] p-6 rounded-2xl border transition-all ${isExamActive ? 'border-amber-500 shadow-lg shadow-amber-900/10' : 'border-slate-800'}`}>
              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isTimed ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                    }`}>
                      <i className={`fas ${isTimed ? 'fa-hourglass-half' : 'fa-file-alt'}`}></i>
                    </div>
                    <div>
                      <h3 className="font-bold text-white text-lg">{task.title}</h3>
                      <p className="text-xs text-slate-500 font-semibold uppercase">{course?.title || 'Unknown'}</p>
                    </div>
                  </div>
                  <p className="text-slate-400 text-sm">{task.description}</p>
                  
                  {isTimed && isExamActive && (
                     <div className="mt-2 flex items-center gap-3">
                        <div className="px-3 py-1 bg-amber-500/10 text-amber-500 rounded-lg text-xs font-black animate-pulse border border-amber-500/20 uppercase tracking-widest">
                           {t.liveExamActive}
                        </div>
                        <div className="text-xl font-mono font-bold text-white">
                           {Math.floor(secondsLeft / 60)}:{(secondsLeft % 60).toString().padStart(2, '0')}
                        </div>
                     </div>
                  )}
                </div>

                <div className="w-full md:w-auto flex flex-col gap-2">
                  {isAdmin ? (
                    <div className="flex flex-col gap-2">
                      {isTimed && !isExamActive && !isExamEnded && (
                        <button 
                          onClick={() => startGlobalLesson(task.id)}
                          className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold text-xs"
                        >
                          {t.startForEveryone}
                        </button>
                      )}
                      <span className="text-[10px] text-slate-500 uppercase font-black text-center">{task.lessonStatus || 'static'}</span>
                    </div>
                  ) : (
                    <>
                      {hasSubmitted ? (
                        <span className="px-6 py-2 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-xl text-center font-bold">
                          <i className="fas fa-check-circle mr-2"></i> {t.completed}
                        </span>
                      ) : (
                        <>
                          {isTimed ? (
                            <>
                              {isExamActive ? (
                                <button 
                                  onClick={() => setActiveLessonId(task.id)}
                                  className="px-6 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all shadow-lg"
                                >
                                  {t.joinExam}
                                </button>
                              ) : isExamEnded ? (
                                <span className="px-6 py-2 bg-slate-800 text-slate-500 rounded-xl font-bold border border-slate-700">
                                  {t.examEnded}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-500 italic">Kutilmoqda...</span>
                              )}
                            </>
                          ) : (
                            <button 
                              onClick={() => {
                                const answer = prompt('Answer:');
                                if(answer) {
                                  const sub: Submission = { id: 'sub_'+Date.now(), username: currentUser.username, taskId: task.id, type: 'text', answerText: answer, status: 'pending', submissionTime: new Date().toISOString() };
                                  onSubmit(sub);
                                }
                              }}
                              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold"
                            >
                              Submit
                            </button>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Global Lesson Modal for Students */}
      {activeLessonId && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[100] flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-4xl rounded-3xl border border-slate-700 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="bg-amber-600 px-8 py-5 flex justify-between items-center">
               <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-pulse">
                     <i className="fas fa-bolt text-white"></i>
                  </div>
                  <h3 className="text-xl font-black text-white uppercase tracking-tighter">Live Exam Session</h3>
               </div>
               <div className="text-3xl font-mono font-black bg-black/40 px-6 py-2 rounded-2xl text-white border border-white/10">
                  {Math.floor((globalTimeLeft[activeLessonId] || 0) / 60)}:{((globalTimeLeft[activeLessonId] || 0) % 60).toString().padStart(2, '0')}
               </div>
            </div>
            
            <div className="p-10 space-y-8 flex-1 overflow-y-auto">
               <div className="space-y-4">
                  <h4 className="text-3xl font-black text-white leading-tight">{tasks.find(t => t.id === activeLessonId)?.title}</h4>
                  <p className="text-slate-400 text-lg">{tasks.find(t => t.id === activeLessonId)?.description}</p>
               </div>

               <div className="p-6 bg-slate-900/50 rounded-2xl border border-slate-700/50">
                  <p className="text-slate-200 font-medium leading-relaxed italic">
                     {tasks.find(t => t.id === activeLessonId)?.textContent || 'Tizim tomonidan berilgan topshiriqni tahlil qiling va quyida javobingizni yozib qoldiring.'}
                  </p>
               </div>

               <textarea 
                  disabled={(globalTimeLeft[activeLessonId] || 0) <= 0}
                  className="w-full h-64 bg-slate-900 border border-slate-700 rounded-3xl p-6 focus:border-amber-500 outline-none resize-none text-white font-mono text-lg transition-all disabled:opacity-50"
                  placeholder="Yechimni shu yerga yozing..."
                  value={lessonAnswer}
                  onChange={e => setLessonAnswer(e.target.value)}
               />
            </div>

            <div className="p-8 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center">
              <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
                {(globalTimeLeft[activeLessonId] || 0) <= 0 ? "VAQT TUGADI" : "VAQT TUGASHIDAN OLDIN YUBORING"}
              </p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setActiveLessonId(null)}
                  className="px-8 py-3 text-slate-400 hover:text-white font-bold transition-all uppercase text-sm"
                >
                  Yopish
                </button>
                <button 
                  disabled={(globalTimeLeft[activeLessonId] || 0) <= 0}
                  onClick={() => finalizeStudentSubmission(activeLessonId)}
                  className="px-10 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 text-white font-black rounded-2xl transition-all shadow-xl shadow-emerald-900/20 uppercase tracking-widest text-sm"
                >
                  YUBORISH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[50] flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-slate-700 p-8 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">New Assignment</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>
            <form onSubmit={(e) => {
               e.preventDefault();
               const task: Task = { ...newTaskData, id: 'task_' + Date.now(), createdDate: new Date().toISOString(), lessonStatus: newTaskData.type === 'lesson' ? 'inactive' : undefined };
               onAddTask(task);
               setShowAddModal(false);
            }} className="space-y-4">
              <input required type="text" placeholder="Title" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white" 
                  value={newTaskData.title} onChange={e => setNewTaskData({...newTaskData, title: e.target.value})} />
              <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  value={newTaskData.type} onChange={e => setNewTaskData({...newTaskData, type: e.target.value as any})}>
                <option value="text">Static Assignment</option>
                <option value="lesson">Timed Challenge</option>
              </select>
              <select className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  value={newTaskData.courseId} onChange={e => setNewTaskData({...newTaskData, courseId: e.target.value})}>
                {Object.values(courses).map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
              <input type="number" placeholder="Time Limit (min)" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  value={newTaskData.timeLimit} onChange={e => setNewTaskData({...newTaskData, timeLimit: parseInt(e.target.value)})} />
              <textarea placeholder="Description" className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-white"
                  value={newTaskData.description} onChange={e => setNewTaskData({...newTaskData, description: e.target.value})} />
              <button type="submit" className="w-full py-3 bg-blue-600 rounded-xl font-bold text-white">Create</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
