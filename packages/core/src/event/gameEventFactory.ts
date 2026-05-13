import type { GameEvent } from "@smashing-cats/protocol";

import type { Entity, Player } from "../types.js";

type CreateGameEventOptions = {
  id: string;
  tick: number;
  type: GameEvent["type"];
  player: Player | undefined;
  entity: Entity;
  damage: number;
  scoreDelta: number;
};

export function createGameEvent({ id, tick, type, player, entity, damage, scoreDelta }: CreateGameEventOptions): GameEvent {
  const event: GameEvent = {
    id,
    tick,
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

  return event;
}
