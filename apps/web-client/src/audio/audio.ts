import { AudioManager } from "./audioManager.js";

export const audio = new AudioManager(4);

const Music = {
  Gameplay: ["/bgm/bgm1.mp3", "/bgm/bgm2.mp3"],
} as const;

const Sounds = {
  PlayerJump: "/sfx/player_jump.wav",
  PlayerLand: "/sfx/player_land.wav",
  PlayerSmash: "/sfx/player_smash.wav",
  PlayerHurt: "/sfx/player_hurt.wav",
  PlayerDie: "/sfx/player_die.wav",

  EnemyDie: "/sfx/enemy_die.wav",
  BoarEnemyDie: "/sfx/enemy_die_boar.wav",
  CrowEnemyDie: "/sfx/enemy_die_crow.wav",
  OrcEnemyDie: "/sfx/enemy_die_orc.wav",
  RatEnemyDie: "/sfx/enemy_die_rat.wav",

  CivilianDie: "/sfx/civilian_die.wav",

  Pickup: "/sfx/pickup.wav",
  UiClick: "/sfx/ui_click.wav",
  GameOver: "/sfx/game_over.wav",
} as const;

type SoundKey = keyof typeof Sounds;

const MusicFiles = Object.values(Music).flat();

export async function initAudio(): Promise<void> {
  setupAudioUnlock();
  await audio.preload([...MusicFiles, ...Object.values(Sounds)]);
}

export function playSound(key: SoundKey, kind?: string) {
  const prefix = kind?.length ? kind[0].toUpperCase() + kind.slice(1) : "";
  let sounds = Sounds[key];

  if (Object.hasOwn(Sounds, prefix + key)) {
    sounds = Sounds[(prefix + key) as SoundKey];
  }

  audio.playSound(sounds);
}

export const musicEvents = {
  gameplay(): void {
    void audio.playMusic(Music.Gameplay, 0.8);
  },

  stop(): void {
    audio.stopMusic();
  },

  setVolume(volume: number): void {
    audio.setMusicVolume(volume);
  },
} as const;

let audioUnlocked = false;

function setupAudioUnlock(): void {
  const unlock = (): void => {
    if (audioUnlocked) {
      return;
    }

    audioUnlocked = true;

    void audio.playMusic(["/bgm/bgm1.mp3", "/bgm/bgm2.mp3"], 0.4);

    window.removeEventListener("pointerdown", unlock);
    window.removeEventListener("keydown", unlock);
    window.removeEventListener("touchstart", unlock);
  };

  window.addEventListener("pointerdown", unlock, { passive: true });
  window.addEventListener("keydown", unlock);
  window.addEventListener("touchstart", unlock, { passive: true });
}
