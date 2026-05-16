import { GAME_CONFIG } from "@smashing-cats/core";
import type { EntitySnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";
import { drawDebugShape } from "./DebugShapeRenderer.js";
import type { EffectRenderer } from "./EffectRenderer.js";
import { SpriteAnimation } from "./SpriteAnimation.js";
import type { RenderViewport } from "./viewport.js";

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
    const width = viewport.worldToScreenSize(worldWidth);
    const height = viewport.worldToScreenSize(worldHeight);

    if (screenX + width < 0 || screenX > canvasWidth) {
      return;
    }

    const image = assets.get(getEntityImagePath(entity));

    const transform = this.animation.getTransform({
      id: entity.id,
      x: screenX,
      y: screenY,
      width,
      height,
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

    ctx.translate(transform.x, transform.y + height / 2);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scaleX, transform.scaleY);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -width / 2, -height, width, height);
    } else {
      ctx.fillStyle = getEntityFallbackColor(entity);
      ctx.fillRect(-width / 2, -height, width, height);
    }

    ctx.restore();

    if (this.debug) {
      drawDebugShape(ctx, screenX, screenY, entity.size, entity.hurt, undefined, viewport);
    }
  }
}

function getEntityImagePath(entity: EntitySnapshot): string {
  const postfix = entity.alive ? "" : "-dead";

  if (entity.type === "civilian") {
    return `/civilians/${entity.kind}${postfix}.png`;
  }

  if (entity.type === "obstacle") {
    return `/obstacles/${entity.kind}${postfix}.png`;
  }

  return `/enemies/${entity.kind}${postfix}.png`;
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
