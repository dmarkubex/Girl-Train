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

let timerEngine: TimerEngine | null = null;
let audioManager: AudioManager | null = null;
let currentState: TimerState = 'idle';
let previousPhase: TimerContext['phase'] | null = null;
let suppressNextPhaseSound = false;

export function render(container: HTMLElement): void {
  // Set full-screen dark background
  const page = document.createElement('div');
  page.className = 'workout-bg min-h-screen flex flex-col relative overflow-hidden';
  page.style.backgroundColor = '#1a1a2e';

  // Check for snapshot recovery
  const pendingSnapshot = getState('pendingSnapshot') as WorkoutSnapshot | undefined;
  const snapshot = pendingSnapshot || loadSnapshot();

  if (snapshot) {
    // Show recovery dialog
    showRecoveryDialog(container, snapshot, pendingSnapshot !== undefined);
    return;
  }

  // Start new workout
  startWorkout(container);
}

function showRecoveryDialog(container: HTMLElement, snapshot: WorkoutSnapshot, isFromState: boolean): void {
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-modal p-5';

  const dialog = document.createElement('div');
  dialog.className = 'bg-white rounded-2xl p-6 max-w-sm w-full';

  const icon = document.createElement('div');
  icon.className = 'text-5xl text-center mb-4';
  icon.textContent = '⏸';

  const title = document.createElement('h2');
  title.className = 'text-xl font-bold text-gray-900 text-center mb-2';
  title.textContent = '检测到未完成的锻炼';

  const message = document.createElement('p');
  message.className = 'text-gray-600 text-center mb-6';
  message.textContent = '是否继续之前的锻炼？';

  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'flex gap-3';

  const abandonButton = document.createElement('button');
  abandonButton.className = 'flex-1 py-3 bg-gray-100 text-gray-700 font-medium rounded-xl hover:bg-gray-200 transition-colors';
  abandonButton.textContent = '放弃';
  abandonButton.addEventListener('click', async () => {
    // Save incomplete session
    await saveIncompleteAndClear(snapshot, saveSession);
    setState('pendingSnapshot', null);
    navigate('home');
  });

  const continueButton = document.createElement('button');
  continueButton.className = 'flex-1 py-3 bg-orange-500 text-white font-medium rounded-xl hover:bg-orange-600 transition-colors';
  continueButton.textContent = '继续';
  continueButton.addEventListener('click', () => {
    // Ensure audio context is unlocked in user gesture path.
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
  page.className = 'min-h-screen flex flex-col relative overflow-hidden';
  page.style.backgroundColor = '#1a1a2e';

  // Progress bar section
  const progressSection = document.createElement('div');
  progressSection.id = 'progress-section';
  page.appendChild(progressSection);

  // Phase badge container
  const phaseSection = document.createElement('div');
  phaseSection.id = 'phase-section';
  phaseSection.className = 'px-5 mb-4';
  page.appendChild(phaseSection);

  // Timer display container
  const timerContainer = document.createElement('div');
  timerContainer.id = 'timer-container';
  page.appendChild(timerContainer);

  // Control buttons
  const controlsSection = document.createElement('div');
  controlsSection.className = 'px-5 pb-12 pt-6';

  const buttonRow = document.createElement('div');
  buttonRow.className = 'flex items-center justify-center gap-4';

  // End button
  const endButton = createControlButton('end', 'bg-red-500 hover:bg-red-600', '<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>', '结束');
  endButton.addEventListener('click', handleEndWorkout);

  // Pause/Resume button
  const pauseButton = createControlButton('pause', 'bg-white hover:bg-gray-100 text-gray-900 w-20 h-20 shadow-xl', '<svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>', '暂停');
  pauseButton.addEventListener('click', handlePauseResume);

  // Skip button
  const skipButton = createControlButton('skip', 'bg-gray-700 hover:bg-gray-600', '<svg class="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/></svg>', '跳过');
  skipButton.addEventListener('click', handleSkip);

  buttonRow.append(endButton, pauseButton, skipButton);

  // Button labels
  const labelRow = document.createElement('div');
  labelRow.className = 'flex justify-center gap-16 mt-3 text-gray-400 text-sm';
  labelRow.innerHTML = '<span>结束</span><span class="text-white font-medium">暂停</span><span>跳过</span>';

  controlsSection.append(buttonRow, labelRow);
  page.appendChild(controlsSection);

  // Pause overlay
  const pauseOverlay = document.createElement('div');
  pauseOverlay.id = 'pause-overlay';
  pauseOverlay.className = 'absolute inset-0 hidden flex items-center justify-center';
  pauseOverlay.style.background = 'rgba(0, 0, 0, 0.7)';
  pauseOverlay.style.backdropFilter = 'blur(4px)';
  pauseOverlay.innerHTML = `
    <div class="text-center">
      <div class="text-white text-6xl font-bold mb-4">⏸</div>
      <p class="text-white text-xl">已暂停</p>
      <p class="text-gray-300 mt-2">点击恢复继续锻炼</p>
    </div>
  `;
  page.appendChild(pauseOverlay);

  container.appendChild(page);

  // Initialize timer
  await initializeTimer(snapshot);
}

function createControlButton(type: string, baseClasses: string, icon: string, label: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.id = `btn-${type}`;
  button.className = `${baseClasses} text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-colors`;
  button.innerHTML = icon;
  button.setAttribute('aria-label', label);

  // Fix pause button size
  if (type === 'pause') {
    button.classList.remove('w-16', 'h-16');
  }

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

    // Create timer engine with event handlers
    timerEngine = new TimerEngine({
      onStateChange: handleTimerStateChange,
      onTick: handleTimerTick,
      onComplete: handleWorkoutComplete,
    });

    previousPhase = null;
    suppressNextPhaseSound = !!snapshot;

    // Wire snapshot hooks BEFORE starting — engine.saveSnapshot() is called inside start()/restoreFromSnapshot()
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
  playPhaseTransitionSound(state, ctx.phase);

  // Update phase badge
  updatePhaseBadge(ctx.phase);

  // Update pause overlay
  const pauseOverlay = document.getElementById('pause-overlay');
  if (pauseOverlay) {
    if (state === 'paused') {
      pauseOverlay.classList.remove('hidden');
    } else {
      pauseOverlay.classList.add('hidden');
    }
  }

  // Update pause button
  const pauseButton = document.getElementById('btn-pause');
  if (pauseButton) {
    if (state === 'paused') {
      pauseButton.innerHTML = '<svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
    } else {
      pauseButton.innerHTML = '<svg class="w-10 h-10" fill="currentColor" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
    }
  }

  // Update full display on state change (for new exercise, etc.)
  updateFullDisplay(ctx);
}

function playPhaseTransitionSound(state: TimerState, phase: TimerContext['phase']): void {
  if (!audioManager) return;

  const isActiveState = state === 'exercising' || state === 'resting' || state === 'project-rest';
  if (!isActiveState) return;

  if (suppressNextPhaseSound) {
    suppressNextPhaseSound = false;
    previousPhase = phase;
    return;
  }

  if (previousPhase === null) {
    if (phase === 'exercise') {
      audioManager.playExerciseStart();
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
    }
  }

  previousPhase = phase;
}

function handleTimerTick(remainingMs: number): void {
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  updateTimerDisplay({ remainingSeconds });

  // Countdown tick sound and vibration in last 3 seconds
  if (remainingSeconds <= 3 && remainingSeconds > 0 && audioManager) {
    audioManager.playTick();
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
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
  badge.className = 'inline-flex items-center px-4 py-2 rounded-full';

  const labels = {
    'exercise': '锻炼中',
    'rest': '休息',
    'project-rest': '项目间休息',
  };

  const gradients = {
    'exercise': 'background: linear-gradient(135deg, #FF8C42 0%, #FF6B35 100%)',
    'rest': 'background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
    'project-rest': 'background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%)',
  };

  badge.style.cssText = gradients[phase];
  badge.innerHTML = `
    <span class="w-2 h-2 bg-white rounded-full mr-2 animate-pulse"></span>
    <span class="text-white font-medium">${labels[phase]}</span>
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

async function handleEndWorkout(): Promise<void> {
  if (!timerEngine) return;

  // Show confirmation
  const confirmed = confirm('确定要提前结束锻炼吗？已完成的进度将被保存。');
  if (!confirmed) return;

  const session = timerEngine.endEarly();
  cleanupWorkout({ clearSnapshot: true });
  await saveSession(session);
  setState('lastSession', session);
  navigate('complete');
}

async function handleWorkoutComplete(session: any): Promise<void> {
  cleanupWorkout({ clearSnapshot: true });
  setState('lastSession', session);
  try {
    await saveSession(session);
  } catch (err) {
    console.error('Failed to save completed workout session:', err);
    // Notify user — session data is still in state for the complete page,
    // but won't appear in history unless the save succeeded.
    try { alert('锻炼记录保存失败，请检查存储空间。'); } catch (_) { /* noop */ }
  }
  navigate('complete');
}

function cleanupWorkout(options?: { clearSnapshot?: boolean }): void {
  if (timerEngine) {
    timerEngine.destroy();
    timerEngine = null;
  }

  if (options?.clearSnapshot) {
    clearSnapshot();
  }

  currentState = 'idle';
  previousPhase = null;
  suppressNextPhaseSound = false;
}

export function cleanup(): void {
  cleanupWorkout();
}
