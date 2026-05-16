import { DEFAULT_IMPACT, type AnimationImpact, type TransformInput } from "./animationTypes.js";

const JUMP_DEFAULT_ROTATION = -0.15;
const JUMP_SPIN_SPEED = 0.018;

export function getJumpImpact(now: number, input: TransformInput): AnimationImpact {
  const kind = input.id.split("-")?.[0] ?? "";
  const impact = { ...DEFAULT_IMPACT };

  switch (kind) {
    case "samurcat":
      impact.rotation = now * JUMP_SPIN_SPEED;
      break;

    case "zombocat":
      impact.rotation = 0;
      break;

    default:
      impact.rotation = JUMP_DEFAULT_ROTATION;
      break;
  }

  return impact;
}
