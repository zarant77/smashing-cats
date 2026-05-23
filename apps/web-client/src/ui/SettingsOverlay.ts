import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { t } from "@smashing-cats/i18n";
import type { ViewKind } from "../views/types.js";
import { playSound } from "../audio/audio.js";
import { deviceController } from "../device/DeviceController.js";

type EngineKind = "canvas" | "phaser" | "three";
type LanguageKind = "en" | "uk";

type SettingsOverlayOptions = {
  isGameRunning?: () => boolean;
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
  currentEngine: EngineKind;
  currentLanguage: LanguageKind;
  soundEnabled: boolean;
  musicEnabled: boolean;
  vibrationEnabled: boolean;
  fullscreenEnabled: boolean;
};

const MENU_ANIMATION_MS = 220;

export class SettingsOverlay {
  private readonly element: HTMLDivElement;

  private readonly isGameRunning: () => boolean;
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

        <button class="fullscreen-button toolbar-fullscreen-button" type="button" data-i18n-title="fullscreen" title="${t("fullscreen")}" aria-label="${t("fullscreen")}">
          <span class="icon icon-fullscreen"></span>
        </button>

        <button class="menu-button" type="button" data-i18n-title="pause" title="${t("pause")}" aria-label="${t("pause")}">
          <span class="icon icon-menu"></span>
        </button>
      </div>

      <div class="card" hidden>
        <h2 data-i18n="settings">${t("settings")}</h2>

        <section class="settings-section">
          <h3 data-i18n="engine">${t("engine")}</h3>

          <div class="settings-row settings-row-3">
            <button class="engine-canvas-button" type="button" data-i18n-title="engineCanvas" title="${t("engineCanvas")}" aria-label="${t("engineCanvas")}">
              <span class="icon icon-canvas"></span>
            </button>

            <button class="engine-phaser-button" type="button" data-i18n-title="enginePhaser" title="${t("enginePhaser")}" aria-label="${t("enginePhaser")}">
              <span class="icon icon-phaser"></span>
            </button>

            <button class="engine-three-button" type="button" data-i18n-title="engineThree" title="${t("engineThree")}" aria-label="${t("engineThree")}">
              <span class="icon icon-three"></span>
            </button>
          </div>
        </section>

        <section class="settings-section">
          <h3 data-i18n="language">${t("language")}</h3>

          <div class="settings-row settings-row-2">
            <button class="language-en-button" type="button" data-i18n-title="languageEnglish" title="${t("languageEnglish")}" aria-label="${t("languageEnglish")}">
              <span class="icon icon-en"></span>
            </button>

            <button class="language-ua-button" type="button" data-i18n-title="languageUkrainian" title="${t("languageUkrainian")}" aria-label="${t("languageUkrainian")}">
              <span class="icon icon-ua"></span>
            </button>
          </div>
        </section>

        <section class="settings-section">
          <h3 data-i18n="audio">${t("audio")}</h3>

          <div class="settings-row settings-row-3">
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

        <button class="exit-button" type="button" data-i18n-title="exit" title="${t("exit")}" aria-label="${t("exit")}">
          <span class="icon icon-exit"></span>
        </button>
      </div>
    `;

    root.append(this.element);
    this.bindEvents();
    this.syncActiveButtons();
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
      if (!this.isVisible()) {
        return;
      }

      this.element.classList.add("settings-overlay-open");
      this.element.classList.add("popup-open");
      this.syncActiveButtons();
    });
  }

  public hide(): void {
    if (!this.isVisible()) {
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

    if (this.isVisible()) {
      this.hide();
      return;
    }

    this.show();
  }

  public isVisible(): boolean {
    return !this.card.hidden;
  }

  private get card(): HTMLDivElement {
    const card = this.element.querySelector<HTMLDivElement>(".card");

    if (card === null) {
      throw new Error("Settings card not found");
    }

    return card;
  }

  private bindEvents(): void {
    this.element.addEventListener("click", (event) => {
      const target = event.target;

      if (!(target instanceof HTMLButtonElement)) {
        return;
      }

      playSound("sound.ui_click");
    });

    this.element.querySelector<HTMLButtonElement>(".menu-button")?.addEventListener("click", (event) => {
      event.stopPropagation();
      this.toggle();
    });

    this.element.querySelector<HTMLButtonElement>(".help-button")?.addEventListener("click", () => this.onHelp?.());
    this.element.querySelector<HTMLButtonElement>(".fullscreen-button")?.addEventListener("click", () => this.onToggleFullscreen?.());
    this.element.querySelector<HTMLButtonElement>(".music-button")?.addEventListener("click", () => this.onToggleMusic?.());
    this.element.querySelector<HTMLButtonElement>(".sound-button")?.addEventListener("click", () => this.onToggleSound?.());
    this.element.querySelector<HTMLButtonElement>(".vibration-button")?.addEventListener("click", () => this.onToggleVibration?.());
    this.element.querySelector<HTMLButtonElement>(".engine-canvas-button")?.addEventListener("click", () => this.onSelectView?.("canvas"));
    this.element.querySelector<HTMLButtonElement>(".engine-phaser-button")?.addEventListener("click", () => this.onSelectView?.("phaser"));
    this.element.querySelector<HTMLButtonElement>(".engine-three-button")?.addEventListener("click", () => this.onSelectView?.("three"));
    this.element.querySelector<HTMLButtonElement>(".language-en-button")?.addEventListener("click", () => this.onSelectLanguage?.("en"));
    this.element.querySelector<HTMLButtonElement>(".language-ua-button")?.addEventListener("click", () => this.onSelectLanguage?.("uk"));
    this.element.querySelector<HTMLButtonElement>(".exit-button")?.addEventListener("click", () => this.onExit?.());

    this.element.addEventListener("pointerdown", (event) => {
      if (!this.element.classList.contains("settings-overlay-open")) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Node)) {
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
    this.setButtonActive(".menu-button", this.isVisible());
    this.setButtonActive(".engine-canvas-button", this.state.currentEngine === "canvas");
    this.setButtonActive(".engine-phaser-button", this.state.currentEngine === "phaser");
    this.setButtonActive(".engine-three-button", this.state.currentEngine === "three");
    this.setButtonActive(".language-en-button", this.state.currentLanguage === "en");
    this.setButtonActive(".language-ua-button", this.state.currentLanguage === "uk");
    this.setButtonActive(".sound-button", this.state.soundEnabled);
    this.setButtonActive(".music-button", this.state.musicEnabled);
    this.setButtonActive(".vibration-button", this.state.vibrationEnabled);
    this.setButtonDisabled(".vibration-button", !(deviceController.isVibrationSupported && deviceController.isProbablyMobile));
    this.setButtonActive(".fullscreen-button", this.state.fullscreenEnabled);

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

    if (paused && !this.isVisible()) {
      this.show();
    }

    if (!paused && this.isVisible()) {
      this.hide();
    }
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
