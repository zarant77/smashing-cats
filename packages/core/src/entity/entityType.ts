import { CIVILIANS, ENEMIES, SPAWNABLES } from "../config.js";

import type { Entity } from "../types.js";

const CIVILIAN_KINDS = new Set(CIVILIANS.map((config) => config.kind));
const ENEMY_KINDS = new Set(ENEMIES.map((config) => config.kind));

export function getEntityType(config: (typeof SPAWNABLES)[number]): Entity["type"] {
  if (CIVILIAN_KINDS.has(config.kind)) {
    return "civilian";
  }

  if (ENEMY_KINDS.has(config.kind)) {
    return "enemy";
  }

  return "obstacle";
}
