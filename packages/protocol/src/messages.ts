import type { CharacterDefinition } from "./character.js";
import type { EntityKind, PlayerId } from "./entity.js";
import type { PlayerInput } from "./input.js";
import type { DeltaSnapshot, GameSnapshot } from "./snapshot.js";

export type InputMessage = {
  type: "input";
  inputSeq: number;
  snapshotTick?: number;
  input: PlayerInput;
};

export type JoinMessage = {
  type: "join";
};

export type SelectCharacterMessage = {
  type: "selectCharacter";
  characterKind: EntityKind;
  matchCode: string;
};

export type PauseMessage = {
  type: "pause";
  paused: boolean;
};

export type ClientToServerMessage = JoinMessage | SelectCharacterMessage | InputMessage | PauseMessage;

export type WelcomeMessage = {
  type: "welcome";
  playerId: PlayerId;
  characters: CharacterDefinition[];
};

export type SnapshotMessage = {
  type: "snapshot";
  snapshot: GameSnapshot;
};

export type DeltaSnapshotMessage = {
  type: "delta";
  delta: DeltaSnapshot;
};

export type PlayerInputMessage = {
  type: "playerInput";
  playerId: PlayerId;
  inputSeq: number;
  snapshotTick?: number;
  input: PlayerInput;
};

export type ServerToClientMessage = WelcomeMessage | SnapshotMessage | DeltaSnapshotMessage | PlayerInputMessage;
