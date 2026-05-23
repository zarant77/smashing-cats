import { GameSnapshot, PlayerId, type EntityKind } from "@smashing-cats/protocol";
import { i18n } from "@smashing-cats/i18n";

import "./ui/debug.js";

import { audio, musicEvents, playSound, setupAudioUnlock } from "./audio/audio.js";
import { deviceController, setupDeviceUnlock } from "./device/DeviceController.js";
import { GameStateController } from "./game/GameStateController.js";
import { GameRuntime } from "./game/GameRuntime.js";
import { getMatchCode } from "./game/routing.js";
import { getRequiredElement, requestFullscreenFromUserGesture, toggleFullscreen, applyStaticTranslations } from "./ui/domControls.js";
import { SettingsOverlay } from "./ui/SettingsOverlay.js";
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
const VIBRATION_ENABLED_KEY = "smashing-cats-vibration-enabled";
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
  setupAudioUnlock();
  setupDeviceUnlock();

  const root = getRequiredElement<HTMLElement>("#game-root", "Game root");
  const uiRoot = getRequiredElement<HTMLElement>("#ui-root", "UI root");

  const params = new URLSearchParams(window.location.search);
  const matchCode = getMatchCode(params);
  const multiplayer = matchCode !== undefined;

  let soundEnabled = localStorage.getItem(SOUNDS_ENABLED_KEY) !== "false";
  let musicEnabled = localStorage.getItem(MUSIC_ENABLED_KEY) !== "false";
  let vibrationEnabled = localStorage.getItem(VIBRATION_ENABLED_KEY) !== "false";

  let viewKind = parseViewKind(params.get("view") ?? localStorage.getItem(VIEW_KEY));
  let selectedCharacterKind = localStorage.getItem(CHARACTER_KEY) as EntityKind | null;

  let view: GameView = await createView(viewKind, root);
  let characterSelect: CharacterSelect | undefined;
  let gameOverPopup: GameOverPopup | undefined;
  let settingsOverlay: SettingsOverlay | undefined;
  let runtime: GameRuntime | undefined;

  let lastSnapshot: GameSnapshot | undefined;
  let lastPlayerId: PlayerId | undefined;

  audio.setSoundsEnabled(soundEnabled);
  audio.setMusicEnabled(musicEnabled);

  const hud = new Hud(uiRoot);
  const touchControls = TouchControls.isTouchDevice() ? new TouchControls() : undefined;
  const gameStateController = new GameStateController();

  gameStateController
    .on("enemyKilled", (enemy) => {
      if (enemy.kind === "crow") {
        setTimeout(() => deviceController.vibrate(100), 500);
      }
    })
    .on("localPlayerHurt", (enemy) => {
      deviceController.vibrate([50]);
    })
    .on("localPlayerDied", () => {
      deviceController.vibrate([200, 100, 200]);
    });

  const helpPopup = new HelpPopup(uiRoot, {
    onClose: () => {
      if (runtime?.isGameRunning() === true) {
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
      currentLanguage: i18n.getLocale(),
      currentEngine: viewKind,
      soundEnabled,
      musicEnabled,
      vibrationEnabled,
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

      gameStateController.update(snapshot, playerId);

      view.render(snapshot, playerId);
      hud.render(snapshot, playerId);
      settingsOverlay?.render(snapshot, playerId);
      gameOverPopup?.render(snapshot, playerId);
      touchControls?.render(snapshot, playerId);
    },
  });

  deviceController.on("orientationChange", () => syncOrientation());
  document.addEventListener("fullscreenchange", () => syncSettingsOverlay());

  gameOverPopup = new GameOverPopup(uiRoot, {
    onRestart: () => {
      playSound("sound.ui_click");
      runtime?.restart();
    },
  });

  characterSelect = new CharacterSelect(uiRoot, {
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

  settingsOverlay = new SettingsOverlay(uiRoot, {
    isGameRunning: () => runtime?.isGameRunning() === true,

    onToggleMenu: () => {
      playSound("sound.ui_click");
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
      soundEnabled = !soundEnabled;

      localStorage.setItem(SOUNDS_ENABLED_KEY, String(soundEnabled));
      audio.setSoundsEnabled(soundEnabled);

      if (soundEnabled) {
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

    onToggleVibration: () => {
      vibrationEnabled = !vibrationEnabled;

      localStorage.setItem(VIBRATION_ENABLED_KEY, String(vibrationEnabled));
      deviceController.setVibrationEnabled(vibrationEnabled);

      playSound("sound.ui_click");

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

    onSelectLanguage: (nextLocale: string) => i18n.changeLocale(nextLocale),

    onExit: () => {
      runtime?.restart();
    },
  });

  syncOrientation();
  syncSettingsOverlay();
  renderCharacterSelect();
  bindFullscreenGesture();
  bindViewShortcuts();

  // Run the game
  i18n.onLocaleChanged((newLocale) => {
    localStorage.setItem(LOCALE_KEY, newLocale);
    document.title = i18n.t("title");
    applyStaticTranslations();
    renderCharacterSelect();
    syncSettingsOverlay();
  });
  i18n.changeLocale(params.get("locale") ?? localStorage.getItem(LOCALE_KEY) ?? "en");

  runtime.start();

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

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function syncOrientation() {
  document.body.className = document.body.className.replace(/\borientation-\w+\b/g, "");
  document.body.className = screen.orientation.type;
}
