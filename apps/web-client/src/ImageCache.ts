export class ImageCache {
  private readonly images = new Map<string, HTMLImageElement>();

  public get(path: string): HTMLImageElement {
    let image = this.images.get(path);

    if (image) {
      return image;
    }

    image = new Image();
    image.src = path;

    this.images.set(path, image);

    return image;
  }

  public async preload(paths: readonly string[]): Promise<void> {
    await Promise.all(paths.map((path) => this.load(path)));
  }

  private async load(path: string): Promise<void> {
    const image = this.get(path);

    if (image.complete) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error(`Failed to load ${path}`));
    });
  }
}
