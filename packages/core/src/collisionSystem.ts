import type { GameEvent } from "@smashing-cats/protocol";
import { intersects } from "./collisions.js";
import { damagePlayer } from "./playerState.js";
import type { Bounds } from "./collisions.js";
import type { Entity, Player } from "./types.js";

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

export function resolvePlayerEntityCollisions(context: CollisionContext): void {
  for (const player of context.players) {
    if (!player.alive) {
      continue;
    }

    const currentPlayerBounds: Bounds = {
      x: player.x + context.scrollX,
      y: player.y,
      width: player.width,
      height: player.height,
    };

    const previousPlayerBounds: Bounds = {
      x: player.previousX + context.scrollX,
      y: player.previousY,
      width: player.width,
      height: player.height,
    };

    const sweptPlayerBounds = getSweptBounds(previousPlayerBounds, currentPlayerBounds);
    const collisionBounds = player.smashingForCollision ? sweptPlayerBounds : currentPlayerBounds;

    for (const entity of context.entities) {
      if (!entity.alive) {
        continue;
      }

      if (intersects(collisionBounds, entity) || context.intersectsCompensatedEntity(player, entity)) {
        resolvePlayerEntityCollision(context, player, entity);
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

    for (const civilian of context.entities) {
      if (civilian.type !== "civilian" || !civilian.alive || !intersects(enemy, civilian)) {
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

function getSweptBounds(from: Bounds, to: Bounds): Bounds {
  const left = Math.min(from.x, to.x);
  const top = Math.min(from.y, to.y);
  const right = Math.max(from.x + from.width, to.x + to.width);
  const bottom = Math.max(from.y + from.height, to.y + to.height);

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}
