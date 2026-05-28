import type { GameSnapshot, LeaderboardEntry, PlayerId } from "@smashing-cats/protocol";
import { TICK_RATE } from "@smashing-cats/core";
import { getDeathPhrase, i18n, t } from "@smashing-cats/i18n";

import {
  escapeHtml,
  getPlayerName,
  formatDuration,
  isTop10Place,
  setPlayerName,
  PLAYER_NAME_MAX_LENGTH,
  sanitizePlayerName,
  PLAYER_NAME_ALLOWED_PATTERN,
  isAllowedPlayerNameKey,
  isAllowedPlayerNameCharacter,
} from "../helpers/index.js";

type GameOverPopupOptions = {
  onRestart: () => void;
  onLeaderboardRequest: () => void;
  onLeaderboardSubmit: (playerName: string) => void;
};

const SHOW_DELAY_MS = 2000;
const SPEECH_DELAY_MS = 1000;
const LEADERBOARD_ENTRY_CLASS = "game-over--leaderboard-entry";

export class GameOverPopup {
  private readonly element: HTMLDivElement;
  private readonly onRestart: () => void;
  private readonly onLeaderboardRequest: () => void;
  private readonly onLeaderboardSubmit: (playerName: string) => void;

  private visible = false;
  private speechVisible = false;
  private leaderboardRequested = false;
  private leaderboardEligible = false;
  private leaderboardSubmitted = false;
  private leaderboardEntrySkipped = false;

  private deadAt: number | undefined;
  private shownForPlayerId: PlayerId | undefined;

  private kind: string | undefined;
  private score = 0;
  private elapsedSeconds = 0;
  private eligibleScore = 0;
  private leaderboardEntries: LeaderboardEntry[] = [];
  private speechPhrase = "";

  public constructor(root: HTMLElement, options: GameOverPopupOptions) {
    this.onRestart = options.onRestart;
    this.onLeaderboardRequest = options.onLeaderboardRequest;
    this.onLeaderboardSubmit = options.onLeaderboardSubmit;

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
      this.reset();
      this.hide();
      return;
    }

    if (this.shownForPlayerId !== player.playerId) {
      this.shownForPlayerId = player.playerId;
      this.deadAt = performance.now();
      this.kind = player.kind;
      this.score = player.score;
      this.elapsedSeconds = Math.max(0, Math.floor((snapshot?.tick ?? 0) / TICK_RATE));
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

  public setLeaderboard(entries: LeaderboardEntry[]): void {
    this.leaderboardEntries = entries;
    this.rerender();
  }

  public setLeaderboardEligible(score: number, place: number): void {
    this.leaderboardEligible = isTop10Place(place);
    this.leaderboardEntrySkipped = false;
    this.eligibleScore = score;
    this.rerender();
  }

  public setReplayVerificationAccepted(score: number, place: number): void {
    this.setLeaderboardEligible(score, place);
  }

  public setReplayVerificationRejected(): void {
    this.leaderboardEligible = false;
    this.rerender();
  }

  public setLeaderboardSubmitted(entries: LeaderboardEntry[]): void {
    this.leaderboardSubmitted = true;
    this.leaderboardEligible = false;
    this.leaderboardEntries = entries;
    this.rerender();
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

    if (!this.leaderboardRequested) {
      this.leaderboardRequested = true;
      this.onLeaderboardRequest();
    }

    this.renderContent(kind, score);
  }

  private renderContent(kind: string, score: number): void {
    this.element.innerHTML = `
      <div class="game-over-card">
        ${this.renderHeader()}
        ${this.renderMain(kind, score)}
        ${this.renderFooter()}
      </div>
    `;

    this.bindEvents();
    this.syncLeaderboardEntryState();
  }

  private renderHeader(): string {
    return `
      <header class="game-over-header">
        <h2 class="game-over-title">${t("gameOverTitle")}</h2>
      </header>
    `;
  }

  private renderMain(kind: string, score: number): string {
    return `
      <main class="game-over-main">
        ${this.renderHero(kind, score)}
        ${this.renderLeaderboard()}
      </main>
    `;
  }

  private renderHero(kind: string, score: number): string {
    const speechHidden = this.speechVisible ? "" : "hidden";

    return `
    <section class="game-over-hero" aria-label="${t("gameOverCharacter")}">
      <div class="game-over-character">
        <div class="game-over-speech" ${speechHidden}>
          ${escapeHtml(this.speechPhrase)}
        </div>

        <img
          class="game-over-platform"
          src="/ui/character_platform.png"
          alt=""
        />

        <img
          class="game-over-portrait"
          src="/portraits/${escapeHtml(kind)}.png"
          alt="${escapeHtml(kind)}"
        />
      </div>

      <div class="game-over-stats">
        <div class="game-over-stat">
          <span>${t("score")}</span>
          <strong>${score}</strong>
        </div>

        <div class="game-over-stat">
          <span>${t("time")}</span>
          <strong>${this.renderElapsedTime()}</strong>
        </div>
      </div>
    </section>
  `;
  }

  private renderLeaderboard(): string {
    return `
      <section class="game-over-leaderboard" aria-label="${t("leaderboard")}">
        <header class="game-over-leaderboard-header">
          <h3 class="game-over-leaderboard-title">${t("leaderboard")}</h3>
        </header>

        <div class="game-over-leaderboard-body">
          ${this.renderLeaderboardRows()}
        </div>
      </section>
    `;
  }

  private renderNameSubmitForm(): string {
    return `
    <form class="game-over-submit-form" aria-label="${t("gameOverLeaderboardEntryTitle")}">
      <h3 class="game-over-submit-title">${t("gameOverLeaderboardEntryTitle")}</h3>

      <div class="game-over-submit-controls">
        <input
          class="game-over-submit-name"
          name="playerName"
          type="text"
          inputmode="text"
          aria-label="${t("name")}"
          maxlength="${PLAYER_NAME_MAX_LENGTH}"
          autocomplete="off"
          autocapitalize="characters"
          autocorrect="off"
          spellcheck="false"
          pattern="${PLAYER_NAME_ALLOWED_PATTERN}{1,${PLAYER_NAME_MAX_LENGTH}}"
          value="${escapeHtml(sanitizePlayerName(getPlayerName()))}"
        />

        <button
          class="button game-over-submit-button"
          type="submit"
        >
          ${t("gameOverLeaderboardSubmit")}
        </button>
      </div>

      <button class="game-over-submit-skip" type="button">
        ${t("gameOverLeaderboardSkip")}
      </button>
    </form>
  `;
  }

  private renderLeaderboardRows(): string {
    if (this.leaderboardEntries.length === 0) {
      return `<p class="game-over-empty-leaderboard">${t("noScoresYet")}</p>`;
    }

    return `
      <ol class="game-over-leaderboard-list">
        <li class="game-over-leaderboard-row game-over-leaderboard-row-header">
          <span>${t("name")}</span>
          <span>${t("character")}</span>
          <span>${t("time")}</span>
          <span>${t("score")}</span>
        </li>
        ${this.leaderboardEntries
          .map(
            (entry) => `
              <li class="game-over-leaderboard-row">
                <span class="game-over-leaderboard-name-text">${escapeHtml(entry.playerName)}</span>
                <span class="game-over-leaderboard-character">${escapeHtml(t(entry.characterKind))}</span>
                <span class="game-over-leaderboard-time">${formatDuration(entry.durationSeconds)}</span>
                <strong class="game-over-leaderboard-score">${entry.score}</strong>
              </li>
            `,
          )
          .join("")}
      </ol>
    `;
  }

  private renderFooter(): string {
    if (this.isLeaderboardEntryActive()) {
      return `
        <footer class="game-over-footer">
          ${this.renderNameSubmitForm()}
        </footer>
      `;
    }

    return `
      <footer class="game-over-footer">
        <button class="button game-over-restart" type="button">
          ${t("restart")}
        </button>
      </footer>
    `;
  }

  private bindEvents(): void {
    const input = this.element.querySelector<HTMLInputElement>(".game-over-submit-name");

    this.element.querySelector<HTMLButtonElement>(".game-over-restart")?.addEventListener("click", () => {
      this.onRestart();
    });

    this.element.querySelector<HTMLButtonElement>(".game-over-submit-skip")?.addEventListener("click", () => {
      this.leaderboardEntrySkipped = true;
      this.leaderboardEligible = false;
      this.rerender();
    });

    this.element.querySelector<HTMLFormElement>(".game-over-submit-form")?.addEventListener("submit", (event) => {
      event.preventDefault();

      const playerName = sanitizePlayerName(input?.value ?? "");

      if (playerName.length === 0) {
        return;
      }

      if (input) {
        input.value = playerName;
      }

      setPlayerName(playerName);
      this.onLeaderboardSubmit(playerName);
    });

    input?.addEventListener("input", () => {
      const start = input.selectionStart ?? input.value.length;
      const end = input.selectionEnd ?? input.value.length;

      const before = input.value;
      const after = sanitizePlayerName(before);

      if (before === after) {
        return;
      }

      const nextStart = sanitizePlayerName(before.slice(0, start)).length;
      const nextEnd = sanitizePlayerName(before.slice(0, end)).length;

      input.value = after;
      input.setSelectionRange(nextStart, nextEnd);
    });

    input?.addEventListener("paste", (event) => {
      const pastedText = event.clipboardData?.getData("text") ?? "";

      if (pastedText.length === 0) {
        return;
      }

      event.preventDefault();
      this.insertSanitizedPlayerNameText(input, pastedText);
    });

    input?.addEventListener("keydown", (event) => {
      if (event.metaKey || event.ctrlKey || event.altKey) {
        return;
      }

      if (isAllowedPlayerNameKey(event.key)) {
        return;
      }

      if (event.key.length === 1 && !isAllowedPlayerNameCharacter(event.key)) {
        event.preventDefault();
      }
    });
  }

  private insertSanitizedPlayerNameText(input: HTMLInputElement, text: string): void {
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const prefix = input.value.slice(0, start);
    const suffix = input.value.slice(end);
    const availableLength = PLAYER_NAME_MAX_LENGTH - sanitizePlayerName(prefix).length - sanitizePlayerName(suffix).length;
    const insertion = sanitizePlayerName(text).slice(0, Math.max(0, availableLength));
    const nextValue = sanitizePlayerName(`${prefix}${insertion}${suffix}`);
    const nextCaret = sanitizePlayerName(`${prefix}${insertion}`).length;

    input.value = nextValue;
    input.setSelectionRange(nextCaret, nextCaret);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }

  private renderElapsedTime(): string {
    const minutes = Math.floor(this.elapsedSeconds / 60);
    const seconds = this.elapsedSeconds % 60;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  private showSpeech(): void {
    if (this.speechVisible) {
      return;
    }

    this.speechVisible = true;

    const speech = this.element.querySelector<HTMLElement>(".game-over-speech");
    speech?.removeAttribute("hidden");
  }

  private rerender(): void {
    if (this.visible && this.kind !== undefined) {
      this.renderContent(this.kind, this.score);
    }
  }

  private syncLeaderboardEntryState(): void {
    const active = this.isLeaderboardEntryActive();
    const wasActive = this.element.classList.contains(LEADERBOARD_ENTRY_CLASS);

    this.element.classList.toggle(LEADERBOARD_ENTRY_CLASS, active);

    if (active && !wasActive && this.canFocusLeaderboardInput()) {
      window.requestAnimationFrame(() => {
        this.element.querySelector<HTMLInputElement>(".game-over-submit-name")?.focus({ preventScroll: true });
      });
    }
  }

  private canFocusLeaderboardInput(): boolean {
    if (document.activeElement !== null && document.activeElement !== document.body) {
      return false;
    }

    return window.matchMedia("(pointer: fine)").matches;
  }

  private isLeaderboardEntryActive(): boolean {
    return this.leaderboardEligible && !this.leaderboardSubmitted && !this.leaderboardEntrySkipped;
  }

  private reset(): void {
    this.deadAt = undefined;
    this.shownForPlayerId = undefined;

    this.kind = undefined;
    this.score = 0;
    this.elapsedSeconds = 0;
    this.eligibleScore = 0;
    this.leaderboardEntries = [];
    this.speechPhrase = "";

    this.leaderboardRequested = false;
    this.leaderboardEligible = false;
    this.leaderboardSubmitted = false;
    this.leaderboardEntrySkipped = false;
  }

  private hide(): void {
    if (!this.visible) {
      return;
    }

    this.visible = false;
    this.speechVisible = false;

    this.element.hidden = true;
    this.element.classList.remove(LEADERBOARD_ENTRY_CLASS);
    this.element.replaceChildren();
  }
}
