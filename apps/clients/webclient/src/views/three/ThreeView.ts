import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Locale, Translator } from "../../i18n.js";
import type { GameView } from "../types.js";

export class ThreeView implements GameView {
  private readonly element: HTMLDivElement;
  private t: Translator = (key) => key;

  public constructor(root: HTMLElement) {
    this.element = document.createElement("div");
    this.element.className = "placeholder-view";
    root.replaceChildren(this.element);
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.element.textContent = snapshot === undefined
      ? `Three.js ${this.t("connecting")}`
      : `Three.js ${this.t("placeholder")} | Player: ${playerId ?? "..."} | Tick: ${snapshot.tick}`;
  }

  public setLocale(_locale: Locale, t: Translator): void {
    this.t = t;
  }
}
