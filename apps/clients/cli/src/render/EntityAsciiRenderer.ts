import type { EntitySnapshot } from "@smashing-cats/protocol";
import { AsciiBuffer } from "./AsciiBuffer.js";
import { AsciiCamera } from "./AsciiCamera.js";
import { ENTITY_SPRITES, UNKNOWN_ENTITY_SPRITE } from "./sprites.js";

export class EntityAsciiRenderer {
  public render(buffer: AsciiBuffer, camera: AsciiCamera, entity: EntitySnapshot, scrollX: number, groundY: number): void {
    const x = camera.worldToScreenX(entity.x, scrollX);
    const bottomY = camera.worldToScreenY(entity.y + entity.height, groundY);

    buffer.drawSprite(x, bottomY, this.getSprite(String(entity.kind)));
  }

  private getSprite(kind: string): string[] {
    return ENTITY_SPRITES[kind] ?? UNKNOWN_ENTITY_SPRITE;
  }
}
