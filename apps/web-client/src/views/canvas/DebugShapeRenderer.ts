import type { HurtCircle, Size, SmashBox } from "@smashing-cats/protocol";

export function drawDebugShape(ctx: CanvasRenderingContext2D, x: number, y: number, size: Size, hurt: HurtCircle, smash?: SmashBox): void {
  const [width, height] = size;
  const [radius, offsetX, offsetY] = hurt;

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.save();

  ctx.lineWidth = 2;

  // Size bounds
  ctx.strokeStyle = "rgba(0, 180, 255, 0.9)";
  ctx.strokeRect(x, y, width, height);

  // Hurt circle
  ctx.strokeStyle = "rgba(255, 40, 40, 0.95)";
  ctx.beginPath();
  ctx.arc(centerX + offsetX, centerY + offsetY, radius, 0, Math.PI * 2);
  ctx.stroke();

  // Smash box
  if (smash !== undefined) {
    const [smashWidth, smashOffsetX] = smash;

    const smashX = x + width / 2 - smashWidth / 2 + smashOffsetX;

    ctx.strokeStyle = "rgba(255, 220, 40, 0.95)";
    ctx.strokeRect(smashX, y, smashWidth, height);
  }

  ctx.restore();
}
