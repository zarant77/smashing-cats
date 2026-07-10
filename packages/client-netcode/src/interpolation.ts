import { FIXED_DT } from "@smashing-cats/core";
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
const TICK_DURATION_MS = FIXED_DT * 1000;

type BufferedSnapshot = {
  snapshot: GameSnapshot;
  receivedAt: number;
};

export class SnapshotInterpolator {
  private readonly snapshots: BufferedSnapshot[] = [];
  private smoothedScrollX: { value: number; updatedAt: number } | undefined;
  private renderedTick: number | undefined;
  private latestServerTickEstimate: { tick: number; updatedAt: number } | undefined;
  private interpolationDelayMs = INITIAL_INTERPOLATION_DELAY_MS;
  private smoothedSnapshotIntervalMs: number | undefined;
  private smoothedJitterMs = 0;

  public add(snapshot: GameSnapshot, receivedAt = performance.now()): void {
    if (this.renderedTick !== undefined && snapshot.tick < this.renderedTick - 1) {
      return;
    }

    const existingIndex = this.snapshots.findIndex((buffered) => buffered.snapshot.tick === snapshot.tick);

    if (existingIndex !== -1) {
      this.snapshots[existingIndex] = { snapshot, receivedAt };
      return;
    }

    const last = this.snapshots.at(-1);

    if (last !== undefined && snapshot.tick > last.snapshot.tick) {
      this.updateNetworkTiming(receivedAt - last.receivedAt);
    }

    const insertIndex = this.snapshots.findIndex((buffered) => buffered.snapshot.tick > snapshot.tick);

    if (insertIndex === -1) {
      this.snapshots.push({ snapshot, receivedAt });
    } else {
      this.snapshots.splice(insertIndex, 0, { snapshot, receivedAt });
    }

    const newest = this.snapshots.at(-1);

    if (newest !== undefined) {
      this.latestServerTickEstimate = {
        tick: newest.snapshot.tick,
        updatedAt: newest.receivedAt,
      };
    }

    if (this.snapshots.length > MAX_BUFFERED_SNAPSHOTS) {
      this.snapshots.splice(0, this.snapshots.length - MAX_BUFFERED_SNAPSHOTS);
    }
  }

  public get(localPlayerId: PlayerId | undefined, now = performance.now()): GameSnapshot | undefined {
    if (this.snapshots.length === 0) {
      this.smoothedScrollX = undefined;
      this.renderedTick = undefined;
      this.latestServerTickEstimate = undefined;
      return undefined;
    }

    if (this.snapshots.length === 1) {
      return this.setRenderedTick(this.smoothScrollX(this.extrapolateSnapshot(this.snapshots[0], localPlayerId, now), now));
    }

    const estimatedServerTick = this.getEstimatedServerTick(now);
    const renderTick = estimatedServerTick - this.interpolationDelayMs / TICK_DURATION_MS;

    if (renderTick <= this.snapshots[0].snapshot.tick) {
      return this.setRenderedTick(this.smoothScrollX(this.snapshots[0].snapshot, now));
    }

    let previous = this.snapshots[0];
    let next = this.snapshots.at(-1);

    for (let index = 1; index < this.snapshots.length; index += 1) {
      const candidate = this.snapshots[index];

      if (candidate === undefined) {
        continue;
      }

      if (candidate.snapshot.tick >= renderTick) {
        next = candidate;
        break;
      }

      previous = candidate;
    }

    if (previous === undefined || next === undefined) {
      return this.setRenderedTick(this.smoothScrollX(this.extrapolateSnapshot(this.snapshots.at(-1), localPlayerId, now), now));
    }

    if (renderTick > next.snapshot.tick || previous === next || next.snapshot.tick <= previous.snapshot.tick) {
      return this.setRenderedTick(this.smoothScrollX(this.extrapolateSnapshot(next, localPlayerId, now), now));
    }

    const alpha = clamp01((renderTick - previous.snapshot.tick) / (next.snapshot.tick - previous.snapshot.tick));
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

  private getEstimatedServerTick(now: number): number {
    const estimate = this.latestServerTickEstimate;

    if (estimate === undefined) {
      return this.snapshots.at(-1)?.snapshot.tick ?? 0;
    }

    return estimate.tick + Math.max(0, now - estimate.updatedAt) / TICK_DURATION_MS;
  }

  private extrapolateSnapshot(
    buffered: BufferedSnapshot | undefined,
    localPlayerId: PlayerId | undefined,
    now: number,
  ): GameSnapshot | undefined {
    if (buffered === undefined) {
      return undefined;
    }

    const dt = Math.min(MAX_EXTRAPOLATION_MS, Math.max(0, now - buffered.receivedAt)) / 1000;

    if (buffered.snapshot.gamePaused) {
      return buffered.snapshot;
    }

    return {
      ...buffered.snapshot,
      world: {
        ...buffered.snapshot.world,
        scrollX: buffered.snapshot.world.scrollX + buffered.snapshot.world.speed * dt,
      },
      players: buffered.snapshot.players.map((player) =>
        player.playerId === localPlayerId
          ? player
          : {
              ...player,
              x: player.x + player.vx * dt,
              y: player.y + player.vy * dt,
            },
      ),
      entities: buffered.snapshot.entities.map((entity) => ({
        ...entity,
        x: entity.x + entity.vx * dt,
        y: entity.y + entity.vy * dt,
      })),
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
