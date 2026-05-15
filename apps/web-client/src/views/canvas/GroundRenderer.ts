import type { GameSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";

const TILE_PATH = "/environments/ground.png";
const TILE_WIDTH = 800;

const GROUND_OFFSET_Y = -55;
const DRAW_OFFSET_Y = 0;

export class GroundRenderer {
  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, snapshot: GameSnapshot): void {
    const image = assets.get(TILE_PATH);

    const groundY = snapshot.world.groundY + GROUND_OFFSET_Y + DRAW_OFFSET_Y;

    if (!this.isReady(image)) {
      this.drawFallback(ctx, canvas, groundY);
      return;
    }

    const scale = TILE_WIDTH / image.naturalWidth;
    const tileHeight = image.naturalHeight * scale;

    const firstTileIndex = Math.floor(snapshot.world.scrollX / TILE_WIDTH);
    const offsetX = -(snapshot.world.scrollX - firstTileIndex * TILE_WIDTH);

    for (let tileIndex = firstTileIndex; offsetX + (tileIndex - firstTileIndex) * TILE_WIDTH < canvas.width + TILE_WIDTH; tileIndex++) {
      const x = offsetX + (tileIndex - firstTileIndex) * TILE_WIDTH;

      this.drawTile(ctx, image, x, groundY, tileHeight, tileIndex);
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    tileHeight: number,
    tileIndex: number,
  ): void {
    const drawX = Math.round(x);
    const drawY = Math.round(y);
    const drawWidth = TILE_WIDTH + 1;
    const drawHeight = Math.ceil(tileHeight);
    const shouldMirror = Math.abs(tileIndex) % 2 === 1;

    ctx.save();

    if (shouldMirror) {
      ctx.translate(drawX + drawWidth, drawY);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
    } else {
      ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    }

    ctx.restore();
  }

  private isReady(image: HTMLImageElement): boolean {
    return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
  }

  private drawFallback(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, groundY: number): void {
    ctx.fillStyle = "#79b851";
    ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);
  }
}
