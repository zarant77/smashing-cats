import { GameSnapshot, PlayerId, type EntityKind } from "@smashing-cats/protocol";
import { createTranslator } from "@smashing-cats/i18n";

import "./ui/debug.js";

import { audio, initAudio, musicEvents, playSound } from "./audio/audio.js";
import { GameRuntime } from "./game/GameRuntime.js";
import { getMatchCode } from "./game/routing.js";
import { applyStaticTranslations, getRequiredElement, requestFullscreenFromUserGesture, toggleFullscreen } from "./ui/domControls.js";
import { SettingsOverlay } from "./ui/SettingsOverlay.js";
import { PauseOverlay } from "./ui/PauseOverlay.js";
import { CharacterSelect } from "./ui/CharacterSelect.js";
import { TouchControls } from "./ui/TouchControls.js";
import { GameOverPopup } from "./ui/GameOverPopup.js";
import { HelpPopup } from "./ui/HelpPopup.js";
import { Hud } from "./ui/Hud.js";
import { createView, parseViewKind } from "./views/createView.js";
import type { GameView, ViewKind } from "./views/types.js";

import "./styles/index.css";

const SOUNDS_ENABLED_KEY = "smashing-cats-sounds-enabled";
const MUSIC_ENABLED_KEY = "smashing-cats-music-enabled";
const LOCALE_KEY = "smashing-cats-locale";
const VIEW_KEY = "smashing-cats-view";
const CHARACTER_KEY = "smashing-cats-character";

const VIEW_SHORTCUTS: Record<string, ViewKind> = {
  Digit1: "canvas",
  Digit2: "phaser",
  Digit3: "three",
  Numpad1: "canvas",
  Numpad2: "phaser",
  Numpad3: "three",
};

void bootstrap();

async function bootstrap(): Promise<void> {
  await initAudio();

  const root = getRequiredElement<HTMLElement>("#game-root", "Game root");
  const uiRoot = getRequiredElement<HTMLElement>("#ui-root", "UI root");

  const params = new URLSearchParams(window.location.search);
  const matchCode = getMatchCode(params);
  const multiplayer = matchCode !== undefined;

  let locale = params.get("locale") ?? localStorage.getItem(LOCALE_KEY) ?? "en";
  let t = createTranslator(locale);

  let soundsEnabled = localStorage.getItem(SOUNDS_ENABLED_KEY) !== "false";
  let musicEnabled = localStorage.getItem(MUSIC_ENABLED_KEY) !== "false";

  let viewKind = parseViewKind(params.get("view") ?? localStorage.getItem(VIEW_KEY));
  let selectedCharacterKind = localStorage.getItem(CHARACTER_KEY) as EntityKind | null;

  let view: GameView = await createView(viewKind, root);
  let characterSelect: CharacterSelect | undefined;
  let gameOverPopup: GameOverPopup | undefined;
  let settingsOverlay: SettingsOverlay | undefined;
  let runtime: GameRuntime | undefined;

  let lastSnapshot: GameSnapshot | undefined;
  let lastPlayerId: PlayerId | undefined;
  let settingsPausedGame = false;

  audio.setSoundsEnabled(soundsEnabled);
  audio.setMusicEnabled(musicEnabled);
  view.setLocale?.(locale, t);

  const hud = new Hud(uiRoot, t);
  const pauseOverlay = new PauseOverlay(uiRoot, t);
  const touchControls = TouchControls.isTouchDevice() ? new TouchControls() : undefined;

  const helpPopup = new HelpPopup(uiRoot, t, {
    onClose: () => {
      playSound("sound.ui_click");
      if (!settingsPausedGame && runtime?.isGameRunning() === true) {
        runtime.setPaused(false);
      }
    },
  });

  const renderCharacterSelect = (): void => {
    if (characterSelect === undefined || runtime === undefined) {
      return;
    }

    characterSelect.render(runtime.characters, runtime.hasSelectedCharacter);
  };

  const syncSettingsOverlay = (): void => {
    settingsOverlay?.setState({
      currentEngine: viewKind,
      currentLanguage: locale === "uk" ? "uk" : "en",
      soundEnabled: soundsEnabled,
      musicEnabled,
      fullscreenEnabled: document.fullscreenElement !== null,
    });
  };

  runtime = new GameRuntime({
    multiplayer,
    matchCode,
    touchControls,
    onCharacterStateChange: renderCharacterSelect,
    render: (snapshot, playerId) => {
      lastSnapshot = snapshot;
      lastPlayerId = playerId;

      view.render(snapshot, playerId);
      hud.render(snapshot, playerId);
      pauseOverlay.render(snapshot, playerId);
      settingsOverlay?.render(snapshot, playerId);
      gameOverPopup?.render(snapshot, playerId);
      touchControls?.update(snapshot, playerId);
    },
  });

  document.addEventListener("fullscreenchange", () => {
    syncSettingsOverlay();
  });

  gameOverPopup = new GameOverPopup(uiRoot, t, {
    onRestart: () => {
      playSound("sound.ui_click");
      runtime?.restart();
    },
  });

  characterSelect = new CharacterSelect(uiRoot, {
    locale,
    t,
    initialCharacterKind: selectedCharacterKind ?? undefined,
    onSelect: (characterKind: EntityKind) => {
      if (runtime === undefined || !runtime.selectCharacter(characterKind)) {
        return;
      }

      playSound("sound.ui_click");

      selectedCharacterKind = characterKind;
      localStorage.setItem(CHARACTER_KEY, characterKind);

      characterSelect?.setPreferredCharacter(characterKind);
    },
  });

  settingsOverlay = new SettingsOverlay(uiRoot, t, {
    onOpen: () => {
      if (runtime === undefined || !runtime.isGameRunning() || runtime.isPaused()) {
        settingsPausedGame = false;
        settingsOverlay?.setPauseDisabled(false);
        return;
      }

      runtime.setPaused(true);
      settingsPausedGame = true;
      settingsOverlay?.setPauseDisabled(true);
    },

    onClose: () => {
      if (settingsPausedGame) {
        runtime?.setPaused(false);
        settingsPausedGame = false;
      }
    },

    onHelp: () => {
      playSound("sound.ui_click");
      if (runtime?.isGameRunning() === true) {
        runtime.setPaused(true);
      }
      helpPopup.show();
    },

    onPause: () => {
      playSound("sound.ui_click");

      if (runtime?.isGameRunning() === true) {
        runtime.togglePause();
      }
    },

    onToggleSound: () => {
      soundsEnabled = !soundsEnabled;

      localStorage.setItem(SOUNDS_ENABLED_KEY, String(soundsEnabled));
      audio.setSoundsEnabled(soundsEnabled);

      if (soundsEnabled) {
        playSound("sound.ui_click");
      }

      syncSettingsOverlay();
    },

    onToggleMusic: () => {
      musicEnabled = !musicEnabled;

      localStorage.setItem(MUSIC_ENABLED_KEY, String(musicEnabled));
      audio.setMusicEnabled(musicEnabled);

      playSound("sound.ui_click");
      musicEvents.gameplay();

      syncSettingsOverlay();
    },

    onToggleFullscreen: () => {
      playSound("sound.ui_click");

      void (async () => {
        await toggleFullscreen();
        syncSettingsOverlay();
      })();
    },

    onSelectView: (view: ViewKind) => switchView(view),

    onSelectLanguage: (nextLocale: string) => setLocale(nextLocale),

    onExit: () => {
      playSound("sound.ui_click");
      runtime?.restart();
    },
  });

  syncSettingsOverlay();
  renderCharacterSelect();
  applyStaticTranslations(locale, t);
  bindFullscreenGesture();
  bindViewShortcuts();

  runtime.start();

  function setLocale(nextLocale: string): void {
    playSound("sound.ui_click");

    locale = nextLocale;
    t = createTranslator(locale);

    localStorage.setItem(LOCALE_KEY, locale);

    applyStaticTranslations(locale, t);

    hud.setTranslator(t);
    characterSelect?.setLocale(locale, t);
    renderCharacterSelect();

    view.setLocale?.(locale, t);

    document.title = t("title");

    syncSettingsOverlay();
  }

  async function switchView(nextViewKind: ViewKind): Promise<void> {
    playSound("sound.ui_click");

    if (nextViewKind === viewKind) {
      syncSettingsOverlay();
      return;
    }

    try {
      const previousView = view;
      const snapshot = lastSnapshot;
      const playerId = lastPlayerId;

      previousView.destroy();

      const nextView = await createView(nextViewKind, root);

      localStorage.setItem(VIEW_KEY, nextViewKind);

      nextView.setLocale?.(locale, t);
      nextView.render(snapshot, playerId);

      viewKind = nextViewKind;
      view = nextView;

      syncSettingsOverlay();
    } catch (error) {
      console.error(error);
      syncSettingsOverlay();
    }
  }

  function bindViewShortcuts(): void {
    window.addEventListener("keydown", (event) => {
      if (event.repeat || isEditableTarget(event.target)) {
        return;
      }

      const nextViewKind = VIEW_SHORTCUTS[event.code];

      if (nextViewKind === undefined) {
        return;
      }

      event.preventDefault();
      void switchView(nextViewKind);
    });
  }
}

function bindFullscreenGesture(): void {
  if (!TouchControls.isTouchDevice()) {
    return;
  }

  window.addEventListener("pointerup", requestFullscreenFromUserGesture, {
    once: true,
    capture: true,
  });
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return target.isContentEditable || target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
}
