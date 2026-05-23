import { getAudioAsset } from "../assets/assets.js";
import { AudioManager } from "./audioManager.js";

export const audio = new AudioManager(4);

const GAMEPLAY_MUSIC_KEYS = ["music.gameplay1", "music.gameplay2"] as const;

type SoundAudioKey = `sound.${string}`;
type MusicAudioKey = `music.${string}`;
type AudioKey = SoundAudioKey | MusicAudioKey;

export function playSound(key: SoundAudioKey): void {
  const path = getAudioPath(key);

  if (path === undefined) {
    return;
  }

  audio.playSound(path);
}

export const musicEvents = {
  gameplay(): void {
    const paths = getAudioPaths(GAMEPLAY_MUSIC_KEYS);

    if (paths.length === 0) {
      return;
    }

    void audio.playMusic(paths, 0.8);
  },

  stop(): void {
    audio.stopMusic();
  },

  setVolume(volume: number): void {
    audio.setMusicVolume(volume);
  },
} as const;

function getAudioPath(key: AudioKey): string | undefined {
  try {
    return getAudioAsset(key);
  } catch (error) {
    console.warn(`Audio asset is not found: ${key}.`, error);
    return undefined;
  }
}

function getAudioPaths(keys: readonly AudioKey[]): string[] {
  return keys.flatMap((key) => {
    const path = getAudioPath(key);

    return path === undefined ? [] : [path];
  });
}

let audioUnlocked = false;

export function setupAudioUnlock(): void {
  const unlock = (): void => {
    if (audioUnlocked) {
      return;
    }

    try {
      setTimeout(() => musicEvents.gameplay(), 100);
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
