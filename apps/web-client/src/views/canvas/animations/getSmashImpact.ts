import { DEFAULT_IMPACT, type AnimationImpact, type TransformInput } from "./animationTypes.js";

export function getSmashImpact(now: number, input: TransformInput): AnimationImpact {
  return {
    ...DEFAULT_IMPACT,
    rotation: 0.35,
  };
}
