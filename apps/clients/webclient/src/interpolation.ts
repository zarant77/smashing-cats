import type { EntitySnapshot, GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";

const REMOTE_PLAYER_INTERPOLATION_DELAY_MS = 75;
const MAX_EXTRAPOLATION_MS = 120;
const MAX_BUFFERED_SNAPSHOTS = 12;
const LOCAL_PLAYER_SMOOTHING_MS = 55;
const WORLD_CORRECTION_SMOOTHING_MS = 70;

type BufferedSnapshot = {
  snapshot: GameSnapshot;
  receivedAt: number;
};

export class SnapshotInterpolator {
  private readonly snapshots: BufferedSnapshot[] = [];
  private readonly localPlayers = new Map<PlayerId, { player: PlayerSnapshot; updatedAt: number }>();
  private smoothedWorld: { snapshot: GameSnapshot; updatedAt: number } | undefined;
  private renderedTick: number | undefined;

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
      this.smoothedWorld = undefined;
      return undefined;
    }

    if (this.snapshots.length === 1) {
      return this.setRenderedTick(this.smoothWorld(this.extrapolateWorld(this.snapshots[0], now), now));
    }

    const renderTime = now - REMOTE_PLAYER_INTERPOLATION_DELAY_MS;
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
      return this.setRenderedTick(this.smoothWorld(this.extrapolateWorld(this.snapshots.at(-1), now), now));
    }

    const latestBuffered = this.snapshots.at(-1);
    const latest = latestBuffered?.snapshot;

    if (previous === next || next.receivedAt <= previous.receivedAt) {
      const extrapolatedNext = this.smoothWorld(this.extrapolateWorld(next, now), now);
      return this.setRenderedTick(
        extrapolatedNext === undefined
          ? undefined
          : this.withSmoothedLocalPlayer(extrapolatedNext, latest, localPlayerId, now),
      );
    }

    const alpha = clamp01((renderTime - previous.receivedAt) / (next.receivedAt - previous.receivedAt));
    const extrapolatedLatest = this.smoothWorld(this.extrapolateWorld(latestBuffered ?? next, now), now);
    return this.setRenderedTick(
      this.withSmoothedLocalPlayer(
        {
          ...interpolateSnapshot(previous.snapshot, next.snapshot, alpha),
          world: extrapolatedLatest?.world ?? next.snapshot.world,
          entities: extrapolatedLatest?.entities ?? next.snapshot.entities,
        },
        latest,
        localPlayerId,
        now,
      ),
    );
  }

  public getRenderedTick(): number | undefined {
    return this.renderedTick;
  }

  public getLatest(): GameSnapshot | undefined {
    return this.snapshots.at(-1)?.snapshot;
  }

  private setRenderedTick(snapshot: GameSnapshot | undefined): GameSnapshot | undefined {
    this.renderedTick = snapshot?.tick;
    return snapshot;
  }

  private extrapolateWorld(buffered: BufferedSnapshot | undefined, now: number): GameSnapshot | undefined {
    if (buffered === undefined) {
      return undefined;
    }

    const dt = Math.min(MAX_EXTRAPOLATION_MS, Math.max(0, now - buffered.receivedAt)) / 1000;
    return {
      ...buffered.snapshot,
      world: {
        ...buffered.snapshot.world,
        scrollX: buffered.snapshot.world.scrollX + buffered.snapshot.world.speed * dt,
      },
      entities: buffered.snapshot.entities.map((entity) => ({
        ...entity,
        x: entity.x + entity.vx * dt,
        y: entity.y + entity.vy * dt,
      })),
    };
  }

  private smoothWorld(snapshot: GameSnapshot | undefined, now: number): GameSnapshot | undefined {
    if (snapshot === undefined) {
      return undefined;
    }

    const previous = this.smoothedWorld;
    if (previous === undefined) {
      this.smoothedWorld = { snapshot, updatedAt: now };
      return snapshot;
    }

    const alpha = clamp01((now - previous.updatedAt) / WORLD_CORRECTION_SMOOTHING_MS);
    const smoothed = {
      ...snapshot,
      world: {
        ...snapshot.world,
        scrollX: lerp(previous.snapshot.world.scrollX, snapshot.world.scrollX, alpha),
      },
      entities: snapshot.entities.map((entity) => interpolateEntity(findById(previous.snapshot.entities, entity.id), entity, alpha)),
    };

    this.smoothedWorld = { snapshot: smoothed, updatedAt: now };
    return smoothed;
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
    tick: Math.round(lerp(from.tick, to.tick, alpha)),
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
