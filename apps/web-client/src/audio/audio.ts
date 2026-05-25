import { getAudioAsset } from "../assetManager/assetManager.js";
import { AudioManager } from "./audioManager.js";

export const audio = new AudioManager(4);

const GAMEPLAY_MUSIC_KEYS = ["music.gameplay1", "music.gameplay2"] as const;

const UNLOCK_EVENTS = [
  "pointerdown",
  "pointerup",
  "touchstart",
  "touchend",
  "mousedown",
  "mouseup",
  "click",
  "keydown",
] as const;

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

export function setPause(isPaused: boolean): void {
  audio.setPause(isPaused);
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

export function setupMusicUnlock(): void {
  const unlock = (): void => {
    if (!navigator.userActivation.isActive) {
      return;
    }

    musicEvents.gameplay();

    for (const event of UNLOCK_EVENTS) {
      window.removeEventListener(event, unlock);
    }
  };

  for (const event of UNLOCK_EVENTS) {
    window.addEventListener(event, unlock, {
      passive: true,
      once: true,
    });
  }
}

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
