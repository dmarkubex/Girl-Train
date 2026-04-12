import { AppConfig, Exercise, Session, SessionExercise, SessionSet } from '../types.js';
import { getBusinessDate } from '../utils/date.js';

export type TimerState = 'idle' | 'exercising' | 'resting' | 'project-rest' | 'paused' | 'completed';

export interface TimerEngineEvents {
  onStateChange: (state: TimerState, context: TimerContext) => void;
  onTick: (remainingMs: number) => void;
  onComplete: (session: Session) => void;
}

export interface TimerContext {
  exerciseIndex: number;
  exerciseName: string;
  currentSet: number;
  totalSets: number;
  totalExercises: number;
  phase: 'exercise' | 'rest' | 'project-rest';
  remainingMs: number;
  totalProgress: number;
}

export interface PhaseState {
  phase: 'exercise' | 'rest' | 'project-rest';
  startedAt: number; // performance.now() timestamp
  plannedDuration: number; // milliseconds
  exerciseIndex: number;
  currentSet: number;
  setStartTimestamp?: number; // Date.now() when set started (for actual duration)
}

export class TimerEngine {
  private state: TimerState = 'idle';
  private config: AppConfig | null = null;
  private currentPhase: PhaseState | null = null;
  private sessionStartTime: number = 0;
  private sessionExercises: SessionExercise[] = [];
  private rafId: number | null = null;
  private lastTickSecond: number = -1;
  private wakeLock: WakeLockSentinel | null = null;
  private elapsedBeforePause: number = 0;
  private visibilityHandler = this.handleVisibilityChange.bind(this);
  private events: TimerEngineEvents = {
    onStateChange: () => {},
    onTick: () => {},
    onComplete: () => {}
  };

  constructor(events?: Partial<TimerEngineEvents>) {
    if (events) {
      this.events = { ...this.events, ...events };
    }
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }

  start(config: AppConfig): void {
    if (this.state !== 'idle') {
      throw new Error('Cannot start: engine not idle');
    }

    this.config = config;
    this.sessionStartTime = Date.now();
    this.sessionExercises = this.initializeSessionExercises(config.exercises);

    this.startExercise(0, 1);
    this.requestWakeLock();
    this.saveSnapshot();
  }

  pause(): void {
    if (this.state !== 'exercising' && this.state !== 'resting' && this.state !== 'project-rest') {
      return;
    }

    // Capture how much time has elapsed in the current phase before pausing
    if (this.currentPhase) {
      this.elapsedBeforePause = performance.now() - this.currentPhase.startedAt;
    }

    this.cancelRaf();
    this.releaseWakeLock();
    this.setState('paused');
    this.saveSnapshot();
  }

  resume(): void {
    if (this.state !== 'paused') {
      return;
    }

    if (!this.currentPhase) {
      throw new Error('Cannot resume: no phase state');
    }

    // Rebuild startedAt so that (performance.now() - startedAt) equals the elapsed time before pause
    this.currentPhase.startedAt = performance.now() - this.elapsedBeforePause;

    this.startRaf();
    this.requestWakeLock();
    this.restoreStateFromPhase();
    this.saveSnapshot();
  }

  skip(): void {
    if (this.state === 'idle' || this.state === 'completed' || this.state === 'paused') {
      return;
    }

    this.cancelRaf();

    if (!this.currentPhase) {
      throw new Error('Cannot skip: no phase state');
    }

    const { phase, exerciseIndex, currentSet, setStartTimestamp } = this.currentPhase;

    if (phase === 'exercise') {
      // Mark current set as skipped
      this.recordSetCompletion(exerciseIndex, currentSet, true, setStartTimestamp);
      this.advanceToNextPhase(exerciseIndex, currentSet, true);
    } else if (phase === 'rest') {
      // Skip rest, start next set
      this.startSet(exerciseIndex, currentSet + 1);
    } else if (phase === 'project-rest') {
      // Skip project rest, start next exercise
      this.startExercise(exerciseIndex + 1, 1);
    }

    this.saveSnapshot();
  }

  endEarly(): Session {
    if (this.state === 'idle' || this.state === 'completed') {
      throw new Error('Cannot end early: no active session');
    }

    this.cancelRaf();
    this.releaseWakeLock();

    const session = this.buildSession('incomplete');
    this.setState('completed');
    this.events.onComplete(session);
    this.clearSnapshot();

    return session;
  }

  destroy(): void {
    this.cancelRaf();
    this.releaseWakeLock();
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.clearSnapshot();
  }

  getSession(): Partial<Session> {
    if (!this.config) {
      throw new Error('No active session');
    }

    return this.buildSession(this.state === 'completed' ? 'completed' : 'incomplete');
  }

  getContext(): TimerContext {
    if (!this.config || !this.currentPhase) {
      throw new Error('No active session or phase');
    }

    const exercise = this.config.exercises[this.currentPhase.exerciseIndex];
    const now = performance.now();
    const elapsed = now - this.currentPhase.startedAt;
    const remaining = Math.max(0, this.currentPhase.plannedDuration - elapsed);

    return {
      exerciseIndex: this.currentPhase.exerciseIndex,
      exerciseName: exercise.name,
      currentSet: this.currentPhase.currentSet,
      totalSets: exercise.totalSets,
      totalExercises: this.config.exercises.length,
      phase: this.currentPhase.phase,
      remainingMs: remaining,
      totalProgress: this.calculateTotalProgress()
    };
  }

  private setState(newState: TimerState): void {
    this.state = newState;

    if (this.currentPhase && this.config) {
      const context = this.getContext();
      this.events.onStateChange(newState, context);
    }
  }

  private restoreStateFromPhase(): void {
    if (!this.currentPhase) return;

    switch (this.currentPhase.phase) {
      case 'exercise':
        this.setState('exercising');
        break;
      case 'rest':
        this.setState('resting');
        break;
      case 'project-rest':
        this.setState('project-rest');
        break;
    }
  }

  private startExercise(exerciseIndex: number, setNumber: number): void {
    if (!this.config) {
      throw new Error('No config loaded');
    }

    if (exerciseIndex >= this.config.exercises.length) {
      // All exercises completed
      this.completeWorkout();
      return;
    }

    this.startSet(exerciseIndex, setNumber);
  }

  private startSet(exerciseIndex: number, setNumber: number): void {
    if (!this.config) {
      throw new Error('No config loaded');
    }

    const exercise = this.config.exercises[exerciseIndex];

    if (setNumber > exercise.totalSets) {
      // All sets completed, move to project rest
      if (exerciseIndex < this.config.exercises.length - 1) {
        this.startProjectRest(exerciseIndex);
        return;
      } else {
        // Last exercise, last set - complete workout
        this.completeWorkout();
        return;
      }
    }

    const duration = exercise.setDurationSeconds * 1000;
    this.currentPhase = {
      phase: 'exercise',
      startedAt: performance.now(),
      plannedDuration: duration,
      exerciseIndex,
      currentSet: setNumber,
      setStartTimestamp: Date.now()
    };

    this.startRaf();
    this.setState('exercising');
  }

  private startRest(exerciseIndex: number, setNumber: number): void {
    if (!this.config) {
      throw new Error('No config loaded');
    }

    const exercise = this.config.exercises[exerciseIndex];
    const duration = exercise.restSeconds * 1000;

    this.currentPhase = {
      phase: 'rest',
      startedAt: performance.now(),
      plannedDuration: duration,
      exerciseIndex,
      currentSet: setNumber
    };

    this.startRaf();
    this.setState('resting');
  }

  private startProjectRest(exerciseIndex: number): void {
    if (!this.config) {
      throw new Error('No config loaded');
    }

    const duration = this.config.projectRestSeconds * 1000;

    this.currentPhase = {
      phase: 'project-rest',
      startedAt: performance.now(),
      plannedDuration: duration,
      exerciseIndex,
      currentSet: 0
    };

    this.startRaf();
    this.setState('project-rest');
  }

  private startRaf(): void {
    this.cancelRaf();
    this.rafId = requestAnimationFrame(this.tick.bind(this));
  }

  private cancelRaf(): void {
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick(): void {
    if (!this.currentPhase || this.state === 'paused') {
      return;
    }

    const now = performance.now();
    const elapsed = now - this.currentPhase.startedAt;
    const remaining = Math.max(0, this.currentPhase.plannedDuration - elapsed);

    // Trigger tick callback for UI updates (throttle to once per second)
    const currentSecond = Math.ceil(remaining / 1000);
    if (currentSecond !== this.lastTickSecond) {
      this.lastTickSecond = currentSecond;
      this.events.onTick(remaining);
    }

    if (remaining <= 0) {
      this.handlePhaseComplete();
    } else {
      this.rafId = requestAnimationFrame(this.tick.bind(this));
    }
  }

  private handlePhaseComplete(): void {
    if (!this.currentPhase || !this.config) {
      return;
    }

    const { phase, exerciseIndex, currentSet, setStartTimestamp } = this.currentPhase;

    if (phase === 'exercise') {
      // Record set completion
      this.recordSetCompletion(exerciseIndex, currentSet, false, setStartTimestamp);

      // Check if more sets or exercises remain
      const exercise = this.config.exercises[exerciseIndex];
      if (currentSet < exercise.totalSets) {
        // More sets - start rest
        this.startRest(exerciseIndex, currentSet);
      } else if (exerciseIndex < this.config.exercises.length - 1) {
        // Last set of exercise, but more exercises - project rest
        this.startProjectRest(exerciseIndex);
      } else {
        // Last set of last exercise - complete workout
        this.completeWorkout();
        return;
      }
    } else if (phase === 'rest') {
      // Rest complete, start next set
      this.startSet(exerciseIndex, currentSet + 1);
    } else if (phase === 'project-rest') {
      // Project rest complete, start next exercise
      this.startExercise(exerciseIndex + 1, 1);
    }

    this.saveSnapshot();
  }

  private advanceToNextPhase(exerciseIndex: number, currentSet: number, wasSkipped: boolean): void {
    if (!this.config) {
      throw new Error('No config loaded');
    }

    const exercise = this.config.exercises[exerciseIndex];

    if (wasSkipped) {
      // Determine next phase based on where we skipped
      if (currentSet < exercise.totalSets) {
        // More sets in this exercise - go to rest
        this.startRest(exerciseIndex, currentSet);
      } else if (exerciseIndex < this.config.exercises.length - 1) {
        // Last set, but more exercises - project rest
        this.startProjectRest(exerciseIndex);
      } else {
        // Last set of last exercise - complete
        this.completeWorkout();
      }
    }
  }

  private completeWorkout(): void {
    this.cancelRaf();
    this.releaseWakeLock();

    const session = this.buildSession('completed');
    this.setState('completed');
    this.events.onComplete(session);
    this.clearSnapshot();
  }

  private initializeSessionExercises(exercises: Exercise[]): SessionExercise[] {
    return exercises.map(ex => ({
      exerciseId: ex.id,
      exerciseName: ex.name,
      plannedSets: ex.totalSets,
      completedSets: 0,
      sets: []
    }));
  }

  private recordSetCompletion(
    exerciseIndex: number,
    setNumber: number,
    skipped: boolean,
    setStartTimestamp?: number
  ): void {
    const sessionExercise = this.sessionExercises[exerciseIndex];
    const exercise = this.config!.exercises[exerciseIndex];

    const actualDuration = setStartTimestamp
      ? Date.now() - setStartTimestamp
      : 0;

    const sessionSet: SessionSet = {
      setIndex: setNumber - 1,
      plannedDuration: exercise.setDurationSeconds,
      actualDuration,
      skipped
    };

    sessionExercise.sets.push(sessionSet);
    if (!skipped) {
      sessionExercise.completedSets++;
    }
  }

  private buildSession(status: 'completed' | 'incomplete' | 'abandoned'): Session {
    if (!this.config) {
      throw new Error('No config loaded');
    }

    const endTime = Date.now();
    const totalDuration = endTime - this.sessionStartTime;

    // Calculate completion rate
    let totalPlannedSets = 0;
    let totalCompletedSets = 0;

    for (const ex of this.sessionExercises) {
      totalPlannedSets += ex.plannedSets;
      totalCompletedSets += ex.completedSets;
    }

    const completionRate = totalPlannedSets > 0
      ? totalCompletedSets / totalPlannedSets
      : 0;

    return {
      sessionId: crypto.randomUUID(),
      date: getBusinessDate(this.sessionStartTime),
      startTime: this.sessionStartTime,
      endTime,
      status,
      exercises: this.sessionExercises,
      totalDuration,
      completionRate
    };
  }

  private calculateTotalProgress(): number {
    if (!this.config || this.sessionExercises.length === 0) {
      return 0;
    }

    let totalPlannedSets = 0;
    let totalCompletedSets = 0;

    for (const ex of this.sessionExercises) {
      totalPlannedSets += ex.plannedSets;
      totalCompletedSets += ex.completedSets;
    }

    return totalPlannedSets > 0 ? totalCompletedSets / totalPlannedSets : 0;
  }

  private handleVisibilityChange(): void {
    if (document.hidden && this.state !== 'paused' && this.state !== 'idle' && this.state !== 'completed') {
      this.pause();
    }
  }

  private requestWakeLock(): void {
    if ('wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(lock => {
        this.wakeLock = lock;
      }).catch(() => {
        // Wake lock not available or denied - ignore
      });
    }
  }

  private releaseWakeLock(): void {
    this.wakeLock?.release();
    this.wakeLock = null;
  }

  private saveSnapshot(): void {
    // Will be implemented by snapshot module
    if (typeof window !== 'undefined' && (window as any).saveWorkoutSnapshot) {
      (window as any).saveWorkoutSnapshot(this);
    }
  }

  private clearSnapshot(): void {
    // Will be implemented by snapshot module
    if (typeof window !== 'undefined' && (window as any).clearWorkoutSnapshot) {
      (window as any).clearWorkoutSnapshot();
    }
  }

  // Methods for snapshot restoration
  getConfig(): AppConfig | null {
    return this.config;
  }

  getSessionStartTime(): number {
    return this.sessionStartTime;
  }

  getSessionExercises(): SessionExercise[] {
    return this.sessionExercises;
  }

  getPhaseState(): PhaseState | null {
    return this.currentPhase;
  }

  restoreFromSnapshot(
    config: AppConfig,
    sessionStartTime: number,
    sessionExercises: SessionExercise[],
    phaseState: PhaseState,
    wasPaused: boolean
  ): void {
    this.config = config;
    this.sessionStartTime = sessionStartTime;
    this.sessionExercises = sessionExercises;
    this.currentPhase = phaseState;

    if (wasPaused) {
      this.setState('paused');
    } else {
      this.startRaf();
      this.requestWakeLock();
      this.restoreStateFromPhase();
    }
  }
}
