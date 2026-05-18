import type { PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";
import { AsciiBuffer } from "./AsciiBuffer.js";
import { AsciiCamera } from "./AsciiCamera.js";
import { ENTITY_COLORS, LOCAL_PLAYER_SPRITE, OTHER_PLAYER_SPRITE, type AnimatedAsciiSprite } from "./sprites.js";

export class PlayerAsciiRenderer {
  private frameIndex = 0;

  public render(
    buffer: AsciiBuffer,
    camera: AsciiCamera,
    player: PlayerSnapshot,
    localPlayerId: PlayerId | undefined,
    groundY: number,
  ): void {
    this.frameIndex++;

    if (!player.alive) {
      return;
    }

    const [, height] = player.size;

    const blinkVisible = Math.floor(Date.now() / 120) % 2 === 0;

    if (player.invulnerable && !blinkVisible) {
      return;
    }

    const x = camera.screenXToColumn(player.x);
    const bottomY = camera.worldToScreenY(player.y + height, groundY);

    const isLocalPlayer = player.playerId === localPlayerId;
    const frames = isLocalPlayer ? LOCAL_PLAYER_SPRITE : OTHER_PLAYER_SPRITE;
    const color = isLocalPlayer ? ENTITY_COLORS.localPlayer : ENTITY_COLORS.otherPlayer;
    const sprite = this.getFrame(frames);

    buffer.drawSprite(x, bottomY, sprite, color);
  }

  private getFrame(sprite: AnimatedAsciiSprite): string[] {
    return sprite[this.frameIndex % sprite.length] ?? sprite[0] ?? [];
  }
}
