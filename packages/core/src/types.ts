import type {
  AnimationSet,
  EntityId,
  EntityType,
  HurtCircle,
  PlayerId,
  PlayerInput,
  PlayerInputCommand,
  Size,
  SmashBox,
} from "@smashing-cats/protocol";

export type Vec2 = {
  x: number;
  y: number;
};

export type Entity = {
  id: string;
  type: EntityType;
  kind: string;
  dummy?: boolean;

  x: number;
  y: number;
  vx: number;
  vy: number;

  size: Size;
  hurt: HurtCircle;

  damage: number;
  score: number;

  animations?: AnimationSet;

  alive: boolean;
};

export type TutorialState = {
  active: boolean;
  completed: boolean;
  targetsDestroyed: number;
  targetsRequired: number;
};

export type Player = Entity & {
  type: "player";
  playerId: PlayerId;

  hp: number;
  maxHp: number;

  smash: SmashBox;

  invulnerableUntilTick: number;

  paused: boolean;
  grounded: boolean;
  smashing: boolean;
  smashingForCollision: boolean;

  previousX: number;
  previousY: number;

  lockedWorldX: number | undefined;

  jumpStartY: number;
  canJump: boolean;
  wasJumpPressed: boolean;

  lastInputSnapshotTick: number | undefined;
  lastReceivedInputSeq: number;
  lastProcessedInputSeq: number;
  lastInput: PlayerInput;
  pendingInputCommands: PlayerInputCommand[];

  smashSnapshotTick: number | undefined;

  damagedByEntityIds: Set<EntityId>;
};
