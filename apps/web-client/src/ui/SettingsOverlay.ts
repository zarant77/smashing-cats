import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { t, type TranslationLocale } from "@smashing-cats/i18n";
import type { ViewKind } from "../views/types.js";
import { playSound } from "../audio/audio.js";
import { deviceController } from "../device/DeviceController.js";
import { storage } from "../storage.js";
import { isNativeApp } from "../device/capacitor.js";

type SettingsOverlayOptions = {
  isGameRunning?: () => boolean;
  showEngineSelector?: boolean;
  enabledViews?: readonly ViewKind[];
  onClose?: () => void;
  onHelp?: () => void;
  onToggleMenu?: () => void;
  onPause?: () => void;
  onToggleFullscreen?: () => void;
  onToggleMusic?: () => void;
  onToggleSound?: () => void;
  onToggleVibration?: () => void;
  onSelectView?: (view: ViewKind) => void;
  onSelectLanguage?: (lang: string) => void;
  onExit?: () => void;
};

type SettingsOverlayState = {
  currentEngine: ViewKind;
  currentLanguage: TranslationLocale;
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  fullscreenEnabled: boolean;
};

const MENU_ANIMATION_MS = 220;
const MATCH_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const MATCH_CODE_LENGTH = 6;
const CREATED_MATCH_CODE_STORAGE_KEY = "smashing-cats-created-match-code";

type NetworkGameTab = "create" | "join";

export class SettingsOverlay {
  private readonly element: HTMLDivElement;

  private readonly isGameRunning: () => boolean;
  private readonly showEngineSelector: boolean;
  private readonly enabledViews: readonly ViewKind[];
  private readonly onClose?: () => void;
  private readonly onHelp?: () => void;
  private readonly onToggleMenu?: () => void;
  private readonly onPause?: () => void;
  private readonly onToggleFullscreen?: () => void;
  private readonly onToggleMusic?: () => void;
  private readonly onToggleSound?: () => void;
  private readonly onToggleVibration?: () => void;
  private readonly onSelectView?: (view: ViewKind) => void;
  private readonly onSelectLanguage?: (lang: string) => void;
  private readonly onExit?: () => void;

  private state: SettingsOverlayState = {
    currentEngine: "canvas",
    currentLanguage: "en",
    soundEnabled: true,
    musicEnabled: true,
    vibrationEnabled: true,
    fullscreenEnabled: false,
  };

  private closeTimeoutId: number | undefined;

  private isPaused = false;

  public constructor(root: HTMLElement, options: SettingsOverlayOptions = {}) {
    this.isGameRunning = options.isGameRunning ?? (() => false);
    this.showEngineSelector = options.showEngineSelector ?? true;
    this.enabledViews = options.enabledViews ?? ["canvas", "phaser", "three"];
    this.onClose = options.onClose;
    this.onHelp = options.onHelp;
    this.onToggleMenu = options.onToggleMenu;
    this.onPause = options.onPause;
    this.onToggleFullscreen = options.onToggleFullscreen;
    this.onToggleMusic = options.onToggleMusic;
    this.onToggleSound = options.onToggleSound;
    this.onToggleVibration = options.onToggleVibration;
    this.onSelectView = options.onSelectView;
    this.onSelectLanguage = options.onSelectLanguage;
    this.onExit = options.onExit;

    this.element = document.createElement("div");
    this.element.className = "settings-overlay";

    this.element.innerHTML = `
      <div class="pause-title" data-i18n="pause"><b>P</b><b>A</b><b>U</b><b>S</b><b>E</b></div>

      <div class="toolbar">
        <button class="help-button" type="button" data-i18n-title="help" title="${t("help")}" aria-label="${t("help")}">
          <span class="icon icon-help"></span>
        </button>

        ${this.renderFullscreenButton()}

        <button class="netplay-button" type="button" data-i18n-title="networkGame" title="${t("networkGame")}" aria-label="${t("networkGame")}">
          <span class="icon icon-netplay"></span>
        </button>

        <button class="menu-button" type="button" data-i18n-title="pause" title="${t("pause")}" aria-label="${t("pause")}">
          <span class="icon icon-menu"></span>
        </button>
      </div>

      <div class="network-game-popup popup-open" hidden>
        <div class="network-game-backdrop"></div>

        <div class="network-game-card" role="dialog" aria-modal="true" aria-labelledby="network-game-title">
          <button class="network-game-close-button" type="button" data-i18n-title="close" title="${t("close")}" aria-label="${t("close")}">
            <span aria-hidden="true">×</span>
          </button>

          <h2 id="network-game-title" data-i18n="networkGame">${t("networkGame")}</h2>

          <div
            class="network-game-tabs"
            role="tablist"
            data-i18n-title="networkGame"
            aria-label="${t("networkGame")}"
          >
            <button
              class="network-game-tab-button active"
              type="button"
              role="tab"
              id="network-create-tab"
              aria-controls="network-create-panel"
              aria-selected="true"
              data-network-tab="create"
              data-i18n="createGame"
            >${t("createGame")}</button>

            <button
              class="network-game-tab-button"
              type="button"
              role="tab"
              id="network-join-tab"
              aria-controls="network-join-panel"
              aria-selected="false"
              data-network-tab="join"
              data-i18n="joinGame"
            >${t("joinGame")}</button>
          </div>

          <section
            class="network-game-panel network-create-panel"
            id="network-create-panel"
            role="tabpanel"
            aria-labelledby="network-create-tab"
          >
            <button class="network-game-primary-button network-create-button" type="button" data-i18n="createGame">
              ${t("createGame")}
            </button>

            <div class="network-room-result" aria-live="polite" hidden>
              <span data-i18n="roomKey">${t("roomKey")}</span>
              <output class="network-room-key"></output>
            </div>
          </section>

          <section
            class="network-game-panel network-join-panel"
            id="network-join-panel"
            role="tabpanel"
            aria-labelledby="network-join-tab"
            hidden
          >
            <label for="network-room-input" data-i18n="roomKeyOrLink">${t("roomKeyOrLink")}</label>

            <input
              class="network-room-input"
              id="network-room-input"
              type="text"
              inputmode="text"
              autocomplete="off"
              autocapitalize="characters"
              spellcheck="false"
              placeholder="https://smash.catemup.com/?match=AAA"
              aria-describedby="network-room-error"
            >

            <p class="network-room-error" id="network-room-error" data-i18n="invalidRoomKey" hidden>
              ${t("invalidRoomKey")}
            </p>

            <button class="network-game-primary-button network-join-button" type="button" data-i18n="joinMatch">
              ${t("joinMatch")}
            </button>
          </section>
        </div>
      </div>

      <div class="card" hidden>
        <h2 data-i18n="settings">${t("settings")}</h2>

        ${this.renderEngineSelector()}

        <section class="settings-section">
          <h3 data-i18n="language">${t("language")}</h3>

          <div class="settings-row">
            <button class="language-en-button" type="button" title="English" aria-label="English">
              <span class="icon icon-flag">🇬🇧</span>
            </button>

            <button class="language-ua-button" type="button" title="Українська" aria-label="Українська">
              <span class="icon icon-flag">🇺🇦</span>
            </button>

            <button class="language-pl-button" type="button" title="Polski" aria-label="Polski">
              <span class="icon icon-flag">🇵🇱</span>
            </button>
          </div>
        </section>

        <section class="settings-section">
          <h3 data-i18n="audio">${t("audio")}</h3>

          <div class="settings-row">
            <button class="sound-button" type="button" data-i18n-title="sound" title="${t("sound")}" aria-label="${t("sound")}">
              <span class="icon icon-sound"></span>
            </button>

            <button class="music-button" type="button" data-i18n-title="music" title="${t("music")}" aria-label="${t("music")}">
              <span class="icon icon-music"></span>
            </button>

            <button class="vibration-button" type="button" data-i18n-title="vibration" title="${t("vibration")}" aria-label="${t("vibration")}">
              <span class="icon icon-vibro"></span>
            </button>
          </div>
        </section>

        <div class="settings-exit-separator" aria-hidden="true"></div>

        <div class="settings-exit-row">
          <button class="tutorial-button" type="button" data-i18n-title="tutorialEnabled" title="${t("tutorialEnabled")}" aria-label="${t("tutorialEnabled")}">
            <span class="icon icon-tutorial"></span>
          </button>

          <button class="exit-button" type="button" data-i18n-title="exit" title="${t("exit")}" aria-label="${t("exit")}">
            <span class="icon icon-exit"></span>
          </button>
        </div>

        <div class="version">v${__APP_VERSION__}</div>
      </div>
    `;

    root.append(this.element);
    this.bindEvents();
    this.syncActiveButtons();
    this.restoreCreatedNetworkGame();
  }

  public render(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    const localPlayer =
      snapshot === undefined || localPlayerId === undefined
        ? undefined
        : snapshot.players.find((player) => player.playerId === localPlayerId);

    this.setPaused(snapshot?.gamePaused === true || localPlayer?.paused === true, this.isGameRunning());
  }

  public setState(state: SettingsOverlayState): void {
    this.state = state;
    this.syncActiveButtons();
  }

  public show(): void {
    this.clearCloseTimeout();

    this.card.hidden = false;
    this.element.classList.remove("settings-overlay-closing");

    window.requestAnimationFrame(() => {
      if (!this.visible) {
        return;
      }

      this.element.classList.add("settings-overlay-open");
      this.element.classList.add("popup-open");
      this.syncActiveButtons();
    });
  }

  public hide(): void {
    if (!this.visible) {
      return;
    }

    this.clearCloseTimeout();

    this.element.classList.remove("settings-overlay-open");
    this.element.classList.remove("popup-open");
    this.element.classList.add("settings-overlay-closing");
    this.syncActiveButtons();

    this.closeTimeoutId = window.setTimeout(() => {
      this.card.hidden = true;
      this.element.classList.remove("settings-overlay-closing");
      this.closeTimeoutId = undefined;
      this.syncActiveButtons();
      this.onClose?.();
    }, MENU_ANIMATION_MS);
  }

  public toggle(): void {
    if (this.isGameRunning()) {
      this.onPause?.();
      return;
    }

    this.onToggleMenu?.();

    if (this.visible) {
      this.hide();
      return;
    }

    this.show();
  }

  public get visible(): boolean {
    return !this.card.hidden;
  }

  private get card(): HTMLDivElement {
    const card = this.element.querySelector<HTMLDivElement>(".card");

    if (card === null) {
      throw new Error("Settings card not found");
    }

    return card;
  }

  private get networkGamePopup(): HTMLDivElement {
    const popup = this.element.querySelector<HTMLDivElement>(".network-game-popup");

    if (popup === null) {
      throw new Error("Network game popup not found");
    }

    return popup;
  }

  private bindEvents(): void {
    this.element.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      if (target.closest(".network-game-popup, .netplay-button") !== null) {
        return;
      }

      playSound("sound.ui_click");
    });

    this.element.querySelector<HTMLButtonElement>(".menu-button")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle();
    });

    this.element.querySelector<HTMLButtonElement>(".help-button")?.addEventListener("click", () => this.onHelp?.());
    this.element
      .querySelector<HTMLButtonElement>(".fullscreen-button")
      ?.addEventListener("click", () => this.onToggleFullscreen?.());
    this.element.querySelector<HTMLButtonElement>(".netplay-button")?.addEventListener("click", () => {
      playSound("sound.ui_click");

      if (this.networkGamePopup.hidden) {
        this.showNetworkGamePopup();
        return;
      }

      this.hideNetworkGamePopup();
    });
    this.element.querySelector<HTMLButtonElement>(".network-game-close-button")?.addEventListener("click", () => {
      playSound("sound.ui_click");
      this.hideNetworkGamePopup();
    });
    this.element.querySelector<HTMLDivElement>(".network-game-backdrop")?.addEventListener("click", () => {
      playSound("sound.ui_click");
      this.hideNetworkGamePopup();
    });
    this.element.querySelectorAll<HTMLButtonElement>(".network-game-tab-button").forEach((button) => {
      button.addEventListener("click", () => {
        const tab = button.dataset.networkTab;

        if (tab !== "create" && tab !== "join") {
          return;
        }

        playSound("sound.ui_click");
        this.selectNetworkGameTab(tab);
      });
    });
    this.element.querySelector<HTMLButtonElement>(".network-create-button")?.addEventListener("click", () => {
      playSound("sound.ui_click");
      this.createNetworkGame();
    });
    this.element.querySelector<HTMLButtonElement>(".network-join-button")?.addEventListener("click", () => {
      playSound("sound.ui_click");
      this.joinNetworkGame();
    });
    this.element.querySelector<HTMLInputElement>(".network-room-input")?.addEventListener("input", () => {
      this.setNetworkRoomErrorVisible(false);
    });
    this.element.querySelector<HTMLInputElement>(".network-room-input")?.addEventListener("keydown", (event) => {
      if (event.key !== "Enter") {
        return;
      }

      event.preventDefault();
      playSound("sound.ui_click");
      this.joinNetworkGame();
    });
    this.element
      .querySelector<HTMLButtonElement>(".music-button")
      ?.addEventListener("click", () => this.onToggleMusic?.());
    this.element
      .querySelector<HTMLButtonElement>(".sound-button")
      ?.addEventListener("click", () => this.onToggleSound?.());
    this.element
      .querySelector<HTMLButtonElement>(".vibration-button")
      ?.addEventListener("click", () => this.onToggleVibration?.());
    this.element.querySelector<HTMLButtonElement>(".tutorial-button")?.addEventListener("click", () => {
      storage.tutorialDone = !storage.tutorialDone;
      this.syncActiveButtons();
    });
    this.element
      .querySelector<HTMLButtonElement>(".engine-canvas-button")
      ?.addEventListener("click", () => this.onSelectView?.("canvas"));
    this.element
      .querySelector<HTMLButtonElement>(".engine-phaser-button")
      ?.addEventListener("click", () => this.onSelectView?.("phaser"));
    this.element
      .querySelector<HTMLButtonElement>(".engine-three-button")
      ?.addEventListener("click", () => this.onSelectView?.("three"));
    this.element
      .querySelector<HTMLButtonElement>(".language-en-button")
      ?.addEventListener("click", () => this.onSelectLanguage?.("en"));
    this.element
      .querySelector<HTMLButtonElement>(".language-ua-button")
      ?.addEventListener("click", () => this.onSelectLanguage?.("uk"));
    this.element
      .querySelector<HTMLButtonElement>(".language-pl-button")
      ?.addEventListener("click", () => this.onSelectLanguage?.("pl"));
    this.element.querySelector<HTMLButtonElement>(".exit-button")?.addEventListener("click", () => this.onExit?.());

    this.element.addEventListener("pointerdown", (event) => {
      if (!this.element.classList.contains("settings-overlay-open")) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node)) {
        return;
      }

      if (this.networkGamePopup.contains(target)) {
        return;
      }

      if (this.card.contains(target)) {
        return;
      }

      const toolbar = this.element.querySelector(".toolbar");

      if (toolbar?.contains(target)) {
        return;
      }

      if (this.isGameRunning()) {
        this.onPause?.();
        return;
      }

      this.hide();
    });
  }

  private syncActiveButtons(): void {
    this.setButtonActive(".menu-button", this.visible);

    if (this.showEngineSelector) {
      for (const viewKind of this.enabledViews) {
        this.setButtonActive(`.engine-${viewKind}-button`, this.state.currentEngine === viewKind);
      }
    }

    this.setButtonActive(".language-en-button", this.state.currentLanguage === "en");
    this.setButtonActive(".language-ua-button", this.state.currentLanguage === "uk");
    this.setButtonActive(".language-pl-button", this.state.currentLanguage === "pl");
    this.setButtonActive(".sound-button", this.state.soundEnabled);
    this.setButtonActive(".music-button", this.state.musicEnabled);
    this.setButtonActive(".vibration-button", this.state.vibrationEnabled);
    this.setButtonActive(".tutorial-button", !storage.tutorialDone);
    this.setButtonDisabled(".vibration-button", !deviceController.vibrationSupported);

    this.setButtonActive(".fullscreen-button", this.state.fullscreenEnabled);
    this.setButtonActive(".netplay-button", !this.networkGamePopup.hidden);

    const pauseTitle = this.element.querySelector(".pause-title") as HTMLDivElement | null;

    if (pauseTitle) {
      pauseTitle.style.display = this.isGameRunning() && this.isPaused ? "block" : "none";
    }
  }

  private setPaused(paused: boolean, syncVisibility: boolean): void {
    this.isPaused = paused;

    if (!syncVisibility) {
      this.syncActiveButtons();
      return;
    }

    if (paused && !this.visible) {
      this.show();
    }

    if (!paused && this.visible) {
      this.hide();
    }
  }

  private showNetworkGamePopup(): void {
    this.networkGamePopup.hidden = false;
    this.selectNetworkGameTab("create");

    const currentMatchCode = getMatchCodeFromInput(window.location.href);

    if (currentMatchCode !== undefined) {
      this.showNetworkRoomKey(currentMatchCode);
    }

    this.syncActiveButtons();

    window.requestAnimationFrame(() => {
      this.element.querySelector<HTMLButtonElement>(".network-game-close-button")?.focus();
    });
  }

  private hideNetworkGamePopup(): void {
    this.networkGamePopup.hidden = true;
    this.setNetworkRoomErrorVisible(false);
    this.syncActiveButtons();
  }

  private selectNetworkGameTab(tab: NetworkGameTab): void {
    this.element.querySelectorAll<HTMLButtonElement>(".network-game-tab-button").forEach((button) => {
      const selected = button.dataset.networkTab === tab;

      button.classList.toggle("active", selected);
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    });

    const createPanel = this.element.querySelector<HTMLElement>(".network-create-panel");
    const joinPanel = this.element.querySelector<HTMLElement>(".network-join-panel");

    if (createPanel !== null) {
      createPanel.hidden = tab !== "create";
    }

    if (joinPanel !== null) {
      joinPanel.hidden = tab !== "join";
    }

    if (tab === "join") {
      window.requestAnimationFrame(() => {
        this.element.querySelector<HTMLInputElement>(".network-room-input")?.focus();
      });
    }
  }

  private createNetworkGame(): void {
    const matchCode = generateMatchCode();
    const matchUrl = createMatchUrl(matchCode);

    window.sessionStorage.setItem(CREATED_MATCH_CODE_STORAGE_KEY, matchCode);
    window.location.replace(matchUrl);
  }

  private joinNetworkGame(): void {
    const input = this.element.querySelector<HTMLInputElement>(".network-room-input");
    const matchCode = getMatchCodeFromInput(input?.value ?? "");

    if (matchCode === undefined) {
      this.setNetworkRoomErrorVisible(true);
      input?.focus();
      return;
    }

    window.location.assign(createMatchUrl(matchCode));
  }

  private showNetworkRoomKey(matchCode: string): void {
    const result = this.element.querySelector<HTMLDivElement>(".network-room-result");
    const output = this.element.querySelector<HTMLOutputElement>(".network-room-key");

    if (result !== null) {
      result.hidden = false;
    }

    if (output !== null) {
      output.value = matchCode;
      output.textContent = matchCode;
    }
  }

  private restoreCreatedNetworkGame(): void {
    const createdMatchCode = window.sessionStorage.getItem(CREATED_MATCH_CODE_STORAGE_KEY);

    if (createdMatchCode === null) {
      return;
    }

    window.sessionStorage.removeItem(CREATED_MATCH_CODE_STORAGE_KEY);

    const currentMatchCode = getMatchCodeFromInput(window.location.href);

    if (currentMatchCode !== createdMatchCode) {
      return;
    }

    this.showNetworkGamePopup();
  }

  private setNetworkRoomErrorVisible(visible: boolean): void {
    const error = this.element.querySelector<HTMLParagraphElement>(".network-room-error");

    if (error !== null) {
      error.hidden = !visible;
    }
  }

  private renderFullscreenButton(): string {
    if (isNativeApp) {
      return "";
    }

    return `
      <button class="fullscreen-button toolbar-fullscreen-button" type="button" data-i18n-title="fullscreen" title="${t("fullscreen")}" aria-label="${t("fullscreen")}">
        <span class="icon icon-fullscreen"></span>
      </button>
    `;
  }

  private renderEngineSelector(): string {
    if (!this.showEngineSelector) {
      return "";
    }

    return `
      <section class="settings-section">
        <h3 data-i18n="engine">${t("engine")}</h3>

        <div class="settings-row">
          ${this.enabledViews.map((viewKind) => this.renderEngineButton(viewKind)).join("")}
        </div>
      </section>
    `;
  }

  private renderEngineButton(viewKind: ViewKind): string {
    const translationKey = getEngineTranslationKey(viewKind);

    return `
      <button class="engine-${viewKind}-button" type="button" data-i18n-title="${translationKey}" title="${t(translationKey)}" aria-label="${t(translationKey)}">
        <span class="icon icon-${viewKind}"></span>
      </button>
    `;
  }

  private setButtonActive(selector: string, active: boolean): void {
    this.element.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
      button.classList.toggle("active", active);
    });
  }

  private setButtonDisabled(selector: string, disabled: boolean): void {
    this.element.querySelectorAll<HTMLButtonElement>(selector).forEach((button) => {
      button.disabled = disabled;
    });
  }

  private clearCloseTimeout(): void {
    if (this.closeTimeoutId === undefined) {
      return;
    }

    window.clearTimeout(this.closeTimeoutId);
    this.closeTimeoutId = undefined;
  }
}

function createMatchUrl(matchCode: string): string {
  const url = new URL(window.location.href);

  url.searchParams.set("match", matchCode);

  return url.toString();
}

function generateMatchCode(): string {
  let code = "";

  for (let index = 0; index < MATCH_CODE_LENGTH; index += 1) {
    code += MATCH_CODE_ALPHABET[Math.floor(Math.random() * MATCH_CODE_ALPHABET.length)];
  }

  return code;
}

function getMatchCodeFromInput(input: string): string | undefined {
  const value = input.trim();

  if (value === "") {
    return undefined;
  }

  if (!value.includes("://")) {
    return value.toUpperCase();
  }

  try {
    const url = new URL(value);
    const matchCode = url.searchParams.get("match")?.trim();

    return matchCode === undefined || matchCode === "" ? undefined : matchCode.toUpperCase();
  } catch {
    return undefined;
  }
}

function getEngineTranslationKey(viewKind: ViewKind): "engineCanvas" | "enginePhaser" | "engineThree" {
  switch (viewKind) {
    case "canvas":
      return "engineCanvas";

    case "phaser":
      return "enginePhaser";

    case "three":
      return "engineThree";
  }
}
