import type { GameReplay, PlayerInput, ReplayInputFrame } from "@smashing-cats/protocol";
import { FIXED_DT, GAME_CONFIG, TICK_RATE } from "./config.js";
import { Game } from "./Game.js";

export type ReplayVerificationResult = {
  readonly valid: boolean;
  readonly expectedScore: number;
  readonly actualScore: number;
  readonly expectedFinalTick: number;
  readonly actualFinalTick: number;
  readonly reason?: string;
};

const PLAYER_ID = "p1";
const MAX_REPLAY_FINAL_TICKS = TICK_RATE * 60 * 30;
const EMPTY_INPUT: PlayerInput = {
  left: false,
  right: false,
  jump: false,
};

export function verifyGameReplay(replay: GameReplay): ReplayVerificationResult {
  const baseResult = {
    expectedScore: replay.finalScore,
    actualScore: 0,
    expectedFinalTick: replay.finalTick,
    actualFinalTick: 0,
  };

  if (replay.version !== 1) {
    return {
      ...baseResult,
      valid: false,
      reason: "Unsupported replay version",
    };
  }

  if (replay.mode !== "single") {
    return {
      ...baseResult,
      valid: false,
      reason: "Unsupported replay mode",
    };
  }

  if (replay.gameVersion.trim() === "") {
    return {
      ...baseResult,
      valid: false,
      reason: "Missing game version",
    };
  }

  const startedAt = Date.parse(replay.startedAt);
  const endedAt = Date.parse(replay.endedAt);

  if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
    return {
      ...baseResult,
      valid: false,
      reason: "Invalid replay dates",
    };
  }

  if (endedAt < startedAt) {
    return {
      ...baseResult,
      valid: false,
      reason: "Replay ended before it started",
    };
  }

  const seed = Number(replay.seed);

  if (!Number.isSafeInteger(seed)) {
    return {
      ...baseResult,
      valid: false,
      reason: "Invalid replay seed",
    };
  }

  if (!Number.isInteger(replay.finalTick) || replay.finalTick < 0) {
    return {
      ...baseResult,
      valid: false,
      reason: "Invalid final tick",
    };
  }

  if (replay.finalTick > MAX_REPLAY_FINAL_TICKS) {
    return {
      ...baseResult,
      valid: false,
      reason: "Replay final tick is too large",
    };
  }

  if (replay.finalScore <= 0) {
    return {
      ...baseResult,
      valid: false,
      reason: "Invalid final score",
    };
  }

  if (replay.inputs.length > replay.finalTick + 1) {
    return {
      ...baseResult,
      valid: false,
      reason: "Replay has too many input frames",
    };
  }

  const game = new Game(seed);
  const inputsByTick = createInputsByTick(replay.inputs);

  game.startTutorial(GAME_CONFIG.tutorial);
  game.addPlayer(PLAYER_ID, replay.playerKind);

  for (let tick = 1; tick <= replay.finalTick; tick += 1) {
    const input = inputsByTick.get(tick) ?? EMPTY_INPUT;

    game.setInput(PLAYER_ID, input, undefined, tick);
    game.update(FIXED_DT);
  }

  const snapshot = game.createSnapshot();
  const player = snapshot.players.find((item) => item.playerId === PLAYER_ID);
  const actualScore = player?.score ?? 0;
  const actualFinalTick = snapshot.tick;

  if (actualFinalTick !== replay.finalTick) {
    return {
      valid: false,
      expectedScore: replay.finalScore,
      actualScore,
      expectedFinalTick: replay.finalTick,
      actualFinalTick,
      reason: "Final tick mismatch",
    };
  }

  if (actualScore !== replay.finalScore) {
    return {
      valid: false,
      expectedScore: replay.finalScore,
      actualScore,
      expectedFinalTick: replay.finalTick,
      actualFinalTick,
      reason: "Final score mismatch",
    };
  }

  return {
    valid: true,
    expectedScore: replay.finalScore,
    actualScore,
    expectedFinalTick: replay.finalTick,
    actualFinalTick,
  };
}

function createInputsByTick(inputs: readonly ReplayInputFrame[]): Map<number, PlayerInput> {
  const inputsByTick = new Map<number, PlayerInput>();

  for (const input of inputs) {
    inputsByTick.set(input.tick, {
      left: input.left,
      right: input.right,
      jump: input.jump,
    });
  }

  return inputsByTick;
}
