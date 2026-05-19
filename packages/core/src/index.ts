export {
  CHARACTERS,
  CIVILIANS,
  ENEMIES,
  FIXED_DT,
  GAME_CONFIG,
  getCharacterConfig,
  OBSTACLES,
  SNAPSHOT_INTERVAL_TICKS,
  SNAPSHOT_RATE,
  SPAWNABLES,
  TICK_RATE,
} from "./config.js";
export { intersects } from "./collision/collisions.js";
export { Game } from "./Game.js";
export { Random } from "./Random.js";
export { simulatePlayerMovement } from "./movement.js";
export * from "./snapshot/SnapshotStore.js";
export * from "./math.js";
export type { PlayerMovementState } from "./movement.js";
export type { CharacterConfig, CivilianConfig, EnemyConfig, GameConfig, ObstacleConfig } from "./config.js";
export type { Bounds } from "./collision/collisions.js";
export type { Entity, Player, Vec2 } from "./types.js";
