import type { EntityId, EntityKind, EntityType, PlayerId } from "./entity.js";

export type EntitySnapshot = {
  id: EntityId;
  type: EntityType;
  kind: EntityKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  damage: number;
  score: number;
  alive: boolean;
};

export type PlayerSnapshot = EntitySnapshot & {
  type: "player";
  playerId: PlayerId;
  hp: number;
  maxHp: number;
  invulnerable: boolean;
  grounded: boolean;
  smashing: boolean;
  jumpStartY: number;
  wasJumpPressed: boolean;
  lastProcessedInputSeq: number;
};

export type GameEvent = {
  id: string;
  tick: number;
  type: "playerHit" | "enemyKilled" | "civilianKilled" | "civilianKilledByEnemy";
  playerId?: PlayerId;
  entityId: EntityId;
  entityType: EntityType;
  entityKind: EntityKind;
  x: number;
  y: number;
  damage: number;
  scoreDelta: number;
};

export type GameSnapshot = {
  tick: number;
  seed: number;
  world: {
    scrollX: number;
    speed: number;
    width: number;
    height: number;
    groundY: number;
    gravity: number;
  };
  players: PlayerSnapshot[];
  entities: EntitySnapshot[];
  events: GameEvent[];
};

export type EntityPatch = {
  id: EntityId;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  alive?: boolean;
};

export type PlayerPatch = EntityPatch & {
  playerId: PlayerId;
  score?: number;
  hp?: number;
  invulnerable?: boolean;
  grounded?: boolean;
  smashing?: boolean;
  jumpStartY?: number;
  wasJumpPressed?: boolean;
  lastProcessedInputSeq?: number;
};

export type DeltaSnapshot = {
  tick: number;
  scrollX?: number;

  addedPlayers?: PlayerSnapshot[];
  updatedPlayers?: PlayerPatch[];
  removedPlayerIds?: PlayerId[];

  addedEntities?: EntitySnapshot[];
  updatedEntities?: EntityPatch[];
  removedEntityIds?: EntityId[];

  events?: GameEvent[];
};
