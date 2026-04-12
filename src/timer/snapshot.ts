import { AppConfig, Session, SessionExercise } from '../types.js';
import { TimerEngine, type PhaseState } from './engine.js';
import { getBusinessDate } from '../utils/date.js';

const SNAPSHOT_KEY = 'workout-snapshot';

export interface WorkoutSnapshot {
  config: AppConfig;
  exerciseIndex: number;
  currentSet: number;
  phase: 'exercise' | 'rest' | 'project-rest';
  remainingMs: number;
  pausedAt?: number;
  sessionData: {
    startTime: number;
    exercises: SessionExercise[];
  };
}

/**
 * Save current workout state to localStorage
 */
export function saveSnapshot(engine: TimerEngine): void {
  try {
    const config = engine.getConfig();
    if (!config) {
      return;
    }

    const phaseState = engine.getPhaseState();
    if (!phaseState) {
      return;
    }

    const context = engine.getContext();

    const snapshot: WorkoutSnapshot = {
      config,
      exerciseIndex: phaseState.exerciseIndex,
      currentSet: phaseState.currentSet,
      phase: phaseState.phase,
      remainingMs: context.remainingMs,
      pausedAt: undefined,
      sessionData: {
        startTime: engine.getSessionStartTime(),
        exercises: engine.getSessionExercises()
      }
    };

    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Failed to save snapshot:', err);
  }
}

/**
 * Load workout snapshot from localStorage
 */
export function loadSnapshot(): WorkoutSnapshot | null {
  try {
    const data = localStorage.getItem(SNAPSHOT_KEY);
    if (!data) {
      return null;
    }

    const snapshot = JSON.parse(data) as WorkoutSnapshot;
    return snapshot;
  } catch (err) {
    console.warn('Failed to load snapshot:', err);
    return null;
  }
}

/**
 * Clear workout snapshot from localStorage
 */
export function clearSnapshot(): void {
  try {
    localStorage.removeItem(SNAPSHOT_KEY);
  } catch (err) {
    console.warn('Failed to clear snapshot:', err);
  }
}

/**
 * Detect if there's a recoverable workout snapshot
 * Returns true if snapshot exists and session is not completed
 */
export function detectAndRestore(engine: TimerEngine): boolean {
  const snapshot = loadSnapshot();
  if (!snapshot) {
    return false;
  }

  // Restore engine state from snapshot
  try {
    const phaseState: PhaseState = {
      phase: snapshot.phase,
      startedAt: 0,
      plannedDuration: 0,
      exerciseIndex: snapshot.exerciseIndex,
      currentSet: snapshot.currentSet
    };

    const exercise = snapshot.config.exercises[snapshot.exerciseIndex];
    switch (snapshot.phase) {
      case 'exercise':
        phaseState.plannedDuration = exercise.setDurationSeconds * 1000;
        break;
      case 'rest':
        phaseState.plannedDuration = exercise.restSeconds * 1000;
        break;
      case 'project-rest':
        phaseState.plannedDuration = snapshot.config.projectRestSeconds * 1000;
        break;
    }

    // Rebuild startedAt from remainingMs so elapsed = plannedDuration - remainingMs
    const elapsed = phaseState.plannedDuration - snapshot.remainingMs;
    phaseState.startedAt = performance.now() - elapsed;

    engine.restoreFromSnapshot(
      snapshot.config,
      snapshot.sessionData.startTime,
      snapshot.sessionData.exercises,
      phaseState,
      !!snapshot.pausedAt
    );

    return true;
  } catch (err) {
    console.warn('Failed to restore snapshot:', err);
    clearSnapshot();
    return false;
  }
}

/**
 * Save incomplete session and clear snapshot (for abandoned workouts)
 * This requires a callback to save to the database
 */
export function saveIncompleteAndClear(
  snapshot: WorkoutSnapshot,
  saveToDb: (session: Session) => Promise<void>
): Promise<void> {
  const endTime = Date.now();
  const totalDuration = endTime - snapshot.sessionData.startTime;

  // Calculate completion rate
  let totalPlannedSets = 0;
  let totalCompletedSets = 0;

  for (const ex of snapshot.sessionData.exercises) {
    totalPlannedSets += ex.plannedSets;
    totalCompletedSets += ex.completedSets;
  }

  const completionRate = totalPlannedSets > 0
    ? totalCompletedSets / totalPlannedSets
    : 0;

  const session: Session = {
    sessionId: crypto.randomUUID(),
    date: getBusinessDate(snapshot.sessionData.startTime),
    startTime: snapshot.sessionData.startTime,
    endTime,
    status: 'incomplete',
    exercises: snapshot.sessionData.exercises,
    totalDuration,
    completionRate
  };

  return saveToDb(session).then(() => {
    clearSnapshot();
  });
}

/**
 * Update snapshot pause state
 */
export function markSnapshotPaused(): void {
  try {
    const data = localStorage.getItem(SNAPSHOT_KEY);
    if (!data) {
      return;
    }

    const snapshot = JSON.parse(data) as WorkoutSnapshot;
    snapshot.pausedAt = Date.now();
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Failed to mark snapshot as paused:', err);
  }
}

/**
 * Update snapshot resume state
 */
export function markSnapshotResumed(): void {
  try {
    const data = localStorage.getItem(SNAPSHOT_KEY);
    if (!data) {
      return;
    }

    const snapshot = JSON.parse(data) as WorkoutSnapshot;
    if (snapshot.pausedAt) {
      snapshot.pausedAt = undefined;
    }
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch (err) {
    console.warn('Failed to mark snapshot as resumed:', err);
  }
}

// Initialize global hooks for engine to call
export function initializeSnapshotHooks(engine: TimerEngine): void {
  if (typeof window !== 'undefined') {
    (window as any).saveWorkoutSnapshot = () => saveSnapshot(engine);
    (window as any).clearWorkoutSnapshot = () => clearSnapshot();
  }
}
