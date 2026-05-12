import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import { DRAW_SPRITE_BORDERS, drawSpriteBorder } from "./debug.js";
import { ImageCache } from "./ImageCache.js";
import { SpriteAnimation } from "./SpriteAnimation.js";
import { LandingEffect } from "./LandingEffect.js";

export class PlayerRenderer {
  private readonly portraits = new ImageCache();
  private readonly animation = new SpriteAnimation();
  private readonly landingEffect = new LandingEffect();

  public draw(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, player: PlayerSnapshot, isLocal: boolean): void {
    const image = this.portraits.get(`/portraits/${player.kind}.png`);
    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;

    const landingImage = this.portraits.get(this.landingEffect.getImagePath());

    this.landingEffect.update({
      id: player.id,
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
      grounded: player.grounded,
    });

    const transform = this.animation.getTransform({
      id: player.id,
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
      alive: player.alive,
      hp: player.hp,
      moving: Math.abs(player.vx) > 1,
      jumping: !player.grounded,
      smashing: player.smashing,
    });

    ctx.save();
    ctx.globalAlpha = shouldBlinkOff ? 0.35 : 1;

    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(-transform.scaleX, transform.scaleY);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -player.width / 2, -player.height / 2, player.width, player.height);
    } else {
      ctx.fillStyle = player.alive ? (isLocal ? "#ffcc33" : "#f58ad4") : "#555555";
      ctx.fillRect(-player.width / 2, -player.height / 2, player.width, player.height);
    }

    ctx.restore();

    if (landingImage.complete && landingImage.naturalWidth > 0) {
      this.landingEffect.draw(ctx, landingImage, player.id);
    }

    if (DRAW_SPRITE_BORDERS) {
      drawSpriteBorder(ctx, player.x, player.y, player.width, player.height);
    }
  }
}
