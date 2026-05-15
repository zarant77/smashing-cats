import type { EntitySnapshot, GameEvent, GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";

import { GAME_CONFIG } from "../config.js";
import { getPlayerSnapshotX, isPlayerInvulnerable } from "../player/playerState.js";

import type { Entity, Player } from "../types.js";

type CreateGameSnapshotOptions = {
  tick: number;
  seed: number;
  scrollX: number;
  players: Iterable<Player>;
  entities: Entity[];
  events: GameEvent[];
};

export function createGameSnapshot({ tick, seed, scrollX, players, entities, events }: CreateGameSnapshotOptions): GameSnapshot {
  return {
    tick,
    seed,
    world: {
      scrollX,
      speed: GAME_CONFIG.scrollSpeed,
      width: GAME_CONFIG.worldWidth,
      height: GAME_CONFIG.worldHeight,
      groundY: GAME_CONFIG.groundY,
      gravity: GAME_CONFIG.gravity,
    },
    players: createPlayerSnapshots({
      players,
      scrollX,
      tick,
    }),
    entities: createEntitySnapshots(entities),
    events: [...events],
  };
}

function createPlayerSnapshots({ players, scrollX, tick }: { players: Iterable<Player>; scrollX: number; tick: number }): PlayerSnapshot[] {
  return [...players].map((player) => ({
    id: player.id,
    playerId: player.playerId,
    type: "player",
    kind: player.kind,

    x: getPlayerSnapshotX(player, scrollX),
    y: player.y,
    vx: player.vx,
    vy: player.vy,

    size: player.size,
    hurt: player.hurt,
    smash: player.smash,

    damage: player.damage,
    score: player.score,
    alive: player.alive,
    animations: player.animations,

    hp: player.hp,
    maxHp: player.maxHp,
    invulnerable: isPlayerInvulnerable(player, tick),

    paused: player.paused,
    grounded: player.grounded,
    smashing: player.smashing,
    jumpStartY: player.jumpStartY,
    wasJumpPressed: player.wasJumpPressed,

    lastProcessedInputSeq: player.lastProcessedInputSeq,
  }));
}

function createEntitySnapshots(entities: Entity[]): EntitySnapshot[] {
  return entities.map((entity) => ({
    id: entity.id,
    type: entity.type,
    kind: entity.kind,

    x: entity.x,
    y: entity.y,
    vx: entity.vx,
    vy: entity.vy,

    size: entity.size,
    hurt: entity.hurt,

    damage: entity.damage,
    score: entity.score,
    alive: entity.alive,
    animations: entity.animations,
  }));
}
