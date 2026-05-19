import * as THREE from "three";
import type { GameSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";
import { ThreeModels } from "../models/threeModels.js";
import type { ThreeModelCache } from "../models/ThreeModelCache.js";

const GROUND_OFFSET_Y = -55;
const GROUND_BASE_SCALE = 500;
const GROUND_TILE_OVERLAP = 18;
const EXTRA_VISIBLE_TILES = 4;
const RENDER_ORDER = 10;

export class GroundRenderer {
  private readonly tiles: THREE.Group[] = [];

  private modelWidth = 1;

  public constructor(
    private readonly scene: THREE.Scene,
    private readonly models: ThreeModelCache,
  ) {}

  public async init(): Promise<void> {
    const model = await this.models.clone(ThreeModels.Environments.ground);

    this.modelWidth = this.getModelWidth(model);

    this.prepareModel(model);
    this.scene.add(model);
    this.tiles.push(model);

    await this.ensureTiles(EXTRA_VISIBLE_TILES);
  }

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const tileScale = viewport.scale * GROUND_BASE_SCALE;
    const tileWidth = Math.max(1, this.modelWidth * tileScale - GROUND_TILE_OVERLAP * viewport.scale);

    const groundY = viewport.worldToScreenY(snapshot.world.groundY + GROUND_OFFSET_Y);
    const scrollX = snapshot.world.scrollX * viewport.scale;

    const firstTileIndex = Math.floor(scrollX / tileWidth) - 1;
    const offsetX = -(scrollX - firstTileIndex * tileWidth);
    const visibleCount = Math.ceil(viewport.screenWidth / tileWidth) + EXTRA_VISIBLE_TILES;

    void this.ensureTiles(visibleCount);

    for (let index = 0; index < this.tiles.length; index++) {
      const tile = this.tiles[index];

      tile.visible = index < visibleCount;

      if (!tile.visible) {
        continue;
      }

      const tileIndex = firstTileIndex + index;
      const mirrored = Math.abs(tileIndex) % 2 === 1;

      const x = offsetX + index * tileWidth + tileWidth / 2;
      const scaleX = mirrored ? -tileScale : tileScale;

      tile.position.set(Math.round(x), Math.round(groundY), 0);
      tile.scale.set(scaleX, tileScale, tileScale);
      tile.rotation.set(Math.PI, 0, 0);
    }
  }

  public destroy(): void {
    for (const tile of this.tiles) {
      this.scene.remove(tile);
    }

    this.tiles.length = 0;
  }

  private async ensureTiles(count: number): Promise<void> {
    while (this.tiles.length < count) {
      const model = await this.models.clone(ThreeModels.Environments.ground);

      this.prepareModel(model);

      model.visible = false;

      this.scene.add(model);
      this.tiles.push(model);
    }
  }

  private prepareModel(model: THREE.Group): void {
    model.traverse((child) => {
      child.renderOrder = RENDER_ORDER;

      if (child instanceof THREE.Mesh) {
        child.frustumCulled = false;
      }
    });
  }

  private getModelWidth(model: THREE.Group): number {
    const box = new THREE.Box3().setFromObject(model);
    const size = new THREE.Vector3();

    box.getSize(size);

    return Math.max(size.x, 1);
  }
}
