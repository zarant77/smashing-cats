import { type AnimationImpact, type TransformInput } from "./animationTypes.js";

const SQUASH_POWER = 0.05;
const SPEED = 0.005;

export function getWalkImpact(now: number, input: TransformInput): AnimationImpact {
  const value = Math.sin(now * SPEED * 2) * SQUASH_POWER;

  return {
    x: 0,
    y: 0,
    scaleX: 1 - value,
    scaleY: 1 + value,
    rotation: 0,
  };
}
