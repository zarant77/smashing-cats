import type { EntitySnapshot, GameSnapshot } from "@smashing-cats/protocol";
import { DRAW_SPRITE_BORDERS, drawSpriteBorder } from "./debug.js";
import { ImageCache } from "./ImageCache.js";

export class EntityRenderer {
  private readonly images = new ImageCache();

  public draw(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    snapshot: GameSnapshot,
    entity: EntitySnapshot,
  ): void {
    const screenX = entity.x - snapshot.world.scrollX;

    if (screenX + entity.width < 0 || screenX > canvasWidth) {
      return;
    }

    const image = this.images.get(getEntityImagePath(entity));

    ctx.save();
    ctx.globalAlpha = entity.alive ? 1 : 0.35;

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, screenX, entity.y, entity.width, entity.height);
    } else {
      ctx.fillStyle = getEntityFallbackColor(entity);
      ctx.fillRect(screenX, entity.y, entity.width, entity.height);
    }

    ctx.restore();

    if (DRAW_SPRITE_BORDERS) {
      drawSpriteBorder(ctx, screenX, entity.y, entity.width, entity.height);
    }
  }
}

function getEntityImagePath(entity: EntitySnapshot): string {
  if (entity.type === "civilian") {
    return `/civilians/${entity.kind}.png`;
  }

  if (entity.type === "obstacle") {
    return `/obstacles/${entity.kind}.png`;
  }

  return `/enemies/${entity.kind}.png`;
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
