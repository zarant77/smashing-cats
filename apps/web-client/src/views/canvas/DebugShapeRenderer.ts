export function drawDebugShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: readonly [width: number, height: number],
  hurt: readonly [radius: number, offsetX: number, offsetY: number],
): void {
  const [width, height] = size;
  const [radius, offsetX, offsetY] = hurt;

  const centerX = x + width / 2;
  const centerY = y + height / 2;

  ctx.save();

  ctx.lineWidth = 2;

  ctx.strokeStyle = "rgba(0, 180, 255, 0.9)";
  ctx.strokeRect(x, y, width, height);

  ctx.strokeStyle = "rgba(255, 40, 40, 0.95)";
  ctx.beginPath();
  ctx.arc(centerX + offsetX, centerY + offsetY, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}
