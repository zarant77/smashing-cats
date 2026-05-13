import { GAME_CONFIG, SPAWNABLES } from "../config.js";
import { createEntity } from "./entityFactory.js";

import { Random } from "../Random.js";

import type { Entity } from "../types.js";

type SpawnAheadOptions = {
  rng: Random;
  scrollX: number;
  nextSpawnX: number;
  nextEntityIndex: number;
};

type SpawnAheadResult = {
  entities: Entity[];
  nextSpawnX: number;
  nextEntityIndex: number;
};

export function spawnAhead({ rng, scrollX, nextSpawnX, nextEntityIndex }: SpawnAheadOptions): SpawnAheadResult {
  const entities: Entity[] = [];

  let spawnX = nextSpawnX;
  let entityIndex = nextEntityIndex;

  while (spawnX < scrollX + GAME_CONFIG.worldWidth * 1.8) {
    const config = rng.pick(SPAWNABLES);

    const isMovingEntity = "minMoveSpeed" in config;

    const moveSpeed = isMovingEntity ? rng.nextInt(config.minMoveSpeed, config.maxMoveSpeed) : 0;

    entities.push(
      createEntity({
        config,
        id: `${config.kind}-${entityIndex++}`,
        x: spawnX,
        moveSpeed,
      }),
    );

    spawnX += rng.nextInt(GAME_CONFIG.spawnDistanceMin, GAME_CONFIG.spawnDistanceMax);
  }

  return {
    entities,
    nextSpawnX: spawnX,
    nextEntityIndex: entityIndex,
  };
}
