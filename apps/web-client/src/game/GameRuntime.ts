import { CHARACTERS, FIXED_DT, Game, SnapshotStore } from "@smashing-cats/core";
import type {
  CharacterDefinition,
  EntitySnapshot,
  EntityKind,
  GameSnapshot,
  InputMessage,
  PlayerId,
  PlayerInput,
  PlayerSnapshot,
  ServerToClientMessage,
} from "@smashing-cats/protocol";

import { AudioEventPlayer } from "../audio/AudioEventPlayer.js";
import { playSound } from "../audio/audio.js";
import { consumePauseToggle, isPaused, readInput } from "../input.js";
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
  private wasJumpPressed = false;
  private wasSmashing = false;
  private snapshotStore = new SnapshotStore();
  private audioEventPlayer = new AudioEventPlayer();
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
    this.hasSelectedCharacterValue = false;
    this.playerId = this.multiplayer ? undefined : LOCAL_PLAYER_ID;
    this.inputSeq = 1;
    this.wasJumpPressed = false;
    this.wasSmashing = false;
    this.charactersValue = this.multiplayer ? [] : [...CHARACTERS];
    this.snapshotStore = new SnapshotStore();
    this.audioEventPlayer = new AudioEventPlayer();
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
    if (
      this.multiplayer &&
      (this.socket?.readyState !== WebSocket.OPEN || this.playerId === undefined || this.matchCode === undefined)
    ) {
      return false;
    }

    this.hasSelectedCharacterValue = true;
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
      this.loadServerSnapshot(snapshot);
      return;
    }

    if (message.type === "delta") {
      const snapshot = this.snapshotStore.applyDelta(message.delta);

      if (snapshot !== undefined) {
        this.loadServerSnapshot(snapshot);
      }

      return;
    }

    if (message.type === "playerInput") {
      this.applyRemoteInput(message.playerId, message.input, message.snapshotTick, message.inputSeq);
    }
  }

  private frame(): void {
    const currentPlayerId = this.playerId;
    const canPlay = currentPlayerId !== undefined && this.hasSelectedCharacterValue;
    const canSend = this.multiplayer && this.socket?.readyState === WebSocket.OPEN && currentPlayerId !== undefined;

    if (consumePauseToggle() && canPlay) {
      if (this.multiplayer) {
        sendClientMessage(this.socket, {
          type: "pause",
          paused: isPaused(),
        });
      } else {
        this.localGame?.setPaused(currentPlayerId, isPaused());
      }
    }

    const input = this.readPlayerInput();
    const currentInputSeq = this.inputSeq++;
    const jumpPressed = input.jump && !this.wasJumpPressed;
    this.wasJumpPressed = input.jump;

    if (canSend && canPlay && !isPaused()) {
      this.sendInput(currentInputSeq, input);
    }

    this.updateLocalGame(canPlay, currentPlayerId, currentInputSeq, input);

    const snapshot = this.getRenderSnapshot(currentInputSeq, input);
    const renderedPlayer = snapshot?.players.find((player) => player.playerId === this.playerId);

    if (jumpPressed && this.hasSelectedCharacterValue && renderedPlayer !== undefined && !isPaused()) {
      playSound(renderedPlayer.smashing && !this.wasSmashing ? "PlayerSmash" : "PlayerJump");
    }

    this.wasSmashing = renderedPlayer?.smashing ?? false;
    this.audioEventPlayer.play(snapshot, this.playerId);
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

  private sendInput(inputSeq: number, input: PlayerInput): void {
    const snapshotTick = this.localSnapshot?.tick;

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

  private updateLocalGame(
    canPlay: boolean,
    currentPlayerId: PlayerId | undefined,
    currentInputSeq: number,
    input: PlayerInput,
  ): void {
    if (!canPlay || this.localGame === undefined || currentPlayerId === undefined) {
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
    void currentInputSeq;
    void input;

    return interpolateSnapshot(this.previousLocalSnapshot, this.localSnapshot, this.localUpdateAccumulator / FIXED_DT);
  }

  private loadServerSnapshot(snapshot: GameSnapshot): void {
    if (!this.multiplayer) {
      return;
    }

    const isNewLocalGame = this.localGame === undefined || this.localSnapshot?.seed !== snapshot.seed;

    if (!isNewLocalGame && !this.shouldApplyServerSnapshot(snapshot)) {
      return;
    }

    const nextSnapshot = this.withOptimisticLocalPlayer(snapshot);
    const previousSnapshot = this.localSnapshot;

    const localGame = isNewLocalGame ? new Game(nextSnapshot.seed) : this.localGame;

    if (localGame === undefined) {
      return;
    }

    this.localGame = localGame;
    localGame.loadSnapshot(nextSnapshot);
    this.localSnapshot = localGame.createSnapshot();

    if (isNewLocalGame) {
      this.previousLocalSnapshot = this.localSnapshot;
      this.lastLocalUpdateAt = performance.now();
      this.localUpdateAccumulator = 0;
      return;
    }

    this.previousLocalSnapshot = previousSnapshot ?? this.localSnapshot;
  }

  private applyRemoteInput(
    playerId: PlayerId,
    input: PlayerInput,
    snapshotTick: number | undefined,
    inputSeq: number | undefined,
  ): void {
    if (!this.multiplayer || playerId === this.playerId || this.localGame === undefined) {
      return;
    }

    this.localGame.setInput(playerId, input, snapshotTick, inputSeq);
  }

  private shouldApplyServerSnapshot(snapshot: GameSnapshot): boolean {
    if (this.localSnapshot === undefined || snapshot.tick > this.localSnapshot.tick) {
      return true;
    }

    if (snapshot.events.length > 0) {
      return true;
    }

    if (haveDifferentIds(this.localSnapshot.players, snapshot.players, "playerId")) {
      return true;
    }

    if (haveDifferentIds(this.localSnapshot.entities, snapshot.entities, "id")) {
      return true;
    }

    const localPlayerId = this.playerId;
    const localPlayer = this.localSnapshot.players.find((player) => player.playerId === localPlayerId);
    const serverPlayer = snapshot.players.find((player) => player.playerId === localPlayerId);

    return (
      localPlayer !== undefined &&
      serverPlayer !== undefined &&
      (localPlayer.hp !== serverPlayer.hp ||
        localPlayer.score !== serverPlayer.score ||
        localPlayer.alive !== serverPlayer.alive ||
        localPlayer.paused !== serverPlayer.paused)
    );
  }

  private withOptimisticLocalPlayer(snapshot: GameSnapshot): GameSnapshot {
    const localPlayerId = this.playerId;

    if (localPlayerId === undefined || this.localSnapshot === undefined) {
      return snapshot;
    }

    const optimisticPlayer = this.localSnapshot.players.find((player) => player.playerId === localPlayerId);

    if (optimisticPlayer === undefined || !optimisticPlayer.alive) {
      return snapshot;
    }

    return {
      ...snapshot,
      players: snapshot.players.map((player) => {
        if (player.playerId !== localPlayerId || !player.alive) {
          return player;
        }

        return {
          ...player,
          x: optimisticPlayer.x,
          y: optimisticPlayer.y,
          vx: optimisticPlayer.vx,
          vy: optimisticPlayer.vy,
          grounded: optimisticPlayer.grounded,
          smashing: optimisticPlayer.smashing,
          jumpStartY: optimisticPlayer.jumpStartY,
          wasJumpPressed: optimisticPlayer.wasJumpPressed,
        };
      }),
    };
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

function haveDifferentIds<TItem extends Record<TKey, string>, TKey extends keyof TItem>(
  left: TItem[],
  right: TItem[],
  key: TKey,
): boolean {
  if (left.length !== right.length) {
    return true;
  }

  const leftIds = new Set(left.map((item) => item[key]));

  return right.some((item) => !leftIds.has(item[key]));
}
