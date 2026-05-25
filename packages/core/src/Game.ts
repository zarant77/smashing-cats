import type { DeltaSnapshot, GameEvent, GameSnapshot, PlayerId, PlayerInput } from "@smashing-cats/protocol";
import type { Entity, Player, TutorialState } from "./types.js";
import { type CharacterConfig, ENEMIES, GAME_CONFIG, TICK_RATE, getCharacterConfig } from "./config.js";
import { Random } from "./Random.js";
import { resolveEnemyCivilianCollisions, resolvePlayerEntityCollisions } from "./collision/collisionSystem.js";
import { createEntity } from "./entity/entityFactory.js";
import { spawnAhead } from "./entity/entitySpawner.js";
import { cleanupEntities, updateEntities } from "./entity/entitySystem.js";
import { createGameEvent } from "./event/gameEventFactory.js";
import { EntityHistoryFrame, recordEntityHistory } from "./history/entityHistory.js";
import { MAX_ENTITY_HISTORY_TICKS } from "./history/historyConfig.js";
import { intersectsCompensatedEntity } from "./history/lagCompensation.js";
import { applyPlayerInput, clearJumpRequest } from "./input/applyPlayerInput.js";
import { updatePlayers } from "./player/playerSystem.js";
import { createPlayer } from "./player/playerFactory.js";
import { createGameSnapshot } from "./snapshot/snapshotFactory.js";
import { createDeltaSnapshot } from "./snapshot/deltaSnapshotFactory.js";

export type StartTutorialOptions = {
  targetsRequired?: number;
  dummyStartX: number;
  dummySpacingX: number;
  gameStartDelaySeconds: number;
  runStartDelaySeconds: number;
  completed?: boolean;
};

export class Game {
  private readonly seed: number;
  private readonly rng: Random;

  private tick = 0;
  private scrollX = 0;
  private nextEntityIndex = 1;
  private nextEventIndex = 1;
  private nextSpawnX = GAME_CONFIG.worldWidth + 240;
  private gamePaused = false;
  private tutorial: TutorialState = createInactiveTutorialState();
  private tutorialGameStartDelayTicks = 0;
  private tutorialFinishTick: number | undefined;
  private runStartTick: number | undefined;

  private readonly players = new Map<PlayerId, Player>();
  private readonly entityHistory: EntityHistoryFrame[] = [];
  private entities: Entity[] = [];
  private events: GameEvent[] = [];

  public constructor(seed: number) {
    this.seed = seed;
    this.rng = new Random(seed);
  }

  public addPlayer(playerId: PlayerId, characterKind: string = "batcat"): void {
    if (this.players.has(playerId)) {
      return;
    }

    let characterConfig: CharacterConfig;

    try {
      characterConfig = getCharacterConfig(characterKind);
    } catch {
      return;
    }

    const player = createPlayer({
      playerId,
      characterConfig,
      gameConfig: GAME_CONFIG,
      index: this.players.size,
      tick: this.tick,
      groundY: GAME_CONFIG.groundY,
      tickRate: TICK_RATE,
    });

    this.players.set(playerId, player);
  }

  public removePlayer(playerId: PlayerId): void {
    this.players.delete(playerId);
  }

  public setInput(
    playerId: PlayerId,
    input: PlayerInput,
    snapshotTick: number | undefined,
    inputSeq: number | undefined,
  ): void {
    const player = this.players.get(playerId);

    if (player === undefined || !player.alive || player.paused) {
      return;
    }

    applyPlayerInput({
      player,
      input,
      snapshotTick,
      inputSeq,
    });
  }

  public setPaused(playerId: PlayerId, paused: boolean): void {
    const player = this.players.get(playerId);

    if (player === undefined || !player.alive || player.paused === paused) {
      return;
    }

    player.paused = paused;

    player.vx = 0;
    player.vy = 0;

    player.smashing = false;
    player.smashingForCollision = false;
    player.smashSnapshotTick = undefined;

    player.lastInput = {
      left: false,
      right: false,
      jump: false,
    };

    clearJumpRequest(player);

    if (paused) {
      player.invulnerableUntilTick = Number.POSITIVE_INFINITY;
      return;
    }

    player.invulnerableUntilTick = this.tick + Math.ceil(GAME_CONFIG.unpauseInvulnerabilitySeconds * TICK_RATE);
  }

  public setGamePaused(paused: boolean): void {
    this.gamePaused = paused;
  }

  public isGamePaused(): boolean {
    return this.gamePaused;
  }

  public startTutorial(options: StartTutorialOptions): void {
    const targetsRequired = Math.max(1, Math.floor(options.targetsRequired ?? 1));
    const completed = options.completed === true;

    this.tutorialGameStartDelayTicks = Math.max(0, Math.ceil(options.gameStartDelaySeconds * TICK_RATE));
    this.tutorialFinishTick = undefined;
    this.runStartTick = this.tick + Math.max(0, Math.ceil(options.runStartDelaySeconds * TICK_RATE));

    this.tutorial = {
      active: !completed,
      completed,
      targetsDestroyed: completed ? targetsRequired : 0,
      targetsRequired,
    };

    this.entities = this.entities.filter((entity) => entity.dummy !== true);

    if (this.tutorial.completed || !this.tutorial.active) {
      return;
    }

    for (let index = 0; index < targetsRequired; index += 1) {
      this.entities.push(this.createTutorialDummy(index, options.dummyStartX, options.dummySpacingX));
    }
  }

  public update(dt: number): void {
    if (this.gamePaused) {
      return;
    }

    this.tick += 1;

    this.events = [];

    const hasAlivePlayers = this.hasAlivePlayers();
    const tutorialActive = this.tutorial.active;
    const worldLocked = this.isWorldLocked();

    if (hasAlivePlayers && !worldLocked) {
      this.scrollX += GAME_CONFIG.scrollSpeed * dt;
      this.spawnAhead();
    }

    updatePlayers({
      players: this.players.values(),
      dt,
    });

    if (hasAlivePlayers) {
      const dummiesAliveBeforeCollisions = getAliveDummyIds(this.entities);

      updateEntities({
        entities: this.entities,
        dt,
      });

      resolvePlayerEntityCollisions({
        tick: this.tick,
        scrollX: this.scrollX,
        players: this.players.values(),
        entities: this.entities,
        playerDamageDisabled: tutorialActive,
        addEvent: this.addEvent.bind(this),

        intersectsCompensatedEntity: (player, entity): boolean =>
          intersectsCompensatedEntity({
            player,
            entity,
            history: this.entityHistory,
            currentTick: this.tick,
            maxHistoryTicks: MAX_ENTITY_HISTORY_TICKS,
          }),
      });

      resolveEnemyCivilianCollisions({
        players: this.players.values(),
        entities: this.entities,
        addEvent: this.addEvent.bind(this),
      });

      this.updateTutorialTargets(dummiesAliveBeforeCollisions);
      this.updateTutorialFinishDelay();
    }

    this.entities = cleanupEntities({
      entities: this.entities,
      scrollX: this.scrollX,
    });

    recordEntityHistory({
      history: this.entityHistory,
      tick: this.tick,
      scrollX: this.scrollX,
      entities: this.entities,
      maxHistoryTicks: MAX_ENTITY_HISTORY_TICKS,
    });
  }

  public createSnapshot(): GameSnapshot {
    return createGameSnapshot({
      tick: this.tick,
      seed: this.seed,
      gamePaused: this.gamePaused,
      tutorial: this.tutorial,
      worldSpeed: this.isWorldLocked() ? 0 : GAME_CONFIG.scrollSpeed,
      simulation: {
        rngState: this.rng.getState(),
        nextEntityIndex: this.nextEntityIndex,
        nextEventIndex: this.nextEventIndex,
        nextSpawnX: this.nextSpawnX,
      },
      scrollX: this.scrollX,
      players: this.players.values(),
      entities: this.entities,
      events: this.events,
    });
  }

  public loadSnapshot(snapshot: GameSnapshot): void {
    if (snapshot.seed !== this.seed) {
      throw new Error(`Cannot load snapshot with seed ${snapshot.seed} into game with seed ${this.seed}`);
    }

    const previousPlayers = new Map(this.players);

    this.tick = snapshot.tick;
    this.gamePaused = snapshot.gamePaused;
    this.tutorial = { ...createInactiveTutorialState(), ...(snapshot.tutorial ?? {}) };
    this.tutorialFinishTick = undefined;
    this.runStartTick = undefined;
    this.scrollX = snapshot.world.scrollX;
    this.nextEntityIndex = snapshot.simulation.nextEntityIndex;
    this.nextEventIndex = snapshot.simulation.nextEventIndex;
    this.nextSpawnX = snapshot.simulation.nextSpawnX;
    this.rng.setState(snapshot.simulation.rngState);
    this.entityHistory.length = 0;
    this.events = snapshot.events.map((event) => ({ ...event }));
    this.entities = snapshot.entities.map((entity) => ({ ...entity }));
    this.players.clear();

    for (const playerSnapshot of snapshot.players) {
      const previousPlayer = previousPlayers.get(playerSnapshot.playerId);

      this.players.set(playerSnapshot.playerId, {
        ...playerSnapshot,
        previousX: playerSnapshot.x,
        previousY: playerSnapshot.y,
        lockedWorldX: undefined,
        invulnerableUntilTick: playerSnapshot.invulnerable ? this.tick + 1 : 0,
        smashingForCollision: playerSnapshot.smashing,
        canJump: playerSnapshot.grounded,
        lastInputSnapshotTick: undefined,
        lastReceivedInputSeq: playerSnapshot.lastProcessedInputSeq,
        lastProcessedInputSeq: playerSnapshot.lastProcessedInputSeq,
        lastInput: {
          left: playerSnapshot.vx < 0,
          right: playerSnapshot.vx > 0,
          jump: false,
        },
        smashSnapshotTick: playerSnapshot.smashing ? this.tick : undefined,
        damagedByEntityIds: new Set(previousPlayer?.damagedByEntityIds),
      });
    }
  }

  public createDeltaSnapshot(previousSnapshot: GameSnapshot): DeltaSnapshot {
    return createDeltaSnapshot(previousSnapshot, this.createSnapshot());
  }

  private spawnAhead(): void {
    const result = spawnAhead({
      rng: this.rng,

      scrollX: this.scrollX,

      nextSpawnX: this.nextSpawnX,
      nextEntityIndex: this.nextEntityIndex,
    });

    this.entities.push(...result.entities);

    this.nextSpawnX = result.nextSpawnX;
    this.nextEntityIndex = result.nextEntityIndex;
  }

  private hasAlivePlayers(): boolean {
    return [...this.players.values()].some((player) => player.alive);
  }

  private isWorldLocked(): boolean {
    return this.tutorial.active || (this.runStartTick !== undefined && this.tick < this.runStartTick);
  }

  private createTutorialDummy(index: number, dummyStartX: number, dummySpacingX: number): Entity {
    const config = ENEMIES.find((enemy) => enemy.dummy === true) ?? ENEMIES[0];

    return createEntity({
      config,
      id: `tutorial-${config.kind}-${this.nextEntityIndex++}`,
      x: this.scrollX + dummyStartX + index * dummySpacingX,
      moveSpeed: 0,
      laneOffsetY: 0,
      dummy: true,
    });
  }

  private updateTutorialTargets(previouslyAliveDummyIds: Set<string>): void {
    if (!this.tutorial.active || this.tutorial.completed) {
      return;
    }

    let destroyedCount = 0;

    for (const entity of this.entities) {
      if (entity.dummy === true && !entity.alive && previouslyAliveDummyIds.has(entity.id)) {
        destroyedCount += 1;
      }
    }

    if (destroyedCount === 0) {
      return;
    }

    this.tutorial.targetsDestroyed += destroyedCount;

    if (this.tutorial.targetsDestroyed >= this.tutorial.targetsRequired) {
      this.tutorial.completed = true;
      this.startTutorialFinishDelay();
    }
  }

  private startTutorialFinishDelay(): void {
    if (this.tutorialFinishTick !== undefined) {
      return;
    }

    this.entities = this.entities.filter((entity) => entity.dummy !== true);
    this.tutorialFinishTick = this.tick + this.tutorialGameStartDelayTicks;

    if (this.tutorialGameStartDelayTicks === 0) {
      this.finishTutorial();
    }
  }

  private updateTutorialFinishDelay(): void {
    if (this.tutorialFinishTick === undefined || this.tick < this.tutorialFinishTick) {
      return;
    }

    this.finishTutorial();
  }

  private finishTutorial(): void {
    this.tutorial.active = false;
    this.tutorialFinishTick = undefined;
  }

  private addEvent(
    type: GameEvent["type"],
    player: Player | undefined,
    entity: Entity,
    damage: number,
    scoreDelta: number,
  ): void {
    this.events.push(
      createGameEvent({
        id: `event-${this.tick}-${this.nextEventIndex++}`,
        tick: this.tick,
        type,
        player,
        entity,
        damage,
        scoreDelta,
      }),
    );
  }
}

function createInactiveTutorialState(): TutorialState {
  return {
    active: false,
    completed: false,
    targetsDestroyed: 0,
    targetsRequired: 0,
  };
}

function getAliveDummyIds(entities: Entity[]): Set<string> {
  return new Set(entities.filter((entity) => entity.dummy === true && entity.alive).map((entity) => entity.id));
}
