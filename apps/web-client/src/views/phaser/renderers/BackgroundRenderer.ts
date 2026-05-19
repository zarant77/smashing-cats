import Phaser from "phaser";
import type { GameSnapshot } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import { assets } from "../../../assets/assets.js";
import type { RenderViewport } from "../../viewport.js";

type ParallaxLayer = {
  path: string;
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
  { path: "/canvas/environments/sky.png", speed: 0, y: 0, height: 1 },
  { path: "/canvas/environments/mountains.png", speed: 0.05, y: 220, height: 0.22, mirror: true },
  { path: "/canvas/environments/clouds.png", speed: 0.1, y: 0, height: 0.6 },
  { path: "/canvas/environments/fog.png", speed: 0.3, y: 200, height: 0.4, mirror: true },
  { path: "/canvas/environments/forest.png", speed: 0.6, y: 210, height: 0.4 },
  { path: "/canvas/environments/forest_front.png", speed: 0.85, y: 350, height: 0.15 },
];

const DEPTH_BASE = -100;

export class BackgroundRenderer {
  private readonly states = new Map<string, LayerState>();
  private sky?: Phaser.GameObjects.Rectangle;

  public constructor(
    private readonly scene: Phaser.Scene,
    private t: Translator,
  ) {}

  public setTranslator(t: Translator): void {
    this.t = t;
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    this.drawSky(viewport);

    for (let index = 0; index < LAYERS.length; index++) {
      this.drawLayer(snapshot, viewport, LAYERS[index], index);
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

  private drawLayer(snapshot: GameSnapshot, viewport: RenderViewport, layer: ParallaxLayer, layerIndex: number): void {
    const source = assets.get(layer.path);

    if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
      return;
    }

    if (!this.scene.textures.exists(layer.path)) {
      this.scene.textures.addImage(layer.path, source);
    }

    const height = viewport.screenHeight * layer.height;
    const imageScale = height / source.naturalHeight;
    const width = source.naturalWidth * imageScale;

    const drawWidth = Math.ceil(width) + 1;
    const drawHeight = Math.ceil(height);
    const drawY = Math.round(viewport.worldToScreenSize(layer.y));

    const scroll = snapshot.world.scrollX * layer.speed * viewport.scale;
    const firstTileIndex = Math.floor(scroll / width);
    const offsetX = -(scroll - firstTileIndex * width);

    const visibleCount = Math.ceil(viewport.screenWidth / width) + 2;
    const state = this.getLayerState(layer.path);

    this.ensureTiles(state, layer.path, visibleCount, DEPTH_BASE + layerIndex);

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

  private getLayerState(path: string): LayerState {
    const existing = this.states.get(path);

    if (existing !== undefined) {
      return existing;
    }

    const created: LayerState = {
      tiles: [],
    };

    this.states.set(path, created);

    return created;
  }

  private ensureTiles(state: LayerState, path: string, count: number, depth: number): void {
    while (state.tiles.length < count) {
      const image = this.scene.add.image(0, 0, path);

      image.setOrigin(0, 0);
      image.setDepth(depth);
      image.setVisible(false);

      state.tiles.push({ image });
    }
  }
}
