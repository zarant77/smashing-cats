export class AudioCache {
  private readonly cache = new Map<string, Promise<HTMLAudioElement>>();
  private readonly loaded = new Map<string, HTMLAudioElement>();

  public preload(paths: readonly string[]): Promise<void> {
    return Promise.all(paths.map((path) => this.load(path))).then(() => undefined);
  }

  public load(path: string): Promise<HTMLAudioElement> {
    const cached = this.cache.get(path);

    if (cached !== undefined) {
      return cached;
    }

    const promise = new Promise<HTMLAudioElement>((resolve, reject) => {
      const audio = new Audio();

      audio.preload = "auto";

      audio.addEventListener(
        "canplaythrough",
        () => {
          this.loaded.set(path, audio);
          resolve(audio);
        },
        { once: true },
      );

      audio.addEventListener("error", () => reject(new Error(`Failed to load audio: ${path}`)), { once: true });

      audio.src = path;
      audio.load();
    });

    this.cache.set(path, promise);

    return promise;
  }

  public get(path: string): Promise<HTMLAudioElement> | undefined {
    return this.cache.get(path);
  }

  public getLoaded(path: string): HTMLAudioElement {
    const audio = this.loaded.get(path);

    if (audio === undefined) {
      throw new Error(`Audio is not loaded: ${path}`);
    }

    return audio;
  }
}
