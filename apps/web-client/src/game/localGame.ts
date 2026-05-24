import { GAME_CONFIG, Game } from "@smashing-cats/core";

type CreateLocalGameOptions = {
  tutorialEnabled?: boolean;
};

export function createLocalGame(options: CreateLocalGameOptions = {}): Game {
  const game = new Game(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

  if (options.tutorialEnabled !== false) {
    game.startTutorial(GAME_CONFIG.tutorial);
  }

  return game;
}
