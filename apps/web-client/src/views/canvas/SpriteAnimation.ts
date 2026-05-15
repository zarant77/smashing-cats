type TransformInput = {
  id: string;

  x: number;
  y: number;

  width: number;
  height: number;

  alive: boolean;
  hp: number;

  moving: boolean;
  jumping: boolean;
  smashing: boolean;

  scale: number;

  velocityX?: number;
};

type AnimationState = {
  hp: number;
  damagedAt: number;
};

type Transform = {
  x: number;
  y: number;

  scaleX: number;
  scaleY: number;

  rotation: number;
};

type AnimationImpact = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
};

const DAMAGE_SHAKE_MS = 500;

const DAMAGE_SHAKE_POWER_X = 7;
const DAMAGE_SHAKE_POWER_Y = 5;
const DAMAGE_SQUASH_POWER = 0.18;

const WALK_BOB_POWER_Y = 4;
const WALK_SQUASH_POWER = 0.09;
const WALK_SPEED = 0.005;

const DEFAULT_IMPACT: AnimationImpact = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
};

export class SpriteAnimation {
  private readonly states = new Map<string, AnimationState>();

  public getTransform(input: TransformInput): Transform {
    const now = performance.now();
    const state = this.getState(input, now);

    const damage = this.getDamageImpact(now, state.damagedAt, input.scale);
    const walk = this.getWalkImpact(now, input);

    return {
      x: input.x + input.width / 2 + damage.x + walk.x,
      y: input.y + input.height / 2 + damage.y + walk.y,

      scaleX: damage.scaleX * walk.scaleX,
      scaleY: damage.scaleY * walk.scaleY,

      rotation: this.getRotation(input),
    };
  }

  private getState(input: TransformInput, now: number): AnimationState {
    const existing = this.states.get(input.id);

    if (existing === undefined) {
      const created: AnimationState = {
        hp: input.hp,
        damagedAt: -Infinity,
      };

      this.states.set(input.id, created);

      return created;
    }

    if (input.hp < existing.hp) {
      existing.damagedAt = now;
    }

    existing.hp = input.hp;

    return existing;
  }

  private getRotation(input: TransformInput): number {
    if (!input.alive) {
      return 0;
    }

    if (input.smashing) {
      return 0.35;
    }

    if (input.jumping) {
      return -0.15;
    }

    return 0;
  }

  private getDamageImpact(now: number, damagedAt: number, scale: number): AnimationImpact {
    const elapsed = now - damagedAt;

    if (elapsed < 0 || elapsed > DAMAGE_SHAKE_MS) {
      return DEFAULT_IMPACT;
    }

    const progress = 1 - elapsed / DAMAGE_SHAKE_MS;
    const squash = Math.sin(elapsed * 0.12) * DAMAGE_SQUASH_POWER * progress;

    return {
      x: Math.sin(elapsed * 0.11) * DAMAGE_SHAKE_POWER_X * progress * scale,
      y: Math.cos(elapsed * 0.17) * DAMAGE_SHAKE_POWER_Y * progress * scale,

      scaleX: 1 + squash,
      scaleY: 1 - squash,
    };
  }

  private getWalkImpact(now: number, input: TransformInput): AnimationImpact {
    if (!input.alive || !input.moving || input.jumping || input.smashing) {
      return DEFAULT_IMPACT;
    }

    const wave = Math.sin(now * WALK_SPEED);
    const bounce = Math.abs(wave);

    return {
      x: 0,
      y: bounce * WALK_BOB_POWER_Y * input.scale,
      scaleX: 1 - wave * WALK_SQUASH_POWER * 0.5,
      scaleY: 1 + wave * WALK_SQUASH_POWER,
    };
  }
}
