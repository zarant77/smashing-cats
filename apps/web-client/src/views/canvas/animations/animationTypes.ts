export type AnimationEffectSpace = "screen" | "world";

export type AnimationSet = {
  idle?: string;
  jump?: string;
  attack?: string;
  death?: string;
};

export type AnimationEffectSpawn = {
  imagePath: string;
  x: number;
  y: number;
  startedAt: number;
  durationMs: number;
  width?: number;
  height?: number;
  scale?: number;
  alpha?: number;
  rotation?: number;
  space?: AnimationEffectSpace;
  fadeOut?: boolean;
  grow?: number;
};

export type TransformInput = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  groundY: number;
  entityY: number;
  alive: boolean;
  hp: number;
  moving: boolean;
  jumping: boolean;
  smashing: boolean;
  animations?: AnimationSet;
  scale: number;
  screenWidth: number;
  screenHeight: number;
  velocityX?: number;
  velocityY?: number;
  disableGroundYMotion?: boolean;
};

export type AnimationState = {
  hp: number;
  alive: boolean;
  damagedAt: number;
  diedAt: number;
  deathStartX: number;
  deathStartY: number;
  deathTargetX: number;
  deathTargetY: number;
  spawnedEffectKeys: Set<string>;
};

export type AnimationImpact = {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  alpha: number;
  spawnEffects?: readonly AnimationEffectSpawn[];
};

export type Transform = AnimationImpact;

export const DEFAULT_IMPACT: AnimationImpact = {
  x: 0,
  y: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
  alpha: 1,
};
