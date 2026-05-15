import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import { assets } from "../../assets/assets.js";
import { drawDebugShape } from "./DebugShapeRenderer.js";
import { LandingEffect } from "./LandingEffect.js";
import { SpriteAnimation } from "./SpriteAnimation.js";
import type { RenderViewport } from "./viewport.js";

type DeathState = {
  startedAt: number;
  x: number;
  y: number;
};

const DEATH_JUMP_VELOCITY = -520;
const DEATH_GRAVITY = 1400;
const DEATH_DRIFT_X = 120;
const DEATH_ROTATION_SPEED = -7;

export class PlayerRenderer {
  private readonly animation = new SpriteAnimation();
  private readonly landingEffect = new LandingEffect();
  private readonly deathStates = new Map<string, DeathState>();

  public constructor(private readonly debug: boolean) {}

  public draw(
    ctx: CanvasRenderingContext2D,
    viewport: RenderViewport,
    snapshot: GameSnapshot,
    player: PlayerSnapshot,
    isLocal: boolean,
  ): void {
    const [worldWidth, worldHeight] = player.size;

    const screenX = viewport.worldToScreenSize(player.x);
    const screenY = viewport.worldToScreenY(player.y);
    const width = viewport.worldToScreenSize(worldWidth);
    const height = viewport.worldToScreenSize(worldHeight);

    const image = assets.get(`/players/${player.kind}.png`);
    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;

    this.landingEffect.update({
      id: player.id,
      x: player.x,
      y: player.y,
      width: worldWidth,
      height: worldHeight,
      grounded: player.grounded,
      smashing: player.smashing,
    });

    if (!player.alive) {
      this.drawDeadPlayer(ctx, viewport, player, image, screenX, screenY, width, height, isLocal);
      return;
    }

    this.deathStates.delete(player.id);

    const transform = this.animation.getTransform({
      id: player.id,
      x: screenX,
      y: screenY,
      width,
      height,
      alive: player.alive,
      hp: player.hp,
      velocityX: player.vx,
      moving: Math.abs(player.vx) > 1,
      jumping: !player.grounded,
      smashing: player.smashing,
      scale: viewport.scale,
    });

    ctx.save();

    ctx.globalAlpha = shouldBlinkOff ? 0.35 : 1;

    ctx.translate(transform.x, transform.y);
    ctx.rotate(transform.rotation);
    ctx.scale(-transform.scaleX, transform.scaleY);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = isLocal ? "#ffcc33" : "#f58ad4";
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    ctx.restore();

    this.landingEffect.draw(ctx, viewport, player.id);

    if (this.debug) {
      drawDebugShape(ctx, screenX, screenY, player.size, player.hurt, player.smash, viewport);
    }
  }

  private drawDeadPlayer(
    ctx: CanvasRenderingContext2D,
    viewport: RenderViewport,
    player: PlayerSnapshot,
    image: HTMLImageElement,
    screenX: number,
    screenY: number,
    width: number,
    height: number,
    isLocal: boolean,
  ): void {
    const state = this.getDeathState(player.id, screenX, screenY);
    const elapsed = (performance.now() - state.startedAt) / 1000;

    const x = state.x + DEATH_DRIFT_X * elapsed * viewport.scale;
    const y = state.y + DEATH_JUMP_VELOCITY * elapsed * viewport.scale + DEATH_GRAVITY * elapsed * elapsed * viewport.scale;

    const rotation = elapsed * DEATH_ROTATION_SPEED;
    const alpha = y > ctx.canvas.height + height ? 0 : 1;

    ctx.save();

    ctx.globalAlpha = alpha;
    ctx.translate(x + width / 2, y + height / 2);
    ctx.rotate(rotation);
    ctx.scale(-1, 1);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -width / 2, -height / 2, width, height);
    } else {
      ctx.fillStyle = isLocal ? "#ffcc33" : "#f58ad4";
      ctx.fillRect(-width / 2, -height / 2, width, height);
    }

    ctx.restore();
  }

  private getDeathState(id: string, x: number, y: number): DeathState {
    const existing = this.deathStates.get(id);

    if (existing) {
      return existing;
    }

    const state: DeathState = {
      startedAt: performance.now(),
      x,
      y,
    };

    this.deathStates.set(id, state);

    return state;
  }
}
