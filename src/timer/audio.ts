export class AudioManager {
  private ctx: AudioContext | null = null;
  private initialized: boolean = false;
  private voiceEnabled: boolean = false;

  // Background music
  private exerciseMusicElement: HTMLAudioElement | null = null;
  private restMusicElement: HTMLAudioElement | null = null;
  private currentMusicElement: HTMLAudioElement | null = null;
  private musicBlobUrls: string[] = [];

  /**
   * Initialize AudioContext - MUST be called from user gesture (click/touch)
   */
  init(): void {
    if (this.initialized) {
      return;
    }

    this.voiceEnabled = typeof window !== 'undefined' && 'speechSynthesis' in window;

    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        this.ctx = new AudioContextClass();

        // Resume context (required for browsers that suspend it)
        if (this.ctx.state === 'suspended') {
          this.ctx.resume();
        }

        // Play a silent sound to unlock audio on some browsers
        const oscillator = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        gain.gain.value = 0;
        oscillator.connect(gain);
        gain.connect(this.ctx.destination);
        oscillator.start(0);
        oscillator.stop(0.01);

        this.initialized = true;
      }
    } catch (err) {
      console.warn('Audio initialization failed:', err);
    }

    // Some browsers may not expose WebAudio but still support speech synthesis.
    if (this.voiceEnabled) {
      this.initialized = true;
      // iOS requires speechSynthesis to be triggered within a user gesture to
      // unlock it for later timer-callback calls. Fire a silent warm-up here.
      try {
        const warmup = new SpeechSynthesisUtterance('');
        warmup.volume = 0;
        window.speechSynthesis.speak(warmup);
      } catch {
        // ignore
      }
    }
  }

  /** Ensure AudioContext is running (iOS suspends it on calls / screen lock). */
  private ensureAudioReady(): void {
    if (this.ctx && this.ctx.state === 'suspended') {
      void this.ctx.resume();
    }
  }

  supportsVoice(): boolean {
    return this.voiceEnabled;
  }

  speak(text: string, options?: { rate?: number; pitch?: number; volume?: number }): void {
    if (!this.voiceEnabled || !text.trim()) {
      return;
    }

    try {
      // iOS bug: speechSynthesis can get stuck in "paused" state.
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = 'zh-CN';
      // Lower pitch (0.87) and slightly slower rate (0.95) for a warm, mature male voice feel.
      utterance.rate = options?.rate ?? 0.95;
      utterance.pitch = options?.pitch ?? 0.87;
      utterance.volume = options?.volume ?? 1;

      // Prefer a male Chinese voice when available.
      // Known male Chinese voice names by platform:
      //   Windows/Edge: "Microsoft Yunxi Online" (zh-CN), "Microsoft Kangkang"
      //   Azure Cognitive: "zh-CN-YunxiNeural", "zh-CN-YunyangNeural"
      // If none is found the first Chinese voice is used as a fallback.
      const voices = window.speechSynthesis.getVoices();
      const maleChinese = voices.find(v =>
        v.lang.startsWith('zh') &&
        (v.name.toLowerCase().includes('male') ||
          v.name.includes('男') ||
          v.name.includes('Yunxi') ||
          v.name.includes('Yunyang') ||
          v.name.toLowerCase().includes('kangkang'))
      );
      const anyChinese = voices.find(v => v.lang.startsWith('zh'));
      const selected = maleChinese || anyChinese;
      if (selected) {
        utterance.voice = selected;
      }

      // Drop pending utterances so new guidance stays relevant to current phase.
      // iOS needs a tiny gap after cancel() before speak() takes effect.
      window.speechSynthesis.cancel();
      setTimeout(() => window.speechSynthesis.speak(utterance), 50);
    } catch (err) {
      console.warn('Failed to speak guidance:', err);
    }
  }

  stopVoice(): void {
    if (!this.voiceEnabled) {
      return;
    }

    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      console.warn('Failed to stop voice synthesis:', err);
    }
  }

  /**
   * Play beep sounds for state changes
   * @param count - Number of beeps to play
   * @param frequency - Frequency in Hz (default 440)
   * @param duration - Duration per beep in ms (default 200)
   * @param gap - Gap between beeps in ms (default 100)
   */
  playBeep(count: number, frequency: number = 440, duration: number = 200, gap: number = 100): void {
    if (!this.ctx || !this.initialized) {
      return;
    }

    try {
      this.ensureAudioReady();
      const now = this.ctx.currentTime;

      for (let i = 0; i < count; i++) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = frequency;

        // Envelope to avoid clicking
        gain.gain.setValueAtTime(0, now + i * (duration + gap) / 1000);
        gain.gain.linearRampToValueAtTime(0.3, now + i * (duration + gap) / 1000 + 0.01);
        gain.gain.linearRampToValueAtTime(0, now + (i + 1) * (duration + gap) / 1000 - 0.01);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + i * (duration + gap) / 1000);
        osc.stop(now + (i + 1) * (duration + gap) / 1000);
      }
    } catch (err) {
      console.warn('Failed to play beep:', err);
    }
  }

  /**
   * Play countdown tick sound (for last 3 seconds)
   */
  playTick(): void {
    if (!this.ctx || !this.initialized) {
      return;
    }

    try {
      this.ensureAudioReady();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.value = 880;

      // Short, sharp tick
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.2, now + 0.005);
      gain.gain.linearRampToValueAtTime(0, now + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch (err) {
      console.warn('Failed to play tick:', err);
    }
  }

  /**
   * Vibrate device (if supported)
   * @param pattern - Single duration or array of [vibrate, pause, vibrate, ...] in ms
   */
  vibrate(pattern: number | number[]): void {
    if ('vibrate' in navigator) {
      try {
        navigator.vibrate(pattern);
      } catch (err) {
        // Vibration API not available or failed
      }
    }
  }

  /**
   * Play exercise start sound (1 beep + vibration)
   */
  playExerciseStart(): void {
    this.playBeep(1, 440, 200);
    this.vibrate(200);
  }

  /**
   * Play exercise complete sound (2 beeps + double vibration)
   */
  playExerciseComplete(): void {
    this.playBeep(2, 660, 200, 100);
    this.vibrate([100, 50, 100]);
  }

  /**
   * Play countdown tick for last 3 seconds
   */
  playCountdownTick(): void {
    this.playTick();
    this.vibrate(50);
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.stopVoice();
    this.stopBackgroundMusic();
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.initialized = false;
  }

  // ─── Background Music ──────────────────────────────────────────────────────

  /**
   * Load a music file blob for a given phase.
   * Call this before starting the workout.
   */
  loadMusic(type: 'exercise' | 'rest', blob: Blob): void {
    const url = URL.createObjectURL(blob);
    this.musicBlobUrls.push(url);
    const el = new Audio(url);
    el.loop = true;
    if (type === 'exercise') {
      this.exerciseMusicElement = el;
    } else {
      this.restMusicElement = el;
    }
  }

  /**
   * Play or switch background music for the given workout phase.
   * Uses the rest track (if loaded) during rest/project-rest,
   * otherwise falls back to the exercise track at the supplied volume.
   */
  playMusicForPhase(phase: 'exercise' | 'rest', volume: number): void {
    const clampedVol = Math.max(0, Math.min(1, volume));
    const target =
      phase === 'rest' && this.restMusicElement
        ? this.restMusicElement
        : this.exerciseMusicElement;

    if (!target) {
      // No track loaded – just adjust volume on whatever is playing.
      if (this.currentMusicElement) {
        this.currentMusicElement.volume = clampedVol;
      }
      return;
    }

    if (this.currentMusicElement && this.currentMusicElement !== target) {
      // Fade out and switch tracks.
      this.currentMusicElement.pause();
      this.currentMusicElement.currentTime = 0;
    }

    this.currentMusicElement = target;
    target.volume = clampedVol;

    if (target.paused) {
      target.play().catch((err) => {
        // Autoplay may be blocked by the browser until a user gesture is made.
        console.warn('Background music autoplay blocked:', err);
      });
    }
  }

  /** Pause background music (e.g. workout paused). */
  pauseBackgroundMusic(): void {
    this.currentMusicElement?.pause();
  }

  /** Resume background music after a pause. */
  resumeBackgroundMusic(): void {
    if (this.currentMusicElement?.paused) {
      this.currentMusicElement.play().catch(() => {});
    }
  }

  /** Stop and release all background music resources. */
  stopBackgroundMusic(): void {
    if (this.currentMusicElement) {
      this.currentMusicElement.pause();
      this.currentMusicElement = null;
    }
    this.exerciseMusicElement = null;
    this.restMusicElement = null;
    for (const url of this.musicBlobUrls) {
      URL.revokeObjectURL(url);
    }
    this.musicBlobUrls = [];
  }

  /** Returns true when at least an exercise music track has been loaded. */
  hasMusic(): boolean {
    return this.exerciseMusicElement !== null;
  }
}

let globalAudioManager: AudioManager | null = null;

export function getGlobalAudioManager(): AudioManager {
  if (!globalAudioManager) {
    globalAudioManager = new AudioManager();
  }
  return globalAudioManager;
}
