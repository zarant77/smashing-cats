import { GAME_CONFIG, SPAWNABLES } from "../config.js";
import { getEntityType } from "./entityType.js";

import type { Entity } from "../types.js";

type CreateEntityOptions = {
  config: (typeof SPAWNABLES)[number];
  id: string;
  x: number;
  moveSpeed: number;
};

export function createEntity({ config, id, x, moveSpeed }: CreateEntityOptions): Entity {
  const [, height] = config.size;
  const laneY = config.laneY ?? 0;

  return {
    id,
    type: getEntityType(config),
    kind: config.kind,

    x,
    y: GAME_CONFIG.groundY - height + laneY,

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
