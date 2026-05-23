import type { GameSnapshot } from "@smashing-cats/protocol";

import { getImageAsset, images } from "../../assetManager/assetManager.js";
import { deviceController } from "../../device/DeviceController.js";

import type { RenderViewport } from "../viewport.js";

type ParallaxLayer = {
  key: string;
  speed: number;
  y: number;
  height: number;
  mirror?: boolean;
  alpha?: number;
};

const LAYERS: ParallaxLayer[] = [
  { key: "environment.sky", speed: 0, y: 0, height: 1 },
  { key: "environment.mountains", speed: 0.05, y: 220, height: 0.22, mirror: true },
  { key: "environment.clouds", speed: 0.1, y: 0, height: 0.6 },
  { key: "environment.fog", speed: 0.3, y: 200, height: 0.4, mirror: true },
  { key: "environment.forest", speed: 0.6, y: 210, height: 0.4 },
  { key: "environment.forest_front", speed: 0.85, y: 350, height: 0.15 },
];

const TILE_START_PADDING = 2;

const MAX_TILT_OFFSET_X = 96;
const MAX_TILT_OFFSET_Y = 10;
const TILT_SMOOTHING = 0.03;
const MIN_TILT_PARALLAX = 0.35;
const MAX_TILT_DEGREES_X = 16;
const MAX_TILT_DEGREES_Y = 16;
const TILT_DEAD_ZONE = 0.05;

export class BackgroundRenderer {
  private tiltX = 0;
  private tiltY = 0;

  private smoothTiltX = 0;
  private smoothTiltY = 0;

  public constructor() {
    deviceController.on("tilt", (tilt) => {
      this.tiltX = tilt.x;
      this.tiltY = tilt.y;
    });
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    snapshot: GameSnapshot,
    viewport: RenderViewport,
  ): void {
    const gameRunning = snapshot.simulation.rngState !== 0;

    this.updateSmoothTilt(gameRunning);

    ctx.imageSmoothingEnabled = false;

    ctx.fillStyle = "#87ceeb";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const layer of LAYERS) {
      this.drawLayer(ctx, canvas, snapshot, viewport, layer, gameRunning);
    }
  }

  private drawLayer(
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    snapshot: GameSnapshot,
    viewport: RenderViewport,
    layer: ParallaxLayer,
    gameRunning: boolean,
  ): void {
    const image = images.getLoaded(getImageAsset(layer.key));

    if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return;
    }

    const height = canvas.height * layer.height;
    const imageScale = height / image.naturalHeight;
    const width = image.naturalWidth * imageScale;

    const drawWidth = Math.ceil(width) + 1;
    const drawHeight = Math.ceil(height);

    const parallaxStrength = this.getTiltParallaxStrength(layer.speed);

    const tiltOffsetX = gameRunning ? 0 : -this.smoothTiltX * MAX_TILT_OFFSET_X * parallaxStrength;
    const tiltOffsetY = gameRunning ? 0 : this.smoothTiltY * MAX_TILT_OFFSET_Y * parallaxStrength;

    const drawY = Math.round(viewport.worldToScreenSize(layer.y) + tiltOffsetY);

    const scroll = snapshot.world.scrollX * layer.speed * viewport.scale;

    const firstTileIndex = Math.floor(scroll / width) - TILE_START_PADDING - 1;
    const offsetX = -(scroll - firstTileIndex * width) + tiltOffsetX;
    const maxDrawX = canvas.width + width + MAX_TILT_OFFSET_X;

    ctx.save();
    ctx.globalAlpha = layer.alpha ?? 1;

    for (let tileIndex = firstTileIndex; offsetX + (tileIndex - firstTileIndex) * width < maxDrawX; tileIndex++) {
      const x = offsetX + (tileIndex - firstTileIndex) * width;
      const drawX = Math.round(x);

      ctx.save();

      const shouldMirror = layer.mirror === true && Math.abs(tileIndex) % 2 === 1;

      if (shouldMirror) {
        ctx.translate(drawX + drawWidth, drawY);
        ctx.scale(-1, 1);
        ctx.drawImage(image, 0, 0, drawWidth, drawHeight);
      } else {
        ctx.drawImage(image, drawX, drawY, drawWidth, drawHeight);
      }

      ctx.restore();
    }

    ctx.restore();
  }

  private updateSmoothTilt(gameRunning: boolean): void {
    const targetX = gameRunning ? 0 : this.normalizeTiltX(this.tiltX);
    const targetY = gameRunning ? 0 : this.normalizeTiltY(this.tiltY);

    this.smoothTiltX = this.lerp(this.smoothTiltX, targetX, TILT_SMOOTHING);
    this.smoothTiltY = this.lerp(this.smoothTiltY, targetY, TILT_SMOOTHING);
  }

  private normalizeTiltX(tiltX: number): number {
    return this.applyDeadZone(this.clamp(tiltX / MAX_TILT_DEGREES_X, -1, 1));
  }

  private normalizeTiltY(tiltY: number): number {
    return this.applyDeadZone(this.clamp(tiltY / MAX_TILT_DEGREES_Y, -1, 1));
  }

  private applyDeadZone(value: number): number {
    return Math.abs(value) < TILT_DEAD_ZONE ? 0 : value;
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
  }

  private getTiltParallaxStrength(speed: number): number {
    return Math.max(speed, MIN_TILT_PARALLAX);
  }

  private lerp(from: number, to: number, factor: number): number {
    return from + (to - from) * factor;
  }
}
