import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { getDeathPhrase, i18n, t } from "@smashing-cats/i18n";

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

  private kind: string | undefined;
  private score = 0;
  private speechPhrase = "";

  public constructor(root: HTMLElement, options: GameOverPopupOptions) {
    this.onRestart = options.onRestart;

    this.element = document.createElement("div");
    this.element.className = "game-over-popup";
    this.element.hidden = true;

    root.append(this.element);

    i18n.onLocaleChanged(() => {
      if (this.visible && this.kind !== undefined) {
        this.speechPhrase = getDeathPhrase(this.kind);
        this.renderContent(this.kind, this.score);
      }
    });
  }

  public render(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    const player = snapshot?.players.find((item) => item.playerId === localPlayerId);

    if (player === undefined || player.alive) {
      this.deadAt = undefined;
      this.shownForPlayerId = undefined;
      this.kind = undefined;
      this.score = 0;
      this.speechPhrase = "";

      this.hide();
      return;
    }

    if (this.shownForPlayerId !== player.playerId) {
      this.shownForPlayerId = player.playerId;
      this.deadAt = performance.now();
      this.kind = player.kind;
      this.score = player.score;
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

  private show(kind: string, score: number): void {
    this.kind = kind;
    this.score = score;

    if (this.visible) {
      return;
    }

    this.visible = true;
    this.speechVisible = false;
    this.element.hidden = false;

    this.renderContent(kind, score);
  }

  private renderContent(kind: string, score: number): void {
    const speechHidden = this.speechVisible ? "" : "hidden";

    this.element.innerHTML = `
      <div class="card">
        <h2>${t("gameOverTitle")}</h2>

        <div class="character-preview">
          <div class="game-over-speech" ${speechHidden}>
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

    this.element.querySelector<HTMLButtonElement>(".restart")?.addEventListener("click", () => {
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
