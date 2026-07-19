import { CHARACTERS, Game } from "@smashing-cats/core";
import type { GameSnapshot, PlayerInput } from "@smashing-cats/protocol";
import { describe, expect, it } from "vitest";

import { SnapshotInterpolator } from "./interpolation.js";
import { LocalPlayerPredictor } from "./prediction.js";

const PLAYER_ID = "p1";
const IDLE_INPUT: PlayerInput = { left: false, right: false, jump: false };
const RIGHT_INPUT: PlayerInput = { left: false, right: true, jump: false };

describe("LocalPlayerPredictor", () => {
  it("renders smooth sub-tick movement on high-refresh displays", () => {
    const predictor = new LocalPlayerPredictor();
    const snapshot = createSnapshot();
    const initialX = getPlayerX(snapshot);

    predictor.apply(snapshot, snapshot, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 0);

    const frameAt8ms = predictor.apply(snapshot, snapshot, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 8);
    const frameAt16ms = predictor.apply(snapshot, snapshot, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 16);

    expect(getPlayerX(frameAt8ms)).toBeGreaterThan(initialX);
    expect(getPlayerX(frameAt16ms)).toBeGreaterThan(getPlayerX(frameAt8ms));
    expect(predictor.getPendingInputCommands()).toHaveLength(0);
  });

  it("keeps the grounded player visually stable while a horizontal correction is blended", () => {
    const predictor = new LocalPlayerPredictor();
    const initial = createSnapshot();

    predictor.apply(initial, initial, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 0);

    const predicted = predictor.apply(initial, initial, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 34);
    const predictedX = getPlayerX(predicted);
    const authoritative = withPlayerState(initial, {
      tick: 4,
      x: predictedX - 10,
      lastProcessedInputSeq: 2,
      vx: 0,
    });
    const corrected = predictor.apply(authoritative, authoritative, PLAYER_ID, IDLE_INPUT, CHARACTERS, 34);

    expect(getPlayerX(corrected)).toBeCloseTo(predictedX, 6);

    const blended = predictor.apply(authoritative, authoritative, PLAYER_ID, IDLE_INPUT, CHARACTERS, 54);

    expect(getPlayerX(blended)).toBeLessThan(predictedX);
    expect(getPlayerX(blended)).toBeGreaterThan(getPlayerX(authoritative));
  });

  it("sends each predicted command once on the reliable socket", () => {
    const predictor = new LocalPlayerPredictor();
    const snapshot = createSnapshot();

    predictor.apply(snapshot, snapshot, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 0);
    predictor.apply(snapshot, snapshot, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 34);

    expect(predictor.takeUnsentInputCommands(24).map((command) => command.inputSeq)).toEqual([1, 2]);
    expect(predictor.takeUnsentInputCommands(24)).toEqual([]);

    predictor.apply(snapshot, snapshot, PLAYER_ID, RIGHT_INPUT, CHARACTERS, 52);

    expect(predictor.takeUnsentInputCommands(24).map((command) => command.inputSeq)).toEqual([3]);
  });

  it("does not simulate a paused wall-clock gap on resume", () => {
    const predictor = new LocalPlayerPredictor();
    const snapshot = createSnapshot();

    predictor.apply(snapshot, snapshot, PLAYER_ID, IDLE_INPUT, CHARACTERS, 0);
    predictor.suspend(IDLE_INPUT, 1_000);
    predictor.apply(snapshot, snapshot, PLAYER_ID, IDLE_INPUT, CHARACTERS, 1_018);

    expect(predictor.getPendingInputCommands()).toHaveLength(1);
  });
});

describe("SnapshotInterpolator", () => {
  it("never rewinds its render clock when a snapshot arrives late", () => {
    const interpolator = new SnapshotInterpolator();

    interpolator.add(createSnapshot(0), 0);
    interpolator.get(undefined, 0);
    interpolator.add(createSnapshot(4), 66);
    interpolator.get(undefined, 66);
    interpolator.get(undefined, 159);

    const beforeLatePacket = interpolator.getRenderedTick();

    interpolator.add(createSnapshot(8), 160);
    interpolator.get(undefined, 160);

    expect(interpolator.getRenderedTick()).toBeGreaterThanOrEqual(beforeLatePacket ?? Number.NEGATIVE_INFINITY);
  });
});

function createSnapshot(tick = 0): GameSnapshot {
  const game = new Game(1337);

  game.addPlayer(PLAYER_ID, "batcat");

  const snapshot = game.createSnapshot();

  return withPlayerState(snapshot, {
    tick,
    x: 120 + tick * 5,
    vx: 300,
  });
}

function withPlayerState(
  snapshot: GameSnapshot,
  patch: { tick: number; x: number; vx: number; lastProcessedInputSeq?: number },
): GameSnapshot {
  return {
    ...snapshot,
    tick: patch.tick,
    players: snapshot.players.map((player) =>
      player.playerId === PLAYER_ID
        ? {
            ...player,
            x: patch.x,
            vx: patch.vx,
            lastProcessedInputSeq: patch.lastProcessedInputSeq ?? player.lastProcessedInputSeq,
          }
        : player,
    ),
  };
}

function getPlayerX(snapshot: GameSnapshot | undefined): number {
  const player = snapshot?.players.find((candidate) => candidate.playerId === PLAYER_ID);

  if (player === undefined) {
    throw new Error("Missing test player");
  }

  return player.x;
}
