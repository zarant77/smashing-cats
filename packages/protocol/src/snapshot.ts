import type { EntityId, EntityKind, EntityType, PlayerId } from "./entity.js";
import { HurtCircle, Size, SmashBox } from "./geometry.js";

export type AnimationSet = {
  idle?: string;
  jump?: string;
  attack?: string;
  death?: string;
};

export type EntitySnapshot = {
  id: EntityId;
  type: EntityType;
  kind: EntityKind;
  dummy?: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: Size;
  hurt: HurtCircle;
  damage: number;
  score: number;
  alive: boolean;
  animations?: AnimationSet;
};

export type PlayerSnapshot = EntitySnapshot & {
  type: "player";
  playerId: PlayerId;
  hp: number;
  maxHp: number;
  smash: SmashBox;
  invulnerable: boolean;
  paused: boolean;
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
  gamePaused: boolean;
  tutorial: TutorialState;
  simulation: GameSimulationState;
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

export type GameSimulationState = {
  rngState: number;
  nextEntityIndex: number;
  nextEventIndex: number;
  nextSpawnX: number;
};

export type TutorialState = {
  active: boolean;
  completed: boolean;
  targetsDestroyed: number;
  targetsRequired: number;
};

export type EntityPatch = {
  id: EntityId;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  alive?: boolean;
  paused?: boolean;
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
  gamePaused?: boolean;
  tutorial?: TutorialState;
  simulation?: GameSimulationState;
  scrollX?: number;

  addedPlayers?: PlayerSnapshot[];
  updatedPlayers?: PlayerPatch[];
  removedPlayerIds?: PlayerId[];

  addedEntities?: EntitySnapshot[];
  updatedEntities?: EntityPatch[];
  removedEntityIds?: EntityId[];

  events?: GameEvent[];
};
