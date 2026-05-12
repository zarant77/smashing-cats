import type { EntitySnapshot, GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";

const INTERPOLATION_DELAY_MS = 75;
const MAX_BUFFERED_SNAPSHOTS = 12;
const LOCAL_PLAYER_SMOOTHING_MS = 55;

type BufferedSnapshot = {
  snapshot: GameSnapshot;
  receivedAt: number;
};

export class SnapshotInterpolator {
  private readonly snapshots: BufferedSnapshot[] = [];
  private readonly localPlayers = new Map<PlayerId, { player: PlayerSnapshot; updatedAt: number }>();

  public add(snapshot: GameSnapshot, receivedAt = performance.now()): void {
    const last = this.snapshots.at(-1);
    if (last !== undefined && snapshot.tick <= last.snapshot.tick) {
      return;
    }

    this.snapshots.push({ snapshot, receivedAt });

    if (this.snapshots.length > MAX_BUFFERED_SNAPSHOTS) {
      this.snapshots.splice(0, this.snapshots.length - MAX_BUFFERED_SNAPSHOTS);
    }
  }

  public get(localPlayerId: PlayerId | undefined, now = performance.now()): GameSnapshot | undefined {
    if (this.snapshots.length === 0) {
      return undefined;
    }

    if (this.snapshots.length === 1) {
      return this.snapshots[0]?.snapshot;
    }

    const renderTime = now - INTERPOLATION_DELAY_MS;
    let previous = this.snapshots[0];
    let next = this.snapshots.at(-1);

    for (let index = 1; index < this.snapshots.length; index += 1) {
      const candidate = this.snapshots[index];
      if (candidate === undefined) {
        continue;
      }

      if (candidate.receivedAt >= renderTime) {
        next = candidate;
        break;
      }

      previous = candidate;
    }

    if (previous === undefined || next === undefined) {
      return this.snapshots.at(-1)?.snapshot;
    }

    const latest = this.snapshots.at(-1)?.snapshot;

    if (previous === next || next.receivedAt <= previous.receivedAt) {
      return this.withSmoothedLocalPlayer(next.snapshot, latest, localPlayerId, now);
    }

    const alpha = clamp01((renderTime - previous.receivedAt) / (next.receivedAt - previous.receivedAt));
    return this.withSmoothedLocalPlayer(interpolateSnapshot(previous.snapshot, next.snapshot, alpha), latest, localPlayerId, now);
  }

  private withSmoothedLocalPlayer(
    snapshot: GameSnapshot,
    latest: GameSnapshot | undefined,
    localPlayerId: PlayerId | undefined,
    now: number,
  ): GameSnapshot {
    if (latest === undefined || localPlayerId === undefined) {
      return snapshot;
    }

    const latestPlayer = latest.players.find((player) => player.playerId === localPlayerId);
    if (latestPlayer === undefined) {
      return snapshot;
    }

    const previous = this.localPlayers.get(localPlayerId);
    if (latestPlayer.smashing || previous?.player.smashing) {
      this.localPlayers.set(localPlayerId, { player: latestPlayer, updatedAt: now });
      return {
        ...snapshot,
        players: snapshot.players.map((player) => (player.playerId === localPlayerId ? latestPlayer : player)),
      };
    }

    const alpha = previous === undefined ? 1 : clamp01((now - previous.updatedAt) / LOCAL_PLAYER_SMOOTHING_MS);
    const smoothedPlayer = interpolatePlayer(previous?.player, latestPlayer, alpha);
    this.localPlayers.set(localPlayerId, { player: smoothedPlayer, updatedAt: now });

    return {
      ...snapshot,
      players: snapshot.players.map((player) => (player.playerId === localPlayerId ? smoothedPlayer : player)),
    };
  }
}

function interpolateSnapshot(from: GameSnapshot, to: GameSnapshot, alpha: number): GameSnapshot {
  return {
    ...to,
    world: {
      ...to.world,
      scrollX: lerp(from.world.scrollX, to.world.scrollX, alpha),
    },
    players: to.players.map((player) => interpolatePlayer(findById(from.players, player.id), player, alpha)),
    entities: to.entities.map((entity) => interpolateEntity(findById(from.entities, entity.id), entity, alpha)),
  };
}

function interpolatePlayer(from: PlayerSnapshot | undefined, to: PlayerSnapshot, alpha: number): PlayerSnapshot {
  if (from === undefined) {
    return to;
  }

  return {
    ...to,
    x: lerp(from.x, to.x, alpha),
    y: lerp(from.y, to.y, alpha),
  };
}

function interpolateEntity(from: EntitySnapshot | undefined, to: EntitySnapshot, alpha: number): EntitySnapshot {
  if (from === undefined) {
    return to;
  }

  return {
    ...to,
    x: lerp(from.x, to.x, alpha),
    y: lerp(from.y, to.y, alpha),
  };
}

function findById<T extends { id: string }>(items: T[], id: string): T | undefined {
  return items.find((item) => item.id === id);
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
