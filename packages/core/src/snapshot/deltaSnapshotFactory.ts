import type {
  DeltaSnapshot,
  EntityId,
  EntityPatch,
  EntitySnapshot,
  GameSnapshot,
  PlayerId,
  PlayerPatch,
  PlayerSnapshot,
} from "@smashing-cats/protocol";

export function createDeltaSnapshot(previous: GameSnapshot, next: GameSnapshot): DeltaSnapshot {
  const delta: DeltaSnapshot = {
    tick: next.tick,
  };

  assignOptional(delta, "scrollX", changed(previous.world.scrollX, next.world.scrollX));
  assignOptional(delta, "addedPlayers", getAddedPlayers(previous.players, next.players));
  assignOptional(delta, "updatedPlayers", getUpdatedPlayers(previous.players, next.players));
  assignOptional(delta, "removedPlayerIds", getRemovedPlayerIds(previous.players, next.players));
  assignOptional(delta, "addedEntities", getAddedEntities(previous.entities, next.entities));
  assignOptional(delta, "updatedEntities", getUpdatedEntities(previous.entities, next.entities));
  assignOptional(delta, "removedEntityIds", getRemovedEntityIds(previous.entities, next.entities));

  if (next.events.length > 0) {
    delta.events = [...next.events];
  }

  return delta;
}

function assignOptional<TObject extends object, TKey extends keyof TObject>(
  target: TObject,
  key: TKey,
  value: TObject[TKey] | undefined,
): void {
  if (value !== undefined) {
    target[key] = value;
  }
}

function getAddedPlayers(previous: PlayerSnapshot[], next: PlayerSnapshot[]): PlayerSnapshot[] | undefined {
  const previousIds = new Set(previous.map((player) => player.playerId));
  const added = next.filter((player) => !previousIds.has(player.playerId));

  return added.length > 0 ? added : undefined;
}

function getUpdatedPlayers(previous: PlayerSnapshot[], next: PlayerSnapshot[]): PlayerPatch[] | undefined {
  const previousById = new Map(previous.map((player) => [player.playerId, player]));
  const patches: PlayerPatch[] = [];

  for (const player of next) {
    const oldPlayer = previousById.get(player.playerId);

    if (oldPlayer === undefined) {
      continue;
    }

    const patch: PlayerPatch = {
      id: player.id,
      playerId: player.playerId,
    };

    assignIfChanged(patch, "x", oldPlayer.x, player.x);
    assignIfChanged(patch, "y", oldPlayer.y, player.y);
    assignIfChanged(patch, "vx", oldPlayer.vx, player.vx);
    assignIfChanged(patch, "vy", oldPlayer.vy, player.vy);
    assignIfChanged(patch, "alive", oldPlayer.alive, player.alive);
    assignIfChanged(patch, "score", oldPlayer.score, player.score);
    assignIfChanged(patch, "hp", oldPlayer.hp, player.hp);
    assignIfChanged(patch, "invulnerable", oldPlayer.invulnerable, player.invulnerable);
    assignIfChanged(patch, "paused", oldPlayer.paused, player.paused);
    assignIfChanged(patch, "grounded", oldPlayer.grounded, player.grounded);
    assignIfChanged(patch, "smashing", oldPlayer.smashing, player.smashing);
    assignIfChanged(patch, "lastProcessedInputSeq", oldPlayer.lastProcessedInputSeq, player.lastProcessedInputSeq);
    assignIfChanged(patch, "jumpStartY", oldPlayer.jumpStartY, player.jumpStartY);
    assignIfChanged(patch, "wasJumpPressed", oldPlayer.wasJumpPressed, player.wasJumpPressed);

    if (hasPlayerPatchChanges(patch)) {
      patches.push(patch);
    }
  }

  return patches.length > 0 ? patches : undefined;
}

function getRemovedPlayerIds(previous: PlayerSnapshot[], next: PlayerSnapshot[]): PlayerId[] | undefined {
  const nextIds = new Set(next.map((player) => player.playerId));
  const removed = previous.filter((player) => !nextIds.has(player.playerId)).map((player) => player.playerId);

  return removed.length > 0 ? removed : undefined;
}

function getAddedEntities(previous: EntitySnapshot[], next: EntitySnapshot[]): EntitySnapshot[] | undefined {
  const previousIds = new Set(previous.map((entity) => entity.id));
  const added = next.filter((entity) => !previousIds.has(entity.id));

  return added.length > 0 ? added : undefined;
}

function getUpdatedEntities(previous: EntitySnapshot[], next: EntitySnapshot[]): EntityPatch[] | undefined {
  const previousById = new Map(previous.map((entity) => [entity.id, entity]));
  const patches: EntityPatch[] = [];

  for (const entity of next) {
    const oldEntity = previousById.get(entity.id);

    if (oldEntity === undefined) {
      continue;
    }

    const patch: EntityPatch = {
      id: entity.id,
    };

    assignIfChanged(patch, "x", oldEntity.x, entity.x);
    assignIfChanged(patch, "y", oldEntity.y, entity.y);
    assignIfChanged(patch, "vx", oldEntity.vx, entity.vx);
    assignIfChanged(patch, "vy", oldEntity.vy, entity.vy);
    assignIfChanged(patch, "alive", oldEntity.alive, entity.alive);

    if (hasEntityPatchChanges(patch)) {
      patches.push(patch);
    }
  }

  return patches.length > 0 ? patches : undefined;
}

function getRemovedEntityIds(previous: EntitySnapshot[], next: EntitySnapshot[]): EntityId[] | undefined {
  const nextIds = new Set(next.map((entity) => entity.id));
  const removed = previous.filter((entity) => !nextIds.has(entity.id)).map((entity) => entity.id);

  return removed.length > 0 ? removed : undefined;
}

function changed<T>(previous: T, next: T): T | undefined {
  return Object.is(previous, next) ? undefined : next;
}

function assignIfChanged<TObject extends object, TKey extends keyof TObject>(
  target: TObject,
  key: TKey,
  previous: TObject[TKey],
  next: TObject[TKey],
): void {
  if (!Object.is(previous, next)) {
    target[key] = next;
  }
}

function hasEntityPatchChanges(patch: EntityPatch): boolean {
  return patch.x !== undefined || patch.y !== undefined || patch.vx !== undefined || patch.vy !== undefined || patch.alive !== undefined;
}

function hasPlayerPatchChanges(patch: PlayerPatch): boolean {
  return (
    hasEntityPatchChanges(patch) ||
    patch.score !== undefined ||
    patch.hp !== undefined ||
    patch.invulnerable !== undefined ||
    patch.grounded !== undefined ||
    patch.smashing !== undefined ||
    patch.jumpStartY !== undefined ||
    patch.wasJumpPressed !== undefined ||
    patch.lastProcessedInputSeq !== undefined
  );
}

function compactDelta(delta: DeltaSnapshot): DeltaSnapshot {
  return {
    tick: delta.tick,
    ...(delta.scrollX !== undefined ? { scrollX: delta.scrollX } : {}),

    ...(delta.addedPlayers !== undefined ? { addedPlayers: delta.addedPlayers } : {}),
    ...(delta.updatedPlayers !== undefined ? { updatedPlayers: delta.updatedPlayers } : {}),
    ...(delta.removedPlayerIds !== undefined ? { removedPlayerIds: delta.removedPlayerIds } : {}),

    ...(delta.addedEntities !== undefined ? { addedEntities: delta.addedEntities } : {}),
    ...(delta.updatedEntities !== undefined ? { updatedEntities: delta.updatedEntities } : {}),
    ...(delta.removedEntityIds !== undefined ? { removedEntityIds: delta.removedEntityIds } : {}),

    ...(delta.events !== undefined ? { events: delta.events } : {}),
  };
}
