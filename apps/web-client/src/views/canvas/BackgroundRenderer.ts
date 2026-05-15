import type { GameSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";

type ParallaxLayer = {
  path: string;
  speed: number;
  y: number;
  height: number;
  mirror?: boolean;
};

const LAYERS: ParallaxLayer[] = [
  { path: "/environments/sky.png", speed: 0, y: 0, height: 1 },
  { path: "/environments/clouds.png", speed: 0.05, y: 20, height: 0.45 },
  { path: "/environments/mountains.png", speed: 0.10, y: 150, height: 0.35, mirror: true },
  { path: "/environments/forest.png", speed: 0.6, y: 190, height: 0.35, mirror: false },
];

export class BackgroundRenderer {
  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, snapshot: GameSnapshot): void {
    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const layer of LAYERS) {
      this.drawLayer(ctx, canvas, snapshot, layer);
    }
  }

  private drawLayer(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, snapshot: GameSnapshot, layer: ParallaxLayer): void {
    const image = assets.get(layer.path);

    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return;
    }

    const height = canvas.height * layer.height;
    const scale = height / image.naturalHeight;
    const width = image.naturalWidth * scale;

    const drawWidth = Math.ceil(width) + 1;
    const drawHeight = Math.ceil(height);
    const drawY = Math.round(layer.y);

    const scroll = snapshot.world.scrollX * layer.speed;

    const firstTileIndex = Math.floor(scroll / width);
    const offsetX = -(scroll - firstTileIndex * width);

    for (let tileIndex = firstTileIndex; offsetX + (tileIndex - firstTileIndex) * width < canvas.width + width; tileIndex++) {
      const x = offsetX + (tileIndex - firstTileIndex) * width;
      const drawX = Math.round(x);

      ctx.save();

      const shouldMirror = layer.mirror === true && Math.abs(tileIndex) % 2 === 1;

      if (shouldMirror) {
        ctx.translate(drawX + drawWidth, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
      } else {
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      }

      ctx.restore();
    }
  }
}
