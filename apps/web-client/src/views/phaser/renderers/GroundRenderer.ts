import Phaser from "phaser";
import type { GameSnapshot } from "@smashing-cats/protocol";
import type { RenderViewport } from "../../viewport.js";
import { getImageAsset, images } from "../../../assetManager/assetManager.js";

const DESIGN_TILE_WIDTH = 800;
const GROUND_OFFSET_Y = -55;

export class GroundRenderer {
  private readonly tiles: Phaser.GameObjects.Image[] = [];

  public constructor(private readonly scene: Phaser.Scene) {}

  public draw(snapshot: GameSnapshot, viewport: RenderViewport): void {
    const image = images.getLoaded(getImageAsset("environment.ground"));

    const tileWidth = viewport.worldToScreenSize(DESIGN_TILE_WIDTH);
    const tileHeight = image.naturalHeight * (tileWidth / image.naturalWidth);
    const groundY = viewport.worldToScreenY(snapshot.world.groundY + GROUND_OFFSET_Y);
    const scrollX = snapshot.world.scrollX * viewport.scale;

    const firstTileIndex = Math.floor(scrollX / tileWidth);
    const offsetX = -(scrollX - firstTileIndex * tileWidth);
    const visibleCount = Math.ceil(this.scene.scale.width / tileWidth) + 2;

    this.ensureTiles(visibleCount);

    for (let index = 0; index < this.tiles.length; index++) {
      const tileIndex = firstTileIndex + index;
      const tile = this.tiles[index];
      const x = offsetX + index * tileWidth;

      tile.setVisible(index < visibleCount);
      tile.setPosition(Math.round(x), Math.round(groundY));
      tile.setDisplaySize(Math.ceil(tileWidth) + 1, Math.ceil(tileHeight));
      tile.setOrigin(0, 0);
      tile.setFlipX(Math.abs(tileIndex) % 2 === 1);
    }
  }

  public destroy(): void {
    for (const tile of this.tiles) {
      tile.destroy();
    }

    this.tiles.length = 0;
  }

  private ensureTiles(count: number): void {
    while (this.tiles.length < count) {
      const tile = this.scene.add.image(0, 0, "environment.ground");
      tile.setDepth(10);
      this.tiles.push(tile);
    }
  }
}
