export interface Exercise {
  id: string;
  name: string;
  coachingTip?: string;
  setDurationSeconds: number;
  restSeconds: number;
  totalSets: number;
  order: number;
}

export interface AudioCoachSettings {
  voiceGuidanceEnabled: boolean;
  countdownReminderEnabled: boolean;
}

export interface MusicSettings {
  enabled: boolean;
  exerciseMusicFileId?: string;
  restMusicFileId?: string;
  exerciseVolume: number;
  restVolume: number;
}

export type VoiceScene =
  | 'exercise_start'
  | 'rest_start'
  | 'project_rest_start'
  | 'workout_complete'
  | 'encourage';

export interface VoicePackSettings {
  scenes: Partial<Record<VoiceScene, string>>;
}

export interface AudioFileRecord {
  id: string;
  name: string;
  blob: Blob;
}

export interface AppConfig {
  id: "default";
  exercises: Exercise[];
  projectRestSeconds: number;
  audioCoach: AudioCoachSettings;
  musicSettings: MusicSettings;
  voicePackSettings: VoicePackSettings;
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
