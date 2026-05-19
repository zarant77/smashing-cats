import * as THREE from "three";
import type { GameSnapshot } from "@smashing-cats/protocol";
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
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;
};

type LayerState = {
  tiles: LayerTile[];
  texture?: THREE.Texture;
};

const LAYERS: ParallaxLayer[] = [
  { path: "/canvas/environments/sky.png", speed: 0, y: -200, height: 1 },
  { path: "/canvas/environments/mountains.png", speed: 0.05, y: 80, height: 0.22, mirror: true },
  { path: "/canvas/environments/clouds.png", speed: 0.1, y: -180, height: 0.6 },
  { path: "/canvas/environments/fog.png", speed: 0.3, y: 30, height: 0.4, mirror: true },
  { path: "/canvas/environments/forest.png", speed: 0.6, y: 65, height: 0.4 },
  { path: "/canvas/environments/forest_front.png", speed: 0.85, y: 220, height: 0.15 },
];

const SKY_COLOR = 0x87ceeb;
const BACKGROUND_Z = 300;
const RENDER_ORDER_BASE = -100;

export class BackgroundRenderer {
  private readonly states = new Map<string, LayerState>();

  private readonly sky: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>;

  public constructor(private readonly scene: THREE.Scene) {
    this.sky = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({
        color: SKY_COLOR,
        side: THREE.DoubleSide,
        depthTest: false,
        depthWrite: false,
      }),
    );

    this.sky.renderOrder = RENDER_ORDER_BASE - 1;
    this.sky.frustumCulled = false;

    this.scene.add(this.sky);
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    this.drawSky(viewport);

    for (let index = 0; index < LAYERS.length; index++) {
      this.drawLayer(snapshot, viewport, LAYERS[index], index);
    }
  }

  public destroy(): void {
    this.scene.remove(this.sky);
    this.sky.geometry.dispose();
    this.sky.material.dispose();

    for (const state of this.states.values()) {
      for (const tile of state.tiles) {
        this.scene.remove(tile.mesh);
        tile.mesh.geometry.dispose();
        tile.mesh.material.dispose();
      }

      state.texture?.dispose();
    }

    this.states.clear();
  }

  private drawSky(viewport: RenderViewport): void {
    this.sky.position.set(viewport.screenWidth / 2, viewport.screenHeight / 2, BACKGROUND_Z);

    this.sky.scale.set(viewport.screenWidth, -viewport.screenHeight, 1);
  }

  private drawLayer(snapshot: GameSnapshot, viewport: RenderViewport, layer: ParallaxLayer, layerIndex: number): void {
    const source = assets.get(layer.path);

    if (!source.complete || source.naturalWidth <= 0 || source.naturalHeight <= 0) {
      return;
    }

    const state = this.getLayerState(layer.path);
    const texture = this.getTexture(state, source);

    const height = viewport.screenHeight * layer.height;
    const imageScale = height / source.naturalHeight;
    const width = source.naturalWidth * imageScale;

    const drawWidth = Math.ceil(width) + 1;
    const drawHeight = Math.ceil(height);
    const drawY = Math.round(viewport.worldToScreenSize(layer.y));

    const scroll = snapshot.world.scrollX * layer.speed * viewport.scale;
    const firstTileIndex = Math.floor(scroll / width) - 1;
    const offsetX = -(scroll - firstTileIndex * width);
    const visibleCount = Math.ceil(viewport.screenWidth / width) + 4;

    this.ensureTiles(state, texture, visibleCount, RENDER_ORDER_BASE + layerIndex);

    for (let index = 0; index < state.tiles.length; index++) {
      const tile = state.tiles[index];
      const tileIndex = firstTileIndex + index;

      tile.mesh.visible = index < visibleCount;

      if (!tile.mesh.visible) {
        continue;
      }

      const x = offsetX + index * width + drawWidth / 2;
      const mirrored = layer.mirror === true && Math.abs(tileIndex) % 2 === 1;

      tile.mesh.position.set(Math.round(x), drawY + drawHeight / 2, BACKGROUND_Z + layerIndex);

      tile.mesh.scale.set(mirrored ? -drawWidth : drawWidth, -drawHeight, 1);

      tile.mesh.material.opacity = layer.alpha ?? 1;
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

  private getTexture(state: LayerState, source: HTMLImageElement): THREE.Texture {
    if (state.texture !== undefined) {
      return state.texture;
    }

    const texture = new THREE.Texture(source);

    texture.needsUpdate = true;
    texture.colorSpace = THREE.SRGBColorSpace;

    state.texture = texture;

    return texture;
  }

  private ensureTiles(state: LayerState, texture: THREE.Texture, count: number, renderOrder: number): void {
    while (state.tiles.length < count) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          side: THREE.DoubleSide,
          depthTest: true,
          depthWrite: false,
        }),
      );

      mesh.renderOrder = renderOrder;
      mesh.visible = false;
      mesh.frustumCulled = false;

      this.scene.add(mesh);
      state.tiles.push({ mesh });
    }
  }
}
