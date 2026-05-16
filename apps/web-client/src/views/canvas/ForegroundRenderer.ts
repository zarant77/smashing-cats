import type { GameSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";
import type { RenderViewport } from "./viewport.js";

const SPAWN_PROBABILITY = 0.5;

type ForegroundSprite = {
  path: string;
  minScale: number;
  maxScale: number;
  y: number;
  speed: number;
  weight: number;
  alpha?: number;
};

type ForegroundObject = {
  path: string;
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
  mirror: boolean;
};

const SPRITES: ForegroundSprite[] = [
  { path: "/environments/fg_tree1.png", minScale: 0.6, maxScale: 0.8, y: -20, speed: 1.35, weight: 1 },
  { path: "/environments/fg_tree2.png", minScale: 0.6, maxScale: 0.8, y: -20, speed: 1.35, weight: 1 },
  { path: "/environments/fg_tree3.png", minScale: 0.6, maxScale: 0.8, y: -20, speed: 1.35, weight: 1 },
  { path: "/environments/fg_fence1.png", minScale: 0.8, maxScale: 1, y: 92, speed: 1, weight: 3 },
  { path: "/environments/fg_stump1.png", minScale: 0.6, maxScale: 0.8, y: 90, speed: 1, weight: 5 },
  { path: "/environments/fg_stump2.png", minScale: 0.6, maxScale: 0.8, y: 90, speed: 1, weight: 5 },
  { path: "/environments/fg_stump3.png", minScale: 0.8, maxScale: 1, y: 90, speed: 1, weight: 5 },
  { path: "/environments/fg_stump4.png", minScale: 0.8, maxScale: 1, y: 90, speed: 1, weight: 5 },
  { path: "/environments/fg_pumpkin1.png", minScale: 0.6, maxScale: 1, y: 80, speed: 1, weight: 5 },
  { path: "/environments/fg_pumpkin2.png", minScale: 0.6, maxScale: 1, y: 80, speed: 1, weight: 5 },
];

const MIN_SPAWN_DISTANCE = 500;
const MAX_SPAWN_DISTANCE = 900;
const DESPAWN_PADDING = 400;
const SPAWN_AHEAD_DISTANCE = 900;

export class ForegroundRenderer {
  private readonly objects: ForegroundObject[] = [];
  private lastScrollX: number | undefined;
  private nextSpawnX = 0;

  public draw(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, snapshot: GameSnapshot, viewport: RenderViewport): void {
    ctx.imageSmoothingEnabled = false;

    const deltaScrollX = this.getDeltaScrollX(snapshot.world.scrollX);

    this.moveObjects(deltaScrollX, viewport);
    this.spawnObjects(canvas);
    this.removeOldObjects(viewport);

    for (const object of this.objects) {
      this.drawObject(ctx, canvas, viewport, object);
    }
  }

  private getDeltaScrollX(scrollX: number): number {
    if (this.lastScrollX === undefined) {
      this.lastScrollX = scrollX;
      return 0;
    }

    const deltaScrollX = scrollX - this.lastScrollX;
    this.lastScrollX = scrollX;

    return deltaScrollX;
  }

  private moveObjects(deltaScrollX: number, viewport: RenderViewport): void {
    const deltaX = deltaScrollX * viewport.scale;

    for (const object of this.objects) {
      object.x -= deltaX * object.speed;
    }

    this.nextSpawnX -= deltaX;
  }

  private spawnObjects(canvas: HTMLCanvasElement): void {
    if (this.nextSpawnX === 0) {
      this.nextSpawnX = canvas.width + this.randomBetween(100, 300);
    }

    while (this.nextSpawnX < canvas.width + SPAWN_AHEAD_DISTANCE) {
      if (Math.random() <= SPAWN_PROBABILITY) {
        this.objects.push(this.createObject(this.nextSpawnX));
      }

      this.nextSpawnX += this.randomBetween(MIN_SPAWN_DISTANCE, MAX_SPAWN_DISTANCE);
    }
  }

  private createObject(x: number): ForegroundObject {
    const sprite = this.pickSprite();

    return {
      path: sprite.path,
      x,
      y: sprite.y,
      scale: this.randomBetween(sprite.minScale, sprite.maxScale),
      speed: sprite.speed,
      alpha: sprite.alpha ?? 1,
      mirror: Math.random() > 0.5,
    };
  }

  private pickSprite(): ForegroundSprite {
    const totalWeight = SPRITES.reduce((sum, sprite) => sum + sprite.weight, 0);
    let random = Math.random() * totalWeight;

    for (const sprite of SPRITES) {
      random -= sprite.weight;

      if (random <= 0) {
        return sprite;
      }
    }

    return SPRITES[0];
  }

  private removeOldObjects(viewport: RenderViewport): void {
    while (this.objects.length > 0) {
      const object = this.objects[0];
      const image = assets.get(object.path);
      const width = image.complete ? image.naturalWidth * object.scale * viewport.scale : 0;

      if (object.x + width >= -DESPAWN_PADDING) {
        return;
      }

      this.objects.shift();
    }
  }

  private drawObject(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement, viewport: RenderViewport, object: ForegroundObject): void {
    const image = assets.get(object.path);

    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return;
    }

    const width = Math.round(image.naturalWidth * object.scale * viewport.scale);
    const height = Math.round(image.naturalHeight * object.scale * viewport.scale);

    const screenX = Math.round(object.x);
    const bottomY = canvas.height - Math.round(object.y * viewport.scale);

    if (screenX + width < 0 || screenX > canvas.width) {
      return;
    }

    ctx.save();
    ctx.globalAlpha = object.alpha;

    if (object.mirror) {
      ctx.translate(screenX + width, bottomY);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, -height, width, height);
    } else {
      ctx.drawImage(image, screenX, bottomY - height, width, height);
    }

    ctx.restore();
  }

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
