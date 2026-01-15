
import { AppState } from './types';

export const STORAGE_KEY = 'edusync_v7_secret_admin';

export const INITIAL_STATE: AppState = {
  users: {
    'admin': {
      username: 'admin',
      passwordHash: '-1274085368', // fizika
      role: 'admin',
      courses: [],
      totalScore: 0,
      rating: 0,
      registrationDate: new Date().toISOString()
    }
  },
  courses: {},
  tasks: {},
  submissions: {}
};
