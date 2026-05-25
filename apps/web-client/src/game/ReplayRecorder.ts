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
