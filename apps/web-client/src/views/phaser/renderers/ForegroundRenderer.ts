import Phaser from "phaser";
import type { GameSnapshot } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import { getImageAsset, images } from "../../../assetManager/assetManager.js";
import type { RenderViewport } from "../../viewport.js";

const SPAWN_PROBABILITY = 0.5;

const MIN_SPAWN_DISTANCE = 500;
const MAX_SPAWN_DISTANCE = 900;
const DESPAWN_PADDING = 400;
const SPAWN_AHEAD_DISTANCE = 900;

const DEPTH = 90;

type ForegroundSprite = {
  key: string;
  minScale: number;
  maxScale: number;
  y: number;
  speed: number;
  weight: number;
  alpha?: number;
};

type ForegroundObject = {
  key: string;
  x: number;
  y: number;
  scale: number;
  speed: number;
  alpha: number;
  mirror: boolean;
  image?: Phaser.GameObjects.Image;
};

const SPRITES: ForegroundSprite[] = [
  { key: "environment.fg_tree1", minScale: 0.6, maxScale: 0.8, y: -20, speed: 1.35, weight: 1 },
  { key: "environment.fg_tree2", minScale: 0.6, maxScale: 0.8, y: -20, speed: 1.35, weight: 1 },
  { key: "environment.fg_tree3", minScale: 0.6, maxScale: 0.8, y: -20, speed: 1.35, weight: 1 },
  { key: "environment.fg_fence1", minScale: 0.8, maxScale: 1, y: 92, speed: 1, weight: 1 },
  { key: "environment.fg_stump1", minScale: 0.6, maxScale: 0.8, y: 90, speed: 1, weight: 1 },
  { key: "environment.fg_stump2", minScale: 0.6, maxScale: 0.8, y: 90, speed: 1, weight: 1 },
  { key: "environment.fg_stump3", minScale: 0.8, maxScale: 1, y: 90, speed: 1, weight: 1 },
  { key: "environment.fg_stump4", minScale: 0.8, maxScale: 1, y: 90, speed: 1, weight: 1 },
  { key: "environment.fg_pumpkin1", minScale: 0.6, maxScale: 1, y: 80, speed: 1, weight: 1 },
  { key: "environment.fg_pumpkin2", minScale: 0.6, maxScale: 1, y: 80, speed: 1, weight: 1 },
];

export class ForegroundRenderer {
  private readonly objects: ForegroundObject[] = [];

  private lastScrollX: number | undefined;
  private nextSpawnX = 0;

  public constructor(
    private readonly scene: Phaser.Scene,
    private t: Translator,
  ) {}

  public setTranslator(t: Translator): void {
    this.t = t;
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const deltaScrollX = this.getDeltaScrollX(snapshot.world.scrollX);

    this.moveObjects(deltaScrollX, viewport);
    this.spawnObjects(viewport);
    this.removeOldObjects(viewport);
    this.updateObjects(viewport);
  }

  public destroy(): void {
    for (const object of this.objects) {
      object.image?.destroy();
    }

    this.objects.length = 0;
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

  private spawnObjects(viewport: RenderViewport): void {
    if (this.nextSpawnX === 0) {
      this.nextSpawnX = viewport.screenWidth + this.randomBetween(100, 300);
    }

    while (this.nextSpawnX < viewport.screenWidth + SPAWN_AHEAD_DISTANCE) {
      if (Math.random() <= SPAWN_PROBABILITY) {
        this.objects.push(this.createObject(this.nextSpawnX));
      }

      this.nextSpawnX += this.randomBetween(MIN_SPAWN_DISTANCE, MAX_SPAWN_DISTANCE);
    }
  }

  private createObject(x: number): ForegroundObject {
    const sprite = this.pickSprite();

    return {
      key: sprite.key,
      x,
      y: sprite.y,
      scale: this.randomBetween(sprite.minScale, sprite.maxScale),
      speed: sprite.speed,
      alpha: sprite.alpha ?? 1,
      mirror: Math.random() > 0.5,
    };
  }

  private updateObjects(viewport: RenderViewport): void {
    for (const object of this.objects) {
      const image = this.getOrCreateImage(object);

      if (image === undefined) {
        continue;
      }

      const source = images.getLoaded(getImageAsset(object.key));

      if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
        image.setVisible(false);
        continue;
      }

      const width = Math.round(source.naturalWidth * object.scale * viewport.scale);
      const height = Math.round(source.naturalHeight * object.scale * viewport.scale);

      const screenX = Math.round(object.x);
      const bottomY = viewport.screenHeight - Math.round(object.y * viewport.scale);

      image.setVisible(screenX + width >= 0 && screenX <= viewport.screenWidth);
      image.setPosition(screenX, bottomY);
      image.setDisplaySize(width, height);
      image.setAlpha(object.alpha);
      image.setFlipX(object.mirror);
    }
  }

  private getOrCreateImage(object: ForegroundObject): Phaser.GameObjects.Image | undefined {
    if (object.image !== undefined) {
      return object.image;
    }

    const source = images.getLoaded(getImageAsset(object.key));

    if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
      return undefined;
    }

    if (!this.scene.textures.exists(object.key)) {
      this.scene.textures.addImage(object.key, source);
    }

    object.image = this.scene.add.image(0, 0, object.key);
    object.image.setOrigin(0, 1);
    object.image.setDepth(DEPTH);
    object.image.setVisible(false);

    return object.image;
  }

  private removeOldObjects(viewport: RenderViewport): void {
    while (this.objects.length > 0) {
      const object = this.objects[0];
      const source = images.getLoaded(getImageAsset(object.key));
      const width = source.complete ? source.naturalWidth * object.scale * viewport.scale : 0;

      if (object.x + width >= -DESPAWN_PADDING) {
        return;
      }

      object.image?.destroy();
      this.objects.shift();
    }
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

  private randomBetween(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
