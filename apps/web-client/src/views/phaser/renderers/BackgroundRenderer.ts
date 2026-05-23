import Phaser from "phaser";
import type { GameSnapshot } from "@smashing-cats/protocol";
import { getImageAsset, images } from "../../../assetManager/assetManager.js";
import { deviceController } from "../../../device/DeviceController.js";
import type { RenderViewport } from "../../viewport.js";

type ParallaxLayer = {
  key: string;
  speed: number;
  y: number;
  height: number;
  mirror?: boolean;
  alpha?: number;
};

type LayerTile = {
  image: Phaser.GameObjects.Image;
};

type LayerState = {
  tiles: LayerTile[];
};

const LAYERS: ParallaxLayer[] = [
  { key: "environment.sky", speed: 0, y: 0, height: 1 },
  { key: "environment.mountains", speed: 0.05, y: 220, height: 0.22, mirror: true },
  { key: "environment.clouds", speed: 0.1, y: 0, height: 0.6 },
  { key: "environment.fog", speed: 0.3, y: 200, height: 0.4, mirror: true },
  { key: "environment.forest", speed: 0.6, y: 210, height: 0.4 },
  { key: "environment.forest_front", speed: 0.85, y: 350, height: 0.15 },
];

const DEPTH_BASE = -100;
const TILE_START_PADDING = 2;

const MAX_TILT_OFFSET_X = 96;
const MAX_TILT_OFFSET_Y = 10;
const TILT_SMOOTHING = 0.03;
const MIN_TILT_PARALLAX = 0.35;
const MAX_TILT_DEGREES_X = 16;
const MAX_TILT_DEGREES_Y = 16;
const TILT_DEAD_ZONE = 0.05;

export class BackgroundRenderer {
  private readonly states = new Map<string, LayerState>();
  private sky?: Phaser.GameObjects.Rectangle;

  private tiltX = 0;
  private tiltY = 0;

  private smoothTiltX = 0;
  private smoothTiltY = 0;

  public constructor(private readonly scene: Phaser.Scene) {
    deviceController.on("tilt", (tilt) => {
      this.tiltX = tilt.x;
      this.tiltY = tilt.y;
    });
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const gameRunning = snapshot.simulation.rngState !== 0;

    this.updateSmoothTilt(gameRunning);

    this.drawSky(viewport);

    for (let index = 0; index < LAYERS.length; index++) {
      this.drawLayer(snapshot, viewport, LAYERS[index], index, gameRunning);
    }
  }

  public destroy(): void {
    this.sky?.destroy();
    this.sky = undefined;

    for (const state of this.states.values()) {
      for (const tile of state.tiles) {
        tile.image.destroy();
      }
    }

    this.states.clear();
  }

  private drawSky(viewport: RenderViewport): void {
    if (this.sky === undefined) {
      this.sky = this.scene.add.rectangle(0, 0, viewport.screenWidth, viewport.screenHeight, 0x87ceeb);
      this.sky.setOrigin(0, 0);
      this.sky.setDepth(DEPTH_BASE - 1);
    }

    this.sky.setPosition(0, 0);
    this.sky.setSize(viewport.screenWidth, viewport.screenHeight);
  }

  private drawLayer(
    snapshot: GameSnapshot,
    viewport: RenderViewport,
    layer: ParallaxLayer,
    layerIndex: number,
    gameRunning: boolean,
  ): void {
    const source = images.getLoaded(getImageAsset(layer.key));

    if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
      return;
    }

    if (!this.scene.textures.exists(layer.key)) {
      this.scene.textures.addImage(layer.key, source);
    }

    const height = viewport.screenHeight * layer.height;
    const imageScale = height / source.naturalHeight;
    const width = source.naturalWidth * imageScale;

    const drawWidth = Math.ceil(width) + 1;
    const drawHeight = Math.ceil(height);

    const parallaxStrength = this.getTiltParallaxStrength(layer.speed);

    const tiltOffsetX = gameRunning ? 0 : -this.smoothTiltX * MAX_TILT_OFFSET_X * parallaxStrength;
    const tiltOffsetY = gameRunning ? 0 : this.smoothTiltY * MAX_TILT_OFFSET_Y * parallaxStrength;

    const drawY = Math.round(viewport.worldToScreenSize(layer.y) + tiltOffsetY);

    const scroll = snapshot.world.scrollX * layer.speed * viewport.scale;
    const firstTileIndex = Math.floor(scroll / width) - TILE_START_PADDING - 1;
    const offsetX = -(scroll - firstTileIndex * width) + tiltOffsetX;

    const visibleCount = Math.ceil((viewport.screenWidth + MAX_TILT_OFFSET_X * 2) / width) + TILE_START_PADDING + 3;
    const state = this.getLayerState(layer.key);

    this.ensureTiles(state, layer.key, visibleCount, DEPTH_BASE + layerIndex);

    for (let index = 0; index < state.tiles.length; index++) {
      const tile = state.tiles[index];
      const tileIndex = firstTileIndex + index;
      const x = offsetX + index * width;
      const visible = index < visibleCount;

      tile.image.setVisible(visible);

      if (!visible) {
        continue;
      }

      tile.image.setPosition(Math.round(x), drawY);
      tile.image.setDisplaySize(drawWidth, drawHeight);
      tile.image.setAlpha(layer.alpha ?? 1);
      tile.image.setFlipX(layer.mirror === true && Math.abs(tileIndex) % 2 === 1);
    }
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

  private getLayerState(key: string): LayerState {
    const existing = this.states.get(key);

    if (existing !== undefined) {
      return existing;
    }

    const created: LayerState = {
      tiles: [],
    };

    this.states.set(key, created);

    return created;
  }

  private ensureTiles(state: LayerState, textureKey: string, count: number, depth: number): void {
    while (state.tiles.length < count) {
      const image = this.scene.add.image(0, 0, textureKey);

      image.setOrigin(0, 0);
      image.setDepth(depth);
      image.setVisible(false);

      state.tiles.push({ image });
    }
  }
}
