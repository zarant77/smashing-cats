import type { EntitySnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";
import { drawDebugShape } from "./DebugShapeRenderer.js";
import { SpriteAnimation } from "./SpriteAnimation.js";
import type { RenderViewport } from "./viewport.js";

export class EntityRenderer {
  private readonly animation = new SpriteAnimation();

  public constructor(private readonly debug: boolean) {}

  public draw(ctx: CanvasRenderingContext2D, canvasWidth: number, viewport: RenderViewport, entity: EntitySnapshot): void {
    const [worldWidth, worldHeight] = entity.size;

    const screenX = viewport.worldToScreenX(entity.x);
    const screenY = viewport.worldToScreenY(entity.y);
    const width = viewport.worldToScreenSize(worldWidth);
    const height = viewport.worldToScreenSize(worldHeight);

    if (screenX + width < 0 || screenX > canvasWidth) {
      return;
    }

    const image = assets.get(getEntityImagePath(entity));
    const shouldAnimate = entity.type !== "obstacle";

    const transform = shouldAnimate
      ? this.animation.getTransform({
          id: entity.id,
          x: screenX,
          y: screenY,
          width,
          height,
          alive: entity.alive,
          hp: entity.alive ? 1 : 0,
          moving: false,
          jumping: false,
          smashing: false,
          scale: viewport.scale,
        })
      : {
          x: screenX + width / 2,
          y: screenY + height / 2,
          scaleX: 1,
          scaleY: 1,
          rotation: 0,
        };

    ctx.save();

    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(transform.scaleX, transform.scaleY);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = getEntityFallbackColor(entity);
      ctx.fillRect(-width / 2, -height / 2, width, height);
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
