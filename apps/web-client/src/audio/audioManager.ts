export type AudioPath = string | readonly string[];

export type SoundOptions = {
  volume?: number;
  playbackRate?: number;
};

export class AudioManager {
  private readonly music = new Audio();
  private readonly soundPool: HTMLAudioElement[] = [];

  private soundIndex = 0;
  private soundsEnabled = true;
  private musicEnabled = true;

  public constructor(soundChannels = 4) {
    const channelCount = Math.max(1, soundChannels);

    for (let i = 0; i < channelCount; i += 1) {
      const audio = new Audio();

      audio.preload = "auto";

      this.soundPool.push(audio);
    }

    this.music.preload = "auto";
    this.music.loop = true;
  }

  public async playMusic(pathOrPaths: AudioPath, volume = 1): Promise<void> {
    if (!this.musicEnabled || !navigator.userActivation.isActive) {
      return;
    }

    const path = this.pickPath(pathOrPaths);

    if (path === null) {
      return;
    }

    const sameTrack = this.music.src.includes(path);

    this.music.pause();

    if (!sameTrack) {
      this.music.src = path;
    }

    this.music.currentTime = 0;
    this.music.volume = volume;

    this.music.play().catch((error: unknown) => {
      console.warn("Failed to play music", error);
    });
  }

  public stopMusic(): void {
    this.music.pause();
    this.music.currentTime = 0;
  }

  public setMusicVolume(volume: number): void {
    this.music.volume = volume;
  }

  public playSound(pathOrPaths: AudioPath, options: SoundOptions = {}): void {
    if (!this.soundsEnabled || !navigator.userActivation.isActive) {
      return;
    }

    const path = this.pickPath(pathOrPaths);

    if (path === null) {
      return;
    }

    const audio = this.soundPool[this.soundIndex]!;

    this.soundIndex = (this.soundIndex + 1) % this.soundPool.length;

    audio.pause();

    audio.src = path;
    audio.currentTime = 0;

    audio.volume = options.volume ?? 1;
    audio.playbackRate = options.playbackRate ?? 1;

    audio.play().catch((error: unknown) => {
      console.warn("Failed to play sound", error);
    });
  }

  public stopAllSounds(): void {
    for (const audio of this.soundPool) {
      audio.pause();
      audio.currentTime = 0;
    }
  }

  public setSoundsEnabled(enabled: boolean): void {
    this.soundsEnabled = enabled;

    if (!enabled) {
      this.stopAllSounds();
    }
  }

  public setMusicEnabled(enabled: boolean): void {
    this.musicEnabled = enabled;

    if (!enabled) {
      this.stopMusic();
    }
  }

  public getSoundsEnabled(): boolean {
    return this.soundsEnabled;
  }

  public getMusicEnabled(): boolean {
    return this.musicEnabled;
  }

  private pickPath(pathOrPaths: AudioPath): string | null {
    if (typeof pathOrPaths === "string") {
      return pathOrPaths;
    }

    if (pathOrPaths.length === 0) {
      return null;
    }

    const index = Math.floor(Math.random() * pathOrPaths.length);

    return pathOrPaths[index] ?? null;
  }
}
