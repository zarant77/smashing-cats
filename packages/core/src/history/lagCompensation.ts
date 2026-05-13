import { intersects } from "../collisions.js";
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

  const entityBounds = frame?.entities.get(entity.id);

  if (frame === undefined || entityBounds === undefined) {
    return false;
  }

  return intersects(
    {
      x: player.x + frame.scrollX,
      y: player.y,
      width: player.width,
      height: player.height,
    },
    entityBounds,
  );
}
