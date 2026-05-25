import { GAME_CONFIG, Game } from "@smashing-cats/core";

type CreateLocalGameOptions = {
  seed?: number;
  tutorialEnabled?: boolean;
};

export function createLocalGame(options: CreateLocalGameOptions = {}): Game {
  const game = new Game(options.seed ?? createLocalGameSeed());

  game.startTutorial({
    ...GAME_CONFIG.tutorial,
    completed: options.tutorialEnabled === false,
  });

  return game;
}

export function createLocalGameSeed(): number {
  return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER);
}
