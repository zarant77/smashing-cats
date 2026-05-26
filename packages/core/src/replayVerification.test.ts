import { describe, expect, test } from "vitest";
import {
  encodeInputBitmask,
  type GameReplay,
  type GameReplayV1,
  type GameReplayV2,
  type PlayerInput,
  type ReplayInputFrame,
  type ReplayInputRun,
} from "@smashing-cats/protocol";
import { FIXED_DT, GAME_CONFIG, Game, verifyGameReplay } from "./index.js";

const PLAYER_ID = "p1";
const PLAYER_KIND = "batcat";
const GAME_VERSION = "test";

const INPUTS: PlayerInput[] = [
  ...repeatInput(55, { left: false, right: true, jump: false }),
  { left: false, right: true, jump: true },
  ...repeatInput(28, { left: false, right: true, jump: false }),
  { left: false, right: true, jump: true },
  ...repeatInput(80, { left: false, right: false, jump: false }),
];

describe("verifyGameReplay", () => {
  test("verifies a replay generated from a deterministic input script", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay(replay);

    expect(replay.finalScore).toBeGreaterThan(0);
    expect(result).toEqual({
      valid: true,
      expectedScore: replay.finalScore,
      actualScore: replay.finalScore,
      expectedFinalTick: replay.finalTick,
      actualFinalTick: replay.finalTick,
    });
  });

  test("verifies a replay generated after tutorial is already completed", () => {
    const replay = createReplay(1337, createSeedSensitiveInputs(), { tutorialCompleted: true });
    const result = verifyGameReplay(replay);

    expect(replay.finalScore).toBeGreaterThan(0);
    expect(result.valid).toBe(true);
    expect(result.actualScore).toBe(replay.finalScore);
  });

  test("verifies a replay built from normalized per-tick input frames", () => {
    const rawInputs: PlayerInput[] = createSeedSensitiveInputs().map((input, index) => ({
      left: input.left === true,
      right: input.right === true || index % 37 === 0,
      jump: input.jump === true,
    }));
    const replay = createReplay(2026, rawInputs, { tutorialCompleted: true });
    const result = verifyGameReplay(replay);

    expect(replay.inputs).toHaveLength(replay.finalTick);
    expect(replay.inputs[0]?.tick).toBe(1);
    expect(replay.inputs.at(-1)?.tick).toBe(replay.finalTick);
    expect(result.valid).toBe(true);
    expect(result.actualScore).toBe(replay.finalScore);
  });

  test("compresses mixed idle and action inputs into replay v2 runs", () => {
    const replay = createReplay(1337, INPUTS);
    const replayV2 = toReplayV2(replay);
    const result = verifyGameReplay(replayV2);

    expect(replayV2.inputRuns.length).toBeLessThan(replay.inputs.length);
    expect(replayV2.inputRuns).toContainEqual([1, 55, encodeInputBitmask({ left: false, right: true, jump: false })]);
    expect(replayV2.inputRuns).toContainEqual([56, 1, encodeInputBitmask({ left: false, right: true, jump: true })]);
    expect(result.valid).toBe(true);
    expect(result.actualScore).toBe(replay.finalScore);
  });

  test("verifies jump-only single-tick v2 runs", () => {
    const inputs = createSeedSensitiveInputs();
    inputs[10] = { left: false, right: false, jump: true };

    const replay = createReplay(2027, inputs, { tutorialCompleted: true });
    const replayV2 = toReplayV2(replay);
    const result = verifyGameReplay(replayV2);

    expect(replayV2.inputRuns).toContainEqual([11, 1, encodeInputBitmask({ left: false, right: false, jump: true })]);
    expect(result.valid).toBe(true);
    expect(result.actualFinalTick).toBe(replay.finalTick);
  });

  test("v1 and v2 produce identical final score and tick", () => {
    const replay = createReplay(1337, createSeedSensitiveInputs(), { tutorialCompleted: true });
    const replayV2 = toReplayV2(replay);
    const v1Result = verifyGameReplay(replay);
    const v2Result = verifyGameReplay(replayV2);

    expect(v1Result.valid).toBe(true);
    expect(v2Result.valid).toBe(true);
    expect(v2Result.actualScore).toBe(v1Result.actualScore);
    expect(v2Result.actualFinalTick).toBe(v1Result.actualFinalTick);
  });

  test("fails when finalScore is tampered", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      finalScore: replay.finalScore + 10,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Final score mismatch");
    expect(result.expectedScore).toBe(replay.finalScore + 10);
    expect(result.actualScore).toBe(replay.finalScore);
  });

  test("fails when seed is tampered", () => {
    const replay = createReplay(1337, createSeedSensitiveInputs());
    const result = verifyGameReplay({
      ...replay,
      seed: "7331",
    });

    expect(result.valid).toBe(false);
  });

  test("fails when input stream is tampered in a score-changing way", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      inputs: createReplayInputFrames(repeatInput(replay.finalTick, { left: false, right: false, jump: false })),
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Final score mismatch");
  });

  test("fails for unsupported replay version", () => {
    const replay = createReplay(1337, INPUTS);
    const unsupportedReplay = {
      ...replay,
      version: 3,
    } as unknown as GameReplay;
    const result = verifyGameReplay(unsupportedReplay);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Unsupported replay version");
  });

  test("fails for malformed v2 runs", () => {
    const replay = toReplayV2(createReplay(1337, INPUTS));

    expect(verifyGameReplay({ ...replay, inputRuns: [[1, 0, 0]] }).reason).toBe("Replay has invalid input run length");
    expect(verifyGameReplay({ ...replay, inputRuns: [[10, 2, 0], [11, 1, 0]] }).reason).toBe(
      "Replay input runs overlap or descend",
    );
    expect(verifyGameReplay({ ...replay, inputRuns: [[2, 1, 0], [1, 1, 0]] }).reason).toBe(
      "Replay input runs overlap or descend",
    );
    expect(verifyGameReplay({ ...replay, inputRuns: [[1, 1, 8]] }).reason).toBe("Replay has invalid input bitmask");
  });

  test("fails when replay has too many input frames", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      inputs: [
        ...replay.inputs,
        { tick: replay.finalTick + 1, left: false, right: false, jump: false },
        { tick: replay.finalTick + 2, left: false, right: false, jump: false },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Replay has too many input frames");
  });

  test("fails when finalTick is too large", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      finalTick: 200_000,
      inputs: [],
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Replay final tick is too large");
  });

  test("fails when finalScore is nonpositive", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      finalScore: 0,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invalid final score");
  });

  test("fails when gameVersion is missing", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      gameVersion: " ",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Missing game version");
  });

  test("fails when replay dates are invalid", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      startedAt: "not-a-date",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Invalid replay dates");
  });

  test("fails when endedAt is earlier than startedAt", () => {
    const replay = createReplay(1337, INPUTS);
    const result = verifyGameReplay({
      ...replay,
      startedAt: "2026-01-01T00:00:10.000Z",
      endedAt: "2026-01-01T00:00:00.000Z",
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Replay ended before it started");
  });
});

type CreateReplayOptions = {
  tutorialCompleted?: boolean;
};

function createReplay(seed: number, inputs: readonly PlayerInput[], options: CreateReplayOptions = {}): GameReplayV1 {
  const game = new Game(seed);

  game.startTutorial({
    ...GAME_CONFIG.tutorial,
    completed: options.tutorialCompleted === true,
  });
  game.addPlayer(PLAYER_ID, PLAYER_KIND);

  for (let index = 0; index < inputs.length; index += 1) {
    const tick = index + 1;

    game.setInput(PLAYER_ID, inputs[index]!, undefined, tick);
    game.update(FIXED_DT);
  }

  const snapshot = game.createSnapshot();
  const player = snapshot.players.find((item) => item.playerId === PLAYER_ID);

  return {
    version: 1,
    gameVersion: GAME_VERSION,
    mode: "single",
    seed: String(seed),
    playerKind: PLAYER_KIND,
    startedAt: "2026-01-01T00:00:00.000Z",
    endedAt: "2026-01-01T00:00:10.000Z",
    finalTick: snapshot.tick,
    finalScore: player?.score ?? 0,
    inputs: createReplayInputFrames(inputs),
  };
}

function toReplayV2(replay: GameReplayV1): GameReplayV2 {
  return {
    version: 2,
    gameVersion: replay.gameVersion,
    mode: replay.mode,
    seed: replay.seed,
    playerKind: replay.playerKind,
    startedAt: replay.startedAt,
    endedAt: replay.endedAt,
    finalTick: replay.finalTick,
    finalScore: replay.finalScore,
    inputRuns: createReplayInputRuns(replay.inputs),
  };
}

function createReplayInputRuns(inputs: readonly ReplayInputFrame[]): ReplayInputRun[] {
  const runs: ReplayInputRun[] = [];

  for (const input of inputs) {
    const bitmask = encodeInputBitmask(input);
    const lastRun = runs.at(-1);

    if (lastRun !== undefined && lastRun[0] + lastRun[1] === input.tick && lastRun[2] === bitmask) {
      runs[runs.length - 1] = [lastRun[0], lastRun[1] + 1, lastRun[2]];
      continue;
    }

    runs.push([input.tick, 1, bitmask]);
  }

  return runs;
}

function createReplayInputFrames(inputs: readonly PlayerInput[]): ReplayInputFrame[] {
  return inputs.map((input, index) => ({
    tick: index + 1,
    left: input.left,
    right: input.right,
    jump: input.jump,
  }));
}

function repeatInput(count: number, input: PlayerInput): PlayerInput[] {
  return Array.from({ length: count }, () => ({ ...input }));
}

function createSeedSensitiveInputs(): PlayerInput[] {
  return Array.from({ length: 1_200 }, (_, index) => {
    const tick = index + 1;
    const cycleTick = tick % 95;

    if (cycleTick === 8 || cycleTick === 36) {
      return { left: false, right: true, jump: true };
    }

    if (cycleTick >= 55 && cycleTick < 72) {
      return { left: true, right: false, jump: false };
    }

    return { left: false, right: true, jump: false };
  });
}
