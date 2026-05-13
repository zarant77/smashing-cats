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
  return {
    id,
    type: getEntityType(config),
    kind: config.kind,

    x,
    y: GAME_CONFIG.groundY - config.height,

    vx: -moveSpeed,
    vy: 0,

    width: config.width,
    height: config.height,

    damage: config.damage,
    score: "score" in config ? config.score : 0,

    alive: true,
  };
}
