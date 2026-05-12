export type PlayerId = string;
export type EntityId = string;

export type EntityKind =
  | "batcat"
  | "ironcat"
  | "darkcat"
  | "robocat"
  | "termicator"
  | "punishcat"
  | "carrambacat"
  | "commandocat"
  | "cybercat"
  | "samurcat"
  | "zombocat"
  | "ghostcat"
  | "cactus"
  | "orc"
  | "boar"
  | "rat"
  | "villager";
export type EntityType = "player" | "obstacle" | "enemy" | "civilian";

export type PlayerInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

export type InputMessage = {
  type: "input";
  tick: number;
  input: PlayerInput;
};

export type JoinMessage = {
  type: "join";
  name?: string;
};

export type SelectCharacterMessage = {
  type: "selectCharacter";
  characterKind: EntityKind;
  name?: string;
};

export type ClientToServerMessage = JoinMessage | SelectCharacterMessage | InputMessage;

export type CharacterDefinition = {
  kind: EntityKind;
  name: Record<"en" | "uk", string>;
  width: number;
  height: number;
  hp: number;
  moveSpeed: number;
  jumpForce: number;
  smashSpeed: number;
  smashMinJumpProgress: number;
};

export type EntitySnapshot = {
  id: EntityId;
  type: EntityType;
  kind: EntityKind;
  x: number;
  y: number;
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
  score: number;
  invulnerable: boolean;
  grounded: boolean;
  smashing: boolean;
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
  };
  players: PlayerSnapshot[];
  entities: EntitySnapshot[];
  events: GameEvent[];
};

export type WelcomeMessage = {
  type: "welcome";
  playerId: PlayerId;
  characters: CharacterDefinition[];
};

export type SnapshotMessage = {
  type: "snapshot";
  snapshot: GameSnapshot;
};

export type ServerToClientMessage = WelcomeMessage | SnapshotMessage;
