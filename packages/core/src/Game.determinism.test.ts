import { describe, expect, test } from "vitest";
import type { GameEvent, GameSnapshot, PlayerInput, PlayerSnapshot } from "@smashing-cats/protocol";
import { FIXED_DT, Game } from "./index.js";

type InputStep = {
  label: "idle" | "move-right" | "jump" | "smash" | "move-mix";
  ticks: number;
  input: PlayerInput;
};

type SimulationResult = {
  snapshot: StableSnapshot;
  score: number;
  events: StableEvent[];
  serialized: string;
};

type StableSnapshot = {
  tick: number;
  seed: number;
  gamePaused: boolean;
  tutorial: GameSnapshot["tutorial"];
  simulation: GameSnapshot["simulation"];
  world: GameSnapshot["world"];
  players: StablePlayer[];
  entities: GameSnapshot["entities"];
};

type StablePlayer = Omit<PlayerSnapshot, "invulnerable">;

type StableEvent = Omit<GameEvent, "id">;

const PLAYER_ID = "p1";
const CHARACTER_KIND = "batcat";
const TUTORIAL_OPTIONS = {
  targetsRequired: 2,
  dummyStartX: 170,
  dummySpacingX: 180,
  gameStartDelaySeconds: 0,
  runStartDelaySeconds: 0,
} as const;

const INPUT_SCRIPT: InputStep[] = [
  { label: "idle", ticks: 20, input: { left: false, right: false, jump: false } },
  { label: "move-right", ticks: 35, input: { left: false, right: true, jump: false } },
  { label: "jump", ticks: 1, input: { left: false, right: true, jump: true } },
  { label: "move-right", ticks: 28, input: { left: false, right: true, jump: false } },
  { label: "smash", ticks: 1, input: { left: false, right: true, jump: true } },
  { label: "move-mix", ticks: 40, input: { left: true, right: false, jump: false } },
  { label: "move-mix", ticks: 45, input: { left: false, right: true, jump: false } },
  { label: "idle", ticks: 90, input: { left: false, right: false, jump: false } },
];

describe("Game deterministic simulation", () => {
  test("same seed and same inputs produce the same final snapshot", () => {
    const first = runSimulation(1337, INPUT_SCRIPT);
    const second = runSimulation(1337, INPUT_SCRIPT);

    expect(second.snapshot).toEqual(first.snapshot);
  });

  test("same seed and same inputs produce the same final score", () => {
    const first = runSimulation(1337, INPUT_SCRIPT);
    const second = runSimulation(1337, INPUT_SCRIPT);

    expect(second.score).toBe(first.score);
  });

  test("same seed and same inputs produce the same event sequence", () => {
    const first = runSimulation(1337, INPUT_SCRIPT);
    const second = runSimulation(1337, INPUT_SCRIPT);

    expect(second.events).toEqual(first.events);
  });

  test("different seed is allowed to produce different results", () => {
    const first = runSimulation(1337, INPUT_SCRIPT);
    const second = runSimulation(7331, INPUT_SCRIPT);

    expect(second.serialized).not.toEqual(first.serialized);
  });

  test("replaying the same recorded input stream twice produces the same stable serialized output", () => {
    const recordedInputStream = expandInputScript(INPUT_SCRIPT);
    const first = runSimulation(2024, recordedInputStream);
    const second = runSimulation(2024, recordedInputStream);

    expect(second.serialized).toBe(first.serialized);
  });
});

function runSimulation(seed: number, inputSource: InputStep[] | readonly PlayerInput[]): SimulationResult {
  return withUnseededRuntimeSourcesBlocked(() => {
    const game = new Game(seed);
    const events: StableEvent[] = [];
    const inputs = isInputStepArray(inputSource) ? expandInputScript(inputSource) : inputSource;

    game.addPlayer(PLAYER_ID, CHARACTER_KIND);
    game.startTutorial(TUTORIAL_OPTIONS);

    for (let tick = 0; tick < inputs.length; tick += 1) {
      game.setInput(PLAYER_ID, inputs[tick]!, undefined, tick + 1);
      game.update(FIXED_DT);
      events.push(...game.createSnapshot().events.map(normalizeEvent));
    }

    const snapshot = normalizeSnapshot(game.createSnapshot());
    const score = snapshot.players.find((player) => player.playerId === PLAYER_ID)?.score ?? 0;

    return {
      snapshot,
      score,
      events,
      serialized: stableSerialize({ snapshot, score, events }),
    };
  });
}

function expandInputScript(script: readonly InputStep[]): PlayerInput[] {
  return script.flatMap((step) => Array.from({ length: step.ticks }, () => ({ ...step.input })));
}

function isInputStepArray(inputSource: InputStep[] | readonly PlayerInput[]): inputSource is InputStep[] {
  return "ticks" in (inputSource[0] ?? {});
}

function normalizeSnapshot(snapshot: GameSnapshot): StableSnapshot {
  return {
    tick: snapshot.tick,
    seed: snapshot.seed,
    gamePaused: snapshot.gamePaused,
    tutorial: { ...snapshot.tutorial },
    simulation: { ...snapshot.simulation },
    world: { ...snapshot.world },
    players: snapshot.players.map(({ invulnerable, ...player }) => player),
    entities: snapshot.entities.map((entity) => ({ ...entity })),
  };
}

function normalizeEvent({ id, ...event }: GameEvent): StableEvent {
  return event;
}

function stableSerialize(value: SimulationResult | Omit<SimulationResult, "serialized">): string {
  return JSON.stringify(value);
}

function withUnseededRuntimeSourcesBlocked<T>(callback: () => T): T {
  const originalRandom = Math.random;
  const originalDateNow = Date.now;
  const originalPerformanceNow = globalThis.performance?.now;

  Math.random = failOnUnseededRuntimeSource("Math.random");
  Date.now = failOnUnseededRuntimeSource("Date.now");

  if (globalThis.performance !== undefined && originalPerformanceNow !== undefined) {
    Object.defineProperty(globalThis.performance, "now", {
      configurable: true,
      value: failOnUnseededRuntimeSource("performance.now"),
    });
  }

  try {
    return callback();
  } finally {
    Math.random = originalRandom;
    Date.now = originalDateNow;

    if (globalThis.performance !== undefined && originalPerformanceNow !== undefined) {
      Object.defineProperty(globalThis.performance, "now", {
        configurable: true,
        value: originalPerformanceNow,
      });
    }
  }
}

function failOnUnseededRuntimeSource(source: string): () => never {
  return () => {
    throw new Error(`${source} must not affect core gameplay simulation`);
  };
}
