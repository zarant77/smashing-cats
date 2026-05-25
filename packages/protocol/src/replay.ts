export type ReplayMode = "single" | "multi";

export type ReplayInputFrame = {
  readonly tick: number;
  readonly left: boolean;
  readonly right: boolean;
  readonly jump: boolean;
};

export type GameReplay = {
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
