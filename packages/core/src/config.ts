import type { AnimationSet, EntityKind, HurtCircle, Size, SmashBox } from "@smashing-cats/protocol";

import charactersData from "./config/characters.json" with { type: "json" };
import civiliansData from "./config/civilians.json" with { type: "json" };
import enemiesData from "./config/enemies.json" with { type: "json" };
import gameData from "./config/game.json" with { type: "json" };
import obstaclesData from "./config/obstacles.json" with { type: "json" };

export type LocalizedText = {
  en: string;
  uk: string;
};

export type GameConfig = {
  worldWidth: number;
  worldHeight: number;
  groundY: number;
  gravity: number;
  scrollSpeed: number;
  spawnInvulnerabilitySeconds: number;
  hurtInvulnerabilitySeconds: number;
  unpauseInvulnerabilitySeconds: number;
  spawnDistanceMin: number;
  spawnDistanceMax: number;
  tutorial: TutorialConfig;
};

export type TutorialConfig = {
  targetsRequired: number;
  dummyStartX: number;
  dummySpacingX: number;
  gameStartDelaySeconds: number;
};

export type CharacterConfig = {
  kind: EntityKind;
  name: LocalizedText;
  size: Size;
  hurt: HurtCircle;
  smash: SmashBox;
  hp: number;
  moveSpeed: number;
  jumpForce: number;
  smashSpeed: number;
  bounceSpeed: number;
  smashMinJumpProgress: number;
  animations?: AnimationSet;
};

type CharacterCommonConfig = Pick<
  CharacterConfig,
  | "size"
  | "hurt"
  | "smash"
  | "smashSpeed"
  | "bounceSpeed"
  | "smashMinJumpProgress"
  | "animations"
>;

type CharacterSpecificConfig = Pick<CharacterConfig, "kind" | "name" | "hp" | "moveSpeed" | "jumpForce">;

type CharactersConfigFile = {
  common: CharacterCommonConfig;
  characters: CharacterSpecificConfig[];
};

type EntityBaseConfig = {
  kind: EntityKind;
  dummy?: boolean;
  size: Size;
  hurt: HurtCircle;
  damage: number;
  laneY?: [number, number];
  animations?: AnimationSet;
};

export type EnemyConfig = EntityBaseConfig & {
  score: number;
  minMoveSpeed: number;
  maxMoveSpeed: number;
};

export type CivilianConfig = EntityBaseConfig & {
  score: number;
  minMoveSpeed: number;
  maxMoveSpeed: number;
};

export type ObstacleConfig = EntityBaseConfig;

export type SpawnableConfig = ObstacleConfig | EnemyConfig | CivilianConfig;

export const GAME_CONFIG = fromJson<GameConfig>(gameData);

const CHARACTERS_CONFIG = fromJson<CharactersConfigFile>(charactersData);

export const CHARACTERS = CHARACTERS_CONFIG.characters.map((character) => ({
  ...CHARACTERS_CONFIG.common,
  ...character,
})) satisfies CharacterConfig[];

export const CIVILIANS = fromJson<CivilianConfig[]>(civiliansData);
export const ENEMIES = fromJson<EnemyConfig[]>(enemiesData);
export const OBSTACLES = fromJson<ObstacleConfig[]>(obstaclesData);

export const SPAWNABLES = [...OBSTACLES, ...ENEMIES.filter((config) => config.dummy !== true), ...CIVILIANS] satisfies SpawnableConfig[];

export const TICK_RATE = 60;
export const SNAPSHOT_RATE = 15;
export const SNAPSHOT_INTERVAL_TICKS = TICK_RATE / SNAPSHOT_RATE;
export const FIXED_DT = 1 / TICK_RATE;

export function getCharacterConfig(kind: EntityKind): CharacterConfig {
  const config = CHARACTERS.find((character) => character.kind === kind);

  if (config === undefined) {
    throw new Error(`Missing character config for "${kind}"`);
  }

  return config;
}

function fromJson<T>(value: unknown): T {
  return value as T;
}
