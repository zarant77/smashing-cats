export { CHARACTERS, CIVILIANS, ENEMIES, FIXED_DT, GAME_CONFIG, getCharacterConfig, OBSTACLES, SPAWNABLES, TICK_RATE } from "./config.js";
export { intersects } from "./collisions.js";
export { Game } from "./Game.js";
export { Random } from "./Random.js";
export { simulatePlayerMovement } from "./movement.js";
export type { PlayerMovementState } from "./movement.js";
export type { CharacterConfig, CivilianConfig, EnemyConfig, GameConfig, ObstacleConfig } from "./config.js";
export type { Bounds } from "./collisions.js";
export type { Entity, Player, Vec2 } from "./types.js";
