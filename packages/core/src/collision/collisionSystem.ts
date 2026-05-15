import type { GameEvent, HurtCircle } from "@smashing-cats/protocol";
import { type Bounds, circlesIntersect, getSmashBox, intersects } from "./collisions.js";
import { damagePlayer } from "../player/playerState.js";
import type { Entity, Player } from "../types.js";

export type AddGameEvent = (
  type: GameEvent["type"],
  player: Player | undefined,
  entity: Entity,
  damage: number,
  scoreDelta: number,
) => void;

export type CollisionContext = {
  tick: number;
  scrollX: number;
  players: Iterable<Player>;
  entities: Entity[];
  addEvent: AddGameEvent;
  intersectsCompensatedEntity: (player: Player, entity: Entity) => boolean;
};

type Circle = {
  x: number;
  y: number;
  radius: number;
};

export function resolvePlayerEntityCollisions(context: CollisionContext): void {
  for (const player of context.players) {
    if (!player.alive) {
      continue;
    }

    const playerHurtCircle = getPlayerCircle(player, context.scrollX);

    for (const entity of context.entities) {
      if (!entity.alive) {
        continue;
      }

      const entityCircle = getEntityCircle(entity);

      if (player.smashingForCollision && entity.type !== "obstacle") {
        const smashBox = getPlayerSmashBox(player, context.scrollX);

        if (intersects(smashBox, circleToBounds(entityCircle)) || context.intersectsCompensatedEntity(player, entity)) {
          resolvePlayerEntityCollision(context, player, entity);
          continue;
        }
      }

      if (circlesIntersect(playerHurtCircle, entityCircle)) {
        resolveDamagingCollision(context, player, entity);
      }
    }
  }
}

function resolvePlayerEntityCollision(context: CollisionContext, player: Player, entity: Entity): void {
  if (!entity.alive) {
    return;
  }

  if (entity.type === "enemy") {
    resolveEnemyCollision(context, player, entity);
    return;
  }

  if (entity.type === "civilian") {
    resolveCivilianCollision(context, player, entity);
    return;
  }

  if (entity.type === "obstacle") {
    resolveDamagingCollision(context, player, entity);
  }
}

function resolveEnemyCollision(context: CollisionContext, player: Player, entity: Entity): void {
  if (player.smashingForCollision) {
    entity.alive = false;
    player.score += entity.score;

    context.addEvent("enemyKilled", player, entity, 0, entity.score);
    stopSmash(player);
    return;
  }

  resolveDamagingCollision(context, player, entity);
}

function resolveCivilianCollision(context: CollisionContext, player: Player, entity: Entity): void {
  if (!player.smashingForCollision) {
    return;
  }

  entity.alive = false;

  const scoreDelta = -entity.score;
  player.score += scoreDelta;

  context.addEvent("civilianKilled", player, entity, 0, scoreDelta);
  stopSmash(player);
}

function resolveDamagingCollision(context: CollisionContext, player: Player, entity: Entity): void {
  const damage = damagePlayer(player, entity, context.scrollX, context.tick);

  if (damage > 0) {
    context.addEvent("playerHit", player, entity, damage, 0);
  }
}

export function resolveEnemyCivilianCollisions(context: Pick<CollisionContext, "players" | "entities" | "addEvent">): void {
  for (const enemy of context.entities) {
    if (enemy.type !== "enemy" || !enemy.alive) {
      continue;
    }

    const enemyCircle = getEntityCircle(enemy);

    for (const civilian of context.entities) {
      if (civilian.type !== "civilian" || !civilian.alive) {
        continue;
      }

      if (!circlesIntersect(enemyCircle, getEntityCircle(civilian))) {
        continue;
      }

      civilian.alive = false;

      const players = [...context.players];
      const scoreDelta = players.length === 0 ? 0 : -civilian.score / players.length;

      for (const player of players) {
        player.score += scoreDelta;
      }

      context.addEvent("civilianKilledByEnemy", undefined, civilian, 0, scoreDelta);
    }
  }
}

function stopSmash(player: Player): void {
  player.smashing = false;
  player.smashingForCollision = false;
  player.smashSnapshotTick = undefined;
  player.jumpStartY = player.y;
}

function getPlayerCircle(player: Player, scrollX: number): Circle {
  return getCircle(player.x + scrollX, player.y, player.size, player.hurt);
}

function getPreviousPlayerCircle(player: Player, scrollX: number): Circle {
  return getCircle(player.previousX + scrollX, player.previousY, player.size, player.hurt);
}

function getEntityCircle(entity: Entity): Circle {
  return getCircle(entity.x, entity.y, entity.size, entity.hurt);
}

function getCircle(x: number, y: number, size: readonly [width: number, height: number], hurt: HurtCircle): Circle {
  const [width, height] = size;
  const [radius, offsetX, offsetY] = hurt;

  return {
    x: x + width / 2 + offsetX,
    y: y + height / 2 + offsetY,
    radius,
  };
}

function sweptCircleIntersects(from: Circle, to: Circle, target: Circle): boolean {
  const radius = from.radius + target.radius;

  return distancePointToSegmentSquared(target.x, target.y, from.x, from.y, to.x, to.y) <= radius * radius;
}

function distancePointToSegmentSquared(px: number, py: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;

  if (dx === 0 && dy === 0) {
    return distanceSquared(px, py, ax, ay);
  }

  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  const x = ax + dx * t;
  const y = ay + dy * t;

  return distanceSquared(px, py, x, y);
}

function distanceSquared(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;

  return dx * dx + dy * dy;
}

function getPlayerSmashBox(player: Player, scrollX: number): Bounds {
  return getSmashBox(player.x + scrollX, player.y, player.size, player.smash);
}

function circleToBounds(circle: Circle): Bounds {
  return {
    x: circle.x - circle.radius,
    y: circle.y - circle.radius,
    width: circle.radius * 2,
    height: circle.radius * 2,
  };
}
