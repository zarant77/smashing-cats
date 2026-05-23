import Phaser from "phaser";

import type { EntitySnapshot, GameSnapshot } from "@smashing-cats/protocol";

import { getImageAsset, images } from "../../../assetManager/assetManager.js";
import type { RenderViewport } from "../../viewport.js";

import { DebugRenderer } from "./DebugRenderer.js";
import { SpriteAnimationState } from "../animations/SpriteAnimationState.js";
import { getSpriteTransform } from "../animations/SpriteTransformAnimator.js";

type EntityObject = {
  image?: Phaser.GameObjects.Image;
  fallback?: Phaser.GameObjects.Rectangle;
};

type RenderSize = {
  width: number;
  height: number;
};

type FlyToScreenState = {
  startedAt: number;
  fromX: number;
  fromY: number;
  targetX: number;
  targetY: number;
  cracked: boolean;
  rotationDirection: number;
};

type FlyToScreenTransform = {
  x: number;
  y: number;
  scale: number;
  rotation: number;
  alpha: number;
};

const DEPTH = 40;

const FLY_TO_SCREEN_MS = 500;
const FLY_TO_SCREEN_FALL_MS = 650;
const FLY_TO_SCREEN_SCALE = 6;
const FLY_TO_SCREEN_SPINS = 1.25;
const FLY_TO_SCREEN_DEPTH = 450;

const SCREEN_CRACK_DELAY_MS = 120;
const SCREEN_CRACK_KEY = "effect.screen_crack";
const SCREEN_CRACK_DEPTH = 500;
const SCREEN_CRACK_MS = 900;
const SCREEN_CRACK_SCALE = 0.72;

export class EntityRenderer {
  private readonly objects = new Map<string, EntityObject>();
  private readonly flyToScreenStates = new Map<string, FlyToScreenState>();

  private readonly debugRenderer: DebugRenderer;
  private readonly animationState = new SpriteAnimationState();

  public constructor(private readonly scene: Phaser.Scene) {
    this.debugRenderer = new DebugRenderer(scene);
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const visibleIds = new Set<string>();

    this.debugRenderer.beginFrame();

    for (const entity of snapshot.entities) {
      visibleIds.add(entity.id);
      this.drawEntity(entity, viewport);
    }

    this.removeMissingEntities(visibleIds);
  }

  public destroy(): void {
    for (const object of this.objects.values()) {
      object.image?.destroy();
      object.fallback?.destroy();
    }

    this.debugRenderer.destroy();
    this.animationState.clear();
    this.flyToScreenStates.clear();

    this.objects.clear();
  }

  private drawEntity(entity: EntitySnapshot, viewport: RenderViewport): void {
    const [worldWidth, worldHeight] = entity.size;

    const physicsWidth = viewport.worldToScreenSize(worldWidth);
    const physicsHeight = viewport.worldToScreenSize(worldHeight);

    const screenX = viewport.worldToScreenX(entity.x);
    const screenY = viewport.worldToScreenY(entity.y);

    if (screenX + physicsWidth < 0 || screenX > viewport.screenWidth) {
      this.hideEntity(entity.id);
      return;
    }

    const object = this.getEntityObject(entity.id);

    const imageKey = getEntityImageKey(entity);
    const source = images.getLoaded(getImageAsset(imageKey));
    const renderSize = getRenderSize(source, physicsWidth, physicsHeight);

    const x = screenX + physicsWidth / 2;
    const y = screenY + physicsHeight;

    const now = this.scene.time.now;
    const animation = this.animationState.resolveEntity(entity, now);
    const transform = getSpriteTransform(animation.kind, (now - animation.startedAt) / 1000);

    const isFlyingToScreen = animation.kind === "flyToScreen";
    const flyToScreen = isFlyingToScreen ? this.getFlyToScreenTransform(entity.id, x, y, now) : undefined;

    const renderX = flyToScreen?.x ?? x + transform.offsetX;
    const renderY = flyToScreen?.y ?? y + transform.offsetY;
    const extraScale = flyToScreen?.scale ?? 1;
    const rotation = flyToScreen?.rotation ?? transform.rotation;
    const alpha = (flyToScreen?.alpha ?? 1) * transform.alpha;
    const depth = isFlyingToScreen ? FLY_TO_SCREEN_DEPTH : DEPTH;

    if (source.complete && source.naturalWidth > 0 && source.naturalHeight > 0) {
      const image = this.getOrCreateImage(object, imageKey, source);

      image.setVisible(true);
      image.setDepth(depth);
      image.setOrigin(0.5, isFlyingToScreen ? 0.5 : 1);
      image.setPosition(Math.round(renderX), Math.round(renderY));
      image.setDisplaySize(
        Math.round(renderSize.width * transform.scaleX * extraScale),
        Math.round(renderSize.height * transform.scaleY * extraScale),
      );
      image.setRotation(rotation);
      image.setAlpha(alpha);
      image.setFlipX(false);
      image.setTint(entity.alive ? 0xffffff : 0xdddddd);

      object.fallback?.setVisible(false);
    } else {
      const fallback = this.getOrCreateFallback(object, entity);

      fallback.setVisible(true);
      fallback.setDepth(depth);
      fallback.setOrigin(0.5, isFlyingToScreen ? 0.5 : 1);
      fallback.setPosition(Math.round(renderX), Math.round(renderY));
      fallback.setSize(
        Math.round(physicsWidth * transform.scaleX * extraScale),
        Math.round(physicsHeight * transform.scaleY * extraScale),
      );
      fallback.setRotation(rotation);
      fallback.setAlpha(alpha);
      fallback.setFillStyle(getEntityFallbackColor(entity));

      object.image?.setVisible(false);
    }

    this.debugRenderer.drawBounds({
      object: entity,
      screenX,
      screenY,
      viewport,
    });
  }

  private getFlyToScreenTransform(id: string, x: number, y: number, now: number): FlyToScreenTransform {
    let state = this.flyToScreenStates.get(id);

    if (state === undefined) {
      state = {
        startedAt: now,
        fromX: x,
        fromY: y,
        targetX: Phaser.Math.Between(120, Math.max(120, this.scene.scale.width - 120)),
        targetY: Phaser.Math.Between(90, Math.max(90, this.scene.scale.height - 90)),
        cracked: false,
        rotationDirection: Math.random() < 0.5 ? -1 : 1,
      };

      this.flyToScreenStates.set(id, state);
    }

    const age = now - state.startedAt;

    if (age <= FLY_TO_SCREEN_MS) {
      const progress = Phaser.Math.Clamp(age / FLY_TO_SCREEN_MS, 0, 1);
      const eased = Phaser.Math.Easing.Cubic.In(progress);

      if (progress >= 1 && !state.cracked) {
        state.cracked = true;
        this.spawnScreenCrack(state.targetX, state.targetY);
      }

      return {
        x: Phaser.Math.Linear(state.fromX, state.targetX, eased),
        y: Phaser.Math.Linear(state.fromY, state.targetY, eased),
        scale: 1 + eased * (FLY_TO_SCREEN_SCALE - 1),
        rotation: eased * Math.PI * 2 * FLY_TO_SCREEN_SPINS * state.rotationDirection,
        alpha: 1,
      };
    }

    const fallAge = age - FLY_TO_SCREEN_MS - SCREEN_CRACK_DELAY_MS;
    const fallProgress = Phaser.Math.Clamp(fallAge / FLY_TO_SCREEN_FALL_MS, 0, 1);
    const easedFall = Phaser.Math.Easing.Cubic.In(fallProgress);

    return {
      x: state.targetX + Math.sin(fallProgress * Math.PI * 2) * 20,
      y: Phaser.Math.Linear(state.targetY, this.scene.scale.height + 260, easedFall),
      scale: FLY_TO_SCREEN_SCALE,
      rotation: (Math.PI * 2 * FLY_TO_SCREEN_SPINS + easedFall * Math.PI * 1.5) * state.rotationDirection,
      alpha: 1 - fallProgress * 0.35,
    };
  }

  private spawnScreenCrack(x: number, y: number): void {
    const source = images.getLoaded(getImageAsset(SCREEN_CRACK_KEY));

    if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
      return;
    }

    if (!this.scene.textures.exists(SCREEN_CRACK_KEY)) {
      this.scene.textures.addImage(SCREEN_CRACK_KEY, source);
    }

    const crack = this.scene.add.image(x, y, SCREEN_CRACK_KEY);

    crack.setOrigin(0.5);
    crack.setDepth(SCREEN_CRACK_DEPTH);
    crack.setScale(SCREEN_CRACK_SCALE);
    crack.setAlpha(0.95);

    this.scene.tweens.add({
      targets: crack,
      alpha: 0,
      duration: SCREEN_CRACK_MS,
      delay: 250,
      ease: "Sine.easeOut",
      onComplete: () => {
        crack.destroy();
      },
    });
  }

  private getEntityObject(id: string): EntityObject {
    const existing = this.objects.get(id);

    if (existing !== undefined) {
      return existing;
    }

    const created: EntityObject = {};
    this.objects.set(id, created);

    return created;
  }

  private getOrCreateImage(object: EntityObject, imageKey: string, source: HTMLImageElement): Phaser.GameObjects.Image {
    if (!this.scene.textures.exists(imageKey)) {
      this.scene.textures.addImage(imageKey, source);
    }

    if (object.image !== undefined && object.image.texture.key === imageKey) {
      return object.image;
    }

    object.image?.destroy();

    const image = this.scene.add.image(0, 0, imageKey);

    image.setOrigin(0.5, 1);
    image.setDepth(DEPTH);
    image.setVisible(false);

    object.image = image;

    return image;
  }

  private getOrCreateFallback(object: EntityObject, entity: EntitySnapshot): Phaser.GameObjects.Rectangle {
    if (object.fallback !== undefined) {
      return object.fallback;
    }

    const fallback = this.scene.add.rectangle(0, 0, 1, 1, getEntityFallbackColor(entity));

    fallback.setOrigin(0.5, 1);
    fallback.setDepth(DEPTH);
    fallback.setVisible(false);

    object.fallback = fallback;

    return fallback;
  }

  private hideEntity(id: string): void {
    const object = this.objects.get(id);

    if (object === undefined) {
      return;
    }

    object.image?.setVisible(false);
    object.fallback?.setVisible(false);
  }

  private removeMissingEntities(visibleIds: Set<string>): void {
    for (const [id, object] of this.objects.entries()) {
      if (visibleIds.has(id)) {
        continue;
      }

      object.image?.destroy();
      object.fallback?.destroy();

      this.animationState.remove(id);
      this.flyToScreenStates.delete(id);

      this.objects.delete(id);
    }
  }
}

function getEntityImageKey(entity: EntitySnapshot): string {
  const postfix = entity.alive ? "" : "_dead";

  return `${entity.type}.${entity.kind}${postfix}`;
}

function getEntityFallbackColor(entity: EntitySnapshot): number {
  if (!entity.alive) {
    return 0x555555;
  }

  if (entity.type === "obstacle") {
    return 0x1e7f3e;
  }

  if (entity.type === "civilian") {
    return 0x4aa3df;
  }

  return 0x8b3a3a;
}

function getRenderSize(image: HTMLImageElement, fallbackWidth: number, fallbackHeight: number): RenderSize {
  if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return {
      width: fallbackWidth,
      height: fallbackHeight,
    };
  }

  return {
    width: fallbackWidth,
    height: fallbackWidth * (image.naturalHeight / image.naturalWidth),
  };
}
