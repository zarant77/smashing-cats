import type { EntityKind, GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";

type GameOverPopupOptions = {
  onRestart: () => void;
};

const SHOW_DELAY_MS = 2000;

export class GameOverPopup {
  private readonly element: HTMLDivElement;
  private readonly t: Translator;
  private readonly onRestart: () => void;

  private visible = false;

  private deadAt: number | undefined;
  private shownForPlayerId: PlayerId | undefined;

  public constructor(root: HTMLElement, t: Translator, options: GameOverPopupOptions) {
    this.t = t;
    this.onRestart = options.onRestart;

    this.element = document.createElement("div");
    this.element.className = "game-over-popup";
    this.element.hidden = true;

    root.append(this.element);
  }

  public render(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    const player = snapshot?.players.find((item) => item.playerId === localPlayerId);

    if (player === undefined || player.alive) {
      this.deadAt = undefined;
      this.shownForPlayerId = undefined;

      this.hide();

      return;
    }

    if (this.shownForPlayerId !== player.playerId) {
      this.shownForPlayerId = player.playerId;
      this.deadAt = performance.now();
    }

    if (this.deadAt === undefined) {
      return;
    }

    const elapsed = performance.now() - this.deadAt;

    if (elapsed < SHOW_DELAY_MS) {
      return;
    }

    this.show(player.kind, player.score);
  }

  private show(kind: EntityKind, score: number): void {
    if (this.visible) {
      return;
    }

    this.visible = true;
    this.element.hidden = false;

    this.element.innerHTML = `
      <div class="game-over-card">
        <h2>${this.t("gameOverTitle")}</h2>

        <img
          class="game-over-cat"
          src="/players/${kind}.png"
          alt="${kind}"
        />

        <div class="game-over-score">
          ${this.t("score")}: <strong>${score}</strong>
        </div>

        <button class="game-over-restart" type="button">
          ${this.t("restart")}
        </button>
      </div>
    `;

    const restartButton = this.element.querySelector<HTMLButtonElement>(".game-over-restart");

    restartButton?.addEventListener("click", () => {
      this.onRestart();
    });
  }

  private hide(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;

    this.element.hidden = true;
    this.element.replaceChildren();
  }
}
