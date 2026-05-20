export class ImageCache {
  private readonly cache = new Map<string, Promise<HTMLImageElement>>();
  private readonly loaded = new Map<string, HTMLImageElement>();

  public preload(paths: readonly string[]): Promise<void> {
    return Promise.all(paths.map((path) => this.load(path))).then(() => undefined);
  }

  public load(path: string): Promise<HTMLImageElement> {
    const cached = this.cache.get(path);

    if (cached !== undefined) {
      return cached;
    }

    const promise = new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();

      image.onload = () => {
        this.loaded.set(path, image);
        resolve(image);
      };

      image.onerror = () => reject(new Error(`Failed to load image: ${path}`));

      image.src = path;
    });

    this.cache.set(path, promise);

    return promise;
  }

  public get(path: string): Promise<HTMLImageElement> | undefined {
    return this.cache.get(path);
  }

  public getLoaded(path: string): HTMLImageElement {
    const image = this.loaded.get(path);

    if (image === undefined) {
      throw new Error(`Image is not loaded: ${path}`);
    }

    return image;
  }
}
