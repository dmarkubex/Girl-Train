export class AudioManager {
  private ctx: AudioContext | null = null;
  private initialized: boolean = false;

  /**
   * Initialize AudioContext - MUST be called from user gesture (click/touch)
   */
  init(): void {
    if (this.initialized) {
      return;
    }

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
