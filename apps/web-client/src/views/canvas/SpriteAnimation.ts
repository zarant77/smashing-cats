export type SpriteAnimationInput = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;

  alive: boolean;
  hp?: number;

  moving?: boolean;
  jumping?: boolean;
  smashing?: boolean;
};

export type SpriteAnimationTransform = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

type SpriteAnimationState = {
  hp?: number;
  alive: boolean;
  damagedAt: number;
};

const BOUNCE_SPEED = 0.012;
const BOUNCE_POWER = 0.055;

const DAMAGE_SHAKE_MS = 500;
const DAMAGE_SHAKE_POWER = 5;

const JUMP_ROTATION = -Math.PI / 8;
const SMASH_ROTATION = Math.PI / 8;

export class SpriteAnimation {
  private readonly states = new Map<string, SpriteAnimationState>();

  public getTransform(input: SpriteAnimationInput): SpriteAnimationTransform {
    const now = performance.now();
    const state = this.getState(input);

    if (this.isDamaged(input, state)) {
      state.damagedAt = now;
    }

    if (input.hp !== undefined) {
      state.hp = input.hp;
    }

    state.alive = input.alive;

    const bounce = Math.sin(now * BOUNCE_SPEED) * BOUNCE_POWER;
    const scaleY = input.alive ? 1 + bounce : 1;
    const scaleX = input.alive ? 1 - bounce * 0.45 : 1;

    const shakeX = this.getDamageShakeX(now, state.damagedAt);

    return {
      x: input.x + input.width / 2 + shakeX,
      y: input.y + input.height / 2,
      scaleX,
      scaleY,
      rotation: this.getRotation(input),
    };
  }

  private getState(input: SpriteAnimationInput): SpriteAnimationState {
    const existing = this.states.get(input.id);

    if (existing) {
      return existing;
    }

    const state: SpriteAnimationState = {
      hp: input.hp ?? 0,
      alive: input.alive,
      damagedAt: -Infinity,
    };

    this.states.set(input.id, state);
    return state;
  }

  private isDamaged(input: SpriteAnimationInput, state: SpriteAnimationState): boolean {
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

  private getRotation(input: SpriteAnimationInput): number {
    if (input.smashing) {
      return SMASH_ROTATION;
    }

    if (input.jumping) {
      return JUMP_ROTATION;
    }

    return 0;
  }
}
