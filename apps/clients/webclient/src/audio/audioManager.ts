export type AudioPath = string | readonly string[];

export type SoundOptions = {
  volume?: number;
  playbackRate?: number;
};

export class AudioManager {
  private readonly music = new Audio();

  private readonly soundPool: HTMLAudioElement[] = [];

  private soundIndex = 0;

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

  public preload(paths: readonly string[]): void {
    for (const path of paths) {
      const audio = new Audio(path);

      audio.preload = "auto";
    }
  }

  public async playMusic(pathOrPaths: AudioPath, volume = 1): Promise<void> {
    const path = this.pickPath(pathOrPaths);

    if (path === null) {
      return;
    }

    if (this.music.src.includes(path)) {
      return;
    }

    this.music.src = path;
    this.music.volume = volume;

    try {
      await this.music.play();
    } catch (error) {
      console.error("Failed to play music", error);
    }
  }

  public stopMusic(): void {
    this.music.pause();
    this.music.currentTime = 0;
  }

  public setMusicVolume(volume: number): void {
    this.music.volume = volume;
  }

  public playSound(pathOrPaths: AudioPath, options: SoundOptions = {}): void {
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

    void audio.play();
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
