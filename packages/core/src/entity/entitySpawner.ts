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

type MovingConfig = {
  minMoveSpeed: number;
  maxMoveSpeed: number;
};

export function spawnAhead({ rng, scrollX, nextSpawnX, nextEntityIndex }: SpawnAheadOptions): SpawnAheadResult {
  const entities: Entity[] = [];

  let spawnX = nextSpawnX;
  let entityIndex = nextEntityIndex;

  while (spawnX < scrollX + GAME_CONFIG.worldWidth * 1.8) {
    const config = rng.pick(SPAWNABLES);

    const moveSpeed = isMovingConfig(config) ? rng.nextInt(config.minMoveSpeed, config.maxMoveSpeed) : 0;

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

function isMovingConfig(config: object): config is MovingConfig {
  return (
    "minMoveSpeed" in config &&
    typeof config.minMoveSpeed === "number" &&
    "maxMoveSpeed" in config &&
    typeof config.maxMoveSpeed === "number"
  );
}
