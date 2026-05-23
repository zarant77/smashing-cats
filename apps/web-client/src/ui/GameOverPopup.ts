import type { EntityKind, GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { getDeathPhrase, t } from "@smashing-cats/i18n";

type GameOverPopupOptions = {
  onRestart: () => void;
};

const SHOW_DELAY_MS = 2000;
const SPEECH_DELAY_MS = 1000;

export class GameOverPopup {
  private readonly element: HTMLDivElement;
  private readonly onRestart: () => void;

  private visible = false;
  private speechVisible = false;

  private deadAt: number | undefined;
  private shownForPlayerId: PlayerId | undefined;
  private speechPhrase = "";

  public constructor(root: HTMLElement, options: GameOverPopupOptions) {
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
      this.speechPhrase = "";

      this.hide();

      return;
    }

    if (this.shownForPlayerId !== player.playerId) {
      this.shownForPlayerId = player.playerId;
      this.deadAt = performance.now();
      this.speechPhrase = getDeathPhrase(player.kind);
    }

    if (this.deadAt === undefined) {
      return;
    }

    const elapsed = performance.now() - this.deadAt;

    if (elapsed < SHOW_DELAY_MS) {
      return;
    }

    this.show(player.kind, player.score);

    if (elapsed >= SHOW_DELAY_MS + SPEECH_DELAY_MS) {
      this.showSpeech();
    }
  }

  private show(kind: EntityKind, score: number): void {
    if (this.visible) {
      return;
    }

    this.visible = true;
    this.speechVisible = false;
    this.element.hidden = false;

    this.element.innerHTML = `
      <div class="card">
        <h2>${t("gameOverTitle")}</h2>

        <div class="character-preview">
          <div class="game-over-speech" hidden>
            ${this.speechPhrase}
          </div>

          <img
            class="platform"
            src="/ui/character_platform.png"
            alt="${kind}"
          />
          <img
            class="portrait"
            src="/portraits/${kind}.png"
            alt="${kind}"
          />
        </div>

        <div class="score">
          ${t("score")}: <strong>${score}</strong>
        </div>

        <button class="button restart" type="button">
          ${t("restart")}
        </button>
      </div>
    `;

    const restartButton = this.element.querySelector<HTMLButtonElement>(".game-over-popup .restart");

    restartButton?.addEventListener("click", () => {
      this.onRestart();
    });
  }

  private showSpeech(): void {
    if (this.speechVisible) {
      return;
    }

    this.speechVisible = true;

    const speech = this.element.querySelector<HTMLElement>(".game-over-speech");
    speech?.removeAttribute("hidden");
  }

  private hide(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.speechVisible = false;

    this.element.hidden = true;
    this.element.replaceChildren();
  }
}
