import { GAME_CONFIG, SPAWNABLES } from "../config.js";
import { getEntityType } from "./entityType.js";

import type { Entity } from "../types.js";
import { randomInt } from "../math.js";

type CreateEntityOptions = {
  config: (typeof SPAWNABLES)[number];
  id: string;
  x: number;
  moveSpeed: number;
};

export function createEntity({ config, id, x, moveSpeed }: CreateEntityOptions): Entity {
  const [, height] = config.size;
  const laneY = config.laneY ?? [0, 0];
  const y = GAME_CONFIG.groundY - height + randomInt(laneY[0], laneY[1]);

  return {
    id,
    type: getEntityType(config),
    kind: config.kind,

    x,
    y,

    vx: -moveSpeed,
    vy: 0,

    size: config.size,
    hurt: config.hurt,

    damage: config.damage,
    score: getScore(config),

    alive: true,
    animations: config.animations,
  };
}

function getScore(config: (typeof SPAWNABLES)[number]): number {
  return "score" in config && typeof config.score === "number" ? config.score : 0;
}
