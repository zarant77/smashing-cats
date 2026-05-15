import { simulatePlayerMovement } from "@smashing-cats/core";
import type { PlayerMovementState } from "@smashing-cats/core";
import type { CharacterDefinition, GameSnapshot, PlayerId, PlayerInput, PlayerSnapshot } from "@smashing-cats/protocol";

const FALLBACK_GRAVITY = 1700;
const MAX_DT = 1 / 30;
const MAX_PENDING_INPUTS = 120;

const IGNORE_POSITION_ERROR = 4;
const SNAP_POSITION_ERROR = 80;
const SMOOTH_CORRECTION_FACTOR = 0.18;

type PendingInput = {
  inputSeq: number;
  input: PlayerInput;
  dt: number;
};

export class LocalPlayerPredictor {
  private state: PlayerMovementState | undefined;
  private playerId: PlayerId | undefined;
  private pendingInputs: PendingInput[] = [];
  private lastUpdatedAt: number | undefined;
  private lastAuthoritativeTick: number | undefined;
  private lastAuthoritativeInputSeq: number | undefined;

  public apply(
    snapshot: GameSnapshot | undefined,
    latest: GameSnapshot | undefined,
    playerId: PlayerId | undefined,
    inputSeq: number,
    input: PlayerInput,
    characters: CharacterDefinition[],
    now = performance.now(),
  ): GameSnapshot | undefined {
    if (snapshot === undefined || latest === undefined || playerId === undefined) {
      this.reset();
      return snapshot;
    }

    const authoritativePlayer = latest.players.find((player) => player.playerId === playerId);

    if (authoritativePlayer === undefined || !authoritativePlayer.alive) {
      this.reset();
      return snapshot;
    }

    const character = characters.find((candidate) => candidate.kind === authoritativePlayer.kind);

    if (character === undefined) {
      this.reset();
      return snapshot;
    }

    if (this.state === undefined || this.playerId !== playerId) {
      this.state = createMovementState(authoritativePlayer);
      this.playerId = playerId;
      this.pendingInputs = [];
      this.lastUpdatedAt = now;
      this.lastAuthoritativeTick = latest.tick;
      this.lastAuthoritativeInputSeq = authoritativePlayer.lastProcessedInputSeq;
    }

    const dt = this.getDeltaTime(now);

    if (this.hasNewAuthoritativeState(latest.tick, authoritativePlayer.lastProcessedInputSeq)) {
      this.reconcile(authoritativePlayer, character, latest);
      this.lastAuthoritativeTick = latest.tick;
      this.lastAuthoritativeInputSeq = authoritativePlayer.lastProcessedInputSeq;
    }

    this.applyInput(inputSeq, input, character, latest, dt);

    return {
      ...snapshot,
      players: snapshot.players.map((player) => (player.playerId === playerId ? this.createPredictedPlayer(authoritativePlayer) : player)),
    };
  }

  public getPlayerState(): PlayerMovementState | undefined {
    return this.state;
  }

  private hasNewAuthoritativeState(tick: number, inputSeq: number): boolean {
    return this.lastAuthoritativeTick !== tick || this.lastAuthoritativeInputSeq !== inputSeq;
  }

  private applyInput(inputSeq: number, input: PlayerInput, character: CharacterDefinition, snapshot: GameSnapshot, dt: number): void {
    if (this.state === undefined) {
      return;
    }

    this.pendingInputs.push({
      inputSeq,
      input,
      dt,
    });

    if (this.pendingInputs.length > MAX_PENDING_INPUTS) {
      this.pendingInputs.splice(0, this.pendingInputs.length - MAX_PENDING_INPUTS);
    }

    simulatePlayerMovement(this.state, input, character, createGameConfig(snapshot.world), dt);
  }

  private reconcile(authoritativePlayer: PlayerSnapshot, character: CharacterDefinition, snapshot: GameSnapshot): void {
    if (this.state === undefined) {
      return;
    }

    this.pendingInputs = this.pendingInputs.filter((pendingInput) => pendingInput.inputSeq > authoritativePlayer.lastProcessedInputSeq);

    const reconciledState = createMovementState(authoritativePlayer);

    for (const pendingInput of this.pendingInputs) {
      simulatePlayerMovement(reconciledState, pendingInput.input, character, createGameConfig(snapshot.world), pendingInput.dt);
    }

    this.applyReconciledState(reconciledState);
  }

  private applyReconciledState(reconciledState: PlayerMovementState): void {
    if (this.state === undefined) {
      this.state = reconciledState;
      return;
    }

    const dx = reconciledState.x - this.state.x;
    const dy = reconciledState.y - this.state.y;
    const distance = Math.hypot(dx, dy);

    if (distance <= IGNORE_POSITION_ERROR) {
      this.state.vx = reconciledState.vx;
      this.state.vy = reconciledState.vy;
      this.state.grounded = reconciledState.grounded;
      this.state.smashing = reconciledState.smashing;
      this.state.smashingForCollision = reconciledState.smashingForCollision;
      this.state.jumpStartY = reconciledState.jumpStartY;
      this.state.wasJumpPressed = reconciledState.wasJumpPressed;
      return;
    }

    if (distance >= SNAP_POSITION_ERROR) {
      this.state = reconciledState;
      return;
    }

    this.state.x += dx * SMOOTH_CORRECTION_FACTOR;
    this.state.y += dy * SMOOTH_CORRECTION_FACTOR;
    this.state.vx = reconciledState.vx;
    this.state.vy = reconciledState.vy;
    this.state.grounded = reconciledState.grounded;
    this.state.smashing = reconciledState.smashing;
    this.state.smashingForCollision = reconciledState.smashingForCollision;
    this.state.jumpStartY = reconciledState.jumpStartY;
    this.state.wasJumpPressed = reconciledState.wasJumpPressed;
  }

  private getDeltaTime(now: number): number {
    const dt = this.lastUpdatedAt === undefined ? 0 : Math.min(MAX_DT, (now - this.lastUpdatedAt) / 1000);

    this.lastUpdatedAt = now;

    return dt;
  }

  private createPredictedPlayer(authoritativePlayer: PlayerSnapshot): PlayerSnapshot {
    if (this.state === undefined) {
      return authoritativePlayer;
    }

    return {
      ...authoritativePlayer,
      x: this.state.x,
      y: this.state.y,
      vx: this.state.vx,
      vy: this.state.vy,
      grounded: this.state.grounded,
      smashing: this.state.smashing,
      jumpStartY: this.state.jumpStartY,
      wasJumpPressed: this.state.wasJumpPressed,
    };
  }

  private reset(): void {
    this.state = undefined;
    this.playerId = undefined;
    this.pendingInputs = [];
    this.lastUpdatedAt = undefined;
    this.lastAuthoritativeTick = undefined;
    this.lastAuthoritativeInputSeq = undefined;
  }
}

function createMovementState(player: PlayerSnapshot): PlayerMovementState {
  return {
    x: player.x,
    y: player.y,
    vx: player.vx,
    vy: player.vy,
    size: player.size,
    grounded: player.grounded,
    smashing: player.smashing,
    smashingForCollision: player.smashing,
    jumpStartY: player.jumpStartY,
    wasJumpPressed: player.wasJumpPressed,
  };
}

function createGameConfig(world: GameSnapshot["world"]): { width: number; groundY: number; gravity: number } {
  return {
    width: world.width,
    groundY: world.groundY,
    gravity: Number.isFinite(world.gravity) ? world.gravity : FALLBACK_GRAVITY,
  };
}
