import type { Translator } from "@smashing-cats/i18n";
import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { AsciiBuffer } from "./AsciiBuffer.js";
import { AsciiCamera } from "./AsciiCamera.js";
import { HudAsciiRenderer } from "./HudAsciiRenderer.js";
import { EntityAsciiRenderer } from "./EntityAsciiRenderer.js";
import { GroundAsciiRenderer } from "./GroundAsciiRenderer.js";
import { PlayerAsciiRenderer } from "./PlayerAsciiRenderer.js";
import { FloatingTextAsciiRenderer } from "./FloatingTextAsciiRenderer.js";

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 28;

export class GameAsciiRenderer {
  private readonly buffer = new AsciiBuffer(VIEW_WIDTH, VIEW_HEIGHT);
  private readonly camera = new AsciiCamera(VIEW_WIDTH, VIEW_HEIGHT);

  private readonly hudRenderer = new HudAsciiRenderer();
  private readonly groundRenderer = new GroundAsciiRenderer();
  private readonly playerRenderer = new PlayerAsciiRenderer();
  private readonly entityRenderer = new EntityAsciiRenderer();
  private readonly floatingTextRenderer = new FloatingTextAsciiRenderer();

  public render(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined, t: Translator): string {
    if (snapshot === undefined) {
      return "Waiting for snapshot...";
    }

    const scrollX = snapshot.world.scrollX;

    this.buffer.clear();

    this.drawClouds(scrollX);
    this.floatingTextRenderer.update(snapshot);
    this.hudRenderer.render(this.buffer, snapshot, t);

    const groundRow = this.camera.worldToScreenY(snapshot.world.groundY, snapshot.world.groundY);
    this.groundRenderer.render(this.buffer, groundRow);

    for (const entity of snapshot.entities) {
      this.entityRenderer.render(this.buffer, this.camera, entity, scrollX, snapshot.world.groundY);
    }

    for (const player of snapshot.players) {
      this.playerRenderer.render(this.buffer, this.camera, player, localPlayerId, snapshot.world.groundY);
    }

    this.floatingTextRenderer.render(this.buffer, this.camera, snapshot.world.groundY);

    return this.buffer.toString();
  }

  private drawClouds(scrollX: number): void {
    const cloudOffset = Math.floor(scrollX * 0.02);

    const clouds = [
      { x: 10, y: 4 },
      { x: 35, y: 6 },
      { x: 65, y: 5 },
      { x: 90, y: 7 },
    ];

    for (const cloud of clouds) {
      const x = (((cloud.x - cloudOffset) % VIEW_WIDTH) + VIEW_WIDTH) % VIEW_WIDTH;

      this.buffer.drawText(x, cloud.y, ".--.");
      this.buffer.drawText(x - 1, cloud.y + 1, "(____)");
    }
  }
}
