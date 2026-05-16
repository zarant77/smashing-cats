import { clamp01, easeOutQuad } from "./animationMath.js";
import { DEFAULT_IMPACT, type AnimationImpact, type TransformInput } from "./animationTypes.js";

const jumpDefaultRotation = (input: TransformInput): number => {
  const velocityY = input.velocityY ?? 0;
  const normalized = Math.max(-1, Math.min(1, velocityY / 600));

  return normalized * 0.25;
};

const getJumpHeight = (input: TransformInput): number => {
  return Math.max(0, input.groundY - input.entityY);
};

export function getJumpImpact(now: number, input: TransformInput): AnimationImpact {
  const kind = input.id.split("-")[0] ?? "";
  const impact = { ...DEFAULT_IMPACT };
  const jumpHeight = getJumpHeight(input);
  const heightProgress = clamp01(jumpHeight / 350);

  switch (kind) {
    case "batcat": {
      const wingProgress = easeOutQuad(clamp01((heightProgress - 0.45) / 0.55));

      impact.rotation = jumpDefaultRotation(input);
      impact.scaleX = 1 + wingProgress * 0.35;
      impact.scaleY = 1 - wingProgress * 0.12;
      break;
    }

    case "carrambacat": {
      impact.rotation = jumpDefaultRotation(input) + Math.sin(now * 0.018) * 0.18;
      impact.scaleX = 1.05;
      impact.scaleY = 0.96;
      break;
    }

    case "commandocat":
      impact.rotation = jumpDefaultRotation(input) * 0.4;
      impact.scaleX = 1.08;
      impact.scaleY = 0.95;
      break;

    case "cybercat": {
      const glitch = Math.sin(now * 0.075) * 0.07;

      impact.rotation = jumpDefaultRotation(input) * 0.8;
      impact.scaleX = 1 + glitch;
      impact.scaleY = 1 - glitch;
      break;
    }

    case "darkcat": {
      const pulse = Math.sin(now * 0.012) * 0.08;

      impact.rotation = jumpDefaultRotation(input) * 0.7;
      impact.scaleX = 1 + pulse;
      impact.scaleY = 1 - pulse;
      break;
    }

    case "ghostcat": {
      const ghostProgress = easeOutQuad(clamp01(jumpHeight / 500));
      const scale = 1.2 - ghostProgress * 0.45;

      impact.scaleX = scale;
      impact.scaleY = scale;
      impact.alpha = 1 - ghostProgress * 0.5;
      break;
    }

    case "ironcat":
      impact.rotation = jumpDefaultRotation(input) * 0.2;
      impact.scaleX = 0.96;
      impact.scaleY = 1.08;
      break;

    case "punishcat":
      impact.rotation = jumpDefaultRotation(input) * 1.8;
      impact.scaleX = 1.12;
      impact.scaleY = 0.9;
      break;

    case "robocat": {
      const steppedRotation = Math.round(jumpDefaultRotation(input) * 12) / 12;

      impact.rotation = steppedRotation;
      impact.scaleX = 1;
      impact.scaleY = 1;
      break;
    }

    case "samurcat":
      impact.rotation = now * 0.05;
      impact.scaleX = 1.1;
      impact.scaleY = 0.92;
      break;

    case "termicator":
      impact.rotation = 0.06 + jumpDefaultRotation(input) * 0.15;
      impact.scaleX = 1.03;
      impact.scaleY = 1.03;
      break;

    case "zombocat": {
      const wobble = Math.sin(now * 0.01) * 0.08;

      impact.rotation = Math.PI * -0.3 + wobble;
      impact.scaleX = 0.94;
      impact.scaleY = 1.08;
      break;
    }

    default:
      impact.rotation = jumpDefaultRotation(input);
      break;
  }

  return impact;
}
