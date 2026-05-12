import type { EntitySnapshot, GameSnapshot } from "@smashing-cats/protocol";
import { DRAW_SPRITE_BORDERS, drawSpriteBorder } from "./debug.js";
import { ImageCache } from "./ImageCache.js";
import { SpriteAnimation } from "./SpriteAnimation.js";

export class EntityRenderer {
  private readonly images = new ImageCache();
  private readonly animation = new SpriteAnimation();

  public draw(ctx: CanvasRenderingContext2D, canvasWidth: number, snapshot: GameSnapshot, entity: EntitySnapshot): void {
    const screenX = entity.x - snapshot.world.scrollX;

    if (screenX + entity.width < 0 || screenX > canvasWidth) {
      return;
    }

    const image = this.images.get(getEntityImagePath(entity));
    const shouldAnimate = entity.type !== "obstacle";

    const transform = shouldAnimate
      ? this.animation.getTransform({
          id: entity.id,
          x: screenX,
          y: entity.y,
          width: entity.width,
          height: entity.height,
          alive: entity.alive,
        })
      : {
          x: screenX + entity.width / 2,
          y: entity.y + entity.height / 2,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        };

    ctx.save();

    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scaleX, transform.scaleY);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -entity.width / 2, -entity.height / 2, entity.width, entity.height);
    } else {
      ctx.fillStyle = getEntityFallbackColor(entity);
      ctx.fillRect(-entity.width / 2, -entity.height / 2, entity.width, entity.height);
    }

    ctx.restore();

    if (DRAW_SPRITE_BORDERS) {
      drawSpriteBorder(ctx, screenX, entity.y, entity.width, entity.height);
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
