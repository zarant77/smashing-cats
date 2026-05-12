import type { GameSnapshot } from "@smashing-cats/protocol";
import { ImageCache } from "./ImageCache.js";

const TILE_PATH = "/environments/ground.png";
const TILE_WIDTH = 400;
const GROUND_OFFSET_Y = -20;

export class GroundRenderer {
  private readonly images = new ImageCache();

  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, snapshot: GameSnapshot): void {
    const image = this.images.get(TILE_PATH);

    const groundY = snapshot.world.groundY + GROUND_OFFSET_Y;

    if (!this.isReady(image)) {
      this.drawFallback(ctx, canvas, groundY);
      return;
    }

    const scale = TILE_WIDTH / image.naturalWidth;
    const tileHeight = image.naturalHeight * scale;

    const offsetX = this.getOffset(snapshot.world.scrollX);

    for (let x = offsetX; x < canvas.width; x += TILE_WIDTH) {
      for (let y = groundY; y < canvas.height; y += tileHeight) {
        ctx.drawImage(image, x, y, TILE_WIDTH, tileHeight);
      }
    }
  }

  private getOffset(scrollX: number): number {
    const offset = -scrollX % TILE_WIDTH;

    return offset > 0 ? offset - TILE_WIDTH : offset;
  }

  private isReady(image: HTMLImageElement): boolean {
    return image.complete && image.naturalWidth > 0;
  }

  private drawFallback(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number): void {
    ctx.fillStyle = "#79b851";

    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  }
}
