import { GAME_CONFIG } from "@smashing-cats/core";
import type { EntitySnapshot } from "@smashing-cats/protocol";
import { getImageAsset, images } from "../../assets/assets.js";
import { drawDebugShape } from "./DebugShapeRenderer.js";
import type { EffectRenderer } from "./EffectRenderer.js";
import { SpriteAnimation } from "./SpriteAnimation.js";
import type { RenderViewport } from "../viewport.js";

type RenderSize = {
  width: number;
  height: number;
};

export class EntityRenderer {
  private readonly animation = new SpriteAnimation();

  public constructor(private readonly debug: boolean) {}

  public draw(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    viewport: RenderViewport,
    entity: EntitySnapshot,
    effects: EffectRenderer,
  ): void {
    const [worldWidth, worldHeight] = entity.size;

    const screenX = viewport.worldToScreenX(entity.x);
    const screenY = viewport.worldToScreenY(entity.y);

    const physicsWidth = viewport.worldToScreenSize(worldWidth);
    const physicsHeight = viewport.worldToScreenSize(worldHeight);

    if (screenX + physicsWidth < 0 || screenX > canvasWidth) {
      return;
    }

    const image = images.getLoaded(getEntityImagePath(entity));
    const renderSize = getRenderSize(image, physicsWidth, physicsHeight);

    const transform = this.animation.getTransform({
      id: entity.id,
      x: screenX,
      y: screenY,
      width: physicsWidth,
      height: physicsHeight,
      groundY: GAME_CONFIG.groundY,
      entityY: entity.y + entity.size[1],
      alive: entity.alive,
      hp: entity.alive ? 1 : 0,
      moving: entity.alive && entity.type !== "obstacle",
      jumping: false,
      smashing: false,
      animations: entity.animations,
      scale: viewport.scale,
      screenWidth: canvasWidth,
      screenHeight: ctx.canvas.height,
    });

    for (const effect of transform.spawnEffects ?? []) {
      effects.add(effect);
    }

    ctx.save();

    ctx.globalAlpha = transform.alpha;

    ctx.translate(transform.x, transform.y + physicsHeight / 2);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scaleX, transform.scaleY);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -renderSize.width / 2, -renderSize.height, renderSize.width, renderSize.height);
    } else {
      ctx.fillStyle = getEntityFallbackColor(entity);
      ctx.fillRect(-renderSize.width / 2, -renderSize.height, renderSize.width, renderSize.height);
    }

    ctx.restore();

    if (this.debug) {
      drawDebugShape(ctx, screenX, screenY, entity.size, entity.hurt, undefined, viewport);
    }
  }
}

function getEntityImagePath(entity: EntitySnapshot): string {
  return getImageAsset(getEntityImageKey(entity));
}

function getEntityImageKey(entity: EntitySnapshot): string {
  const postfix = entity.alive ? "" : "_dead";

  return `${entity.type}.${entity.kind}${postfix}`;
}

function getEntityFallbackColor(entity: EntitySnapshot): string {
  if (!entity.alive) {
    return "#555555";
  }

  if (entity.type === "obstacle") {
    return "#1e7f3e";
  }

  if (entity.type === "civilian") {
    return "#4aa3df";
  }

  return "#8b3a3a";
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
