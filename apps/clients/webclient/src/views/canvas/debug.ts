export const DRAW_SPRITE_BORDERS = false;

export function drawSpriteBorder(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number): void {
  ctx.save();
  ctx.strokeStyle = "#ff00ff";
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, width, height);
  ctx.restore();
}
