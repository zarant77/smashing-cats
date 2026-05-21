import type { AnimationSet, EntitySnapshot, PlayerSnapshot } from "@smashing-cats/protocol";

import type { SpriteAnimationKind } from "./SpriteTransformAnimator.js";

type AnimationState = {
  kind: SpriteAnimationKind;
  startedAt: number;
};

const DEFAULT_ANIMATION: SpriteAnimationKind = "bounce";

const KNOWN_ANIMATIONS = new Set<string>(["bounce", "jump", "smash", "fall", "walk", "squish", "fly", "flyToScreen"]);

export class SpriteAnimationState {
  private readonly states = new Map<string, AnimationState>();

  public resolvePlayer(player: PlayerSnapshot, now: number): AnimationState {
    const fallback = resolvePlayerAnimation(player);
    return this.resolve(player.id, fallback, now);
  }

  public resolveEntity(entity: EntitySnapshot, now: number): AnimationState {
    const fallback = resolveEntityAnimation(entity);
    return this.resolve(entity.id, fallback, now);
  }

  public remove(id: string): void {
    this.states.delete(id);
  }

  public clear(): void {
    this.states.clear();
  }

  private resolve(id: string, kind: SpriteAnimationKind, now: number): AnimationState {
    const existing = this.states.get(id);

    if (existing !== undefined && existing.kind === kind) {
      return existing;
    }

    const created: AnimationState = {
      kind,
      startedAt: now,
    };

    this.states.set(id, created);

    return created;
  }
}

function resolvePlayerAnimation(player: PlayerSnapshot): SpriteAnimationKind {
  if (!player.alive) {
    return getAnimation(player.animations, "death", "fall");
  }

  if (player.smashing) {
    return getAnimation(player.animations, "attack", "smash");
  }

  if (!player.grounded) {
    return getAnimation(player.animations, "jump", "jump");
  }

  return getAnimation(player.animations, "idle", "bounce");
}

function resolveEntityAnimation(entity: EntitySnapshot): SpriteAnimationKind {
  if (!entity.alive) {
    return getAnimation(entity.animations, "death", "fall");
  }

  if (entity.vy !== 0) {
    return getAnimation(entity.animations, "jump", "jump");
  }

  return getAnimation(entity.animations, "idle", "walk");
}

function getAnimation(animations: AnimationSet | undefined, key: keyof AnimationSet, fallback: SpriteAnimationKind): SpriteAnimationKind {
  const value = animations?.[key];

  if (value === undefined || !isSpriteAnimationKind(value)) {
    return fallback;
  }

  return value;
}

function isSpriteAnimationKind(value: string): value is SpriteAnimationKind {
  return KNOWN_ANIMATIONS.has(value);
}
