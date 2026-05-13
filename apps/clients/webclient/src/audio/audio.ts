import { AudioManager } from "./audioManager.js";

const audio = new AudioManager(4);

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
  EnemySpawn: "/sfx/enemy_spawn.wav",

  CivilianDie: "/sfx/civilian_die.wav",

  Pickup: "/sfx/pickup.wav",
  UiClick: "/sfx/ui_click.wav",
  GameOver: "/sfx/game_over.wav",
} as const;

const MusicFiles = Object.values(Music).flat();

export async function initAudio(): Promise<void> {
  await audio.preload([...MusicFiles, ...Object.values(Sounds)]);
}

export const audioEvents = {
  playerJump(): void {
    audio.playSound(Sounds.PlayerJump);
  },

  playerLand(): void {
    audio.playSound(Sounds.PlayerLand);
  },

  playerSmash(): void {
    audio.playSound(Sounds.PlayerSmash);
  },

  playerHurt(): void {
    audio.playSound(Sounds.PlayerHurt);
  },

  playerDie(): void {
    audio.playSound(Sounds.PlayerDie);
  },

  enemyDie(): void {
    audio.playSound(Sounds.EnemyDie);
  },

  enemySpawn(): void {
    audio.playSound(Sounds.EnemySpawn);
  },

  civilianDie(): void {
    audio.playSound(Sounds.CivilianDie);
  },

  pickup(): void {
    audio.playSound(Sounds.Pickup);
  },

  uiClick(): void {
    audio.playSound(Sounds.UiClick);
  },

  gameOver(): void {
    audio.playSound(Sounds.GameOver);
  },
} as const;

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
