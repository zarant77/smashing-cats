import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";
import { drawDebugShape } from "./DebugShapeRenderer.js";
import { LandingEffect } from "./LandingEffect.js";
import { SpriteAnimation } from "./SpriteAnimation.js";

export class PlayerRenderer {
  private readonly animation = new SpriteAnimation();
  private readonly landingEffect = new LandingEffect();

  public constructor(private readonly debug: boolean) {}

  public draw(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, player: PlayerSnapshot, isLocal: boolean): void {
    const [width, height] = player.size;

    const image = assets.get(`/players/${player.kind}.png`);
    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;

    this.landingEffect.update({
      id: player.id,
      x: player.x,
      y: player.y,
      width,
      height,
      grounded: player.grounded,
      smashing: player.smashing,
    });

    const transform = this.animation.getTransform({
      id: player.id,
      x: player.x,
      y: player.y,
      width,
      height,
      alive: player.alive,
      hp: player.hp,
      velocityX: player.vx,
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
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = player.alive ? (isLocal ? "#ffcc33" : "#f58ad4") : "#555555";
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    ctx.restore();

    this.landingEffect.draw(ctx, player.id);

    if (this.debug) {
      drawDebugShape(ctx, player.x, player.y, player.size, player.hurt, player.smash);
    }
  }
}
