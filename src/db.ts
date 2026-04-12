import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { AppConfig, Session, StreakInfo } from './types.js';
import { getBusinessDate } from './utils/date.js';

interface ExerciseTrackerDB extends DBSchema {
  config: {
    key: string;
    value: AppConfig;
  };
  sessions: {
    key: string;
    value: Session;
    indexes: {
      date: string;
      status: string;
    };
  };
}

const DB_NAME = 'exercise-tracker';
const DB_VERSION = 1;

let dbInstance: IDBPDatabase<ExerciseTrackerDB> | null = null;

/**
 * Migration definitions for database version upgrades.
 */
const migrations: Array<(db: IDBPDatabase<ExerciseTrackerDB>) => void | Promise<void>> = [
  // v0 → v1: create initial stores
  async (db) => {
    db.createObjectStore('config', { keyPath: 'id' });
    const sessionsStore = db.createObjectStore('sessions', { keyPath: 'sessionId' });
    sessionsStore.createIndex('date', 'date');
    sessionsStore.createIndex('status', 'status');
  }
];

/**
 * Open and initialize the database.
 */
export async function openDatabase(): Promise<IDBPDatabase<ExerciseTrackerDB>> {
  if (dbInstance) {
    return dbInstance;
  }

  dbInstance = await openDB<ExerciseTrackerDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      for (let i = oldVersion; i < migrations.length; i++) {
        migrations[i](db);
      }
    }
  });

  return dbInstance;
}

/**
 * Get app configuration. Returns undefined if not exists.
 */
export async function getConfig(): Promise<AppConfig | undefined> {
  const db = await openDatabase();
  return db.get('config', 'default');
}

/**
 * Save app configuration.
 */
export async function saveConfig(config: AppConfig): Promise<void> {
  const db = await openDatabase();
  await db.put('config', config);
}

/**
 * Get default exercise plan seed.
 */
export function getDefaultConfig(): AppConfig {
  return {
    id: 'default',
    exercises: [
      {
        id: '1',
        name: '抱头展胸',
        setDurationSeconds: 70,
        restSeconds: 15,
        totalSets: 9,
        order: 1
      },
      {
        id: '2',
        name: '上胸弯对抗',
        setDurationSeconds: 70,
        restSeconds: 15,
        totalSets: 9,
        order: 2
      }
    ],
    projectRestSeconds: 60
  };
}

/**
 * Initialize default config if not exists.
 */
export async function initializeDefaultConfig(): Promise<void> {
  const existing = await getConfig();
  if (!existing) {
    const defaultConfig = getDefaultConfig();
    await saveConfig(defaultConfig);
  }
}

/**
 * Save a session.
 */
export async function saveSession(session: Session): Promise<void> {
  const db = await openDatabase();
  await db.put('sessions', session);
}

/**
 * Get sessions by date range (inclusive).
 * Both dates should be in YYYY-MM-DD format.
 */
export async function getSessionsByDateRange(from: string, to: string): Promise<Session[]> {
  const db = await openDatabase();
  const sessions = await db.getAll('sessions');
  return sessions.filter(s => s.date >= from && s.date <= to)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Get the most recent session by start time.
 */
export async function getLatestSession(): Promise<Session | undefined> {
  const db = await openDatabase();
  const sessions = await db.getAll('sessions');

  if (sessions.length === 0) {
    return undefined;
  }

  return sessions.reduce((latest, current) =>
    current.startTime > latest.startTime ? current : latest
  );
}

/**
 * Get session for a specific business date.
 * Returns most recent session if multiple exist for same date.
 */
export async function getSessionByDate(date: string): Promise<Session | undefined> {
  const db = await openDatabase();
  const sessions = await db.getAllFromIndex('sessions', 'date', date);

  if (sessions.length === 0) {
    return undefined;
  }

  // Return most recent by start time
  return sessions.reduce((latest, current) =>
    current.startTime > latest.startTime ? current : latest
  );
}

/**
 * Export all data as JSON object.
 */
export async function exportAllData(): Promise<{ config: AppConfig; sessions: Session[] }> {
  const db = await openDatabase();
  const config = await db.get('config', 'default');
  const sessions = await db.getAll('sessions');

  if (!config) {
    throw new Error('No configuration found');
  }

  return { config, sessions };
}

/**
 * Import data from JSON object.
 * Validates structure and merges sessions by sessionId.
 */
export async function importData(json: unknown): Promise<void> {
  if (!json || typeof json !== 'object') {
    throw new Error('Invalid JSON data');
  }

  const data = json as { config?: unknown; sessions?: unknown };

  // Validate and import config
  if (!data.config || typeof data.config !== 'object') {
    throw new Error('Missing or invalid config');
  }

  const config = data.config as AppConfig;
  if (config.id !== 'default' || !Array.isArray(config.exercises)) {
    throw new Error('Invalid config structure');
  }

  await saveConfig(config);

  // Validate and import sessions
  if (!Array.isArray(data.sessions)) {
    throw new Error('Invalid sessions data');
  }

  const db = await openDatabase();

  for (const session of data.sessions) {
    if (!session || typeof session !== 'object') {
      continue;
    }

    const s = session as Session;
    if (!s.sessionId || !s.date) {
      continue;
    }

    // Only add if doesn't exist
    const existing = await db.get('sessions', s.sessionId);
    if (!existing) {
      await db.put('sessions', s);
    }
  }
}

/**
 * Calculate streak information (current and max streak).
 * Streak counts consecutive business days with at least one completed session.
 */
export async function calculateStreak(): Promise<StreakInfo> {
  const db = await openDatabase();
  const sessions = await db.getAll('sessions');

  if (sessions.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Filter only completed sessions and sort by date descending
  const completedSessions = sessions
    .filter(s => s.status === 'completed')
    .map(s => s.date)
    .sort((a, b) => b.localeCompare(a)); // descending

  if (completedSessions.length === 0) {
    return { currentStreak: 0, maxStreak: 0 };
  }

  // Get unique dates
  const uniqueDates = [...new Set(completedSessions)];
  const today = getBusinessDate(Date.now());

  // Calculate current streak
  let currentStreak = 0;
  let checkDate = today;

  for (const date of uniqueDates) {
    if (date === checkDate) {
      currentStreak++;
      // Move to previous day
      const dateObj = new Date(date);
      dateObj.setDate(dateObj.getDate() - 1);
      checkDate = dateObj.toISOString().split('T')[0];
    } else if (date < checkDate) {
      // Streak broken
      break;
    }
  }

  // Calculate max streak
  let maxStreak = 0;
  let tempStreak = 1;

  for (let i = 0; i < uniqueDates.length - 1; i++) {
    const currentDate = new Date(uniqueDates[i]);
    const nextDate = new Date(uniqueDates[i + 1]);

    // Check if consecutive days
    const diffTime = currentDate.getTime() - nextDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      tempStreak++;
    } else {
      maxStreak = Math.max(maxStreak, tempStreak);
      tempStreak = 1;
    }
  }

  maxStreak = Math.max(maxStreak, tempStreak);

  return { currentStreak, maxStreak };
}
