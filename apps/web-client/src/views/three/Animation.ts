import type { PlayerSnapshot } from "@smashing-cats/protocol";
import type { SceneObject } from "./ObjectRegistry.js";
import { getWorldY } from "./coordinates.js";

type AnimationInput = {
  id: string;
  topY: number;
  size: readonly [width: number, height: number];
  groundY: number;
  alive: boolean;
  hp?: number;
  jumping?: boolean;
  smashing?: boolean;
};

type AnimationState = {
  hp?: number;
  alive: boolean;
  damagedAt: number;
};

const BOUNCE_SPEED = 0.012;
const BOUNCE_POWER = 0.055;

const DAMAGE_SHAKE_MS = 500;
const DAMAGE_SHAKE_POWER = 5;

const JUMP_ROTATION = Math.PI / 8;
const SMASH_ROTATION = -Math.PI / 8;

export class Animation {
  private readonly states = new Map<string, AnimationState>();

  public applyPlayer(object: SceneObject, player: PlayerSnapshot, centerX: number, groundY: number): void {
    this.apply(
      object,
      {
        id: player.id,
        topY: player.y,
        size: player.size,
        groundY,
        alive: player.alive,
        hp: player.hp,
        jumping: !player.grounded,
        smashing: player.smashing,
      },
      centerX,
    );
  }

  public applyEntity(
    object: SceneObject,
    id: string,
    centerX: number,
    topY: number,
    size: readonly [width: number, height: number],
    groundY: number,
    alive: boolean,
  ): void {
    this.apply(
      object,
      {
        id,
        topY,
        size,
        groundY,
        alive,
      },
      centerX,
    );
  }

  private apply(object: SceneObject, input: AnimationInput, centerX: number): void {
    const now = performance.now();
    const state = this.getState(input);

    if (this.isDamaged(input, state)) {
      state.damagedAt = now;
    }

    if (input.hp !== undefined) {
      state.hp = input.hp;
    }

    state.alive = input.alive;

    const [, height] = input.size;

    const bounce = Math.sin(now * BOUNCE_SPEED) * BOUNCE_POWER;
    const scaleY = input.alive ? 1 + bounce : 1;
    const scaleX = input.alive ? 1 - bounce * 0.45 : 1;
    const shakeX = this.getDamageShakeX(now, state.damagedAt);

    object.root.position.set(centerX + shakeX, getWorldY(input.topY, height, input.groundY), 0);

    object.root.rotation.set(0, 0, this.getRotation(input));
    object.root.scale.set(scaleX, scaleY, 1);
  }

  private getState(input: AnimationInput): AnimationState {
    const existing = this.states.get(input.id);

    if (existing !== undefined) {
      return existing;
    }

    const state: AnimationState = {
      hp: input.hp ?? 0,
      alive: input.alive,
      damagedAt: -Infinity,
    };

    this.states.set(input.id, state);

    return state;
  }

  private isDamaged(input: AnimationInput, state: AnimationState): boolean {
    if (state.alive && !input.alive) {
      return true;
    }

    if (input.hp === undefined || state.hp === undefined) {
      return false;
    }

    return input.hp < state.hp;
  }

  private getDamageShakeX(now: number, damagedAt: number): number {
    const elapsed = now - damagedAt;

    if (elapsed < 0 || elapsed > DAMAGE_SHAKE_MS) {
      return 0;
    }

    const progress = 1 - elapsed / DAMAGE_SHAKE_MS;

    return Math.sin(elapsed * 0.09) * DAMAGE_SHAKE_POWER * progress;
  }

  private getRotation(input: AnimationInput): number {
    if (input.smashing) {
      return SMASH_ROTATION;
    }

    if (input.jumping) {
      return JUMP_ROTATION;
    }

    return 0;
  }
}
