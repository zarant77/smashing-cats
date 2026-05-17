import { Game } from "@smashing-cats/core";

export function createLocalGame(): Game {
  return new Game(Math.floor(Math.random() * Number.MAX_SAFE_INTEGER));
}
