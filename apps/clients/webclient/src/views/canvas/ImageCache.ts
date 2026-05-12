export class ImageCache {
  private readonly images = new Map<string, HTMLImageElement>();

  public get(path: string): HTMLImageElement {
    const cachedImage = this.images.get(path);
    if (cachedImage !== undefined) {
      return cachedImage;
    }

    const image = new Image();
    image.src = path;
    this.images.set(path, image);

    return image;
  }
}
