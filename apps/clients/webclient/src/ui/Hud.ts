import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "../i18n.js";

export class Hud {
  private readonly element: HTMLDivElement;
  private t: Translator;

  public constructor(root: HTMLElement, t: Translator) {
    this.t = t;
    this.element = document.createElement("div");
    this.element.className = "hud";
    root.append(this.element);
  }

  public setTranslator(t: Translator): void {
    this.t = t;
  }

  public render(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    const players = snapshot?.players.filter((player) => player.alive) ?? [];

    if (players.length === 0) {
      this.element.replaceChildren();
      return;
    }

    this.element.replaceChildren(...players.map((player) => {
      const item = document.createElement("div");
      item.className = player.playerId === localPlayerId ? "hud-player hud-player-local" : "hud-player";
      item.textContent = `${player.playerId} ${player.hp}/${player.maxHp} ${this.t("hp")} ${player.score} ${this.t("points")}`;
      return item;
    }));
  }
}
