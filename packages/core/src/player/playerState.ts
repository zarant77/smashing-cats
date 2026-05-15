import { GAME_CONFIG } from "../config.js";
import type { Player, Entity } from "../types.js";

export function damagePlayer(player: Player, entity: Entity, scrollX: number, tick: number): number {
  if (isPlayerInvulnerable(player, tick) || player.damagedByEntityIds.has(entity.id)) {
    return 0;
  }

  player.damagedByEntityIds.add(entity.id);

  const damage = entity.damage;

  player.hp = Math.max(0, player.hp - damage);
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

export function updateDeadPlayer(player: Player, dt: number): void {
  const [, height] = player.size;

  if (player.y + height >= GAME_CONFIG.groundY) {
    player.y = GAME_CONFIG.groundY - height;
    player.vy = 0;
    player.grounded = true;
    return;
  }

  player.vy += GAME_CONFIG.gravity * dt;
  player.y += player.vy * dt;

  if (player.y + height >= GAME_CONFIG.groundY) {
    player.y = GAME_CONFIG.groundY - height;
    player.vy = 0;
    player.grounded = true;
  }
}

export function getPlayerSnapshotX(player: Player, scrollX: number): number {
  return player.lockedWorldX === undefined ? player.x : player.lockedWorldX - scrollX;
}

export function isPlayerInvulnerable(player: Player, tick: number): boolean {
  return player.alive && (player.paused || tick < player.invulnerableUntilTick);
}
