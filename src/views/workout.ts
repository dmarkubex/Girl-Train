/**
 * Workout View
 * Full-screen workout execution page with timer, controls, and progress tracking
 */

import { getConfig, saveSession } from '../db';
import { navigate } from '../router';
import { TimerEngine, type TimerState, type TimerContext } from '../timer/engine';
import { type AudioManager, getGlobalAudioManager } from '../timer/audio';
import { loadSnapshot, clearSnapshot, saveIncompleteAndClear, markSnapshotPaused, markSnapshotResumed, initializeSnapshotHooks, type WorkoutSnapshot } from '../timer/snapshot';
import { setState, getState } from '../state';
import { createTimerDisplay, updateTimerDisplay } from '../components/timer-display';
import { createProgressBar } from '../components/progress-bar';
import type { AppConfig } from '../types';

let timerEngine: TimerEngine | null = null;
let audioManager: AudioManager | null = null;
let currentState: TimerState = 'idle';
let previousPhase: TimerContext['phase'] | null = null;
let suppressNextPhaseSound = false;
let workoutConfig: AppConfig | null = null;
let announcedCountdownSeconds = new Set<number>();

export function render(container: HTMLElement): void {
  const page = document.createElement('div');
  page.className = 'workout-view';

  // Check for snapshot recovery
  const pendingSnapshot = getState('pendingSnapshot') as WorkoutSnapshot | undefined;
  const snapshot = pendingSnapshot || loadSnapshot();

  if (snapshot) {
    showRecoveryDialog(container, snapshot, pendingSnapshot !== undefined);
    return;
  }

  // Start new workout
  startWorkout(container);
}

function showRecoveryDialog(container: HTMLElement, snapshot: WorkoutSnapshot, isFromState: boolean): void {
  const overlay = document.createElement('div');
  overlay.className = 'pause-overlay-view';

  const dialog = document.createElement('div');
  dialog.className = 'dark-card';
  dialog.style.textAlign = 'center';

  const icon = document.createElement('div');
  icon.innerHTML = '<span style="font-size: 48px;">⏸</span>';
  icon.style.marginBottom = '16px';

  const title = document.createElement('h2');
  title.textContent = '检测到未完成的锻炼';

  const message = document.createElement('p');
  message.textContent = '是否继续之前的锻炼？';
  message.style.marginBottom = '24px';

  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '12px';

  const abandonButton = document.createElement('button');
  abandonButton.className = 'btn-secondary';
  abandonButton.style.flex = '1';
  abandonButton.textContent = '放弃';
  abandonButton.addEventListener('click', async () => {
    // Save incomplete session
    await saveIncompleteAndClear(snapshot, saveSession);
    setState('pendingSnapshot', null);
    navigate('home');
  });

  const continueButton = document.createElement('button');
  continueButton.className = 'btn-save-glow';
  continueButton.style.flex = '1';
  continueButton.style.padding = '14px';
  continueButton.textContent = '继续';
  continueButton.addEventListener('click', () => {
    getGlobalAudioManager().init();
    overlay.remove();
    if (isFromState) {
      setState('pendingSnapshot', null);
    }
    startWorkout(container, snapshot);
  });

  buttonContainer.append(abandonButton, continueButton);
  dialog.append(icon, title, message, buttonContainer);
  overlay.appendChild(dialog);
  container.appendChild(overlay);
}

async function startWorkout(container: HTMLElement, snapshot?: WorkoutSnapshot): Promise<void> {
  const page = document.createElement('div');
  page.className = 'workout-view';

  // Progress bar section
  const progressSection = document.createElement('div');
  progressSection.id = 'progress-section';
  page.appendChild(progressSection);

  // Phase badge container
  const phaseSection = document.createElement('div');
  phaseSection.id = 'phase-section';
  phaseSection.className = 'phase-badge-wrapper';
  page.appendChild(phaseSection);

  // Timer display container
  const timerContainer = document.createElement('div');
  timerContainer.id = 'timer-container';
  timerContainer.style.flex = '1';
  timerContainer.style.display = 'flex';
  page.appendChild(timerContainer);

  // Control buttons
  const controlsSection = document.createElement('div');
  controlsSection.className = 'workout-controls';

  // End button
  const endButton = createControlButton('end', '<svg class="icon-32" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>', '结束');
  endButton.addEventListener('click', handleEndWorkout);

  // Pause/Resume button
  const pauseButton = createControlButton('pause', '<svg class="icon-40" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>', '暂停');
  pauseButton.addEventListener('click', handlePauseResume);

  // Skip button
  const skipButton = createControlButton('skip', '<svg class="icon-32" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>', '跳过');
  skipButton.addEventListener('click', handleSkip);

  controlsSection.append(endButton, pauseButton, skipButton);
  page.appendChild(controlsSection);

  // Pause overlay
  const pauseOverlay = document.createElement('div');
  pauseOverlay.id = 'pause-overlay';
  pauseOverlay.className = 'pause-overlay-view';
  pauseOverlay.style.display = 'none';
  pauseOverlay.innerHTML = `
    <h2>已暂停</h2>
    <p>点击屏幕任意位置恢复</p>
  `;
  pauseOverlay.addEventListener('click', handlePauseResume);
  page.appendChild(pauseOverlay);

  container.appendChild(page);

  // Initialize timer
  await initializeTimer(snapshot);
}

function createControlButton(type: string, icon: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = `btn-${type}`;
  button.className = `ctrl-btn btn-${type}`;
  button.innerHTML = icon;
  button.setAttribute('aria-label', label);
  return button;
}

async function initializeTimer(snapshot?: WorkoutSnapshot): Promise<void> {
  try {
    const config = await getConfig();
    if (!config) {
      console.error('No config found');
      navigate('home');
      return;
    }

    // Reuse globally unlocked audio context.
    audioManager = getGlobalAudioManager();
    workoutConfig = config;

    // Create timer engine with event handlers
    timerEngine = new TimerEngine({
      onStateChange: handleTimerStateChange,
      onTick: handleTimerTick,
      onComplete: handleWorkoutComplete,
    });

    previousPhase = null;
    suppressNextPhaseSound = !!snapshot;

    initializeSnapshotHooks(timerEngine);

    if (snapshot) {
      // Restore from snapshot
      const phaseState = {
        phase: snapshot.phase,
        startedAt: 0,
        plannedDuration: 0,
        exerciseIndex: snapshot.exerciseIndex,
        currentSet: snapshot.currentSet,
      };

      const exercise = config.exercises[snapshot.exerciseIndex];
      switch (snapshot.phase) {
        case 'exercise':
          phaseState.plannedDuration = exercise.setDurationSeconds * 1000;
          break;
        case 'rest':
          phaseState.plannedDuration = exercise.restSeconds * 1000;
          break;
        case 'project-rest':
          phaseState.plannedDuration = config.projectRestSeconds * 1000;
          break;
      }

      const elapsed = phaseState.plannedDuration - snapshot.remainingMs;
      phaseState.startedAt = performance.now() - elapsed;

      timerEngine.restoreFromSnapshot(
        snapshot.config,
        snapshot.sessionData.startTime,
        snapshot.sessionData.exercises,
        phaseState,
        !!snapshot.pausedAt
      );
    } else {
      // Start new workout
      timerEngine.start(config);
    }

  } catch (error) {
    console.error('Failed to initialize timer:', error);
    navigate('home');
  }
}

function handleTimerStateChange(state: TimerState, ctx: TimerContext): void {
  currentState = state;
  playPhaseTransitionSound(state, ctx);

  updatePhaseBadge(ctx.phase);

  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) {
    if (state === 'paused') {
      pauseOverlay.style.display = 'flex';
    } else {
      pauseOverlay.style.display = 'none';
    }
  }

  const pauseButton = document.getElementById('btn-pause');
  if (pauseButton) {
    if (state === 'paused') {
      // Show play icon when paused
      pauseButton.innerHTML = '<svg class="icon-40" fill="currentColor" style="margin-left: 6px;" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    } else {
      pauseButton.innerHTML = '<svg class="icon-40" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    }
  }

  updateFullDisplay(ctx);
}

function playPhaseTransitionSound(state: TimerState, ctx: TimerContext): void {
  if (!audioManager) return;

  const phase = ctx.phase;
  const isActiveState = state === 'exercising' || state === 'resting' || state === 'project-rest';
  if (!isActiveState) return;

  announcedCountdownSeconds = new Set<number>();

  if (suppressNextPhaseSound) {
    suppressNextPhaseSound = false;
    previousPhase = phase;
    return;
  }

  if (previousPhase === null) {
    if (phase === 'exercise') {
      audioManager.playExerciseStart();
      announceExerciseGuidance(ctx);
    }
    previousPhase = phase;
    return;
  }

  if (phase !== previousPhase) {
    if (previousPhase === 'exercise' && (phase === 'rest' || phase === 'project-rest')) {
      audioManager.playExerciseComplete();
    }
    if (phase === 'exercise') {
      audioManager.playExerciseStart();
      announceExerciseGuidance(ctx);
    }
    if (phase === 'rest' || phase === 'project-rest') {
      announcePhaseStart(phase);
    }
  }

  previousPhase = phase;
}

function handleTimerTick(remainingMs: number): void {
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  updateTimerDisplay({ remainingSeconds });

  if (!timerEngine || !audioManager || !workoutConfig?.audioCoach?.countdownReminderEnabled) {
    return;
  }

  try {
    timerEngine.getContext();
  } catch {
    return;
  }

  if ((remainingSeconds === 10 || remainingSeconds <= 3) && remainingSeconds > 0 && !announcedCountdownSeconds.has(remainingSeconds)) {
    announcedCountdownSeconds.add(remainingSeconds);
    audioManager.speak(`还有 ${remainingSeconds} 秒`);
  }

  if (remainingSeconds <= 3 && remainingSeconds > 0 && audioManager) {
    audioManager.playTick();
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
  }
}

function announceExerciseGuidance(ctx: TimerContext): void {
  if (!audioManager || !workoutConfig?.audioCoach?.voiceGuidanceEnabled) {
    return;
  }

  const exercise = workoutConfig.exercises[ctx.exerciseIndex];
  if (!exercise) {
    return;
  }

  const parts = [
    `开始 ${ctx.exerciseName}，第 ${ctx.currentSet} 组，共 ${ctx.totalSets} 组。`
  ];

  if (exercise.coachingTip && exercise.coachingTip.trim()) {
    parts.push(exercise.coachingTip.trim());
  }

  audioManager.speak(parts.join(' '));
}

function announcePhaseStart(phase: TimerContext['phase']): void {
  if (!audioManager || !workoutConfig?.audioCoach?.voiceGuidanceEnabled) {
    return;
  }

  if (phase === 'rest') {
    audioManager.speak('休息开始，调整呼吸。');
  } else if (phase === 'project-rest') {
    audioManager.speak('动作切换休息，准备下一个动作。');
  }
}

function updateFullDisplay(ctx: TimerContext): void {
  const progressSection = document.getElementById('progress-section');
  const phaseSection = document.getElementById('phase-section');
  const timerContainer = document.getElementById('timer-container');

  if (!progressSection || !phaseSection || !timerContainer) return;

  progressSection.innerHTML = '';
  phaseSection.innerHTML = '';
  timerContainer.innerHTML = '';

  const progressComponent = createProgressBar({
    currentExerciseIndex: ctx.exerciseIndex,
    totalExercises: ctx.totalExercises,
    currentSetIndex: ctx.currentSet - 1,
    totalSets: ctx.totalSets,
    phase: ctx.phase,
  });

  const phaseBadge = createPhaseBadge(ctx.phase);
  const timerComponent = createTimerDisplay({
    exerciseName: ctx.exerciseName,
    exerciseIndex: ctx.exerciseIndex,
    totalExercises: ctx.totalExercises,
    setIndex: ctx.currentSet - 1,
    totalSets: ctx.totalSets,
    remainingSeconds: Math.ceil(ctx.remainingMs / 1000),
    phase: ctx.phase,
    isPaused: currentState === 'paused',
  });

  progressSection.appendChild(progressComponent);
  phaseSection.appendChild(phaseBadge);
  timerContainer.appendChild(timerComponent);
}

function updatePhaseBadge(phase: 'exercise' | 'rest' | 'project-rest'): void {
  const phaseSection = document.getElementById('phase-section');
  if (!phaseSection) return;

  phaseSection.innerHTML = '';
  phaseSection.appendChild(createPhaseBadge(phase));
}

function createPhaseBadge(phase: 'exercise' | 'rest' | 'project-rest'): HTMLElement {
  const badge = document.createElement('div');
  badge.className = `phase-badge phase-${phase}`;

  const labels = {
    'exercise': '锻炼中',
    'rest': '休息',
    'project-rest': '项目间休息',
  };

  badge.innerHTML = `
    <span style="width:8px; height:8px; background:#fff; border-radius:50%; margin-right:8px; animation: pulse-opacity 1s infinite alternate;"></span>
    <span>${labels[phase]}</span>
  `;

  return badge;
}

function handlePauseResume(): void {
  if (!timerEngine) return;
  if (currentState === 'paused') {
    timerEngine.resume();
    markSnapshotResumed();
  } else {
    timerEngine.pause();
    markSnapshotPaused();
  }
}

function handleSkip(): void {
  if (!timerEngine) return;
  timerEngine.skip();
}

function handleEndWorkout(): void {
  if (!timerEngine) return;
  
  // Pause the timer to wait for user's choice
  const wasPaused = currentState === 'paused';
  if (!wasPaused) {
    timerEngine.pause();
    markSnapshotPaused();
  }

  const container = document.querySelector('.workout-view');
  if (!container) return;

  const overlay = document.createElement('div');
  overlay.className = 'pause-overlay-view confirm-end-overlay';
  overlay.style.zIndex = '200';

  const dialog = document.createElement('div');
  dialog.className = 'dark-card';
  dialog.style.textAlign = 'center';
  dialog.style.maxWidth = '300px';

  const icon = document.createElement('div');
  icon.innerHTML = '<span style="font-size: 48px;">🛑</span>';
  icon.style.marginBottom = '16px';

  const title = document.createElement('h2');
  title.textContent = '提前结束？';
  title.style.margin = '0 0 12px 0';

  const message = document.createElement('p');
  message.textContent = '已完成的锻炼进度将会被保存。';
  message.style.marginBottom = '24px';
  message.style.color = 'rgba(255,255,255,0.6)';

  const buttonContainer = document.createElement('div');
  buttonContainer.style.display = 'flex';
  buttonContainer.style.gap = '12px';

  const cancelButton = document.createElement('button');
  cancelButton.className = 'btn-secondary';
  cancelButton.style.flex = '1';
  cancelButton.textContent = '继续练';
  cancelButton.addEventListener('click', (e) => {
    e.stopPropagation();
    overlay.remove();
    // Resume only if it wasn't paused before clicking End
    if (!wasPaused && timerEngine) {
      timerEngine.resume();
      markSnapshotResumed();
    }
  });

  const confirmButton = document.createElement('button');
  confirmButton.className = 'btn-save-glow';
  confirmButton.style.background = 'linear-gradient(135deg, #EF4444 0%, #B91C1C 100%)';
  confirmButton.style.boxShadow = '0 4px 16px rgba(239, 68, 68, 0.4)';
  confirmButton.style.flex = '1';
  confirmButton.style.padding = '14px';
  confirmButton.textContent = '结束';
  confirmButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!timerEngine) return;
    overlay.remove();
    const session = timerEngine.endEarly();
    cleanupWorkout({ clearSnapshot: true });
    await saveSession(session);
    setState('lastSession', session);
    navigate('complete');
  });

  buttonContainer.append(cancelButton, confirmButton);
  dialog.append(icon, title, message, buttonContainer);
  
  // click outside to cancel
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      cancelButton.click();
    }
  });

  overlay.appendChild(dialog);
  container.appendChild(overlay);
}

async function handleWorkoutComplete(session: any): Promise<void> {
  cleanupWorkout({ clearSnapshot: true });
  setState('lastSession', session);
  try {
    await saveSession(session);
  } catch (err) {
    console.error('Failed to save completed workout session:', err);
    try { alert('锻炼记录保存失败，请检查存储空间。'); } catch (_) { /* noop */ }
  }
  navigate('complete');
}

function cleanupWorkout(options?: { clearSnapshot?: boolean }): void {
  if (timerEngine) {
    timerEngine.destroy();
    timerEngine = null;
  }
  audioManager?.stopVoice();
  if (options?.clearSnapshot) {
    clearSnapshot();
  }
  currentState = 'idle';
  previousPhase = null;
  suppressNextPhaseSound = false;
  workoutConfig = null;
  announcedCountdownSeconds = new Set<number>();
}

export function cleanup(): void {
  cleanupWorkout();
}
