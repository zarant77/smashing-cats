import { describe, expect, it } from "vitest";

import { FIXED_DT } from "./config.js";
import { Game } from "./Game.js";
import { SnapshotStore } from "./snapshot/SnapshotStore.js";
import { FixedStepClock } from "./time/FixedStepClock.js";

const PLAYER_ID = "p1";

describe("authoritative netcode", () => {
  it("coalesces a delayed input batch into the freshest state without losing a jump", () => {
    const game = createGame();

    game.queueInputCommand(PLAYER_ID, {
      inputSeq: 1,
      clientTick: 1,
      snapshotTick: 0,
      input: { left: false, right: true, jump: true },
    });
    game.queueInputCommand(PLAYER_ID, {
      inputSeq: 2,
      clientTick: 2,
      snapshotTick: 1,
      input: { left: false, right: false, jump: false },
    });

    game.update(FIXED_DT);

    const player = game.createSnapshot().players[0];

    expect(player?.lastProcessedInputSeq).toBe(2);
    expect(player?.vx).toBe(0);
    expect(player?.grounded).toBe(false);
    expect(player?.vy).toBeLessThan(0);
  });

  it("acknowledges the newest delayed command in one server tick", () => {
    const game = createGame();

    for (let tick = 1; tick <= 3; tick += 1) {
      game.queueInputCommand(PLAYER_ID, {
        inputSeq: tick,
        clientTick: tick,
        input: { left: false, right: true, jump: false },
      });
    }

    game.update(FIXED_DT);

    expect(game.createSnapshot().players[0]?.lastProcessedInputSeq).toBe(3);
  });

  it("clears queued movement when a globally paused match resumes", () => {
    const game = createGame();
    const initialX = game.createSnapshot().players[0]?.x;

    game.queueInputCommand(PLAYER_ID, {
      inputSeq: 1,
      clientTick: 1,
      input: { left: false, right: true, jump: false },
    });
    game.setGamePaused(true);
    game.setGamePaused(false);
    game.update(FIXED_DT);

    const player = game.createSnapshot().players[0];

    expect(player?.lastProcessedInputSeq).toBe(1);
    expect(player?.x).toBe(initialX);
    expect(player?.vx).toBe(0);
  });

  it("preserves airborne physics across a global pause", () => {
    const game = createGame();

    game.queueInputCommand(PLAYER_ID, {
      inputSeq: 1,
      clientTick: 1,
      input: { left: false, right: false, jump: true },
    });
    game.update(FIXED_DT);

    const velocityBeforePause = game.createSnapshot().players[0]?.vy ?? 0;

    game.setGamePaused(true);
    game.setGamePaused(false);
    game.update(FIXED_DT);

    const velocityAfterPause = game.createSnapshot().players[0]?.vy ?? 0;

    expect(velocityBeforePause).toBeLessThan(0);
    expect(velocityAfterPause).toBeGreaterThan(velocityBeforePause);
    expect(velocityAfterPause).toBeLessThan(0);
  });
});

describe("FixedStepClock", () => {
  it("keeps a 60 Hz simulation at 600 steps over ten seconds with 16 ms timer callbacks", () => {
    const clock = new FixedStepClock(FIXED_DT);
    let steps = 0;

    clock.reset(0);

    for (let now = 16; now < 10_000; now += 16) {
      steps += clock.advance(now);
    }

    steps += clock.advance(10_000);

    expect(steps).toBe(600);
  });

  it("caps catch-up work after a long event-loop stall", () => {
    const clock = new FixedStepClock(FIXED_DT, 5);

    clock.reset(0);

    expect(clock.advance(5_000)).toBe(5);
    expect(clock.advance(5_001)).toBe(0);
  });
});

describe("SnapshotStore stale packet handling", () => {
  it("does not turn stale full or delta packets into fresh interpolation samples", () => {
    const game = createGame();
    const store = new SnapshotStore();
    const tick0 = game.createSnapshot();

    expect(store.setFullSnapshot(tick0)?.tick).toBe(0);

    game.update(FIXED_DT);

    const tick1 = game.createSnapshot();

    expect(store.setFullSnapshot(tick1)?.tick).toBe(1);
    expect(store.setFullSnapshot(tick0)).toBeUndefined();
    expect(store.applyDelta({ tick: 1, scrollX: 999 })).toBeUndefined();
    expect(store.getLatest()?.tick).toBe(1);
    expect(store.getLatest()?.world.scrollX).not.toBe(999);
  });
});

function createGame(): Game {
  const game = new Game(1337);

  game.addPlayer(PLAYER_ID, "batcat");

  return game;
}
