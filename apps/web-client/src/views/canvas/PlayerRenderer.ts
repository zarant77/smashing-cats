import type { GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";
import { GAME_CONFIG } from "@smashing-cats/core";
import { assets } from "../../assets/assets.js";
import { drawDebugShape } from "./DebugShapeRenderer.js";
import type { EffectRenderer } from "./EffectRenderer.js";
import { SpriteAnimation } from "./SpriteAnimation.js";
import type { RenderViewport } from "./viewport.js";

type DeathState = {
  startedAt: number;
  x: number;
  y: number;
};

type SmashLandingState = {
  wasGrounded: boolean;
  wasSmashing: boolean;
};

type RenderSize = {
  width: number;
  height: number;
};

const DEATH_JUMP_VELOCITY = -520;
const DEATH_GRAVITY = 1400;
const DEATH_DRIFT_X = 120;
const DEATH_ROTATION_SPEED = -7;

const SMASH_EFFECT_PATH = "/canvas/effects/smash.png";
const SMASH_EFFECT_DURATION_MS = 200;

const SMASH_EFFECT_OFFSET_X = 20;
const SMASH_EFFECT_OFFSET_Y = -20;

const SMASH_EFFECT_WIDTH = 64 * 3;
const SMASH_EFFECT_HEIGHT = 23 * 3;

export class PlayerRenderer {
  private readonly animation = new SpriteAnimation();
  private readonly deathStates = new Map<string, DeathState>();
  private readonly smashLandingStates = new Map<string, SmashLandingState>();

  public constructor(private readonly debug: boolean) {}

  public draw(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    viewport: RenderViewport,
    snapshot: GameSnapshot,
    player: PlayerSnapshot,
    isLocal: boolean,
    effects: EffectRenderer,
  ): void {
    const [worldWidth, worldHeight] = player.size;

    const screenX = viewport.worldToScreenSize(player.x);
    const screenY = viewport.worldToScreenY(player.y);

    const physicsWidth = viewport.worldToScreenSize(worldWidth);
    const physicsHeight = viewport.worldToScreenSize(worldHeight);

    const image = assets.get(`/canvas/players/${player.kind}.png`);
    const renderSize = getRenderSize(image, physicsWidth, physicsHeight);

    const shouldBlinkOff = player.invulnerable && Math.floor(snapshot.tick / 2) % 2 === 0;

    this.updateSmashLandingEffect(player, effects, screenX, snapshot.world.groundY, physicsWidth, physicsHeight, viewport.scale);

    if (!player.alive) {
      this.drawDeadPlayer(ctx, viewport, player, image, screenX, screenY, physicsWidth, physicsHeight, renderSize, isLocal);
      return;
    }

    this.deathStates.delete(player.id);

    const transform = this.animation.getTransform({
      id: player.id,
      x: screenX,
      y: screenY,
      width: physicsWidth,
      height: physicsHeight,
      groundY: GAME_CONFIG.groundY,
      entityY: player.y + player.size[1],
      alive: player.alive,
      hp: player.hp,
      velocityX: player.vx,
      velocityY: player.vy,
      moving: player.alive && player.grounded && !player.smashing,
      jumping: !player.grounded,
      smashing: player.smashing,
      animations: player.animations,
      scale: viewport.scale,
      screenWidth: canvasWidth,
      screenHeight: ctx.canvas.height,
    });

    ctx.save();

    ctx.globalAlpha = shouldBlinkOff ? 0.35 : transform.alpha;

    ctx.translate(transform.x, transform.y + physicsHeight / 2);
    ctx.rotate(transform.rotation);
    ctx.scale(-transform.scaleX, transform.scaleY);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -renderSize.width / 2, -renderSize.height, renderSize.width, renderSize.height);
    } else {
      ctx.fillStyle = isLocal ? "#ffcc33" : "#f58ad4";
      ctx.fillRect(-renderSize.width / 2, -renderSize.height, renderSize.width, renderSize.height);
    }

    ctx.restore();

    if (this.debug) {
      drawDebugShape(ctx, screenX, screenY, player.size, player.hurt, player.smash, viewport);
    }
  }

  private updateSmashLandingEffect(
    player: PlayerSnapshot,
    effects: EffectRenderer,
    screenX: number,
    screenY: number,
    width: number,
    height: number,
    scale: number,
  ): void {
    const state = this.getSmashLandingState(player);

    const justLanded = !state.wasGrounded && player.grounded;

    if (justLanded && state.wasSmashing) {
      effects.add({
        imagePath: SMASH_EFFECT_PATH,
        x: screenX + width / 2 + SMASH_EFFECT_OFFSET_X * scale,
        y: (screenY + SMASH_EFFECT_OFFSET_Y) * scale,
        startedAt: performance.now(),
        durationMs: SMASH_EFFECT_DURATION_MS,
        width: SMASH_EFFECT_WIDTH,
        height: SMASH_EFFECT_HEIGHT,
        scale,
        grow: 0.35 * scale,
        space: "screen",
        fadeOut: true,
      });
    }

    state.wasGrounded = player.grounded;
    state.wasSmashing = player.smashing || (!player.grounded && state.wasSmashing);
  }

  private drawDeadPlayer(
    ctx: CanvasRenderingContext2D,
    viewport: RenderViewport,
    player: PlayerSnapshot,
    image: HTMLImageElement,
    screenX: number,
    screenY: number,
    physicsWidth: number,
    physicsHeight: number,
    renderSize: RenderSize,
    isLocal: boolean,
  ): void {
    const state = this.getDeathState(player.id, screenX, screenY);
    const elapsed = (performance.now() - state.startedAt) / 1000;

    const x = state.x + DEATH_DRIFT_X * elapsed * viewport.scale;
    const y = state.y + DEATH_JUMP_VELOCITY * elapsed * viewport.scale + DEATH_GRAVITY * elapsed * elapsed * viewport.scale;

    const rotation = elapsed * DEATH_ROTATION_SPEED;
    const alpha = y > ctx.canvas.height + renderSize.height ? 0 : 1;

    ctx.save();

    ctx.globalAlpha = alpha;
    ctx.translate(x + physicsWidth / 2, y + physicsHeight / 2);
    ctx.rotate(rotation);
    ctx.scale(-1, 1);

    if (image.complete && image.naturalWidth > 0) {
      ctx.drawImage(image, -renderSize.width / 2, -renderSize.height / 2, renderSize.width, renderSize.height);
    } else {
      ctx.fillStyle = isLocal ? "#ffcc33" : "#f58ad4";
      ctx.fillRect(-renderSize.width / 2, -renderSize.height / 2, renderSize.width, renderSize.height);
    }

    ctx.restore();
  }

  private getDeathState(id: string, x: number, y: number): DeathState {
    const existing = this.deathStates.get(id);

    if (existing !== undefined) {
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

  private getSmashLandingState(player: PlayerSnapshot): SmashLandingState {
    const existing = this.smashLandingStates.get(player.id);

    if (existing !== undefined) {
      return existing;
    }

    const state: SmashLandingState = {
      wasGrounded: player.grounded,
      wasSmashing: player.smashing,
    };

    this.smashLandingStates.set(player.id, state);

    return state;
  }
}

function getRenderSize(image: HTMLImageElement, fallbackWidth: number, fallbackHeight: number): RenderSize {
  if (!image.complete || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
    return {
      width: fallbackWidth,
      height: fallbackHeight,
    };
  }

  return {
    width: fallbackWidth,
    height: fallbackWidth * (image.naturalHeight / image.naturalWidth),
  };
}
