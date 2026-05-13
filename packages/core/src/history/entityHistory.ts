import type { Bounds } from "../collision/collisions.js";
import type { Entity } from "../types.js";

export type EntityHistoryFrame = {
  tick: number;
  scrollX: number;
  entities: Map<string, Bounds>;
};

type RecordEntityHistoryOptions = {
  history: EntityHistoryFrame[];
  tick: number;
  scrollX: number;
  entities: Entity[];
  maxHistoryTicks: number;
};

export function recordEntityHistory({ history, tick, scrollX, entities, maxHistoryTicks }: RecordEntityHistoryOptions): void {
  history.push({
    tick,
    scrollX,
    entities: new Map(
      entities.map((entity) => [
        entity.id,
        {
          x: entity.x,
          y: entity.y,
          width: entity.width,
          height: entity.height,
        },
      ]),
    ),
  });

  const minTick = tick - maxHistoryTicks;

  while (history[0] !== undefined && history[0].tick < minTick) {
    history.shift();
  }
}

type GetEntityHistoryFrameOptions = {
  history: EntityHistoryFrame[];
  targetTick: number;
};

export function getEntityHistoryFrame({ history, targetTick }: GetEntityHistoryFrameOptions): EntityHistoryFrame | undefined {
  let closestFrame: EntityHistoryFrame | undefined;

  for (const frame of history) {
    if (frame.tick > targetTick) {
      break;
    }

    closestFrame = frame;
  }

  return closestFrame;
}
