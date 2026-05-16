import { hashToUnit, lerp } from "./animations/animationMath.js";
import {
  DEFAULT_IMPACT,
  type AnimationEffectSpawn,
  type AnimationImpact,
  type AnimationState,
  type Transform,
  type TransformInput,
} from "./animations/animationTypes.js";
import { getBounceImpact } from "./animations/getBounceImpact.js";
import { getDamageImpact } from "./animations/getDamageImpact.js";
import { getFlyingDeathImpact } from "./animations/getFlyingDeathImpact.js";
import { getGroundDeathImpact } from "./animations/getGroundDeathImpact.js";
import { getJumpImpact } from "./animations/getJumpImpact.js";
import { getSmashImpact } from "./animations/getSmashImpact.js";
import { getSwingImpact } from "./animations/getSwingImpact.js";
import { getWalkImpact } from "./animations/getWalkImpact.js";

type AnimationHandler = (now: number, state: AnimationState, input: TransformInput) => AnimationImpact;

const DEFAULT_IDLE_ANIMATION = "bounce";
const DEFAULT_JUMP_ANIMATION = "jump";
const DEFAULT_ATTACK_ANIMATION = "smash";
const DEFAULT_DEATH_ANIMATION = "squish";

const ANIMATIONS: Record<string, AnimationHandler> = {
  none: () => DEFAULT_IMPACT,

  walk: (now, _state, input) => getWalkImpact(now, input),

  bounce: (now, _state, input) => getBounceImpact(now, input),

  swing: (now, _state, input) => getSwingImpact(now, input),

  fly: (now, _state, input) => getWalkImpact(now, input),

  jump: (now, _state, input) => getJumpImpact(now, input),

  smash: (now, _state, input) => getSmashImpact(now, input),

  squish: (now, state, input) => getGroundDeathImpact(now, state, input),

  flyToScreen: (now, state, input) => getFlyingDeathImpact(now, state, input),
};

export class SpriteAnimation {
  private readonly states = new Map<string, AnimationState>();

  public getTransform(input: TransformInput): Transform {
    const now = performance.now();
    const state = this.getState(input, now);

    const damage = getDamageImpact(now, state.damagedAt, input.scale);
    const animation = this.getAnimationImpact(now, state, input);

    return {
      x: input.x + input.width / 2 + damage.x + animation.x,
      y: input.y + input.height / 2 + damage.y + animation.y,

      scaleX: damage.scaleX * animation.scaleX,
      scaleY: damage.scaleY * animation.scaleY,

      rotation: damage.rotation + animation.rotation,

      spawnEffects: mergeSpawnEffects(damage.spawnEffects, animation.spawnEffects),
    };
  }

  private getState(input: TransformInput, now: number): AnimationState {
    const currentX = input.x + input.width / 2;
    const currentY = input.y + input.height / 2;

    const existing = this.states.get(input.id);

    if (existing === undefined) {
      const target = createDeathTarget(input);

      const created: AnimationState = {
        hp: input.hp,
        alive: input.alive,

        damagedAt: -Infinity,
        diedAt: input.alive ? -Infinity : now,

        deathStartX: currentX,
        deathStartY: currentY,

        deathTargetX: target.x,
        deathTargetY: target.y,

        spawnedEffectKeys: new Set<string>(),
      };

      this.states.set(input.id, created);

      return created;
    }

    if (input.hp < existing.hp) {
      existing.damagedAt = now;
    }

    if (existing.alive && !input.alive) {
      const target = createDeathTarget(input);

      existing.diedAt = now;

      existing.deathStartX = currentX;
      existing.deathStartY = currentY;

      existing.deathTargetX = target.x;
      existing.deathTargetY = target.y;

      existing.spawnedEffectKeys.clear();
    }

    existing.hp = input.hp;
    existing.alive = input.alive;

    return existing;
  }

  private getAnimationImpact(now: number, state: AnimationState, input: TransformInput): AnimationImpact {
    const animationName = getAnimationName(input);
    const handler = ANIMATIONS[animationName];

    if (handler === undefined) {
      return DEFAULT_IMPACT;
    }

    return handler(now, state, input);
  }
}

function getAnimationName(input: TransformInput): string {
  if (!input.alive) {
    return input.animations?.death ?? DEFAULT_DEATH_ANIMATION;
  }

  if (input.smashing) {
    return input.animations?.attack ?? DEFAULT_ATTACK_ANIMATION;
  }

  if (input.jumping) {
    return input.animations?.jump ?? DEFAULT_JUMP_ANIMATION;
  }

  return input.animations?.idle ?? DEFAULT_IDLE_ANIMATION;
}

function createDeathTarget(input: TransformInput): { x: number; y: number } {
  const marginX = Math.min(160, input.screenWidth * 0.18);
  const marginY = Math.min(120, input.screenHeight * 0.18);

  const minX = marginX;
  const maxX = Math.max(minX, input.screenWidth - marginX);

  const minY = marginY;
  const maxY = Math.max(minY, input.screenHeight - marginY);

  return {
    x: lerp(minX, maxX, hashToUnit(`${input.id}:death-target-x`)),
    y: lerp(minY, maxY, hashToUnit(`${input.id}:death-target-y`)),
  };
}

function mergeSpawnEffects(...groups: Array<readonly AnimationEffectSpawn[] | undefined>): readonly AnimationEffectSpawn[] | undefined {
  const effects = groups.flatMap((group) => group ?? []);

  return effects.length > 0 ? effects : undefined;
}
