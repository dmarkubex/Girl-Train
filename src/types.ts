export interface Exercise {
  id: string;
  name: string;
  setDurationSeconds: number;
  restSeconds: number;
  totalSets: number;
  order: number;
}

export interface AppConfig {
  id: "default";
  exercises: Exercise[];
  projectRestSeconds: number;
}

export interface SessionSet {
  setIndex: number;
  plannedDuration: number; // seconds
  actualDuration: number; // milliseconds
  skipped: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  exerciseName: string;
  plannedSets: number;
  completedSets: number;
  sets: SessionSet[];
}

export interface Session {
  sessionId: string;
  date: string; // business date YYYY-MM-DD
  startTime: number; // timestamp ms
  endTime: number; // timestamp ms
  status: "completed" | "incomplete" | "abandoned";
  exercises: SessionExercise[];
  totalDuration: number; // ms
  completionRate: number; // 0-1
  note?: string;
}

export interface StreakInfo {
  currentStreak: number;
  maxStreak: number;
}
