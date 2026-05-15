import type { EntitySnapshot, GameSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";
import { drawDebugShape } from "./DebugShapeRenderer.js";
import { SpriteAnimation } from "./SpriteAnimation.js";

export class EntityRenderer {
  private readonly animation = new SpriteAnimation();

  public constructor(private readonly debug: boolean) {}

  public draw(ctx: CanvasRenderingContext2D, canvasWidth: number, snapshot: GameSnapshot, entity: EntitySnapshot): void {
    const [width, height] = entity.size;
    const screenX = entity.x - snapshot.world.scrollX;

    if (screenX + width < 0 || screenX > canvasWidth) {
      return;
    }

    const image = assets.get(getEntityImagePath(entity));
    const shouldAnimate = entity.type !== "obstacle";

    const transform = shouldAnimate
      ? this.animation.getTransform({
          id: entity.id,
          x: screenX,
          y: entity.y,
          width,
          height,
          alive: entity.alive,
        })
      : {
          x: screenX + width / 2,
          y: entity.y + height / 2,
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
      drawDebugShape(ctx, screenX, entity.y, entity.size, entity.hurt);
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
