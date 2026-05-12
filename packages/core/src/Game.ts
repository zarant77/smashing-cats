import type {
  EntitySnapshot,
  EntityKind,
  GameEvent,
  GameSnapshot,
  PlayerId,
  PlayerInput,
  PlayerSnapshot,
} from "@smashing-cats/protocol";
import { GAME_CONFIG, getCharacterConfig, SPAWNABLES } from "./config.js";
import { intersects } from "./collisions.js";
import { Random } from "./Random.js";
import type { CharacterConfig } from "./config.js";
import type { Entity, Player } from "./types.js";

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  jump: false,
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
      damagedByEntityIds: new Set(),
      lastInput: { ...EMPTY_INPUT },
    });
  }

  public removePlayer(playerId: PlayerId): void {
    this.players.delete(playerId);
  }

  public setInput(playerId: PlayerId, input: PlayerInput): void {
    const player = this.players.get(playerId);
    if (player === undefined) {
      return;
    }

    player.lastInput = input;
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
    }
    this.cleanupEntities();
  }

  public createSnapshot(): GameSnapshot {
    const players: PlayerSnapshot[] = [...this.players.values()].map((player) => ({
      id: player.id,
      playerId: player.playerId,
      type: "player",
      kind: player.kind,
      x: getPlayerSnapshotX(player, this.scrollX),
      y: player.y,
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
    }));

    const entities: EntitySnapshot[] = this.entities.map((entity) => ({
      id: entity.id,
      type: entity.type,
      kind: entity.kind,
      x: entity.x,
      y: entity.y,
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

      const input = player.lastInput;
      const characterConfig = getCharacterConfig(player.kind);
      const moveDirection = Number(input.right) - Number(input.left);
      const jumpPressed = input.jump && !player.wasJumpPressed;
      player.smashingForCollision = player.smashing;
      player.vx = player.smashing ? 0 : moveDirection * characterConfig.moveSpeed;

      if (jumpPressed && player.grounded) {
        player.vy = -characterConfig.jumpForce;
        player.grounded = false;
        player.jumpStartY = player.y;
      } else if (jumpPressed && !player.grounded && !player.smashing && canSmash(player, characterConfig)) {
        player.vy = characterConfig.smashSpeed;
        player.smashing = true;
        player.smashingForCollision = true;
      }

      player.x += player.vx * dt;
      updatePlayerVertical(player, characterConfig, dt);

      player.x = clamp(player.x, 20, GAME_CONFIG.worldWidth - player.width - 20);

      if (player.y + player.height >= GAME_CONFIG.groundY) {
        player.y = GAME_CONFIG.groundY - player.height;
        player.vy = 0;
        player.grounded = true;
        player.smashing = false;
        player.jumpStartY = player.y;
      }

      player.wasJumpPressed = input.jump;
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
        if (!entity.alive || !intersects(collisionPlayer, entity)) {
          continue;
        }

        if (entity.type === "enemy") {
          if (player.smashingForCollision) {
            entity.alive = false;
            player.score += entity.score;
            this.addEvent("enemyKilled", player, entity, 0, entity.score);
            player.smashing = false;
            player.jumpStartY = player.y;
          } else {
            const damage = damagePlayer(player, entity, this.scrollX, this.tick);
            if (damage > 0) {
              this.addEvent("playerHit", player, entity, damage, 0);
            }
          }
        }

        if (entity.type === "civilian" && player.smashingForCollision) {
          entity.alive = false;
          player.score += entity.score;
          this.addEvent("civilianKilled", player, entity, 0, entity.score);
          player.smashing = false;
          player.jumpStartY = player.y;
        }

        if (entity.type === "obstacle") {
          const damage = damagePlayer(player, entity, this.scrollX, this.tick);
          if (damage > 0) {
            this.addEvent("playerHit", player, entity, damage, 0);
          }
        }
      }
    }
  }

  private spawnAhead(): void {
    while (this.nextSpawnX < this.scrollX + GAME_CONFIG.worldWidth * 1.8) {
      const config = this.rng.pick(SPAWNABLES);
      const isMovingEntity = "minSpeedBonus" in config;
      const speedBonus = isMovingEntity ? this.rng.nextInt(config.minSpeedBonus, config.maxSpeedBonus) : 0;

      this.entities.push({
        id: `${config.kind}-${this.nextEntityIndex++}`,
        type: getEntityType(config),
        kind: config.kind,
        x: this.nextSpawnX,
        y: GAME_CONFIG.groundY - config.height,
        vx: -speedBonus,
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

  private hasAlivePlayers(): boolean {
    return [...this.players.values()].some((player) => player.alive);
  }

  private addEvent(
    type: GameEvent["type"],
    player: Player,
    entity: Entity,
    damage: number,
    scoreDelta: number,
  ): void {
    this.events.push({
      id: `event-${this.tick}-${this.nextEventIndex++}`,
      tick: this.tick,
      type,
      playerId: player.playerId,
      entityId: entity.id,
      entityType: entity.type,
      entityKind: entity.kind,
      x: entity.x,
      y: entity.y,
      damage,
      scoreDelta,
    });
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function canSmash(player: Player, characterConfig: CharacterConfig): boolean {
  const maxJumpHeight = (characterConfig.jumpForce * characterConfig.jumpForce) / (2 * GAME_CONFIG.gravity);
  return player.jumpStartY - player.y >= maxJumpHeight * characterConfig.smashMinJumpProgress;
}

function updatePlayerVertical(player: Player, characterConfig: CharacterConfig, dt: number): void {
  player.y += player.vy * dt;
  player.vy += GAME_CONFIG.gravity * dt;
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
  }

  return damage;
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
  if (!("score" in config)) {
    return "obstacle";
  }

  return config.score < 0 ? "civilian" : "enemy";
}

function isPlayerInvulnerable(player: Player, tick: number): boolean {
  return player.alive && tick < player.invulnerableUntilTick;
}
