import { Game } from "@smashing-cats/core";

type CreateLocalGameOptions = {
  tutorialEnabled?: boolean;
};

const TUTORIAL_GAME_START_DELAY_SECONDS = 1.5;

export function createLocalGame(options: CreateLocalGameOptions = {}): Game {
  const game = new Game(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));

  if (options.tutorialEnabled !== false) {
    game.startTutorial({
      targetsRequired: 3,
      dummyStartX: 350,
      dummySpacingX: 140,
      gameStartDelaySeconds: TUTORIAL_GAME_START_DELAY_SECONDS,
    });
  }

  return game;
}
