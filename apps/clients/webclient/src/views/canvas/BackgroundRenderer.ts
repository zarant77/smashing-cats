import type { GameSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";

type ParallaxLayer = {
  path: string;
  speed: number;
  y: number;
  height: number;
};

const LAYERS: ParallaxLayer[] = [
  { path: "/environments/sky.png", speed: 0, y: 0, height: 1 },
  { path: "/environments/clouds.png", speed: 0.15, y: 20, height: 0.45 },
  { path: "/environments/mountains.png", speed: 0.35, y: 80, height: 0.55 },
  { path: "/environments/forest.png", speed: 0.6, y: 160, height: 0.45 },
];

export class BackgroundRenderer {
  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, snapshot: GameSnapshot): void {
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

    const offset = -(snapshot.world.scrollX * layer.speed) % width;
    const startX = offset > 0 ? offset - width : offset;

    for (let x = startX; x < canvas.width; x += width) {
      ctx.drawImage(image, x, layer.y, width, height);
    }
  }
}
