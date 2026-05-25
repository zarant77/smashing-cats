import { describe, expect, test } from "vitest";
import type { GameReplay, PlayerInput, ReplayInputFrame } from "@smashing-cats/protocol";
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
      version: 2,
    } as unknown as GameReplay;
    const result = verifyGameReplay(unsupportedReplay);

    expect(result.valid).toBe(false);
    expect(result.reason).toBe("Unsupported replay version");
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

function createReplay(seed: number, inputs: readonly PlayerInput[], options: CreateReplayOptions = {}): GameReplay {
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
