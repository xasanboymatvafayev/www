
import React, { useState } from 'react';
import { Course, User } from '../types';
import { Language, translations } from '../translations';

interface CourseListProps {
  courses: Course[];
  currentUser: User;
  onEnroll: (id: string) => void;
  onAddCourse: (course: Course) => void;
  lang: Language;
}

const CourseList: React.FC<CourseListProps> = ({ courses, currentUser, onEnroll, onAddCourse, lang }) => {
  const [showModal, setShowModal] = useState(false);
  const isAdmin = currentUser.role === 'admin';
  const t = translations[lang];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructor: '',
    duration: '',
    level: 'Beginner' as 'Beginner' | 'Intermediate' | 'Advanced'
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newCourse: Course = {
      ...formData,
      id: 'course_' + Date.now(),
      studentUsernames: [],
      taskIds: [],
      createdDate: new Date().toISOString()
    };
    onAddCourse(newCourse);
    setShowModal(false);
  };

  const getLevelLabel = (lvl: string) => {
    switch(lvl) {
      case 'Beginner': return t.beginner;
      case 'Intermediate': return t.intermediate;
      case 'Advanced': return t.advanced;
      default: return lvl;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{t.courses}</h2>
          <p className="text-slate-400">{t.browseCourses}</p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => setShowModal(true)}
            className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg"
          >
            <i className="fas fa-plus"></i> {t.createCourse}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {courses.map(course => {
          const isEnrolled = currentUser.courses.includes(course.id);
          return (
            <div key={course.id} className="bg-[#1e293b] rounded-3xl border border-slate-800 overflow-hidden flex flex-col hover:border-blue-500/30 transition-all shadow-xl">
              <div className="h-32 bg-gradient-to-br from-slate-800 to-slate-900 relative p-6">
                <div className="absolute top-4 right-4 px-3 py-1 bg-blue-600/20 text-blue-400 text-[10px] font-black rounded-full border border-blue-600/30 uppercase tracking-widest">
                  {getLevelLabel(course.level)}
                </div>
                <div className="w-12 h-12 bg-white/5 backdrop-blur rounded-2xl flex items-center justify-center text-2xl font-black border border-white/10">
                  {course.title.charAt(0)}
                </div>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-1">{course.title}</h3>
                <p className="text-slate-400 text-sm mb-6 line-clamp-2 flex-1 leading-relaxed">{course.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-8">
                  <div className="flex items-center gap-2">
                    <i className="fas fa-user-tie text-blue-500"></i>
                    <span className="truncate">{course.instructor}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-clock text-blue-500"></i>
                    <span>{course.duration}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-users text-blue-500"></i>
                    <span>{course.studentUsernames.length} {t.studentsCount}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <i className="fas fa-layer-group text-blue-500"></i>
                    <span>{course.taskIds.length} {t.tasksCount}</span>
                  </div>
                </div>

                {isEnrolled ? (
                  <button disabled className="w-full py-3 bg-slate-800 text-slate-500 rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed border border-slate-700">
                    <i className="fas fa-check-circle mr-2"></i> {t.enrolled}
                  </button>
                ) : (
                  <button 
                    onClick={() => onEnroll(course.id)}
                    className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-blue-900/20"
                  >
                    {t.enroll}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1e293b] w-full max-w-lg rounded-[2.5rem] border border-slate-700 p-8 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-xl font-black uppercase tracking-widest">{t.newCourse}</h3>
              <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white"><i className="fas fa-times text-xl"></i></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{t.courseTitle}</label>
                <input required type="text" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:border-blue-500 outline-none" 
                  value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{t.courseDesc}</label>
                <textarea required rows={3} className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:border-blue-500 outline-none resize-none"
                  value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{t.instructor}</label>
                  <input required type="text" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:border-blue-500 outline-none"
                    value={formData.instructor} onChange={e => setFormData({...formData, instructor: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{t.duration}</label>
                  <input required type="text" className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:border-blue-500 outline-none"
                    value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">{t.level}</label>
                <select className="w-full bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-white focus:border-blue-500 outline-none appearance-none"
                  value={formData.level} onChange={e => setFormData({...formData, level: e.target.value as any})}>
                  <option value="Beginner">{t.beginner}</option>
                  <option value="Intermediate">{t.intermediate}</option>
                  <option value="Advanced">{t.advanced}</option>
                </select>
              </div>
              <button type="submit" className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all shadow-lg mt-4">
                {t.createCourse}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CourseList;
