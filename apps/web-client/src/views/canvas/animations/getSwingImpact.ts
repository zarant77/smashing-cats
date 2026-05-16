import { DEFAULT_IMPACT, type AnimationImpact, type TransformInput } from "./animationTypes.js";

const POWER = 0.05;
const SPEED = 0.005;

export function getSwingImpact(now: number, input: TransformInput): AnimationImpact {
  const wave = Math.sin(now * SPEED);

  return {
    ...DEFAULT_IMPACT,
    rotation: wave * POWER,
  };
}
