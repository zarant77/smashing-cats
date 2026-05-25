import { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { i18n } from "@smashing-cats/i18n";

import "./uncrasher.js";
import "./ui/debug.js";

import { initCapacitor } from "./capacitor.js";
import { storage } from "./storage.js";
import { audio, musicEvents, playSound, setupMusicUnlock } from "./audio/audio.js";
import { deviceController } from "./device/DeviceController.js";
import { loadHeavyEffectsIfAllowed } from "./device/loadHeavyEffectsIfAllowed.js";
import { GameStateController } from "./game/GameStateController.js";
import { GameRuntime } from "./game/GameRuntime.js";
import { getMatchCode } from "./game/routing.js";
import {
  getRequiredElement,
  requestFullscreenFromUserGesture,
  toggleFullscreen,
  applyStaticTranslations,
} from "./ui/domControls.js";
import { SettingsOverlay } from "./ui/SettingsOverlay.js";
import { CharacterSelect } from "./ui/CharacterSelect.js";
import { TouchControls } from "./ui/TouchControls.js";
import { GameOverPopup } from "./ui/GameOverPopup.js";
import { HelpPopup } from "./ui/HelpPopup.js";
import { Hud } from "./ui/Hud.js";
import { createView, hasMultipleViewKinds, parseViewKind } from "./views/createView.js";
import { getViewSize } from "./views/viewport.js";
import type { GameView, ViewKind } from "./views/types.js";

import "./styles/index.css";

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
  await initCapacitor();

  loadHeavyEffectsIfAllowed();

  const root = getRequiredElement<HTMLElement>("#game-root", "Game root");
  const uiRoot = getRequiredElement<HTMLElement>("#ui-root", "UI root");

  const params = new URLSearchParams(window.location.search);
  const matchCode = getMatchCode(params);
  const multiplayer = matchCode !== undefined;
  const rendererSwitchingEnabled = hasMultipleViewKinds();

  let viewKind = parseViewKind(storage.view);

  let view: GameView = await createView(viewKind, root);
  let characterSelect: CharacterSelect | undefined;
  let gameOverPopup: GameOverPopup | undefined;
  let settingsOverlay: SettingsOverlay | undefined;
  let runtime: GameRuntime | undefined;

  let lastSnapshot: GameSnapshot | undefined;
  let lastPlayerId: PlayerId | undefined;

  audio.setSoundsEnabled(storage.sounds);
  audio.setMusicEnabled(storage.music);

  const hud = new Hud(uiRoot);
  const touchControls = TouchControls.isTouchDevice() ? new TouchControls() : undefined;
  const gameStateController = new GameStateController();

  gameStateController
    .on("enemyKilled", (enemy) => {
      if (enemy.kind === "crow") {
        setTimeout(() => deviceController.vibrate(100), 500);
      }
    })
    .on("localPlayerHurt", () => {
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
      soundEnabled: storage.sounds,
      musicEnabled: storage.music,
      vibrationEnabled: storage.vibration,
      fullscreenEnabled: document.fullscreenElement !== null,
    });
  };

  runtime = new GameRuntime({
    multiplayer,
    matchCode,
    touchControls,
    onCharacterStateChange: renderCharacterSelect,
    getVisibleWorldWidth: () => getViewSize(root).visibleWorldWidth,
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

  document.addEventListener("fullscreenchange", () => syncSettingsOverlay());

  gameOverPopup = new GameOverPopup(uiRoot, {
    onRestart: () => {
      playSound("sound.ui_click");
      runtime?.restart();
    },
  });

  characterSelect = new CharacterSelect(uiRoot, {
    initialCharacterKind: storage.character,
    onSelect: (characterKind: string) => {
      if (runtime === undefined || !runtime.selectCharacter(characterKind)) {
        return;
      }

      playSound("sound.ui_click");

      storage.character = characterKind;

      characterSelect?.setPreferredCharacter(characterKind);
    },
  });

  settingsOverlay = new SettingsOverlay(uiRoot, {
    isGameRunning: () => runtime?.isGameRunning() === true,
    showEngineSelector: rendererSwitchingEnabled,

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
      storage.sounds = !storage.sounds;

      audio.setSoundsEnabled(storage.sounds);

      if (storage.sounds) {
        playSound("sound.ui_click");
      }

      syncSettingsOverlay();
    },

    onToggleMusic: () => {
      storage.music = !storage.music;
      audio.setMusicEnabled(storage.music);

      playSound("sound.ui_click");
      musicEvents.gameplay();

      syncSettingsOverlay();
    },

    onToggleVibration: () => {
      storage.vibration = !storage.vibration;
      deviceController.setVibrationEnabled(storage.vibration);

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

    onSelectView: rendererSwitchingEnabled ? (view: ViewKind) => switchView(view) : undefined,

    onSelectLanguage: (nextLocale: string) => i18n.changeLocale(nextLocale),

    onExit: () => {
      runtime?.restart();
    },
  });

  syncSettingsOverlay();
  renderCharacterSelect();
  bindFullscreenGesture();

  if (rendererSwitchingEnabled) {
    bindViewShortcuts();
  }

  setupMusicUnlock();

  // Run the game
  i18n.onLocaleChanged((newLocale) => {
    storage.locale = newLocale;
    document.title = `${i18n.t("title")} v${__ASSET_VERSION__}`;
    applyStaticTranslations();
    renderCharacterSelect();
    syncSettingsOverlay();
  });
  i18n.changeLocale(params.get("locale") ?? storage.locale);

  runtime.start();

  async function switchView(nextViewKind: ViewKind): Promise<void> {
    playSound("sound.ui_click");

    if (!rendererSwitchingEnabled && nextViewKind !== "canvas") {
      syncSettingsOverlay();
      return;
    }

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

      storage.view = nextViewKind;

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
}
