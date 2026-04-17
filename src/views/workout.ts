/**
 * Workout View
 * Full-screen workout execution page with timer, controls, and progress tracking
 */

import { getConfig, getAudioFile, saveSession } from '../db';
import { navigate } from '../router';
import { TimerEngine, type TimerState, type TimerContext } from '../timer/engine';
import { type AudioManager, getGlobalAudioManager } from '../timer/audio';
import { VoicePackManager } from '../timer/voice-pack';
import { loadSnapshot, clearSnapshot, saveIncompleteAndClear, markSnapshotPaused, markSnapshotResumed, initializeSnapshotHooks, type WorkoutSnapshot } from '../timer/snapshot';
import { setState, getState } from '../state';
import { createTimerDisplay, updateTimerDisplay } from '../components/timer-display';
import { createProgressBar } from '../components/progress-bar';
import type { AppConfig, MusicSettings, VoiceScene } from '../types';

let timerEngine: TimerEngine | null = null;
let audioManager: AudioManager | null = null;
let voicePackManager: VoicePackManager | null = null;
let currentState: TimerState = 'idle';
let previousPhase: TimerContext['phase'] | null = null;
let suppressNextPhaseSound = false;
let workoutConfig: AppConfig | null = null;
let announcedCountdownSeconds = new Set<number>();
let announcedMilestones = new Set<string>();

// ─── Encouragement Pool (60 items) ───────────────────────────────────────────
// Three styles: 暖心鼓励型 / 能量激励型 / 趣味调侃型 + 状态型

const ENCOURAGEMENT_POOL = [
  // 暖心鼓励型 — 温柔有力量 (刘宇宁风格) ×20
  '你不是一个人在练，我在这陪着你。',
  '每一滴汗水，都是给自己最好的礼物。',
  '不用和别人比，今天比昨天好，就是进步。',
  '慢慢来，身体会记住每一次用心的动作。',
  '感受一下呼吸，稳住，你做得很好。',
  '这个动作很辛苦，但你坚持下来了，真棒。',
  '累了没关系，但别停，坚持到最后一秒。',
  '你选择开始，就已经赢了一半。',
  '每一下都有意义，身体在悄悄变好。',
  '深吸一口气，把力量送到肌肉里。',
  '比起昨天，今天的你又强了一点。',
  '不是每一天都容易，但每一天都值得。',
  '你的努力，身体都记得。',
  '保持住，这组快结束了，撑住！',
  '感受肌肉的发力，这是你变强的声音。',
  '坚持锻炼的人，永远拥有最好的状态。',
  '每一个努力的瞬间，都在变成将来的礼物。',
  '你比昨天更好，这就够了。',
  '一步一步，不快不慢，都是你的节奏。',
  '以后的你，一定会感谢现在这个努力的你。',
  // 能量激励型 ×16
  '收紧核心，冲！',
  '专注发力，每一下都算数！',
  '感受肌肉燃烧，这是变强的证明！',
  '呼气发力，吸气还原，节奏稳住！',
  '全力以赴，漂亮地完成这组！',
  '爆发力来了，全力以赴！',
  '核心收紧，力量到位！',
  '动作到位，效果翻倍！',
  '再撑几秒，你可以的！',
  '全程发力，不要偷懒！',
  '感受每一块肌肉都在参与！',
  '加油！就这几下！',
  '没有做不到，只有不想做！',
  '你的身体比你想象的强大！',
  '就差这几秒，拼了！',
  '这把汗出得值！',
  // 趣味鼓励型 ×14
  '教练说了，不能停！',
  '别想太多，脑子一热冲就完了！',
  '排出去的是借口，留下来的是实力！',
  '这是送给自己的礼物，不收白不收！',
  '现在多一滴汗，以后多一分自信！',
  '偷懒？不存在的！',
  '这几下，算什么，继续！',
  '汗水不会说谎，努力都在积累！',
  '身体在喊停，但意志力说不行！',
  '坚持住，这把汗流得很值！',
  '想想你开始的理由，继续！',
  '以后的你，会感谢现在咬牙的你！',
  '下一个休息就是奖励，冲过去！',
  '保持节奏，稳住！',
  // 状态调整型 ×10
  '专注呼吸，把注意力放在动作上！',
  '姿势保持标准，继续！',
  '节奏稳了，继续，撑住！',
  '放松肩膀，力量传到对的地方！',
  '呼吸有节奏，动作更有力！',
  '不要憋气，放松，继续动！',
  '一呼一吸，跟着节奏走！',
  '身体放松，专注在动作上！',
  '放慢节奏，做到位比做快更重要！',
  '收腹，挺胸，继续保持！',
];

// ─── Story Pool (休息时播放的励志小故事) ────────────────────────────────────
const STORY_POOL = [
  '有人问，你练那么苦值得吗？他说：对不起自己才最不值。',
  '一位百岁老人每天散步，他说：腿不走，心就先老了。',
  '世界冠军说，成功没有捷径，只有每天积累的汗水。',
  '一棵树，风越大，根扎得越深。你也一样，越练越强。',
  '困难是磨刀石，经历它，你才能变得更加锋利。',
  '体能是勇气的基础，身体强壮，心也更有力量。',
  '最难的不是开始，而是很累时依然选择坚持。',
  '汗水里藏着答案，只有坚持，才能找到。',
  '不怕慢，就怕站。走一步，就是前进了一步。',
  '今天的努力，是给将来自己最好的投资。',
  '运动是最公平的事，你付出多少，身体就回报多少。',
  '每一个坚持练习的人，都在用汗水书写自己的故事。',
  '有人问怎么变强，答案只有一个：每天比昨天多坚持一点。',
  '身体是最诚实的，你练，它就回应；你停，它就沉默。',
  '山再高，脚一步一步地走，总能到达。',
];

// ─── Lyrics Pool (休息时朗诵歌词风格的励志短句) ────────────────────────────
const LYRICS_POOL = [
  '风吹过山河，带走了不舍，留下的是坚定前行的勇气。',
  '一步一步向前，哪怕风雨，哪怕山高路远，心中有光。',
  '再苦再累，我也要做那个不服输的人。',
  '拼尽全力，不留遗憾，这才是我的方式。',
  '每一个坚持都是一首歌，在岁月里慢慢回响。',
  '勇敢地前行，不回头，前方有你要的答案。',
  '山再高又怎样，攀登才是我的本能。',
  '这条路，我选择了就不后悔，一直走下去。',
  '心中有梦，脚下有路，什么困难都是纸老虎。',
  '用汗水换明天，用坚持写未来。',
];

let encouragementQueue: string[] = [];
let encouragementIndex = 0;
let storyQueue: string[] = [];
let storyIndex = 0;
let lyricsQueue: string[] = [];
let lyricsIndex = 0;

function shufflePool(pool: string[]): string[] {
  const arr = [...pool];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function initEncouragementQueue(): void {
  encouragementQueue = shufflePool(ENCOURAGEMENT_POOL);
  encouragementIndex = 0;
  storyQueue = shufflePool(STORY_POOL);
  storyIndex = 0;
  lyricsQueue = shufflePool(LYRICS_POOL);
  lyricsIndex = 0;
}

function nextEncouragement(): string {
  if (encouragementIndex >= encouragementQueue.length) {
    encouragementQueue = shufflePool(ENCOURAGEMENT_POOL);
    encouragementIndex = 0;
  }
  return encouragementQueue[encouragementIndex++];
}

function nextStory(): string {
  if (storyIndex >= storyQueue.length) {
    storyQueue = shufflePool(STORY_POOL);
    storyIndex = 0;
  }
  return storyQueue[storyIndex++];
}

function nextLyrics(): string {
  if (lyricsIndex >= lyricsQueue.length) {
    lyricsQueue = shufflePool(LYRICS_POOL);
    lyricsIndex = 0;
  }
  return lyricsQueue[lyricsIndex++];
}

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
    initEncouragementQueue();

    // Initialize voice pack manager.
    voicePackManager = new VoicePackManager(config.voicePackSettings);

    // Initialize background music (async, non-blocking).
    if (config.musicSettings?.enabled) {
      loadWorkoutMusic(config.musicSettings).catch((err) => {
        console.warn('Background music failed to load:', err);
      });
    }

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

async function loadWorkoutMusic(settings: MusicSettings): Promise<void> {
  if (!audioManager) return;
  if (settings.exerciseMusicFileId) {
    const record = await getAudioFile(settings.exerciseMusicFileId);
    if (record) {
      audioManager.loadMusic('exercise', record.blob);
    }
  }
  if (settings.restMusicFileId) {
    const record = await getAudioFile(settings.restMusicFileId);
    if (record) {
      audioManager.loadMusic('rest', record.blob);
    }
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
  announcedMilestones = new Set<string>();

  if (suppressNextPhaseSound) {
    suppressNextPhaseSound = false;
    previousPhase = phase;
    return;
  }

  if (previousPhase === null) {
    if (phase === 'exercise') {
      audioManager.playExerciseStart();
      void announceExerciseGuidance(ctx);
    }
    previousPhase = phase;
    switchBackgroundMusic(phase);
    return;
  }

  if (phase !== previousPhase) {
    if (previousPhase === 'exercise' && (phase === 'rest' || phase === 'project-rest')) {
      audioManager.playExerciseComplete();
    }
    if (phase === 'exercise') {
      audioManager.playExerciseStart();
      void announceExerciseGuidance(ctx);
    }
    if (phase === 'rest' || phase === 'project-rest') {
      void announcePhaseStart(phase);
    }
    switchBackgroundMusic(phase);
  }

  previousPhase = phase;
}

function handleTimerTick(remainingMs: number): void {
  const remainingSeconds = Math.ceil(remainingMs / 1000);
  updateTimerDisplay({ remainingSeconds });

  if (!timerEngine || !audioManager) return;

  let ctx: TimerContext | null = null;
  try {
    ctx = timerEngine.getContext();
  } catch {
    // context not available yet
  }

  // --- Countdown reminders (10s + last 3s) ---
  if (workoutConfig?.audioCoach?.countdownReminderEnabled && ctx) {
    if ((remainingSeconds === 10 || remainingSeconds <= 3) && remainingSeconds > 0 && !announcedCountdownSeconds.has(remainingSeconds)) {
      announcedCountdownSeconds.add(remainingSeconds);
      audioManager.speak(`还有 ${remainingSeconds} 秒`);
    }
    if (remainingSeconds <= 3 && remainingSeconds > 0) {
      audioManager.playTick();
      if (navigator.vibrate) navigator.vibrate(50);
    }
  }

  // --- Mid-exercise motivational encouragement (sets ≥ 25 s) ---
  if (
    workoutConfig?.audioCoach?.voiceGuidanceEnabled &&
    ctx?.phase === 'exercise'
  ) {
    const exercise = workoutConfig.exercises[ctx.exerciseIndex];
    const setDurationSeconds = exercise?.setDurationSeconds ?? 0;
    const totalMs = setDurationSeconds * 1000;
    // Only encourage on longer sets, and stop before the countdown window
    if (setDurationSeconds >= 25 && remainingMs > 12000) {
      const progress = (totalMs - remainingMs) / totalMs;
      if (progress >= 0.5 && !announcedMilestones.has('50')) {
        announcedMilestones.add('50');
        audioManager.speak(nextEncouragement());
      } else if (progress >= 0.75 && !announcedMilestones.has('75')) {
        announcedMilestones.add('75');
        audioManager.speak(nextEncouragement());
      }
    }
  }
}

function switchBackgroundMusic(phase: TimerContext['phase']): void {
  if (!audioManager || !workoutConfig?.musicSettings?.enabled || !audioManager.hasMusic()) return;
  const settings = workoutConfig.musicSettings;
  const isExercise = phase === 'exercise';
  audioManager.playMusicForPhase(
    isExercise ? 'exercise' : 'rest',
    isExercise ? (settings.exerciseVolume ?? 0.5) : (settings.restVolume ?? 0.3)
  );
}

async function announceExerciseGuidance(ctx: TimerContext): Promise<void> {
  if (!audioManager || !workoutConfig?.audioCoach?.voiceGuidanceEnabled) {
    return;
  }

  // Try voice pack first.
  if (voicePackManager) {
    const played = await voicePackManager.tryPlayScene('exercise_start');
    if (played) return;
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

async function announcePhaseStart(phase: TimerContext['phase']): Promise<void> {
  if (!audioManager || !workoutConfig?.audioCoach?.voiceGuidanceEnabled) {
    return;
  }

  if (phase === 'rest' || phase === 'project-rest') {
    const scene: VoiceScene = phase === 'rest' ? 'rest_start' : 'project_rest_start';

    // Try voice pack first.
    if (voicePackManager) {
      const played = await voicePackManager.tryPlayScene(scene);
      if (played) return;
    }

    // TTS with randomised story / lyrics / fixed content.
    const rand = Math.random();
    if (rand < 0.35) {
      // 播放励志小故事
      audioManager.speak(nextStory());
    } else if (rand < 0.6) {
      // 播放歌词风格励志短句
      audioManager.speak(nextLyrics());
    } else {
      // Fixed phase announcement
      if (phase === 'rest') {
        audioManager.speak('休息开始，调整呼吸。');
      } else {
        audioManager.speak('动作切换休息，准备下一个动作。');
      }
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
    audioManager?.resumeBackgroundMusic();
  } else {
    timerEngine.pause();
    markSnapshotPaused();
    audioManager?.pauseBackgroundMusic();
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
  audioManager?.stopBackgroundMusic();
  voicePackManager?.destroy();
  voicePackManager = null;
  if (options?.clearSnapshot) {
    clearSnapshot();
  }
  currentState = 'idle';
  previousPhase = null;
  suppressNextPhaseSound = false;
  workoutConfig = null;
  announcedCountdownSeconds = new Set<number>();
  announcedMilestones = new Set<string>();
  encouragementQueue = [];
  encouragementIndex = 0;
  storyQueue = [];
  storyIndex = 0;
  lyricsQueue = [];
  lyricsIndex = 0;
}

export function cleanup(): void {
  cleanupWorkout();
}
