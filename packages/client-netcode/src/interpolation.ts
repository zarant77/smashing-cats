import type { EntitySnapshot, GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";

const INITIAL_INTERPOLATION_DELAY_MS = 70;
const MIN_INTERPOLATION_DELAY_MS = 45;
const MAX_INTERPOLATION_DELAY_MS = 160;
const INTERPOLATION_DELAY_PADDING_MS = 12;
const INTERPOLATION_DELAY_SMOOTHING = 0.08;
const JITTER_MULTIPLIER = 2.2;
const MAX_EXTRAPOLATION_MS = 80;
const MAX_BUFFERED_SNAPSHOTS = 24;
const WORLD_CORRECTION_SMOOTHING_MS = 70;
const NETWORK_TIMING_SMOOTHING = 0.12;

type BufferedSnapshot = {
  snapshot: GameSnapshot;
  receivedAt: number;
};

export class SnapshotInterpolator {
  private readonly snapshots: BufferedSnapshot[] = [];
  private smoothedScrollX: { value: number; updatedAt: number } | undefined;
  private renderedTick: number | undefined;
  private interpolationDelayMs = INITIAL_INTERPOLATION_DELAY_MS;
  private smoothedSnapshotIntervalMs: number | undefined;
  private smoothedJitterMs = 0;

  public add(snapshot: GameSnapshot, receivedAt = performance.now()): void {
    const last = this.snapshots.at(-1);

    if (last !== undefined && snapshot.tick <= last.snapshot.tick) {
      return;
    }

    if (last !== undefined) {
      this.updateNetworkTiming(receivedAt - last.receivedAt);
    }

    this.snapshots.push({ snapshot, receivedAt });

    if (this.snapshots.length > MAX_BUFFERED_SNAPSHOTS) {
      this.snapshots.splice(0, this.snapshots.length - MAX_BUFFERED_SNAPSHOTS);
    }
  }

  public get(localPlayerId: PlayerId | undefined, now = performance.now()): GameSnapshot | undefined {
    if (this.snapshots.length === 0) {
      this.smoothedScrollX = undefined;
      this.renderedTick = undefined;
      return undefined;
    }

    if (this.snapshots.length === 1) {
      return this.setRenderedTick(this.smoothScrollX(this.extrapolateWorld(this.snapshots[0], now), now));
    }

    const renderTime = now - this.interpolationDelayMs;

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
      return this.setRenderedTick(this.smoothScrollX(this.extrapolateWorld(this.snapshots.at(-1), now), now));
    }

    if (previous === next || next.receivedAt <= previous.receivedAt) {
      return this.setRenderedTick(this.smoothScrollX(this.extrapolateWorld(next, now), now));
    }

    const alpha = clamp01((renderTime - previous.receivedAt) / (next.receivedAt - previous.receivedAt));
    const interpolated = interpolateSnapshot(previous.snapshot, next.snapshot, alpha, localPlayerId);

    return this.setRenderedTick(this.smoothScrollX(interpolated, now));
  }

  public getRenderedTick(): number | undefined {
    return this.renderedTick;
  }

  public getLatest(): GameSnapshot | undefined {
    return this.snapshots.at(-1)?.snapshot;
  }

  public getInterpolationDelayMs(): number {
    return this.interpolationDelayMs;
  }

  private updateNetworkTiming(intervalMs: number): void {
    if (!Number.isFinite(intervalMs) || intervalMs <= 0) {
      return;
    }

    if (this.smoothedSnapshotIntervalMs === undefined) {
      this.smoothedSnapshotIntervalMs = intervalMs;
      this.smoothedJitterMs = 0;
      this.interpolationDelayMs = clamp(
        intervalMs + INTERPOLATION_DELAY_PADDING_MS,
        MIN_INTERPOLATION_DELAY_MS,
        MAX_INTERPOLATION_DELAY_MS,
      );
      return;
    }

    const intervalDelta = Math.abs(intervalMs - this.smoothedSnapshotIntervalMs);

    this.smoothedSnapshotIntervalMs = lerp(this.smoothedSnapshotIntervalMs, intervalMs, NETWORK_TIMING_SMOOTHING);
    this.smoothedJitterMs = lerp(this.smoothedJitterMs, intervalDelta, NETWORK_TIMING_SMOOTHING);

    const targetDelay = clamp(
      this.smoothedSnapshotIntervalMs + this.smoothedJitterMs * JITTER_MULTIPLIER + INTERPOLATION_DELAY_PADDING_MS,
      MIN_INTERPOLATION_DELAY_MS,
      MAX_INTERPOLATION_DELAY_MS,
    );

    this.interpolationDelayMs = lerp(this.interpolationDelayMs, targetDelay, INTERPOLATION_DELAY_SMOOTHING);
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
    };
  }

  private smoothScrollX(snapshot: GameSnapshot | undefined, now: number): GameSnapshot | undefined {
    if (snapshot === undefined) {
      return undefined;
    }

    const previous = this.smoothedScrollX;

    if (previous === undefined) {
      this.smoothedScrollX = {
        value: snapshot.world.scrollX,
        updatedAt: now,
      };

      return snapshot;
    }

    const alpha = clamp01((now - previous.updatedAt) / WORLD_CORRECTION_SMOOTHING_MS);
    const scrollX = lerp(previous.value, snapshot.world.scrollX, alpha);

    this.smoothedScrollX = {
      value: scrollX,
      updatedAt: now,
    };

    return {
      ...snapshot,
      world: {
        ...snapshot.world,
        scrollX,
      },
    };
  }
}

function interpolateSnapshot(from: GameSnapshot, to: GameSnapshot, alpha: number, localPlayerId: PlayerId | undefined): GameSnapshot {
  return {
    ...to,
    tick: Math.round(lerp(from.tick, to.tick, alpha)),
    world: {
      ...to.world,
      scrollX: lerp(from.world.scrollX, to.world.scrollX, alpha),
    },
    players: to.players.map((player) => {
      if (player.playerId === localPlayerId) {
        return player;
      }

      return interpolatePlayer(findById(from.players, player.id), player, alpha);
    }),
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
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
