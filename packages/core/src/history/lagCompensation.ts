import { circlesIntersect, Hurt2Circle, type Circle } from "../collision/collisions.js";
import { clamp } from "../math/clamp.js";
import { getEntityHistoryFrame } from "./entityHistory.js";

import type { EntityHistoryFrame } from "./entityHistory.js";
import type { Entity, Player } from "../types.js";

type IntersectsCompensatedEntityOptions = {
  player: Player;
  entity: Entity;
  history: EntityHistoryFrame[];
  currentTick: number;
  maxHistoryTicks: number;
};

export function intersectsCompensatedEntity({
  player,
  entity,
  history,
  currentTick,
  maxHistoryTicks,
}: IntersectsCompensatedEntityOptions): boolean {
  if (!player.smashingForCollision || player.smashSnapshotTick === undefined) {
    return false;
  }

  const targetTick = clamp(Math.floor(player.smashSnapshotTick), currentTick - maxHistoryTicks, currentTick);

  const frame = getEntityHistoryFrame({
    history,
    targetTick,
  });

  const entityFrame = frame?.entities.get(entity.id);

  if (frame === undefined || entityFrame === undefined) {
    return false;
  }

  return circlesIntersect(
    Hurt2Circle(player.x + frame.scrollX, player.y, player.size, player.hurt),
    Hurt2Circle(entityFrame.x, entityFrame.y, entity.size, entityFrame.hurt),
  );
}
