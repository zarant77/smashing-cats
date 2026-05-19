import { DEFAULT_IMPACT, type AnimationImpact, type TransformInput } from "./animationTypes.js";

const BOUNCE_POWER = 20;
const SQUASH_POWER = 0.07;
const SPEED = 0.005;

export function getBounceImpact(now: number, input: TransformInput): AnimationImpact {
  const wave = Math.sin(now * SPEED);
  const wave2 = Math.sin(now * SPEED * 2);
  const bounce = Math.abs(wave);
  const y = input.disableGroundYMotion === true ? 0 : -bounce * BOUNCE_POWER * input.scale;

  return {
    ...DEFAULT_IMPACT,
    y,
    scaleX: 1 - wave2 * SQUASH_POWER,
    scaleY: 1 + wave2 * SQUASH_POWER,
  };
}
