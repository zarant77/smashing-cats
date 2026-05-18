import { type EntityKind } from "@smashing-cats/protocol";
import { createTranslator } from "@smashing-cats/i18n";

import { audio, initAudio, musicEvents, playSound } from "./audio/audio.js";
import { GameRuntime } from "./game/GameRuntime.js";
import { getMatchCode } from "./game/routing.js";
import {
  applyStaticTranslations,
  getRequiredElement,
  requestFullscreenFromUserGesture,
  toggleFullscreen,
  updateAudioButtons,
  updateFullscreenButton,
  updateLocaleButtons,
} from "./ui/domControls.js";
import { PauseOverlay } from "./ui/PauseOverlay.js";
import { CharacterSelect } from "./ui/CharacterSelect.js";
import { TouchControls } from "./ui/TouchControls.js";
import { GameOverPopup } from "./ui/GameOverPopup.js";
import { Hud } from "./ui/Hud.js";
import { createView, parseViewKind } from "./views/createView.js";
import type { GameView, ViewKind } from "./views/types.js";

import "./styles/index.css";
import { showFPS } from "./ui/debug.js";

const SOUNDS_ENABLED_KEY = "smashing-cats-sounds-enabled";
const MUSIC_ENABLED_KEY = "smashing-cats-music-enabled";
const LOCALE_KEY = "smashing-cats-locale";
const VIEW_KEY = "smashing-cats-view";
const CHARACTER_KEY = "smashing-cats-character";

void bootstrap();

async function bootstrap(): Promise<void> {
  await initAudio();

  const root = getRequiredElement<HTMLElement>("#game-root", "Game root");
  const uiRoot = getRequiredElement<HTMLElement>("#ui-root", "UI root");
  const engineSelect = document.querySelector<HTMLSelectElement>("#engine-select");
  const localeButtons = document.querySelectorAll<HTMLButtonElement>("[data-locale]");
  const soundToggle = document.querySelector<HTMLButtonElement>("#sound-toggle");
  const musicToggle = document.querySelector<HTMLButtonElement>("#music-toggle");
  const fullscreenToggle = document.querySelector<HTMLButtonElement>("#fullscreen-toggle");

  const params = new URLSearchParams(window.location.search);
  const matchCode = getMatchCode(params);
  const multiplayer = matchCode !== undefined;
  const debug = params.has("debug") && params.get("debug") !== "0" && params.get("debug") !== "false";

  let locale = params.get("locale") ?? localStorage.getItem(LOCALE_KEY) ?? "en";
  let t = createTranslator(locale);
  let soundsEnabled = localStorage.getItem(SOUNDS_ENABLED_KEY) !== "false";
  let musicEnabled = localStorage.getItem(MUSIC_ENABLED_KEY) !== "false";
  let viewKind = parseViewKind(params.get("view") ?? localStorage.getItem(VIEW_KEY));
  let selectedCharacterKind = localStorage.getItem(CHARACTER_KEY) as EntityKind | null;
  let view: GameView = await createView(viewKind, root, { debug });
  let characterSelect: CharacterSelect | undefined;
  let gameOverPopup: GameOverPopup | undefined;
  let runtime: GameRuntime | undefined;

  audio.setSoundsEnabled(soundsEnabled);
  audio.setMusicEnabled(musicEnabled);
  view.setLocale?.(locale, t);

  if (debug) {
    showFPS();
  }

  const hud = new Hud(uiRoot, t);
  const pauseOverlay = new PauseOverlay(uiRoot, t);
  const touchControls = TouchControls.isTouchDevice() ? new TouchControls() : undefined;
  const renderCharacterSelect = (): void => {
    if (characterSelect === undefined || runtime === undefined) {
      return;
    }

    characterSelect.render(runtime.characters, runtime.hasSelectedCharacter);
  };

  runtime = new GameRuntime({
    multiplayer,
    matchCode,
    touchControls,
    onCharacterStateChange: renderCharacterSelect,
    render: (snapshot, playerId) => {
      view.render(snapshot, playerId);
      hud.render(snapshot, playerId);
      pauseOverlay.render(snapshot, playerId);
      gameOverPopup?.render(snapshot, playerId);
      touchControls?.update(snapshot, playerId);
    },
  });

  gameOverPopup = new GameOverPopup(uiRoot, t, {
    onRestart: () => {
      playSound("UiClick");
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

      playSound("UiClick");
      selectedCharacterKind = characterKind;
      localStorage.setItem(CHARACTER_KEY, characterKind);
      characterSelect?.setPreferredCharacter(characterKind);
    },
  });

  renderCharacterSelect();
  applyStaticTranslations(locale, t);
  updateLocaleButtons(localeButtons, locale);
  updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);
  updateFullscreenButton(fullscreenToggle);
  bindFullscreenControls(fullscreenToggle);
  bindEngineSelect(
    engineSelect,
    viewKind,
    root,
    debug,
    () => locale,
    () => t,
    (nextViewKind, nextView) => {
      viewKind = nextViewKind;
      view = nextView;
    },
  );
  bindAudioControls();
  bindLocaleControls();

  runtime?.start();

  function bindAudioControls(): void {
    soundToggle?.addEventListener("click", () => {
      soundsEnabled = !soundsEnabled;

      localStorage.setItem(SOUNDS_ENABLED_KEY, String(soundsEnabled));
      audio.setSoundsEnabled(soundsEnabled);

      if (soundsEnabled) {
        playSound("UiClick");
      }

      updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);
    });

    musicToggle?.addEventListener("click", () => {
      musicEnabled = !musicEnabled;

      localStorage.setItem(MUSIC_ENABLED_KEY, String(musicEnabled));
      audio.setMusicEnabled(musicEnabled);

      playSound("UiClick");
      musicEvents.gameplay();
      updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);
    });
  }

  function bindLocaleControls(): void {
    for (const button of localeButtons) {
      button.addEventListener("click", () => {
        playSound("UiClick");

        locale = button.dataset.locale ?? "en";
        t = createTranslator(locale);
        localStorage.setItem(LOCALE_KEY, locale);

        applyStaticTranslations(locale, t);
        updateLocaleButtons(localeButtons, locale);
        updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);

        hud.setTranslator(t);
        characterSelect?.setLocale(locale, t);
        renderCharacterSelect();
        view.setLocale?.(locale, t);
      });
    }
  }
}

function bindFullscreenControls(fullscreenToggle: HTMLButtonElement | null): void {
  document.addEventListener("fullscreenchange", () => updateFullscreenButton(fullscreenToggle));

  if (TouchControls.isTouchDevice()) {
    window.addEventListener("pointerup", requestFullscreenFromUserGesture, {
      once: true,
      capture: true,
    });
  }

  fullscreenToggle?.addEventListener("click", () => {
    void toggleFullscreen();
  });
}

function bindEngineSelect(
  engineSelect: HTMLSelectElement | null,
  initialViewKind: ViewKind,
  root: HTMLElement,
  debug: boolean,
  getLocale: () => string,
  getTranslator: () => ReturnType<typeof createTranslator>,
  onViewChange: (viewKind: ViewKind, view: GameView) => void,
): void {
  if (engineSelect === null) {
    return;
  }

  engineSelect.value = initialViewKind;

  let currentViewKind = initialViewKind;

  engineSelect.addEventListener("change", () => {
    void switchView();
  });

  async function switchView(): Promise<void> {
    if (!engineSelect) {
      return;
    }

    playSound("UiClick");

    const nextViewKind = parseViewKind(engineSelect.value);

    if (nextViewKind === currentViewKind) {
      return;
    }

    engineSelect.disabled = true;

    try {
      const nextView = await createView(nextViewKind, root, { debug });

      localStorage.setItem(VIEW_KEY, nextViewKind);
      nextView.setLocale?.(getLocale(), getTranslator());

      currentViewKind = nextViewKind;
      onViewChange(nextViewKind, nextView);
    } catch (error) {
      console.error(error);
      engineSelect.value = currentViewKind;
    } finally {
      engineSelect.disabled = false;
    }
  }
}
