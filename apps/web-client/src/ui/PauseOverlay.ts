import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";

export class PauseOverlay {
  private readonly element: HTMLDivElement;
  private readonly t: Translator;

  public constructor(root: HTMLElement, t: Translator) {
    this.t = t;

    this.element = document.createElement("div");
    this.element.className = "pause-overlay";
    this.element.hidden = true;

    root.append(this.element);
  }

  public render(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    const player = snapshot?.players.find((item) => item.playerId === localPlayerId);
    const paused = snapshot?.gamePaused === true || (player !== undefined && player.alive && player.paused);

    if (!paused) {
      this.element.hidden = true;
      this.element.replaceChildren();
      return;
    }

    this.element.hidden = false;
    this.element.textContent = this.t("pause");
  }
}
