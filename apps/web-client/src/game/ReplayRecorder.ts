import type { GameReplay, GameSnapshot, PlayerId, PlayerInput, ReplayInputFrame } from "@smashing-cats/protocol";

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
  private readonly inputs: ReplayInputFrame[] = [];

  private completedReplay: GameReplay | undefined;
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

    this.inputs.push({
      tick,
      left: input.left,
      right: input.right,
      jump: input.jump,
    });
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
      version: 1,
      gameVersion: this.gameVersion,
      mode: "single",
      seed: this.seed,
      playerKind: this.playerKind,
      startedAt: this.startedAt,
      endedAt: new Date().toISOString(),
      finalTick: snapshot.tick,
      finalScore: player.score,
      inputs: this.inputs.map((input) => ({ ...input })),
    };

    console.debug("[leaderboard] completed replay", {
      finalScore: this.completedReplay.finalScore,
      finalTick: this.completedReplay.finalTick,
      inputsLength: this.completedReplay.inputs.length,
      firstInputFrames: this.completedReplay.inputs.slice(0, 5),
      lastInputFrames: this.completedReplay.inputs.slice(-5),
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
      inputs: this.completedReplay.inputs.map((input) => ({ ...input })),
    };
  }
}
