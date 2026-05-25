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

  const primarySimulation = simulateReplay({ replay, seed, tutorialCompleted: false });
  const completedTutorialSimulation =
    primarySimulation.actualScore === replay.finalScore && primarySimulation.actualFinalTick === replay.finalTick
      ? primarySimulation
      : simulateReplay({ replay, seed, tutorialCompleted: true });
  const simulation =
    completedTutorialSimulation.actualScore === replay.finalScore &&
    completedTutorialSimulation.actualFinalTick === replay.finalTick
      ? completedTutorialSimulation
      : primarySimulation;

  if (simulation.actualFinalTick !== replay.finalTick) {
    return {
      valid: false,
      expectedScore: replay.finalScore,
      actualScore: simulation.actualScore,
      expectedFinalTick: replay.finalTick,
      actualFinalTick: simulation.actualFinalTick,
      reason: "Final tick mismatch",
    };
  }

  if (simulation.actualScore !== replay.finalScore) {
    return {
      valid: false,
      expectedScore: replay.finalScore,
      actualScore: simulation.actualScore,
      expectedFinalTick: replay.finalTick,
      actualFinalTick: simulation.actualFinalTick,
      reason: "Final score mismatch",
    };
  }

  return {
    valid: true,
    expectedScore: replay.finalScore,
    actualScore: simulation.actualScore,
    expectedFinalTick: replay.finalTick,
    actualFinalTick: simulation.actualFinalTick,
  };
}

type SimulateReplayOptions = {
  replay: GameReplay;
  seed: number;
  tutorialCompleted: boolean;
};

function simulateReplay(options: SimulateReplayOptions): Pick<ReplayVerificationResult, "actualScore" | "actualFinalTick"> {
  const game = new Game(options.seed);
  const inputsByTick = createInputsByTick(options.replay.inputs);

  game.startTutorial({
    ...GAME_CONFIG.tutorial,
    completed: options.tutorialCompleted,
  });
  game.addPlayer(PLAYER_ID, options.replay.playerKind);

  for (let tick = 1; tick <= options.replay.finalTick; tick += 1) {
    const input = inputsByTick.get(tick) ?? EMPTY_INPUT;

    game.setInput(PLAYER_ID, input, undefined, tick);
    game.update(FIXED_DT);
  }

  const snapshot = game.createSnapshot();
  const player = snapshot.players.find((item) => item.playerId === PLAYER_ID);

  return {
    actualScore: player?.score ?? 0,
    actualFinalTick: snapshot.tick,
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
