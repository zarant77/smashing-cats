import {
  encodeInputBitmask,
  type GameReplay,
  type GameReplayV2,
  type GameSnapshot,
  type PlayerId,
  type PlayerInput,
  type ReplayInputRun,
} from "@smashing-cats/protocol";

type ReplayRecorderOptions = {
  gameVersion: string;
  seed: number;
  playerKind: string;
};

export class ReplayRecorder {
  private readonly gameVersion: string;
  private readonly seed: string;
  private readonly playerKind: string;
  private readonly startedAt: string;
  private readonly inputRuns: ReplayInputRun[] = [];
  private logicalInputCount = 0;

  private completedReplay: GameReplayV2 | undefined;
  private lastRecordedTick = 0;
  private duplicateTickCount = 0;
  private missingTickCount = 0;

  public constructor(options: ReplayRecorderOptions) {
    this.gameVersion = options.gameVersion;
    this.seed = String(options.seed);
    this.playerKind = options.playerKind;
    this.startedAt = new Date().toISOString();
  }

  public recordInput(tick: number, input: PlayerInput): void {
    if (this.completedReplay !== undefined) {
      return;
    }

    if (tick <= this.lastRecordedTick) {
      this.duplicateTickCount += 1;
      return;
    }

    if (this.lastRecordedTick === 0 && tick > 1) {
      this.missingTickCount += tick - 1;
    } else if (this.lastRecordedTick > 0 && tick > this.lastRecordedTick + 1) {
      this.missingTickCount += tick - this.lastRecordedTick - 1;
    }

    this.lastRecordedTick = tick;
    this.logicalInputCount += 1;

    const bitmask = encodeInputBitmask(input);
    const lastRun = this.inputRuns.at(-1);

    if (lastRun !== undefined && lastRun[0] + lastRun[1] === tick && lastRun[2] === bitmask) {
      this.inputRuns[this.inputRuns.length - 1] = [lastRun[0], lastRun[1] + 1, lastRun[2]];
      return;
    }

    this.inputRuns.push([tick, 1, bitmask]);
  }

  public complete(snapshot: GameSnapshot, playerId: PlayerId): GameReplay | undefined {
    if (this.completedReplay !== undefined) {
      return this.completedReplay;
    }

    const player = snapshot.players.find((item) => item.playerId === playerId);

    if (player === undefined || player.alive) {
      return undefined;
    }

    this.completedReplay = {
      version: 2,
      gameVersion: this.gameVersion,
      mode: "single",
      seed: this.seed,
      playerKind: this.playerKind,
      startedAt: this.startedAt,
      endedAt: new Date().toISOString(),
      finalTick: snapshot.tick,
      finalScore: player.score,
      inputRuns: this.inputRuns.map(cloneInputRun),
    };

    const compressionRatio = this.inputRuns.length === 0 ? 1 : this.logicalInputCount / this.inputRuns.length;

    console.debug("[leaderboard] completed replay", {
      finalScore: this.completedReplay.finalScore,
      finalTick: this.completedReplay.finalTick,
      inputRunsLength: this.completedReplay.inputRuns.length,
      logicalInputCount: this.logicalInputCount,
      estimatedCompressionRatio: compressionRatio,
      firstInputRuns: this.completedReplay.inputRuns.slice(0, 5),
      lastInputRuns: this.completedReplay.inputRuns.slice(-5),
      duplicateTickCount: this.duplicateTickCount,
      missingTickCount: this.missingTickCount,
    });

    return this.completedReplay;
  }

  public getCompletedReplay(): GameReplay | undefined {
    if (this.completedReplay === undefined) {
      return undefined;
    }

    return {
      ...this.completedReplay,
      inputRuns: this.completedReplay.inputRuns.map(cloneInputRun),
    };
  }
}

function cloneInputRun(run: ReplayInputRun): ReplayInputRun {
  return [run[0], run[1], run[2]];
}
