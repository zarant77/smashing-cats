export type ReplayMode = "single" | "multi";

export type ReplayInputFrame = {
  readonly tick: number;
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
};

export type ReplayInputRun = readonly [
  tick: number,
  length: number,
  input: number,
];

export const REPLAY_INPUT_LEFT = 1;
export const REPLAY_INPUT_RIGHT = 2;
export const REPLAY_INPUT_JUMP = 4;
export const REPLAY_INPUT_MAX_BITMASK = REPLAY_INPUT_LEFT | REPLAY_INPUT_RIGHT | REPLAY_INPUT_JUMP;

export type GameReplayV1 = {
  readonly version: 1;
  readonly gameVersion: string;
  readonly mode: ReplayMode;
  readonly seed: string;
  readonly playerKind: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly finalTick: number;
  readonly finalScore: number;
  readonly inputs: readonly ReplayInputFrame[];
};

export type GameReplayV2 = {
  readonly version: 2;
  readonly gameVersion: string;
  readonly mode: ReplayMode;
  readonly seed: string;
  readonly playerKind: string;
  readonly startedAt: string;
  readonly endedAt: string;
  readonly finalTick: number;
  readonly finalScore: number;
  readonly inputRuns: readonly ReplayInputRun[];
};

export type GameReplay = GameReplayV1 | GameReplayV2;

export function encodeInputBitmask(input: Pick<ReplayInputFrame, "left" | "right" | "jump">): number {
  return (input.left ? REPLAY_INPUT_LEFT : 0) | (input.right ? REPLAY_INPUT_RIGHT : 0) | (input.jump ? REPLAY_INPUT_JUMP : 0);
}

export function decodeInputBitmask(bitmask: number): Pick<ReplayInputFrame, "left" | "right" | "jump"> {
  const normalizedBitmask = Number.isInteger(bitmask) ? bitmask : 0;

  return {
    left: (normalizedBitmask & REPLAY_INPUT_LEFT) !== 0,
    right: (normalizedBitmask & REPLAY_INPUT_RIGHT) !== 0,
    jump: (normalizedBitmask & REPLAY_INPUT_JUMP) !== 0,
  };
}
