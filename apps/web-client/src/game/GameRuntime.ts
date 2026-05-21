import { CHARACTERS, FIXED_DT, Game, SnapshotStore } from "@smashing-cats/core";
import { LocalPlayerPredictor, SnapshotInterpolator } from "@smashing-cats/client-netcode";
import type {
  CharacterDefinition,
  EntityKind,
  EntitySnapshot,
  GameSnapshot,
  InputMessage,
  PlayerId,
  PlayerInput,
  PlayerSnapshot,
  ServerToClientMessage,
} from "@smashing-cats/protocol";

import { consumePauseToggle, isPaused, setPaused as setInputPaused, togglePause, readInput } from "../input.js";
import { createSocket, parseServerMessage, sendClientMessage } from "../network/clientConnection.js";
import type { TouchControls } from "../ui/TouchControls.js";
import { createLocalGame } from "./localGame.js";

const LOCAL_PLAYER_ID = "p1";

type GameRuntimeOptions = {
  multiplayer: boolean;
  matchCode: string | undefined;
  touchControls: TouchControls | undefined;
  onCharacterStateChange(): void;
  render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void;
};

export class GameRuntime {
  private readonly multiplayer: boolean;
  private readonly matchCode: string | undefined;
  private readonly touchControls: TouchControls | undefined;
  private readonly onCharacterStateChange: () => void;
  private readonly renderFrame: (snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined) => void;

  private charactersValue: CharacterDefinition[];
  private hasSelectedCharacterValue = false;
  private playerId: PlayerId | undefined;
  private inputSeq = 1;
  private lastSentInputSeq = 0;
  private lastSentInput: PlayerInput | undefined;
  private interpolator = new SnapshotInterpolator();
  private snapshotStore = new SnapshotStore();
  private predictor = new LocalPlayerPredictor();
  private socket: WebSocket | undefined;
  private localGame: Game | undefined;
  private previousLocalSnapshot: GameSnapshot | undefined;
  private localSnapshot: GameSnapshot | undefined;
  private lastLocalUpdateAt = performance.now();
  private localUpdateAccumulator = 0;

  public constructor(options: GameRuntimeOptions) {
    this.multiplayer = options.multiplayer;
    this.matchCode = options.matchCode;
    this.touchControls = options.touchControls;
    this.onCharacterStateChange = options.onCharacterStateChange;
    this.renderFrame = options.render;

    this.charactersValue = this.multiplayer ? [] : [...CHARACTERS];
    this.playerId = this.multiplayer ? undefined : LOCAL_PLAYER_ID;
    this.socket = this.multiplayer ? createSocket() : undefined;
    this.localGame = this.multiplayer ? undefined : createLocalGame();

    this.bindSocketEvents();
  }

  public get characters(): CharacterDefinition[] {
    return this.charactersValue;
  }

  public get hasSelectedCharacter(): boolean {
    return this.hasSelectedCharacterValue;
  }

  public restart(): void {
    setInputPaused(false);

    this.hasSelectedCharacterValue = false;
    this.playerId = this.multiplayer ? undefined : LOCAL_PLAYER_ID;
    this.inputSeq = 1;
    this.lastSentInputSeq = 0;
    this.lastSentInput = undefined;
    this.charactersValue = this.multiplayer ? [] : [...CHARACTERS];
    this.interpolator = new SnapshotInterpolator();
    this.snapshotStore = new SnapshotStore();
    this.predictor = new LocalPlayerPredictor();
    this.previousLocalSnapshot = undefined;
    this.localSnapshot = undefined;
    this.lastLocalUpdateAt = performance.now();
    this.localUpdateAccumulator = 0;

    if (this.multiplayer) {
      this.socket?.close();
      this.socket = createSocket();
      this.bindSocketEvents();
    } else {
      this.localGame = createLocalGame();
    }

    this.onCharacterStateChange();
    this.renderFrame(undefined, undefined);
  }

  public selectCharacter(characterKind: EntityKind): boolean {
    if (this.multiplayer && (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined || this.matchCode === undefined)) {
      return false;
    }

    this.hasSelectedCharacterValue = true;
    setInputPaused(false);
    this.onCharacterStateChange();

    if (this.multiplayer) {
      const matchCode = this.matchCode;

      if (matchCode === undefined) {
        return false;
      }

      sendClientMessage(this.socket, {
        type: "selectCharacter",
        characterKind,
        matchCode,
      });
      return true;
    }

    this.playerId = LOCAL_PLAYER_ID;
    this.localGame = createLocalGame();
    this.localGame.addPlayer(this.playerId, characterKind);
    this.localSnapshot = this.localGame.createSnapshot();
    this.previousLocalSnapshot = this.localSnapshot;

    return true;
  }

  public start(): void {
    this.frame();
  }

  public setPaused(paused: boolean): void {
    if (!this.isGameRunning()) {
      return;
    }

    setInputPaused(paused);

    if (this.multiplayer) {
      sendClientMessage(this.socket, {
        type: "pause",
        paused,
      });
      this.lastSentInput = undefined;
      return;
    }

    if (this.localGame === undefined) {
      return;
    }

    this.localGame.setGamePaused(paused);
    this.localSnapshot = this.localGame.createSnapshot();
    this.previousLocalSnapshot = this.localSnapshot;
    this.localUpdateAccumulator = 0;
    this.lastLocalUpdateAt = performance.now();
  }

  public togglePause(): void {
    if (this.isGameRunning()) {
      togglePause();
      this.setPaused(isPaused());
    }
  }

  public isGameRunning(): boolean {
    if (!this.hasSelectedCharacterValue || this.playerId === undefined) {
      return false;
    }

    const snapshot = this.multiplayer ? this.interpolator.getLatest() : this.localSnapshot;
    const player = snapshot?.players.find((item) => item.playerId === this.playerId);

    return player?.alive !== false;
  }

  public isPaused(): boolean {
    const snapshot = this.multiplayer ? this.interpolator.getLatest() : this.localSnapshot;
    const player = snapshot?.players.find((item) => item.playerId === this.playerId);

    return snapshot?.gamePaused === true || player?.paused === true || isPaused();
  }

  private bindSocketEvents(): void {
    if (this.socket === undefined) {
      return;
    }

    this.socket.addEventListener("open", () => {
      sendClientMessage(this.socket, { type: "join" });
    });

    this.socket.addEventListener("message", (event) => {
      const message = parseServerMessage(event.data);

      if (message !== undefined) {
        this.handleServerMessage(message);
      }
    });
  }

  private handleServerMessage(message: ServerToClientMessage): void {
    if (message.type === "welcome") {
      this.playerId = message.playerId;
      this.charactersValue = message.characters;
      this.onCharacterStateChange();
      return;
    }

    if (message.type === "snapshot") {
      const snapshot = this.snapshotStore.setFullSnapshot(message.snapshot);
      this.interpolator.add(snapshot);
      return;
    }

    if (message.type === "delta") {
      const snapshot = this.snapshotStore.applyDelta(message.delta);

      if (snapshot !== undefined) {
        this.interpolator.add(snapshot);
      }
    }
  }

  private frame(): void {
    const currentPlayerId = this.playerId;
    const canPlay = currentPlayerId !== undefined && this.hasSelectedCharacterValue;
    const canSend = this.multiplayer && this.socket?.readyState === WebSocket.OPEN && canPlay;

    if (consumePauseToggle()) {
      if (this.isGameRunning()) {
        this.setPaused(isPaused());
      } else {
        setInputPaused(false);
      }
    }

    const input = this.readPlayerInput();
    const currentInputSeq = this.getCurrentInputSeq(canSend && !isPaused(), input);

    this.updateLocalGame(canPlay, currentPlayerId, currentInputSeq, input);

    const snapshot = this.getRenderSnapshot(currentInputSeq, input);

    this.renderFrame(snapshot, this.playerId);

    requestAnimationFrame(() => this.frame());
  }

  private readPlayerInput(): PlayerInput {
    const keyboardInput = readInput();
    const touchInput = this.touchControls?.getInput();

    return {
      left: keyboardInput.left || touchInput?.left === true,
      right: keyboardInput.right || touchInput?.right === true,
      jump: keyboardInput.jump || touchInput?.jump === true,
    };
  }

  private getCurrentInputSeq(canSend: boolean, input: PlayerInput): number {
    if (!this.multiplayer) {
      return this.inputSeq++;
    }

    if (canSend && this.shouldSendInput(input)) {
      const inputSeq = this.inputSeq++;

      this.sendInput(inputSeq, input);
      this.lastSentInputSeq = inputSeq;
      this.lastSentInput = { ...input };
    }

    return this.lastSentInputSeq;
  }

  private shouldSendInput(input: PlayerInput): boolean {
    return hasActiveInput(input) || this.lastSentInput === undefined || !isSameInput(this.lastSentInput, input);
  }

  private sendInput(inputSeq: number, input: PlayerInput): void {
    const snapshotTick = this.interpolator.getRenderedTick();

    const inputMessage: InputMessage =
      snapshotTick === undefined
        ? {
            type: "input",
            inputSeq,
            input,
          }
        : {
            type: "input",
            inputSeq,
            snapshotTick,
            input,
          };

    sendClientMessage(this.socket, inputMessage);
  }

  private updateLocalGame(canPlay: boolean, currentPlayerId: PlayerId | undefined, currentInputSeq: number, input: PlayerInput): void {
    if (this.multiplayer || !canPlay || this.localGame === undefined || currentPlayerId === undefined) {
      this.lastLocalUpdateAt = performance.now();
      this.localUpdateAccumulator = 0;
      return;
    }

    if (!isPaused()) {
      this.localGame.setInput(currentPlayerId, input, undefined, currentInputSeq);
    }

    const now = performance.now();
    const dt = Math.min(0.25, (now - this.lastLocalUpdateAt) / 1000);
    this.lastLocalUpdateAt = now;
    this.localUpdateAccumulator += dt;

    while (this.localUpdateAccumulator >= FIXED_DT) {
      this.previousLocalSnapshot = this.localSnapshot;
      this.localGame.update(FIXED_DT);
      this.localSnapshot = this.localGame.createSnapshot();
      this.localUpdateAccumulator -= FIXED_DT;
    }
  }

  private getRenderSnapshot(currentInputSeq: number, input: PlayerInput): GameSnapshot | undefined {
    if (!this.multiplayer) {
      return interpolateSnapshot(this.previousLocalSnapshot, this.localSnapshot, this.localUpdateAccumulator / FIXED_DT);
    }

    const interpolatedSnapshot = this.interpolator.get(this.playerId);
    const latestSnapshot = this.interpolator.getLatest();
    const localPlayer = latestSnapshot?.players.find((player) => player.playerId === this.playerId);

    if (latestSnapshot?.gamePaused === true) {
      return interpolatedSnapshot;
    }

    if (localPlayer?.paused === true) {
      return interpolatedSnapshot;
    }

    return this.predictor.apply(interpolatedSnapshot, latestSnapshot, this.playerId, currentInputSeq, input, this.charactersValue);
  }
}

function interpolateSnapshot(
  previous: GameSnapshot | undefined,
  current: GameSnapshot | undefined,
  alpha: number,
): GameSnapshot | undefined {
  if (current === undefined) {
    return undefined;
  }

  if (previous === undefined || previous.tick >= current.tick) {
    return current;
  }

  const clampedAlpha = clamp01(alpha);

  return {
    ...current,
    tick: Math.round(lerp(previous.tick, current.tick, clampedAlpha)),
    world: {
      ...current.world,
      scrollX: lerp(previous.world.scrollX, current.world.scrollX, clampedAlpha),
    },
    players: current.players.map((player) => interpolatePlayer(previous.players, player, clampedAlpha)),
    entities: current.entities.map((entity) => interpolateEntity(previous.entities, entity, clampedAlpha)),
  };
}

function interpolatePlayer(previousPlayers: PlayerSnapshot[], current: PlayerSnapshot, alpha: number): PlayerSnapshot {
  const previous = previousPlayers.find((player) => player.playerId === current.playerId);

  if (previous === undefined) {
    return current;
  }

  return {
    ...current,
    x: lerp(previous.x, current.x, alpha),
    y: lerp(previous.y, current.y, alpha),
  };
}

function interpolateEntity(previousEntities: EntitySnapshot[], current: EntitySnapshot, alpha: number): EntitySnapshot {
  const previous = previousEntities.find((entity) => entity.id === current.id);

  if (previous === undefined) {
    return current;
  }

  return {
    ...current,
    x: lerp(previous.x, current.x, alpha),
    y: lerp(previous.y, current.y, alpha),
  };
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function isSameInput(left: PlayerInput, right: PlayerInput): boolean {
  return left.left === right.left && left.right === right.right && left.jump === right.jump;
}

function hasActiveInput(input: PlayerInput): boolean {
  return input.left || input.right || input.jump;
}
