import type { EntitySnapshot } from "@smashing-cats/protocol";
import { AsciiBuffer } from "./AsciiBuffer.js";
import { AsciiCamera } from "./AsciiCamera.js";
import { ENTITY_SPRITES, UNKNOWN_ENTITY_SPRITE } from "./sprites.js";

type DeadEntity = {
  entity: EntitySnapshot;
  diedAt: number;
};

const DEATH_BLINK_MS = 1000;
const BLINK_INTERVAL_MS = 120;

export class EntityAsciiRenderer {
  private readonly deadEntities = new Map<string, DeadEntity>();

  public render(buffer: AsciiBuffer, camera: AsciiCamera, entity: EntitySnapshot, scrollX: number, groundY: number): void {
    if (entity.alive) {
      this.deadEntities.delete(entity.id);
      this.renderEntity(buffer, camera, entity, scrollX, groundY);
      return;
    }

    this.renderDeadEntity(buffer, camera, entity, scrollX, groundY);
  }

  private renderDeadEntity(buffer: AsciiBuffer, camera: AsciiCamera, entity: EntitySnapshot, scrollX: number, groundY: number): void {
    const now = Date.now();

    const deadEntity = this.deadEntities.get(entity.id) ?? {
      entity,
      diedAt: now,
    };

    this.deadEntities.set(entity.id, deadEntity);

    const age = now - deadEntity.diedAt;

    if (age >= DEATH_BLINK_MS) {
      return;
    }

    const visible = Math.floor(age / BLINK_INTERVAL_MS) % 2 === 0;

    if (!visible) {
      return;
    }

    this.renderEntity(buffer, camera, deadEntity.entity, scrollX, groundY);
  }

  private renderEntity(buffer: AsciiBuffer, camera: AsciiCamera, entity: EntitySnapshot, scrollX: number, groundY: number): void {
    const [, height] = entity.size;

    const x = camera.worldToScreenX(entity.x, scrollX);
    const bottomY = camera.worldToScreenY(entity.y + height, groundY);

    buffer.drawSprite(x, bottomY, this.getSprite(String(entity.kind)));
  }

  private getSprite(kind: string): string[] {
    return ENTITY_SPRITES[kind] ?? UNKNOWN_ENTITY_SPRITE;
  }
}
