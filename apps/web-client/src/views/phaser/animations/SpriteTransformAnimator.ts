export type SpriteAnimationKind = "bounce" | "jump" | "smash" | "fall" | "walk" | "squish" | "fly" | "flyToScreen";

export type SpriteTransform = {
  scaleX: number;
  scaleY: number;
  rotation: number;
  offsetY: number;
  offsetX: number;
  alpha: number;
};

export const DEFAULT_SPRITE_TRANSFORM: SpriteTransform = {
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  offsetY: 0,
  offsetX: 0,
  alpha: 1,
};

export function getSpriteTransform(kind: SpriteAnimationKind, time: number): SpriteTransform {
  switch (kind) {
    case "bounce":
      return {
        ...DEFAULT_SPRITE_TRANSFORM,
        scaleY: 1 + Math.sin(time * 9) * 0.06,
        offsetY: Math.sin(time * 9) * -4,
      };

    case "walk":
      return {
        ...DEFAULT_SPRITE_TRANSFORM,
        scaleX: 1 + Math.sin(time * 12) * 0.04,
        scaleY: 1 - Math.sin(time * 12) * 0.04,
        rotation: Math.sin(time * 12) * 0.04,
      };

    case "jump":
      return {
        ...DEFAULT_SPRITE_TRANSFORM,
        scaleX: 0.94,
        scaleY: 1.08,
        rotation: -0.08,
      };

    case "smash":
      return {
        ...DEFAULT_SPRITE_TRANSFORM,
        scaleX: 1.16,
        scaleY: 0.82,
        rotation: 0.16,
      };

    case "fall": {
      const progress = Math.min(time / 1.2, 1);
      const launch = Math.sin(progress * Math.PI) * 120;

      return {
        ...DEFAULT_SPRITE_TRANSFORM,
        scaleX: 1,
        scaleY: 1,
        rotation: -progress * Math.PI * 4 + Math.sin(progress * 16) * 0.15 * (1 - progress),
        offsetX: -progress * progress * 520,
        offsetY: -launch + progress * progress * 460,
        alpha: 1,
      };
    }

    case "squish":
      return {
        ...DEFAULT_SPRITE_TRANSFORM,
        scaleX: 1.22,
        scaleY: 0.72,
        offsetY: 10,
      };

    case "fly":
      return {
        ...DEFAULT_SPRITE_TRANSFORM,
        offsetY: Math.sin(time * 8) * 6,
        rotation: Math.sin(time * 8) * 0.08,
      };

    case "flyToScreen":
      return DEFAULT_SPRITE_TRANSFORM;
  }
}
