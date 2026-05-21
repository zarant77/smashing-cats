import type { DeltaSnapshot, EntityKind, GameEvent, GameSnapshot, PlayerId, PlayerInput } from "@smashing-cats/protocol";
import type { Entity, Player } from "./types.js";
import { type CharacterConfig, GAME_CONFIG, TICK_RATE, getCharacterConfig } from "./config.js";
import { Random } from "./Random.js";
import { resolveEnemyCivilianCollisions, resolvePlayerEntityCollisions } from "./collision/collisionSystem.js";
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

export class Game {
  private readonly seed: number;
  private readonly rng: Random;

  private tick = 0;
  private scrollX = 0;
  private nextEntityIndex = 1;
  private nextEventIndex = 1;
  private nextSpawnX = GAME_CONFIG.worldWidth + 240;

  private readonly players = new Map<PlayerId, Player>();
  private readonly entityHistory: EntityHistoryFrame[] = [];
  private entities: Entity[] = [];
  private events: GameEvent[] = [];

  public constructor(seed: number) {
    this.seed = seed;
    this.rng = new Random(seed);
  }

  public addPlayer(playerId: PlayerId, characterKind: EntityKind = "batcat"): void {
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

  public setInput(playerId: PlayerId, input: PlayerInput, snapshotTick: number | undefined, inputSeq: number | undefined): void {
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

  public update(dt: number): void {
    this.tick += 1;

    this.events = [];

    const hasAlivePlayers = this.hasAlivePlayers();

    if (hasAlivePlayers) {
      this.scrollX += GAME_CONFIG.scrollSpeed * dt;
      this.spawnAhead();
    }

    updatePlayers({
      players: this.players.values(),
      dt,
    });

    if (hasAlivePlayers) {
      updateEntities({
        entities: this.entities,
        dt,
      });

      resolvePlayerEntityCollisions({
        tick: this.tick,
        scrollX: this.scrollX,
        players: this.players.values(),
        entities: this.entities,
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

  private addEvent(type: GameEvent["type"], player: Player | undefined, entity: Entity, damage: number, scoreDelta: number): void {
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
