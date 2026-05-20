import { clamp, easeInCubic, easeOutBack, easeOutCubic, lerp } from "./animationMath.js";
import {
  DEFAULT_IMPACT,
  type AnimationEffectSpawn,
  type AnimationImpact,
  type AnimationState,
  type TransformInput,
} from "./animationTypes.js";

export const FLYING_DEATH_FLY_MS = 400;
export const FLYING_DEATH_HOLD_MS = 100;
export const FLYING_DEATH_FALL_MS = 400;

const FLYING_DEATH_MAX_SCALE = 4.2;
const FLYING_DEATH_FLY_ROTATION = -0.65;
const FLYING_DEATH_FALL_ROTATION = 2.4;

const SCREEN_CRACK_EFFECT_KEY = "screen-crack";
const SCREEN_CRACK_DURATION_MS = 1400;
const SCREEN_CRACK_SCALE = 1.15;

export function getFlyingDeathImpact(now: number, state: AnimationState, input: TransformInput): AnimationImpact {
  const elapsed = now - state.diedAt;

  const currentX = input.x + input.width / 2;
  const currentY = input.y + input.height / 2;

  const spawnEffects = getSpawnEffects(now, elapsed, state);

  if (elapsed <= FLYING_DEATH_FLY_MS) {
    return {
      ...getFlyToScreenImpact(elapsed, state, currentX, currentY),
      spawnEffects,
    };
  }

  if (elapsed <= FLYING_DEATH_FLY_MS + FLYING_DEATH_HOLD_MS) {
    return {
      ...getHoldImpact(state, currentX, currentY),
      spawnEffects,
    };
  }

  return {
    ...getFallImpact(elapsed - FLYING_DEATH_FLY_MS - FLYING_DEATH_HOLD_MS, state, input, currentX, currentY),
    spawnEffects,
  };
}

function getFlyToScreenImpact(elapsed: number, state: AnimationState, currentX: number, currentY: number): AnimationImpact {
  const progress = clamp(elapsed / FLYING_DEATH_FLY_MS, 0, 1);

  const positionProgress = easeOutBack(progress);
  const scaleProgress = easeOutCubic(progress);

  const animatedX = lerp(state.deathStartX, state.deathTargetX, positionProgress);
  const animatedY = lerp(state.deathStartY, state.deathTargetY, positionProgress);

  const scale = lerp(1, FLYING_DEATH_MAX_SCALE, scaleProgress);

  return {
    ...DEFAULT_IMPACT,
    x: animatedX - currentX,
    y: animatedY - currentY,
    scaleX: scale,
    scaleY: scale,
    rotation: FLYING_DEATH_FLY_ROTATION * progress,
  };
}

function getHoldImpact(state: AnimationState, currentX: number, currentY: number): AnimationImpact {
  return {
    ...DEFAULT_IMPACT,
    x: state.deathTargetX - currentX,
    y: state.deathTargetY - currentY,
    scaleX: FLYING_DEATH_MAX_SCALE,
    scaleY: FLYING_DEATH_MAX_SCALE,
    rotation: FLYING_DEATH_FLY_ROTATION,
  };
}

function getFallImpact(elapsed: number, state: AnimationState, input: TransformInput, currentX: number, currentY: number): AnimationImpact {
  const progress = clamp(elapsed / FLYING_DEATH_FALL_MS, 0, 1);
  const fallProgress = easeInCubic(progress);

  const fallDistance = input.screenHeight + input.height * FLYING_DEATH_MAX_SCALE;
  const animatedY = state.deathTargetY + fallDistance * fallProgress;

  const scale = lerp(FLYING_DEATH_MAX_SCALE, FLYING_DEATH_MAX_SCALE * 0.85, progress);

  return {
    ...DEFAULT_IMPACT,
    x: state.deathTargetX - currentX,
    y: animatedY - currentY,
    scaleX: scale,
    scaleY: scale,
    rotation: FLYING_DEATH_FLY_ROTATION + FLYING_DEATH_FALL_ROTATION * progress,
  };
}

function getSpawnEffects(now: number, elapsed: number, state: AnimationState): readonly AnimationEffectSpawn[] | undefined {
  if (elapsed < FLYING_DEATH_FLY_MS) {
    return undefined;
  }

  if (state.spawnedEffectKeys.has(SCREEN_CRACK_EFFECT_KEY)) {
    return undefined;
  }

  state.spawnedEffectKeys.add(SCREEN_CRACK_EFFECT_KEY);

  return [
    {
      imageKey: "effect.screen_crack",

      x: state.deathTargetX,
      y: state.deathTargetY,

      startedAt: now,
      durationMs: SCREEN_CRACK_DURATION_MS,

      scale: SCREEN_CRACK_SCALE,
      space: "screen",
      fadeOut: true,
    },
  ];
}
