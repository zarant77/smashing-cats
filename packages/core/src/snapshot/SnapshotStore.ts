import type { DeltaSnapshot, EntitySnapshot, GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";

export class SnapshotStore {
  private fullSnapshot: GameSnapshot | undefined;
  private snapshot: GameSnapshot | undefined;

  public setFullSnapshot(snapshot: GameSnapshot): GameSnapshot {
    this.fullSnapshot = cloneSnapshot(snapshot);
    this.snapshot = cloneSnapshot(snapshot);
    return this.snapshot;
  }

  public applyDelta(delta: DeltaSnapshot): GameSnapshot | undefined {
    if (this.fullSnapshot === undefined) {
      return undefined;
    }

    const snapshot = cloneSnapshot(this.fullSnapshot);

    snapshot.tick = delta.tick;
    snapshot.events = delta.events ?? [];

    if (delta.simulation !== undefined) {
      snapshot.simulation = { ...delta.simulation };
    }

    if (delta.scrollX !== undefined) {
      snapshot.world.scrollX = delta.scrollX;
    }

    if (delta.addedPlayers !== undefined) {
      upsertByKey(snapshot.players, delta.addedPlayers.map(clonePlayerSnapshot), "playerId");
    }

    if (delta.updatedPlayers !== undefined) {
      for (const patch of delta.updatedPlayers) {
        const player = snapshot.players.find((item) => item.playerId === patch.playerId);

        if (player !== undefined) {
          Object.assign(player, patch);
        }
      }
    }

    if (delta.removedPlayerIds !== undefined) {
      const removedPlayerIds = new Set(delta.removedPlayerIds);
      snapshot.players = snapshot.players.filter((player) => !removedPlayerIds.has(player.playerId));
    }

    if (delta.addedEntities !== undefined) {
      upsertByKey(snapshot.entities, delta.addedEntities.map(cloneEntitySnapshot), "id");
    }

    if (delta.updatedEntities !== undefined) {
      for (const patch of delta.updatedEntities) {
        const entity = snapshot.entities.find((item) => item.id === patch.id);

        if (entity !== undefined) {
          Object.assign(entity, patch);
        }
      }
    }

    if (delta.removedEntityIds !== undefined) {
      const removedEntityIds = new Set(delta.removedEntityIds);
      snapshot.entities = snapshot.entities.filter((entity) => !removedEntityIds.has(entity.id));
    }

    this.snapshot = snapshot;
    return snapshot;
  }

  public getLatest(): GameSnapshot | undefined {
    return this.snapshot;
  }
}

function cloneSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    tick: snapshot.tick,
    seed: snapshot.seed,
    simulation: { ...snapshot.simulation },
    world: { ...snapshot.world },
    players: snapshot.players.map(clonePlayerSnapshot),
    entities: snapshot.entities.map(cloneEntitySnapshot),
    events: snapshot.events.map((event) => ({ ...event })),
  };
}

function clonePlayerSnapshot(player: PlayerSnapshot): PlayerSnapshot {
  return {
    ...player,
  };
}

function cloneEntitySnapshot(entity: EntitySnapshot): EntitySnapshot {
  return {
    ...entity,
  };
}

function upsertByKey<TItem extends Record<TKey, string>, TKey extends keyof TItem>(
  target: TItem[],
  items: TItem[],
  key: TKey,
): void {
  for (const item of items) {
    const existingIndex = target.findIndex((candidate) => candidate[key] === item[key]);

    if (existingIndex === -1) {
      target.push(item);
      continue;
    }

    target[existingIndex] = item;
  }
}
