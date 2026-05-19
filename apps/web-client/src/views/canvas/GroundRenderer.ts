import type { GameSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";
import type { RenderViewport } from "../viewport.js";

const TILE_PATH = "/canvas/environments/ground.png";

const DESIGN_TILE_WIDTH = 800;
const GROUND_OFFSET_Y = -55;

export class GroundRenderer {
  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, snapshot: GameSnapshot, viewport: RenderViewport): void {
    const image = assets.get(TILE_PATH);

    const tileWidth = viewport.worldToScreenSize(DESIGN_TILE_WIDTH);
    const groundY = viewport.worldToScreenY(snapshot.world.groundY + GROUND_OFFSET_Y);

    if (!this.isReady(image)) {
      this.drawFallback(ctx, canvas, groundY);
      return;
    }

    const imageScale = tileWidth / image.naturalWidth;
    const tileHeight = image.naturalHeight * imageScale;

    const scrollX = snapshot.world.scrollX * viewport.scale;

    const firstTileIndex = Math.floor(scrollX / tileWidth);
    const offsetX = -(scrollX - firstTileIndex * tileWidth);

    for (let tileIndex = firstTileIndex; offsetX + (tileIndex - firstTileIndex) * tileWidth < canvas.width + tileWidth; tileIndex++) {
      const x = offsetX + (tileIndex - firstTileIndex) * tileWidth;

      this.drawTile(ctx, image, x, groundY, tileWidth, tileHeight, tileIndex);
    }
  }

  private drawTile(
    ctx: CanvasRenderingContext2D,
    image: HTMLImageElement,
    x: number,
    y: number,
    tileWidth: number,
    tileHeight: number,
    tileIndex: number,
  ): void {
    const drawX = Math.round(x);
    const drawY = Math.round(y);
    const drawWidth = Math.ceil(tileWidth) + 1;
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
