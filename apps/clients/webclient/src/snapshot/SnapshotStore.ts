import type { DeltaSnapshot, EntitySnapshot, GameSnapshot, PlayerSnapshot } from "@smashing-cats/protocol";

export class SnapshotStore {
  private snapshot: GameSnapshot | undefined;

  public setFullSnapshot(snapshot: GameSnapshot): GameSnapshot {
    this.snapshot = cloneSnapshot(snapshot);
    return this.snapshot;
  }

  public applyDelta(delta: DeltaSnapshot): GameSnapshot | undefined {
    if (this.snapshot === undefined) {
      return undefined;
    }

    const snapshot = cloneSnapshot(this.snapshot);

    snapshot.tick = delta.tick;
    snapshot.events = delta.events ?? [];

    if (delta.scrollX !== undefined) {
      snapshot.world.scrollX = delta.scrollX;
    }

    if (delta.addedPlayers !== undefined) {
      snapshot.players.push(...delta.addedPlayers.map(clonePlayerSnapshot));
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
      snapshot.entities.push(...delta.addedEntities.map(cloneEntitySnapshot));
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
