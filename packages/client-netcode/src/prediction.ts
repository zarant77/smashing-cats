import { FIXED_DT, simulatePlayerMovement } from "@smashing-cats/core";
import type { PlayerMovementState } from "@smashing-cats/core";
import type { CharacterDefinition, GameSnapshot, PlayerId, PlayerInput, PlayerSnapshot } from "@smashing-cats/protocol";

const FALLBACK_GRAVITY = 1700;
const MAX_ACCUMULATED_DT = 0.25;
const MAX_PENDING_INPUTS = 120;

const IGNORE_POSITION_ERROR = 0.5;
const GROUNDED_Y_ERROR = 1.5;
const LANDING_POSITION_ERROR = 8;
const SNAP_POSITION_ERROR = 96;
const VISUAL_CORRECTION_SMOOTHING_MS = 110;

type PendingInput = {
  tick: number;
  inputSeq: number;
  actionInput: PlayerInput;
};

export class LocalPlayerPredictor {
  private state: PlayerMovementState | undefined;
  private playerId: PlayerId | undefined;
  private pendingInputs: PendingInput[] = [];
  private lastRawInput: PlayerInput | undefined;
  private jumpRequested = false;
  private predictedTick: number | undefined;
  private lastUpdatedAt: number | undefined;
  private accumulator = 0;
  private lastAuthoritativeTick: number | undefined;
  private lastAuthoritativeInputSeq: number | undefined;
  private visualCorrectionX = 0;
  private visualCorrectionY = 0;
  private lastVisualCorrectionAt: number | undefined;

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
      this.lastRawInput = input;
      this.jumpRequested = false;
      this.predictedTick = latest.tick;
      this.lastUpdatedAt = now;
      this.accumulator = 0;
      this.lastAuthoritativeTick = latest.tick;
      this.lastAuthoritativeInputSeq = authoritativePlayer.lastProcessedInputSeq;
    }

    this.accumulateTime(now);
    this.applyInputEdge(input);

    if (this.hasNewAuthoritativeState(latest.tick, authoritativePlayer.lastProcessedInputSeq)) {
      this.reconcile(authoritativePlayer, character, latest, now);
      this.lastAuthoritativeTick = latest.tick;
      this.lastAuthoritativeInputSeq = authoritativePlayer.lastProcessedInputSeq;
    }

    this.applyPredictionSteps(inputSeq, input, character, latest);
    this.decayVisualCorrection(now);

    return {
      ...snapshot,
      players: snapshot.players.map((player) => (player.playerId === playerId ? this.createPredictedPlayer(authoritativePlayer) : player)),
    };
  }

  private hasNewAuthoritativeState(tick: number, inputSeq: number): boolean {
    return this.lastAuthoritativeTick !== tick || this.lastAuthoritativeInputSeq !== inputSeq;
  }

  private applyPredictionSteps(inputSeq: number, input: PlayerInput, character: CharacterDefinition, snapshot: GameSnapshot): void {
    if (this.state === undefined) {
      return;
    }

    while (this.accumulator >= FIXED_DT) {
      const actionInput = {
        ...input,
        jump: this.consumeJumpRequest(),
      };
      const tick = (this.predictedTick ?? snapshot.tick) + 1;

      this.pendingInputs.push({
        tick,
        inputSeq,
        actionInput,
      });

      if (this.pendingInputs.length > MAX_PENDING_INPUTS) {
        this.pendingInputs.splice(0, this.pendingInputs.length - MAX_PENDING_INPUTS);
      }

      simulatePlayerMovement(this.state, actionInput, character, createGameConfig(snapshot.world), FIXED_DT);
      this.predictedTick = tick;
      this.accumulator -= FIXED_DT;
    }
  }

  private reconcile(authoritativePlayer: PlayerSnapshot, character: CharacterDefinition, snapshot: GameSnapshot, now: number): void {
    if (this.state === undefined) {
      return;
    }

    this.pendingInputs = this.pendingInputs.filter((pendingInput) => pendingInput.tick > snapshot.tick);

    const reconciledState = createMovementState(authoritativePlayer);
    this.predictedTick = snapshot.tick;

    for (const pendingInput of this.pendingInputs) {
      simulatePlayerMovement(reconciledState, pendingInput.actionInput, character, createGameConfig(snapshot.world), FIXED_DT);
      this.predictedTick = pendingInput.tick;
    }

    this.applyReconciledState(reconciledState, now);
  }

  private applyReconciledState(reconciledState: PlayerMovementState, now: number): void {
    if (this.state === undefined) {
      this.state = reconciledState;
      this.visualCorrectionX = 0;
      this.visualCorrectionY = 0;
      this.lastVisualCorrectionAt = now;
      return;
    }

    const currentState = this.state;
    const dx = reconciledState.x - currentState.x;
    const dy = reconciledState.y - currentState.y;
    const distance = Math.hypot(dx, dy);

    if (this.shouldIgnoreGroundedYCorrection(currentState, reconciledState, dy)) {
      this.state = {
        ...reconciledState,
        x: Math.abs(dx) <= IGNORE_POSITION_ERROR ? currentState.x : reconciledState.x,
        y: reconciledState.y,
        vy: 0,
        grounded: true,
        smashing: false,
        smashingForCollision: false,
        jumpStartY: reconciledState.y,
      };
      this.visualCorrectionY = 0;
      return;
    }

    if (this.shouldStabilizeLanding(currentState, reconciledState, dy)) {
      this.state = {
        ...reconciledState,
        y: reconciledState.y,
        vy: 0,
        grounded: true,
        smashing: false,
        smashingForCollision: false,
        jumpStartY: reconciledState.y,
      };
      this.visualCorrectionY = 0;
      this.lastVisualCorrectionAt = now;
      return;
    }

    if (distance <= IGNORE_POSITION_ERROR) {
      this.state = {
        ...reconciledState,
        x: currentState.x,
        y: currentState.y,
      };
      return;
    }

    if (distance >= SNAP_POSITION_ERROR) {
      this.state = reconciledState;
      this.visualCorrectionX = 0;
      this.visualCorrectionY = 0;
      this.lastVisualCorrectionAt = now;
      return;
    }

    this.applySmoothedCorrection(reconciledState, now);
  }

  private applySmoothedCorrection(reconciledState: PlayerMovementState, now: number): void {
    if (this.state === undefined) {
      this.state = reconciledState;
      this.visualCorrectionX = 0;
      this.visualCorrectionY = 0;
      this.lastVisualCorrectionAt = now;
      return;
    }

    const visualX = this.state.x + this.visualCorrectionX;
    const visualY = this.state.y + this.visualCorrectionY;
    this.state = reconciledState;
    this.visualCorrectionX = visualX - reconciledState.x;
    this.visualCorrectionY = visualY - reconciledState.y;
    this.lastVisualCorrectionAt = now;
  }

  private shouldStabilizeLanding(currentState: PlayerMovementState, reconciledState: PlayerMovementState, dy: number): boolean {
    return (
      reconciledState.grounded &&
      currentState.grounded !== reconciledState.grounded &&
      Math.abs(dy) <= LANDING_POSITION_ERROR
    );
  }

  private shouldIgnoreGroundedYCorrection(
    currentState: PlayerMovementState,
    reconciledState: PlayerMovementState,
    dy: number,
  ): boolean {
    return currentState.grounded && reconciledState.grounded && Math.abs(dy) <= GROUNDED_Y_ERROR;
  }

  private accumulateTime(now: number): void {
    const dt = this.lastUpdatedAt === undefined ? 0 : Math.min(MAX_ACCUMULATED_DT, (now - this.lastUpdatedAt) / 1000);

    this.lastUpdatedAt = now;
    this.accumulator += dt;
  }

  private applyInputEdge(input: PlayerInput): void {
    const wasJumpPressed = this.lastRawInput?.jump ?? input.jump;

    if (input.jump && !wasJumpPressed) {
      this.jumpRequested = true;
    }

    this.lastRawInput = input;
  }

  private consumeJumpRequest(): boolean {
    if (!this.jumpRequested) {
      return false;
    }

    this.jumpRequested = false;
    return true;
  }

  private createPredictedPlayer(authoritativePlayer: PlayerSnapshot): PlayerSnapshot {
    if (this.state === undefined) {
      return authoritativePlayer;
    }

    return {
      ...authoritativePlayer,
      x: this.state.x + this.visualCorrectionX,
      y: this.state.y + this.visualCorrectionY,
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
    this.lastRawInput = undefined;
    this.jumpRequested = false;
    this.predictedTick = undefined;
    this.lastUpdatedAt = undefined;
    this.accumulator = 0;
    this.lastAuthoritativeTick = undefined;
    this.lastAuthoritativeInputSeq = undefined;
    this.visualCorrectionX = 0;
    this.visualCorrectionY = 0;
    this.lastVisualCorrectionAt = undefined;
  }

  private decayVisualCorrection(now: number): void {
    if (this.lastVisualCorrectionAt === undefined) {
      return;
    }

    const dtMs = Math.max(0, now - this.lastVisualCorrectionAt);
    const alpha = clamp01(dtMs / VISUAL_CORRECTION_SMOOTHING_MS);

    this.visualCorrectionX = lerp(this.visualCorrectionX, 0, alpha);
    this.visualCorrectionY = lerp(this.visualCorrectionY, 0, alpha);
    this.lastVisualCorrectionAt = now;
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
    canJump: player.grounded,
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

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
