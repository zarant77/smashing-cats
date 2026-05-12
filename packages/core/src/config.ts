import type { EntityKind } from "@smashing-cats/protocol";
import charactersData from "./config/characters.json" with { type: "json" };
import civiliansData from "./config/civilians.json" with { type: "json" };
import enemiesData from "./config/enemies.json" with { type: "json" };
import gameData from "./config/game.json" with { type: "json" };
import obstaclesData from "./config/obstacles.json" with { type: "json" };

export type GameConfig = {
  tickRate: number;
  worldWidth: number;
  worldHeight: number;
  groundY: number;
  gravity: number;
  scrollSpeed: number;
  spawnDistanceMin: number;
  spawnDistanceMax: number;
};

export type CharacterConfig = {
  kind: EntityKind;
  name: Record<"en" | "uk", string>;
  width: number;
  height: number;
  hp: number;
  spawnInvulnerabilitySeconds: number;
  moveSpeed: number;
  jumpForce: number;
  smashSpeed: number;
  bounceSpeed: number;
  smashMinJumpProgress: number;
};

type CharacterCommonConfig = Pick<
  CharacterConfig,
  | "width"
  | "height"
  | "spawnInvulnerabilitySeconds"
  | "smashSpeed"
  | "bounceSpeed"
  | "smashMinJumpProgress"
>;

type CharacterSpecificConfig = Pick<
  CharacterConfig,
  "kind" | "name" | "hp" | "moveSpeed" | "jumpForce"
>;

type CharactersConfigFile = {
  common: CharacterCommonConfig;
  characters: CharacterSpecificConfig[];
};

export type EnemyConfig = {
  kind: EntityKind;
  width: number;
  height: number;
  damage: number;
  score: number;
  minSpeedBonus: number;
  maxSpeedBonus: number;
};

export type CivilianConfig = {
  kind: EntityKind;
  width: number;
  height: number;
  damage: number;
  score: number;
  minSpeedBonus: number;
  maxSpeedBonus: number;
};

export type ObstacleConfig = {
  kind: EntityKind;
  width: number;
  height: number;
  damage: number;
};

export const GAME_CONFIG = gameData as GameConfig;
const CHARACTERS_CONFIG = charactersData as CharactersConfigFile;
export const CHARACTERS = CHARACTERS_CONFIG.characters.map((character) => ({
  ...CHARACTERS_CONFIG.common,
  ...character,
})) satisfies CharacterConfig[];
export const CIVILIANS = civiliansData as CivilianConfig[];
export const ENEMIES = enemiesData as EnemyConfig[];
export const OBSTACLES = obstaclesData as ObstacleConfig[];
export const SPAWNABLES = [...OBSTACLES, ...ENEMIES, ...CIVILIANS] as const;
export const TICK_RATE = GAME_CONFIG.tickRate;
export const FIXED_DT = 1 / TICK_RATE;

export function getCharacterConfig(kind: EntityKind): CharacterConfig {
  const config = CHARACTERS.find((character) => character.kind === kind);
  if (config === undefined) {
    throw new Error(`Missing character config for "${kind}"`);
  }

  return config;
}
