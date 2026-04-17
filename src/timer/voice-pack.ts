import { getAudioFile } from '../db.js';
import type { VoicePackSettings, VoiceScene } from '../types.js';

/**
 * VoicePackManager
 *
 * Plays pre-recorded audio files for specific workout scenes
 * (exercise_start, rest_start, etc.).  Falls back gracefully to
 * Web Speech API TTS when no file has been uploaded for a scene.
 */
export class VoicePackManager {
  private settings: VoicePackSettings;
  private activeAudio: HTMLAudioElement | null = null;
  private activeBlobUrl: string | null = null;

  constructor(settings: VoicePackSettings) {
    this.settings = settings;
  }

  updateSettings(settings: VoicePackSettings): void {
    this.settings = settings;
  }

  /**
   * Attempt to play the pre-recorded audio for the given scene.
   * Returns `true` if the file was found and playback started,
   * `false` otherwise (caller should fall back to TTS).
   */
  async tryPlayScene(scene: VoiceScene): Promise<boolean> {
    const fileId = this.settings.scenes[scene];
    if (!fileId) {
      return false;
    }

    let record;
    try {
      record = await getAudioFile(fileId);
    } catch {
      return false;
    }

    if (!record) {
      return false;
    }

    this.stopCurrent();

    const url = URL.createObjectURL(record.blob);
    const audio = new Audio(url);
    this.activeAudio = audio;
    this.activeBlobUrl = url;

    audio.onended = () => {
      if (this.activeBlobUrl === url) {
        URL.revokeObjectURL(url);
        this.activeAudio = null;
        this.activeBlobUrl = null;
      }
    };

    const cleanup = () => {
      URL.revokeObjectURL(url);
      if (this.activeAudio === audio) {
        this.activeAudio = null;
      }
      if (this.activeBlobUrl === url) {
        this.activeBlobUrl = null;
      }
    };

    audio.onerror = () => cleanup();

    try {
      await audio.play();
      return true;
    } catch {
      URL.revokeObjectURL(url);
      this.activeAudio = null;
      this.activeBlobUrl = null;
      return false;
    }
  }

  /** Stop any currently-playing voice-pack audio. */
  stopCurrent(): void {
    if (this.activeAudio) {
      this.activeAudio.pause();
      this.activeAudio = null;
    }
    if (this.activeBlobUrl) {
      URL.revokeObjectURL(this.activeBlobUrl);
      this.activeBlobUrl = null;
    }
  }

  destroy(): void {
    this.stopCurrent();
  }
}
