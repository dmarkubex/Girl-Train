export class AudioManager {
  private ctx: AudioContext | null = null;
  private initialized: boolean = false;
  private voiceEnabled: boolean = false;

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
      utterance.rate = options?.rate ?? 1;
      utterance.pitch = options?.pitch ?? 1;
      utterance.volume = options?.volume ?? 1;

      // Explicitly pick a Chinese voice when available (avoids silent fallback on iOS).
      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(v => v.lang.startsWith('zh'));
      if (zhVoice) {
        utterance.voice = zhVoice;
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
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
    this.ctx = null;
    this.initialized = false;
  }
}

let globalAudioManager: AudioManager | null = null;

export function getGlobalAudioManager(): AudioManager {
  if (!globalAudioManager) {
    globalAudioManager = new AudioManager();
  }
  return globalAudioManager;
}
