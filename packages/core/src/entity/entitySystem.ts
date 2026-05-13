import type { Entity } from "../types.js";

type UpdateEntitiesOptions = {
  entities: Entity[];
  dt: number;
};

export function updateEntities({ entities, dt }: UpdateEntitiesOptions): void {
  for (const entity of entities) {
    if (!entity.alive) {
      continue;
    }

    entity.x += entity.vx * dt;
    entity.y += entity.vy * dt;
  }
}

type CleanupEntitiesOptions = {
  entities: Entity[];
  scrollX: number;
};

export function cleanupEntities({ entities, scrollX }: CleanupEntitiesOptions): Entity[] {
  const minX = scrollX - 300;

  return entities.filter((entity) => entity.x > minX);
}
