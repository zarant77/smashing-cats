import type { PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";
import { AsciiBuffer } from "./AsciiBuffer.js";
import { AsciiCamera } from "./AsciiCamera.js";
import { LOCAL_PLAYER_SPRITE, OTHER_PLAYER_SPRITE } from "./sprites.js";

export class PlayerAsciiRenderer {
  public render(
    buffer: AsciiBuffer,
    camera: AsciiCamera,
    player: PlayerSnapshot,
    localPlayerId: PlayerId | undefined,
    groundY: number,
  ): void {
    if (!player.alive) {
      return;
    }

    const blinkVisible = Math.floor(Date.now() / 120) % 2 === 0;

    if (player.invulnerable && !blinkVisible) {
      return;
    }

    const x = camera.screenXToColumn(player.x);
    const bottomY = camera.worldToScreenY(player.y + player.height, groundY);

    const sprite = player.playerId === localPlayerId ? LOCAL_PLAYER_SPRITE : OTHER_PLAYER_SPRITE;

    buffer.drawSprite(x, bottomY, sprite);
  }
}
