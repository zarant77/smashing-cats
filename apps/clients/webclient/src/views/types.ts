import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Locale, Translator } from "@smashing-cats/i18n";

export type ViewKind = "canvas" | "phaser" | "three";

export type GameView = {
  render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void;
  setLocale?(locale: Locale, t: Translator): void;
};
