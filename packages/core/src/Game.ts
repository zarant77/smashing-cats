import type { DeltaSnapshot, EntityKind, GameEvent, GameSnapshot, PlayerId, PlayerInput } from "@smashing-cats/protocol";
import type { Entity, Player } from "./types.js";
import { type CharacterConfig, GAME_CONFIG, getCharacterConfig } from "./config.js";
import { Random } from "./Random.js";
import { resolveEnemyCivilianCollisions, resolvePlayerEntityCollisions } from "./collision/collisionSystem.js";
import { spawnAhead } from "./entity/entitySpawner.js";
import { cleanupEntities, updateEntities } from "./entity/entitySystem.js";
import { createGameEvent } from "./event/gameEventFactory.js";
import { EntityHistoryFrame, recordEntityHistory } from "./history/entityHistory.js";
import { MAX_ENTITY_HISTORY_TICKS } from "./history/historyConfig.js";
import { intersectsCompensatedEntity } from "./history/lagCompensation.js";
import { applyPlayerInput } from "./input/applyPlayerInput.js";
import { updatePlayers } from "./player/playerSystem.js";
import { createPlayer } from "./player/playerFactory.js";
import { createGameSnapshot } from "./snapshot/snapshotFactory.js";
import { createDeltaSnapshot } from "./snapshot/deltaSnapshotFactory.js";

const UNPAUSE_INVULNERABILITY_SECONDS = 2;

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
      index: this.players.size,
      tick: this.tick,
      groundY: GAME_CONFIG.groundY,
      tickRate: GAME_CONFIG.tickRate,
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

    if (paused) {
      player.invulnerableUntilTick = Number.POSITIVE_INFINITY;
      return;
    }

    player.invulnerableUntilTick = this.tick + Math.ceil(UNPAUSE_INVULNERABILITY_SECONDS * GAME_CONFIG.tickRate);
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
      scrollX: this.scrollX,
      players: this.players.values(),
      entities: this.entities,
      events: this.events,
    });
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
