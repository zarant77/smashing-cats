import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import { DRAW_SPRITE_BORDERS, drawSpriteBorder } from "./debug.js";
import { ImageCache } from "./ImageCache.js";

export class PlayerRenderer {
  private readonly portraits = new ImageCache();

  public draw(
    ctx: CanvasRenderingContext2D,
    snapshot: GameSnapshot,
    player: PlayerSnapshot,
    isLocal: boolean,
  ): void {
    const image = this.portraits.get(`/portraits/${player.kind}.png`);
    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;

    ctx.save();
    ctx.globalAlpha = shouldBlinkOff ? 0.35 : 1;

    if (image.complete && image.naturalWidth > 0) {
      ctx.translate(player.x + player.width, player.y);
      ctx.scale(-1, 1);
      ctx.drawImage(image, 0, 0, player.width, player.height);
    } else {
      ctx.fillStyle = player.alive ? (isLocal ? "#ffcc33" : "#f58ad4") : "#555555";
      ctx.fillRect(player.x, player.y, player.width, player.height);
    }

    ctx.restore();

    if (DRAW_SPRITE_BORDERS) {
      drawSpriteBorder(ctx, player.x, player.y, player.width, player.height);
    }
  }
}
