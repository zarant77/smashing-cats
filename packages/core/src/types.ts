import type { EntityId, EntityKind, EntityType, PlayerId, PlayerInput } from "@smashing-cats/protocol";

export type Vec2 = {
  x: number;
  y: number;
};

export type Entity = {
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

export type Player = Entity & {
  type: "player";
  playerId: PlayerId;
  hp: number;
  maxHp: number;
  score: number;
  invulnerableUntilTick: number;
  grounded: boolean;
  smashing: boolean;
  smashingForCollision: boolean;
  lockedWorldX: number | undefined;
  jumpStartY: number;
  wasJumpPressed: boolean;
  lastInputSnapshotTick: number | undefined;
  smashSnapshotTick: number | undefined;
  damagedByEntityIds: Set<EntityId>;
  lastInput: PlayerInput;
};
