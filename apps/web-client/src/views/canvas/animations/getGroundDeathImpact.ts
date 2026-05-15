import { DEFAULT_IMPACT, type AnimationImpact, type AnimationState, type TransformInput } from "./animationTypes.js";

export function getGroundDeathImpact(_now: number, _state: AnimationState, _input: TransformInput): AnimationImpact {
  return DEFAULT_IMPACT;
}
