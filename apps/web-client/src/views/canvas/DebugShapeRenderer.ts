import type { HurtCircle, Size, SmashBox } from "@smashing-cats/protocol";
import type { RenderViewport } from "../viewport.js";

export function drawDebugShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: Size,
  hurt: HurtCircle,
  smash: SmashBox | undefined,
  viewport: RenderViewport,
): void {
  const [worldWidth, worldHeight] = size;
  const [worldRadius, worldOffsetX, worldOffsetY] = hurt;

  const width = viewport.worldToScreenSize(worldWidth);
  const height = viewport.worldToScreenSize(worldHeight);
  const radius = viewport.worldToScreenSize(worldRadius);
  const offsetX = viewport.worldToScreenSize(worldOffsetX);
  const offsetY = viewport.worldToScreenSize(worldOffsetY);

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.save();

  ctx.lineWidth = Math.max(1, viewport.worldToScreenSize(2));

  ctx.strokeStyle = "rgba(0, 180, 255, 0.9)";
  ctx.strokeRect(x, y, width, height);

  ctx.strokeStyle = "rgba(255, 40, 40, 0.95)";
  ctx.beginPath();
  ctx.arc(centerX + offsetX, centerY + offsetY, radius, 0, Math.PI * 2);
  ctx.stroke();

  if (smash !== undefined) {
    const [worldSmashWidth, worldSmashOffsetX] = smash;

    const smashWidth = viewport.worldToScreenSize(worldSmashWidth);
    const smashOffsetX = viewport.worldToScreenSize(worldSmashOffsetX);
    const smashX = x + width / 2 - smashWidth / 2 + smashOffsetX;

    ctx.strokeStyle = "rgba(255, 220, 40, 0.95)";
    ctx.strokeRect(smashX, y, smashWidth, height);
  }

  ctx.restore();
}
