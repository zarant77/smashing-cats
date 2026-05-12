import type {
  EntitySnapshot,
  EntityCollisionMessage,
  EntityKind,
  GameEvent,
  GameSnapshot,
  PlayerId,
  PlayerInput,
  PlayerStateMessage,
  PlayerSnapshot,
} from "@smashing-cats/protocol";
import { CIVILIANS, ENEMIES, GAME_CONFIG, getCharacterConfig, SPAWNABLES } from "./config.js";
import { intersects } from "./collisions.js";
import { Random } from "./Random.js";
import type { CharacterConfig } from "./config.js";
import type { Entity, Player } from "./types.js";
import type { Bounds } from "./collisions.js";

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  jump: false,
};
const CIVILIAN_KINDS = new Set<EntityKind>(CIVILIANS.map((config) => config.kind));
const ENEMY_KINDS = new Set<EntityKind>(ENEMIES.map((config) => config.kind));
const LAG_COMPENSATION_SECONDS = 0.5;
const MAX_ENTITY_HISTORY_TICKS = Math.ceil(GAME_CONFIG.tickRate * LAG_COMPENSATION_SECONDS);

type EntityHistoryFrame = {
  tick: number;
  scrollX: number;
  entities: Map<string, Bounds>;
};

export class Game {
  private readonly seed: number;
  private readonly rng: Random;
  private tick = 0;
  private scrollX = 0;
  private nextEntityIndex = 1;
  private nextEventIndex = 1;
  private nextSpawnX = GAME_CONFIG.worldWidth + 240;
  private players = new Map<PlayerId, Player>();
  private entities: Entity[] = [];
  private entityHistory: EntityHistoryFrame[] = [];
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
    const index = this.players.size;
    this.players.set(playerId, {
      id: `${characterConfig.kind}-${playerId}`,
      playerId,
      type: "player",
      kind: characterConfig.kind,
      x: 120 + index * 70,
      y: GAME_CONFIG.groundY - characterConfig.height,
      vx: 0,
      vy: 0,
      width: characterConfig.width,
      height: characterConfig.height,
      damage: 0,
      score: 0,
      alive: true,
      hp: characterConfig.hp,
      maxHp: characterConfig.hp,
      invulnerableUntilTick: this.tick + Math.ceil(characterConfig.spawnInvulnerabilitySeconds * GAME_CONFIG.tickRate),
      grounded: true,
      smashing: false,
      smashingForCollision: false,
      lockedWorldX: undefined,
      jumpStartY: GAME_CONFIG.groundY - characterConfig.height,
      wasJumpPressed: false,
      lastInputSnapshotTick: undefined,
      lastReceivedInputSeq: 0,
      lastProcessedInputSeq: 0,
      smashSnapshotTick: undefined,
      damagedByEntityIds: new Set(),
      lastInput: { ...EMPTY_INPUT },
    });
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
    if (player === undefined) {
      return;
    }

    player.lastInput = input;
    player.lastInputSnapshotTick = normalizeSnapshotTick(snapshotTick);
    player.lastReceivedInputSeq = normalizeInputSeq(inputSeq, player.lastReceivedInputSeq);
  }

  public setPlayerState(playerId: PlayerId, state: PlayerStateMessage): void {
    const player = this.players.get(playerId);
    if (player === undefined || !player.alive) {
      return;
    }

    const startedSmash = !player.smashing && state.smashing;
    player.x = clampFinite(state.x, 20, GAME_CONFIG.worldWidth - player.width - 20, player.x);
    player.y = clampFinite(state.y, -GAME_CONFIG.worldHeight * 2, GAME_CONFIG.groundY - player.height, player.y);
    player.vx = finiteOr(state.vx, player.vx);
    player.vy = finiteOr(state.vy, player.vy);
    player.grounded = state.grounded;
    player.smashing = state.smashing;
    player.smashingForCollision = state.smashing;
    player.jumpStartY = finiteOr(state.jumpStartY, player.jumpStartY);
    player.wasJumpPressed = state.wasJumpPressed;
    player.lastInputSnapshotTick = normalizeSnapshotTick(state.snapshotTick);
    player.lastReceivedInputSeq = normalizeInputSeq(state.inputSeq, player.lastReceivedInputSeq);
    player.lastProcessedInputSeq = player.lastReceivedInputSeq;

    if (startedSmash) {
      player.smashSnapshotTick = player.lastInputSnapshotTick;
    }

    if (player.grounded && !player.smashing) {
      player.smashSnapshotTick = undefined;
    }
  }

  public handleEntityCollision(playerId: PlayerId, collision: EntityCollisionMessage): void {
    const player = this.players.get(playerId);
    const entity = this.entities.find((candidate) => candidate.id === collision.entityId);
    if (player === undefined || entity === undefined || !player.alive || !entity.alive) {
      return;
    }

    if (collision.snapshotTick !== undefined) {
      player.lastInputSnapshotTick = normalizeSnapshotTick(collision.snapshotTick);
      player.smashSnapshotTick = player.lastInputSnapshotTick;
    }

    this.resolvePlayerEntityCollision(player, entity, collision.collisionKind);
  }

  public update(dt: number): void {
    this.tick += 1;
    this.events = [];
    const hasAlivePlayers = this.hasAlivePlayers();
    if (hasAlivePlayers) {
      this.scrollX += GAME_CONFIG.scrollSpeed * dt;
      this.spawnAhead();
    }

    this.updatePlayers(dt);
    if (hasAlivePlayers) {
      this.updateEnemies(dt);
      this.resolveCollisions();
      this.resolveEnemyCivilianCollisions();
    }
    this.cleanupEntities();
    this.recordEntityHistory();
  }

  public createSnapshot(): GameSnapshot {
    const players: PlayerSnapshot[] = [...this.players.values()].map((player) => ({
      id: player.id,
      playerId: player.playerId,
      type: "player",
      kind: player.kind,
      x: getPlayerSnapshotX(player, this.scrollX),
      y: player.y,
      vx: player.vx,
      vy: player.vy,
      width: player.width,
      height: player.height,
      damage: player.damage,
      score: player.score,
      alive: player.alive,
      hp: player.hp,
      maxHp: player.maxHp,
      invulnerable: isPlayerInvulnerable(player, this.tick),
      grounded: player.grounded,
      smashing: player.smashing,
      jumpStartY: player.jumpStartY,
      wasJumpPressed: player.wasJumpPressed,
      lastProcessedInputSeq: player.lastProcessedInputSeq,
    }));

    const entities: EntitySnapshot[] = this.entities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      kind: entity.kind,
      x: entity.x,
      y: entity.y,
      vx: entity.vx,
      vy: entity.vy,
      width: entity.width,
      height: entity.height,
      damage: entity.damage,
      score: entity.score,
      alive: entity.alive,
    }));

    return {
      tick: this.tick,
      seed: this.seed,
      world: {
        scrollX: this.scrollX,
        speed: GAME_CONFIG.scrollSpeed,
        width: GAME_CONFIG.worldWidth,
        height: GAME_CONFIG.worldHeight,
        groundY: GAME_CONFIG.groundY,
        gravity: GAME_CONFIG.gravity,
      },
      players,
      entities,
      events: [...this.events],
    };
  }

  private updatePlayers(dt: number): void {
    for (const player of this.players.values()) {
      if (!player.alive) {
        player.smashingForCollision = false;
        updateDeadPlayer(player, dt);
        continue;
      }
    }
  }

  private updateEnemies(dt: number): void {
    for (const entity of this.entities) {
      if (entity.type !== "enemy" || !entity.alive) {
        continue;
      }

      entity.x += entity.vx * dt;
      entity.y += entity.vy * dt;
    }
  }

  private resolveCollisions(): void {
    for (const player of this.players.values()) {
      if (!player.alive) {
        continue;
      }

      const collisionPlayer = {
        ...player,
        x: player.x + this.scrollX,
      };

      for (const entity of this.entities) {
        if (!entity.alive) {
          continue;
        }

        const currentIntersects = intersects(collisionPlayer, entity);

        if (currentIntersects || this.intersectsCompensatedEntity(player, entity)) {
          this.resolvePlayerEntityCollision(player, entity, player.smashingForCollision ? "smash" : "touch");
        }
      }
    }
  }

  private resolvePlayerEntityCollision(
    player: Player,
    entity: Entity,
    collisionKind: EntityCollisionMessage["collisionKind"],
  ): void {
    if (!entity.alive) {
      return;
    }

    if (entity.type === "enemy") {
      if (collisionKind === "smash" || player.smashingForCollision) {
        entity.alive = false;
        player.score += entity.score;
        this.addEvent("enemyKilled", player, entity, 0, entity.score);
        player.smashing = false;
        player.smashSnapshotTick = undefined;
        player.jumpStartY = player.y;
      } else {
        const damage = damagePlayer(player, entity, this.scrollX, this.tick);
        if (damage > 0) {
          this.addEvent("playerHit", player, entity, damage, 0);
        }
      }
    }

    if (entity.type === "civilian") {
      entity.alive = false;
      const scoreDelta = -entity.score;
      player.score += scoreDelta;
      this.addEvent("civilianKilled", player, entity, 0, scoreDelta);
      player.smashing = false;
      player.smashSnapshotTick = undefined;
      player.jumpStartY = player.y;
    }

    if (entity.type === "obstacle") {
      const damage = damagePlayer(player, entity, this.scrollX, this.tick);
      if (damage > 0) {
        this.addEvent("playerHit", player, entity, damage, 0);
      }
    }
  }

  private spawnAhead(): void {
    while (this.nextSpawnX < this.scrollX + GAME_CONFIG.worldWidth * 1.8) {
      const config = this.rng.pick(SPAWNABLES);
      const isMovingEntity = "minMoveSpeed" in config;
      const moveSpeed = isMovingEntity ? this.rng.nextInt(config.minMoveSpeed, config.maxMoveSpeed) : 0;

      this.entities.push({
        id: `${config.kind}-${this.nextEntityIndex++}`,
        type: getEntityType(config),
        kind: config.kind,
        x: this.nextSpawnX,
        y: GAME_CONFIG.groundY - config.height,
        vx: -moveSpeed,
        vy: 0,
        width: config.width,
        height: config.height,
        damage: config.damage,
        score: "score" in config ? config.score : 0,
        alive: true,
      });

      this.nextSpawnX += this.rng.nextInt(GAME_CONFIG.spawnDistanceMin, GAME_CONFIG.spawnDistanceMax);
    }
  }

  private cleanupEntities(): void {
    const minX = this.scrollX - 300;
    this.entities = this.entities.filter((entity) => entity.x > minX);
  }

  private resolveEnemyCivilianCollisions(): void {
    for (const enemy of this.entities) {
      if (enemy.type !== "enemy" || !enemy.alive) {
        continue;
      }

      for (const civilian of this.entities) {
        if (civilian.type !== "civilian" || !civilian.alive || !intersects(enemy, civilian)) {
          continue;
        }

        civilian.alive = false;
        const players = [...this.players.values()];
        const scoreDelta = players.length === 0 ? 0 : -civilian.score / players.length;
        for (const player of players) {
          player.score += scoreDelta;
        }

        this.addEvent("civilianKilledByEnemy", undefined, civilian, 0, scoreDelta);
      }
    }
  }

  private hasAlivePlayers(): boolean {
    return [...this.players.values()].some((player) => player.alive);
  }

  private recordEntityHistory(): void {
    this.entityHistory.push({
      tick: this.tick,
      scrollX: this.scrollX,
      entities: new Map(
        this.entities.map((entity) => [
          entity.id,
          {
            x: entity.x,
            y: entity.y,
            width: entity.width,
            height: entity.height,
          },
        ]),
      ),
    });

    const minTick = this.tick - MAX_ENTITY_HISTORY_TICKS;
    while (this.entityHistory[0] !== undefined && this.entityHistory[0].tick < minTick) {
      this.entityHistory.shift();
    }
  }

  private intersectsCompensatedEntity(player: Player, entity: Entity): boolean {
    if (!player.smashingForCollision || player.smashSnapshotTick === undefined) {
      return false;
    }

    const frame = this.getEntityHistoryFrame(player.smashSnapshotTick);
    const entityBounds = frame?.entities.get(entity.id);
    if (frame === undefined || entityBounds === undefined) {
      return false;
    }

    return intersects(
      {
        x: player.x + frame.scrollX,
        y: player.y,
        width: player.width,
        height: player.height,
      },
      entityBounds,
    );
  }

  private getEntityHistoryFrame(snapshotTick: number): EntityHistoryFrame | undefined {
    const targetTick = clamp(Math.floor(snapshotTick), this.tick - MAX_ENTITY_HISTORY_TICKS, this.tick);
    let closestFrame: EntityHistoryFrame | undefined;

    for (const frame of this.entityHistory) {
      if (frame.tick > targetTick) {
        break;
      }

      closestFrame = frame;
    }

    return closestFrame;
  }

  private addEvent(
    type: GameEvent["type"],
    player: Player | undefined,
    entity: Entity,
    damage: number,
    scoreDelta: number,
  ): void {
    const event: GameEvent = {
      id: `event-${this.tick}-${this.nextEventIndex++}`,
      tick: this.tick,
      type,
      entityId: entity.id,
      entityType: entity.type,
      entityKind: entity.kind,
      x: entity.x,
      y: entity.y,
      damage,
      scoreDelta,
    };

    if (player !== undefined) {
      event.playerId = player.playerId;
    }

    this.events.push(event);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function damagePlayer(player: Player, entity: Entity, scrollX: number, tick: number): number {
  if (isPlayerInvulnerable(player, tick) || player.damagedByEntityIds.has(entity.id)) {
    return 0;
  }

  player.damagedByEntityIds.add(entity.id);
  const damage = entity.damage;
  player.hp = Math.max(0, player.hp - entity.damage);
  player.alive = player.hp > 0;

  if (!player.alive) {
    player.lockedWorldX = player.x + scrollX;
    player.vx = 0;
    player.smashing = false;
    player.smashingForCollision = false;
    player.smashSnapshotTick = undefined;
  }

  return damage;
}

function normalizeSnapshotTick(snapshotTick: number | undefined): number | undefined {
  if (snapshotTick === undefined || !Number.isFinite(snapshotTick)) {
    return undefined;
  }

  return Math.max(0, Math.floor(snapshotTick));
}

function normalizeInputSeq(inputSeq: number | undefined, fallback: number): number {
  if (inputSeq === undefined || !Number.isFinite(inputSeq)) {
    return fallback;
  }

  return Math.max(fallback, Math.floor(inputSeq));
}

function finiteOr(value: number, fallback: number): number {
  return Number.isFinite(value) ? value : fallback;
}

function clampFinite(value: number, min: number, max: number, fallback: number): number {
  return clamp(finiteOr(value, fallback), min, max);
}

function updateDeadPlayer(player: Player, dt: number): void {
  if (player.y + player.height >= GAME_CONFIG.groundY) {
    player.y = GAME_CONFIG.groundY - player.height;
    player.vy = 0;
    player.grounded = true;
    return;
  }

  player.vy += GAME_CONFIG.gravity * dt;
  player.y += player.vy * dt;

  if (player.y + player.height >= GAME_CONFIG.groundY) {
    player.y = GAME_CONFIG.groundY - player.height;
    player.vy = 0;
    player.grounded = true;
  }
}

function getPlayerSnapshotX(player: Player, scrollX: number): number {
  return player.lockedWorldX === undefined ? player.x : player.lockedWorldX - scrollX;
}

function getEntityType(config: (typeof SPAWNABLES)[number]): Entity["type"] {
  if (CIVILIAN_KINDS.has(config.kind)) {
    return "civilian";
  }

  if (ENEMY_KINDS.has(config.kind)) {
    return "enemy";
  }

  return "obstacle";
}

function isPlayerInvulnerable(player: Player, tick: number): boolean {
  return player.alive && tick < player.invulnerableUntilTick;
}
