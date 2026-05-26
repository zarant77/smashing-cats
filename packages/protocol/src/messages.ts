import type { CharacterDefinition } from "./character.js";
import type { PlayerId } from "./entity.js";
import type { PlayerInput } from "./input.js";
import type { GameReplay } from "./replay.js";
import type { DeltaSnapshot, GameSnapshot } from "./snapshot.js";

export type LeaderboardMode = "single" | "multi";

export type LeaderboardEntry = {
  id: string;
  mode: LeaderboardMode;
  playerName: string;
  characterKind: string;
  durationSeconds: number;
  score: number;
  createdAt: string;
};

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
  characterKind: string;
  matchCode: string;
};

export type PauseMessage = {
  type: "pause";
  paused: boolean;
};

export type GetLeaderboardMessage = {
  type: "getLeaderboard";
  mode: LeaderboardMode;
};

export type SubmitLeaderboardEntryMessage = {
  type: "submitLeaderboardEntry";
  playerName: string;
};

export type SubmitReplayForVerificationMessage = {
  type: "submitReplayForVerification";
  replay: GameReplay;
};

export type ClientToServerMessage =
  | JoinMessage
  | SelectCharacterMessage
  | InputMessage
  | PauseMessage
  | GetLeaderboardMessage
  | SubmitLeaderboardEntryMessage
  | SubmitReplayForVerificationMessage;

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

export type LeaderboardMessage = {
  type: "leaderboard";
  mode: LeaderboardMode;
  entries: LeaderboardEntry[];
};

export type LeaderboardEligibleMessage = {
  type: "leaderboardEligible";
  mode: LeaderboardMode;
  score: number;
};

export type LeaderboardSubmittedMessage = {
  type: "leaderboardSubmitted";
  mode: LeaderboardMode;
  entry: LeaderboardEntry;
  entries: LeaderboardEntry[];
};

export type ReplayVerificationAcceptedMessage = {
  type: "replayVerificationAccepted";
  mode: LeaderboardMode;
  score: number;
  place: number;
};

export type ReplayVerificationRejectedMessage = {
  type: "replayVerificationRejected";
  reason: string;
};

export type ServerToClientMessage =
  | WelcomeMessage
  | SnapshotMessage
  | DeltaSnapshotMessage
  | LeaderboardMessage
  | LeaderboardEligibleMessage
  | LeaderboardSubmittedMessage
  | ReplayVerificationAcceptedMessage
  | ReplayVerificationRejectedMessage;
