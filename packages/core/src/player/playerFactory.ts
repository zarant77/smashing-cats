import type { EntityKind, PlayerId, PlayerInput } from "@smashing-cats/protocol";

import type { CharacterConfig } from "../config.js";
import type { Player } from "../types.js";

const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  jump: false,
};

type CreatePlayerOptions = {
  playerId: PlayerId;
  characterConfig: CharacterConfig;
  index: number;
  tick: number;
  groundY: number;
  tickRate: number;
};

export function createPlayer({ playerId, characterConfig, index, tick, groundY, tickRate }: CreatePlayerOptions): Player {
  const x = 120 + index * 70;
  const y = groundY - characterConfig.height;

  return {
    id: `${characterConfig.kind}-${playerId}`,
    playerId,
    type: "player",
    kind: characterConfig.kind as EntityKind,

    x,
    y,
    previousX: x,
    previousY: y,
    vx: 0,
    vy: 0,

    width: characterConfig.width,
    height: characterConfig.height,

    damage: 0,
    score: 0,
    alive: true,

    hp: characterConfig.hp,
    maxHp: characterConfig.hp,
    invulnerableUntilTick: tick + Math.ceil(characterConfig.spawnInvulnerabilitySeconds * tickRate),

    paused: false,
    grounded: true,
    smashing: false,
    smashingForCollision: false,
    lockedWorldX: undefined,
    jumpStartY: y,
    wasJumpPressed: false,

    lastInputSnapshotTick: undefined,
    lastReceivedInputSeq: 0,
    lastProcessedInputSeq: 0,
    smashSnapshotTick: undefined,

    damagedByEntityIds: new Set(),
    lastInput: { ...EMPTY_INPUT },
  };
}
