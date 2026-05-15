import { DEFAULT_IMPACT, type AnimationImpact } from "./animationTypes.js";

const DAMAGE_SHAKE_MS = 500;

const DAMAGE_SHAKE_POWER_X = 7;
const DAMAGE_SHAKE_POWER_Y = 5;
const DAMAGE_SQUASH_POWER = 0.18;

export function getDamageImpact(now: number, damagedAt: number, scale: number): AnimationImpact {
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
    rotation: 0,
  };
}
