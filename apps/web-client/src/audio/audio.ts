import { getAudioAsset } from "../assets/assets.js";
import { AudioManager } from "./audioManager.js";

export const audio = new AudioManager(4);

const GAMEPLAY_MUSIC_KEYS = ["music.gameplay1", "music.gameplay2"] as const;

type SoundAudioKey = `sound.${string}`;
type MusicAudioKey = `music.${string}`;
type AudioKey = SoundAudioKey | MusicAudioKey;

export async function initAudio(): Promise<void> {
  setupAudioUnlock();
}

export function playSound(key: SoundAudioKey): void {
  audio.playSound(getAudioPath(key));
}

export const musicEvents = {
  gameplay(): void {
    void audio.playMusic(getAudioPaths(GAMEPLAY_MUSIC_KEYS), 0.8);
  },

  stop(): void {
    audio.stopMusic();
  },

  setVolume(volume: number): void {
    audio.setMusicVolume(volume);
  },
} as const;

function getAudioPath(key: AudioKey): string {
  return getAudioAsset(key);
}

function getAudioPaths(keys: readonly AudioKey[]): string[] {
  return keys.map((key) => getAudioPath(key));
}

let audioUnlocked = false;

function setupAudioUnlock(): void {
  const unlock = (): void => {
    if (audioUnlocked) {
      return;
    }

    try {
      musicEvents.gameplay();
    } catch (error) {
      console.warn("Audio assets are not ready yet.", error);
      return;
    }

    audioUnlocked = true;
    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
}
