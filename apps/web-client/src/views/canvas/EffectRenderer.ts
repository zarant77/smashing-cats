import { assets } from "../../assets/assets.js";
import type { RenderViewport } from "../viewport.js";

export type EffectSpace = "screen" | "world";

export type SpriteEffect = {
  imagePath: string;

  x: number;
  y: number;

  startedAt: number;
  durationMs: number;

  width?: number;
  height?: number;

  scale?: number;
  alpha?: number;
  rotation?: number;

  space?: EffectSpace;

  fadeOut?: boolean;
  grow?: number;
};

export class EffectRenderer {
  private effects: SpriteEffect[] = [];

  public add(effect: SpriteEffect): void {
    this.effects.push(effect);
  }

  public draw(ctx: CanvasRenderingContext2D, viewport: RenderViewport): void {
    const now = performance.now();

    this.effects = this.effects.filter((effect) => {
      const elapsed = now - effect.startedAt;

      if (elapsed < 0 || elapsed > effect.durationMs) {
        return false;
      }

      const progress = elapsed / effect.durationMs;

      this.drawEffect(ctx, viewport, effect, progress);

      return true;
    });
  }

  public clear(): void {
    this.effects = [];
  }

  private drawEffect(ctx: CanvasRenderingContext2D, viewport: RenderViewport, effect: SpriteEffect, progress: number): void {
    const image = assets.get(effect.imagePath);

    if (!isImageReady(image)) {
      return;
    }

    const space = effect.space ?? "screen";
    const baseScale = effect.scale ?? 1;
    const grow = effect.grow ?? 0;
    const scale = baseScale + grow * progress;

    const baseAlpha = effect.alpha ?? 1;
    const alpha = effect.fadeOut === true ? baseAlpha * (1 - progress) : baseAlpha;

    const rotation = effect.rotation ?? 0;

    const baseWidth = effect.width ?? image.naturalWidth;
    const baseHeight = effect.height ?? image.naturalHeight;

    const width = space === "world" ? viewport.worldToScreenSize(baseWidth * scale) : baseWidth * scale;
    const height = space === "world" ? viewport.worldToScreenSize(baseHeight * scale) : baseHeight * scale;

    const x = space === "world" ? viewport.worldToScreenX(effect.x) : effect.x;
    const y = space === "world" ? viewport.worldToScreenY(effect.y) : effect.y;

    ctx.save();

    ctx.globalAlpha = alpha;
    ctx.translate(x, y);
    ctx.rotate(rotation);
    ctx.drawImage(image, -width / 2, -height / 2, width, height);

    ctx.restore();
  }
}

function isImageReady(image: HTMLImageElement): boolean {
  return image.complete && image.naturalWidth > 0 && image.naturalHeight > 0;
}
