import { getImageAsset, images } from "../../assetManager/assetManager.js";

export type DrawImageOptions = {
  flip?: boolean;
  rotation?: number;
  pivotX?: number;
  pivotY?: number;
  offsetX?: number;
  offsetY?: number;
  scaleX?: number;
  scaleY?: number;
};

export type DrawTextOptions = {
  font?: string;
  color?: string;
  align?: CanvasTextAlign;
  rotation?: number;
  maxWidth?: number;
  lineHeight?: number;
  preserveNewlines?: boolean;
};

type RenderHelperOptions = {
  getGroundY: () => number;
  worldObjectX: (worldX: number) => number;
};

export class RenderHelper {
  private readonly getGroundY: () => number;
  private readonly worldObjectX: (worldX: number) => number;

  public constructor(options: RenderHelperOptions) {
    this.getGroundY = options.getGroundY;
    this.worldObjectX = options.worldObjectX;
  }

  public img(
    ctx: CanvasRenderingContext2D,
    key: string,
    worldX: number,
    y: number,
    scale: number,
    options?: DrawImageOptions,
  ): void {
    const img = images.getLoaded(getImageAsset(key));

    const w = img.width * scale;
    const h = img.height * scale;

    const x = this.worldObjectX(worldX) + (options?.offsetX ?? 0);
    const drawY = this.getGroundY() - h - y + (options?.offsetY ?? 0);

    const flip = options?.flip ?? false;
    const rotation = options?.rotation ?? 0;
    const pivotX = options?.pivotX ?? w * 0.5;
    const pivotY = options?.pivotY ?? h;
    const scaleX = options?.scaleX ?? 1;
    const scaleY = options?.scaleY ?? 1;

    ctx.save();

    ctx.translate(x + pivotX, drawY + pivotY);
    ctx.rotate(rotation);
    ctx.scale(flip ? -scaleX : scaleX, scaleY);
    ctx.drawImage(img, -pivotX, -pivotY, w, h);

    ctx.restore();
  }

  public text(ctx: CanvasRenderingContext2D, text: string, worldX: number, y: number, options?: DrawTextOptions): void {
    const x = this.worldObjectX(worldX);
    const drawY = this.getGroundY() - y;

    ctx.save();

    ctx.translate(x, drawY);
    ctx.rotate(options?.rotation ?? 0);

    ctx.font = options?.font ?? "700 24px GameFont";
    ctx.fillStyle = options?.color ?? "#111111";
    ctx.textAlign = options?.align ?? "left";
    ctx.textBaseline = "middle";

    const maxWidth = options?.maxWidth ?? 180;
    const lineHeight = options?.lineHeight ?? 28;
    const lines = this.getTextLines(ctx, text, maxWidth, options?.preserveNewlines ?? false);

    const totalHeight = (lines.length - 1) * lineHeight;
    const startY = -totalHeight * 0.5;

    lines.forEach((line, index) => {
      ctx.fillText(line, 0, startY + index * lineHeight);
    });

    ctx.restore();
  }

  public speech(ctx: CanvasRenderingContext2D, text: string, worldX: number, y: number): void {
    this.img(ctx, "common.speech_bubble", worldX, y, 1);

    this.text(ctx, text, worldX + 200, y + 95, {
      font: "700 30px GameFont",
      color: "#2a1b12",
      align: "center",
      rotation: -0.1,
      maxWidth: 220,
      lineHeight: 28,
      preserveNewlines: true,
    });
  }

  private getTextLines(
    ctx: CanvasRenderingContext2D,
    text: string,
    maxWidth: number,
    preserveNewlines: boolean,
  ): string[] {
    if (!preserveNewlines) {
      return this.wrapText(ctx, text, maxWidth);
    }

    return text.split("\n").flatMap((line) => {
      if (line.trim().length === 0) {
        return [""];
      }

      return this.wrapText(ctx, line, maxWidth);
    });
  }

  private wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];

    let current = "";

    for (const word of words) {
      const test = current.length > 0 ? `${current} ${word}` : word;
      const width = ctx.measureText(test).width;

      if (width > maxWidth && current.length > 0) {
        lines.push(current);
        current = word;
      } else {
        current = test;
      }
    }

    if (current.length > 0) {
      lines.push(current);
    }

    return lines;
  }
}
