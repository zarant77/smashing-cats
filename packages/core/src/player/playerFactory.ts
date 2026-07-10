import type { PlayerId, PlayerInput } from "@smashing-cats/protocol";

import type { CharacterConfig, GameConfig } from "../config.js";
import type { Player } from "../types.js";

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  jump: false,
};

type CreatePlayerOptions = {
  playerId: PlayerId;
  characterConfig: CharacterConfig;
  gameConfig: GameConfig;
  index: number;
  tick: number;
  groundY: number;
  tickRate: number;
};

type ApplyPlayerDamageOptions = {
  player: Player;
  gameConfig: GameConfig;
  damage: number;
  tick: number;
  tickRate: number;
};

export function createPlayer({
  playerId,
  characterConfig,
  gameConfig,
  index,
  tick,
  groundY,
  tickRate,
}: CreatePlayerOptions): Player {
  const [, height] = characterConfig.size;

  const x = 120 + index * 70;
  const y = groundY - height;

  return {
    id: `${characterConfig.kind}-${playerId}`,
    playerId,
    type: "player",
    kind: characterConfig.kind as string,

    x,
    y,
    previousX: x,
    previousY: y,

    vx: 0,
    vy: 0,

    size: characterConfig.size,
    hurt: characterConfig.hurt,
    smash: characterConfig.smash,

    damage: 0,
    score: 0,
    alive: true,

    hp: characterConfig.hp,
    maxHp: characterConfig.hp,

    animations: characterConfig.animations,

    invulnerableUntilTick: tick + Math.ceil(gameConfig.spawnInvulnerabilitySeconds * tickRate),

    paused: false,
    grounded: true,

    smashing: false,
    smashingForCollision: false,

    lockedWorldX: undefined,

    jumpStartY: y,
    canJump: true,
    wasJumpPressed: false,

    lastInputSnapshotTick: undefined,
    lastReceivedInputSeq: 0,
    lastProcessedInputSeq: 0,
    pendingInputCommands: [],

    smashSnapshotTick: undefined,

    damagedByEntityIds: new Set(),

    lastInput: { ...EMPTY_INPUT },
  };
}

export function applyPlayerDamage({ player, gameConfig, damage, tick, tickRate }: ApplyPlayerDamageOptions): boolean {
  if (damage <= 0 || !player.alive || player.paused || tick < player.invulnerableUntilTick) {
    return false;
  }

  player.hp = Math.max(0, player.hp - damage);
  player.damage += damage;

  player.invulnerableUntilTick = tick + Math.ceil(gameConfig.hurtInvulnerabilitySeconds * tickRate);

  if (player.hp <= 0) {
    player.alive = false;
  }

  return true;
}
