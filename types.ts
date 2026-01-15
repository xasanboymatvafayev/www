
export type Role = 'admin' | 'user';

export interface User {
  username: string;
  passwordHash: string;
  role: Role;
  courses: string[];
  totalScore: number;
  rating: number;
  registrationDate: string;
}

export type TaskType = 'text' | 'video' | 'lesson';

export interface Task {
  id: string;
  courseId: string;
  title: string;
  description: string;
  type: TaskType;
  textContent?: string;
  videoUrl?: string;
  videoFilename?: string;
  timeLimit?: number;
  maxPoints: number;
  deadline: string;
  createdDate: string;
  lessonStatus?: 'inactive' | 'active' | 'completed';
  lessonStartTime?: string;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  duration: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  studentUsernames: string[];
  taskIds: string[];
  createdDate: string;
}

export interface Submission {
  id: string;
  username: string;
  taskId: string;
  type: TaskType;
  answerText?: string;
  videoUrl?: string;
  status: 'pending' | 'approved' | 'rejected';
  grade?: number;
  adminComment?: string;
  submissionTime: string;
}

export interface AppState {
  users: Record<string, User>;
  courses: Record<string, Course>;
  tasks: Record<string, Task>;
  submissions: Record<string, Submission>;
  lastUpdated: number; // Cloud sinxronizatsiya uchun muhim
}
