import { FIXED_DT, simulatePlayerMovement } from "@smashing-cats/core";
import type { PlayerMovementState } from "@smashing-cats/core";
import type {
  CharacterDefinition,
  GameSnapshot,
  PlayerId,
  PlayerInput,
  PlayerInputCommand,
  PlayerSnapshot,
} from "@smashing-cats/protocol";

const FALLBACK_GRAVITY = 1700;
const MAX_ACCUMULATED_DT = 0.25;
const MAX_PENDING_INPUTS = 120;

const IGNORE_POSITION_ERROR = 0.5;
const GROUNDED_Y_ERROR = 1.5;
const LANDING_POSITION_ERROR = 8;
const SNAP_POSITION_ERROR = 96;
const VISUAL_CORRECTION_SMOOTHING_MS = 110;

export class LocalPlayerPredictor {
  private state: PlayerMovementState | undefined;
  private playerId: PlayerId | undefined;
  private pendingInputs: PlayerInputCommand[] = [];
  private lastRawInput: PlayerInput | undefined;
  private jumpRequested = false;
  private lastUpdatedAt: number | undefined;
  private accumulator = 0;
  private lastAuthoritativeTick: number | undefined;
  private lastAuthoritativeInputSeq: number | undefined;
  private nextInputSeq = 1;
  private lastSentInputSeq = 0;
  private clientTick = 0;
  private visualCorrectionX = 0;
  private visualCorrectionY = 0;
  private lastVisualCorrectionAt: number | undefined;
  private lastRenderedX: number | undefined;
  private lastRenderedY: number | undefined;

  public apply(
    snapshot: GameSnapshot | undefined,
    latest: GameSnapshot | undefined,
    playerId: PlayerId | undefined,
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
      this.lastRawInput = { ...input, jump: false };
      this.jumpRequested = false;
      this.lastUpdatedAt = now;
      this.accumulator = 0;
      this.lastAuthoritativeTick = latest.tick;
      this.lastAuthoritativeInputSeq = authoritativePlayer.lastProcessedInputSeq;
      this.nextInputSeq = authoritativePlayer.lastProcessedInputSeq + 1;
      this.lastSentInputSeq = authoritativePlayer.lastProcessedInputSeq;
      this.clientTick = latest.tick;
    }

    this.accumulateTime(now);
    this.applyInputEdge(input);

    if (this.hasNewAuthoritativeState(latest.tick, authoritativePlayer.lastProcessedInputSeq)) {
      this.reconcile(authoritativePlayer, character, latest, now);
      this.lastAuthoritativeTick = latest.tick;
      this.lastAuthoritativeInputSeq = authoritativePlayer.lastProcessedInputSeq;
    }

    this.applyPredictionSteps(input, character, latest, snapshot.tick);
    this.decayVisualCorrection(now);

    const renderedState = this.createRenderState(input, character, latest);
    const predictedPlayer = this.createPredictedPlayer(authoritativePlayer, renderedState);

    this.lastRenderedX = predictedPlayer.x;
    this.lastRenderedY = predictedPlayer.y;

    return {
      ...snapshot,
      players: snapshot.players.map((player) => (player.playerId === playerId ? predictedPlayer : player)),
    };
  }

  public getPendingInputCommands(): PlayerInputCommand[] {
    return this.pendingInputs.map((pendingInput) => ({
      ...pendingInput,
      input: { ...pendingInput.input },
    }));
  }

  public takeUnsentInputCommands(maxCommands: number): PlayerInputCommand[] {
    const limit = Math.max(0, Math.floor(maxCommands));

    if (limit === 0) {
      return [];
    }

    const commands = this.pendingInputs
      .filter((pendingInput) => pendingInput.inputSeq > this.lastSentInputSeq)
      .slice(0, limit)
      .map((pendingInput) => ({
        ...pendingInput,
        input: { ...pendingInput.input },
      }));

    const lastCommand = commands.at(-1);

    if (lastCommand !== undefined) {
      this.lastSentInputSeq = lastCommand.inputSeq;
    }

    return commands;
  }

  public suspend(input: PlayerInput, now = performance.now()): void {
    this.lastUpdatedAt = now;
    this.accumulator = 0;
    this.lastRawInput = input;
    this.jumpRequested = false;
  }

  public getLastInputSeq(): number {
    return this.nextInputSeq - 1;
  }

  private hasNewAuthoritativeState(tick: number, inputSeq: number): boolean {
    return this.lastAuthoritativeTick !== tick || this.lastAuthoritativeInputSeq !== inputSeq;
  }

  private applyPredictionSteps(
    input: PlayerInput,
    character: CharacterDefinition,
    snapshot: GameSnapshot,
    renderedSnapshotTick: number,
  ): void {
    if (this.state === undefined) {
      return;
    }

    while (this.accumulator >= FIXED_DT) {
      const actionInput = {
        ...input,
        jump: this.consumeJumpRequest(),
      };

      const command: PlayerInputCommand = {
        inputSeq: this.nextInputSeq++,
        clientTick: ++this.clientTick,
        snapshotTick: renderedSnapshotTick,
        input: actionInput,
      };

      this.pendingInputs.push(command);

      if (this.pendingInputs.length > MAX_PENDING_INPUTS) {
        this.pendingInputs.splice(0, this.pendingInputs.length - MAX_PENDING_INPUTS);
      }

      simulatePlayerMovement(this.state, command.input, character, createGameConfig(snapshot.world), FIXED_DT);
      this.accumulator -= FIXED_DT;
    }
  }

  private reconcile(authoritativePlayer: PlayerSnapshot, character: CharacterDefinition, snapshot: GameSnapshot, now: number): void {
    if (this.state === undefined) {
      return;
    }

    this.pendingInputs = this.pendingInputs.filter((pendingInput) => pendingInput.inputSeq > authoritativePlayer.lastProcessedInputSeq);
    this.nextInputSeq = Math.max(this.nextInputSeq, authoritativePlayer.lastProcessedInputSeq + 1);
    this.lastSentInputSeq = Math.max(this.lastSentInputSeq, authoritativePlayer.lastProcessedInputSeq);

    const reconciledState = createMovementState(authoritativePlayer);

    for (const pendingInput of this.pendingInputs) {
      simulatePlayerMovement(reconciledState, pendingInput.input, character, createGameConfig(snapshot.world), FIXED_DT);
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

    const stabilizeGroundedY = this.shouldIgnoreGroundedYCorrection(currentState, reconciledState, dy);
    const stabilizeLanding = this.shouldStabilizeLanding(currentState, reconciledState, dy);

    if (distance <= IGNORE_POSITION_ERROR) {
      this.state = {
        ...reconciledState,
        x: currentState.x,
        y: stabilizeGroundedY || stabilizeLanding ? reconciledState.y : currentState.y,
      };

      if (stabilizeGroundedY || stabilizeLanding) {
        this.visualCorrectionY = 0;
      }

      return;
    }

    if (distance >= SNAP_POSITION_ERROR) {
      this.state = reconciledState;
      this.visualCorrectionX = 0;
      this.visualCorrectionY = 0;
      this.lastVisualCorrectionAt = now;
      return;
    }

    this.applySmoothedCorrection(reconciledState, now, stabilizeGroundedY || stabilizeLanding);
  }

  private applySmoothedCorrection(reconciledState: PlayerMovementState, now: number, stabilizeY: boolean): void {
    if (this.state === undefined) {
      this.state = reconciledState;
      this.visualCorrectionX = 0;
      this.visualCorrectionY = 0;
      this.lastVisualCorrectionAt = now;
      return;
    }

    const visualX = this.lastRenderedX ?? this.state.x + this.visualCorrectionX;
    const visualY = this.lastRenderedY ?? this.state.y + this.visualCorrectionY;
    this.state = reconciledState;
    this.visualCorrectionX = visualX - reconciledState.x;
    this.visualCorrectionY = stabilizeY ? 0 : visualY - reconciledState.y;
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

  private createRenderState(
    input: PlayerInput,
    character: CharacterDefinition,
    snapshot: GameSnapshot,
  ): PlayerMovementState | undefined {
    if (this.state === undefined) {
      return undefined;
    }

    const renderedState: PlayerMovementState = {
      ...this.state,
      size: [...this.state.size],
    };

    if (this.accumulator > 0) {
      simulatePlayerMovement(
        renderedState,
        {
          ...input,
          jump: this.jumpRequested,
        },
        character,
        createGameConfig(snapshot.world),
        this.accumulator,
      );
    }

    return renderedState;
  }

  private createPredictedPlayer(
    authoritativePlayer: PlayerSnapshot,
    renderedState: PlayerMovementState | undefined,
  ): PlayerSnapshot {
    if (renderedState === undefined) {
      return authoritativePlayer;
    }

    return {
      ...authoritativePlayer,
      x: renderedState.x + this.visualCorrectionX,
      y: renderedState.y + this.visualCorrectionY,
      vx: renderedState.vx,
      vy: renderedState.vy,
      grounded: renderedState.grounded,
      smashing: renderedState.smashing,
      jumpStartY: renderedState.jumpStartY,
      wasJumpPressed: renderedState.wasJumpPressed,
    };
  }

  private reset(): void {
    this.state = undefined;
    this.playerId = undefined;
    this.pendingInputs = [];
    this.lastRawInput = undefined;
    this.jumpRequested = false;
    this.lastUpdatedAt = undefined;
    this.accumulator = 0;
    this.lastAuthoritativeTick = undefined;
    this.lastAuthoritativeInputSeq = undefined;
    this.nextInputSeq = 1;
    this.lastSentInputSeq = 0;
    this.clientTick = 0;
    this.visualCorrectionX = 0;
    this.visualCorrectionY = 0;
    this.lastVisualCorrectionAt = undefined;
    this.lastRenderedX = undefined;
    this.lastRenderedY = undefined;
  }

  private decayVisualCorrection(now: number): void {
    if (this.lastVisualCorrectionAt === undefined) {
      return;
    }

    const dtMs = Math.max(0, now - this.lastVisualCorrectionAt);
    const alpha = 1 - Math.exp(-dtMs / VISUAL_CORRECTION_SMOOTHING_MS);

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
