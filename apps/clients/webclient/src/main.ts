import {
  normalizeMessage,
  minifyMessage,
  type CharacterDefinition,
  type EntityKind,
  type GameEvent,
  type GameSnapshot,
  type InputMessage,
  type PlayerId,
  type ServerToClientMessage,
  ClientToServerMessage,
} from "@smashing-cats/protocol";
import { SnapshotStore } from "@smashing-cats/core";
import { createTranslator } from "@smashing-cats/i18n";
import { SnapshotInterpolator, LocalPlayerPredictor } from "@smashing-cats/client-netcode";

import { preloadAssets } from "./assets/assets.js";
import { audio, audioEvents, initAudio, musicEvents } from "./audio/audio.js";
import { consumePauseToggle, isPaused, readInput } from "./input.js";
import { PauseOverlay } from "./ui/PauseOverlay.js";
import { CharacterSelect } from "./ui/CharacterSelect.js";
import { TouchControls } from "./ui/TouchControls.js";
import { GameOverPopup } from "./ui/GameOverPopup.js";
import { Hud } from "./ui/Hud.js";
import { createView, parseViewKind } from "./views/createView.js";
import type { GameView } from "./views/types.js";

import "./styles/index.css";

const SOUNDS_ENABLED_KEY = "smashing-cats-sounds-enabled";
const MUSIC_ENABLED_KEY = "smashing-cats-music-enabled";

void bootstrap();

async function bootstrap(): Promise<void> {
  await preloadAssets();
  await initAudio();

  const loadingScreen = document.querySelector("#loading");
  loadingScreen?.remove();

  const root = document.querySelector<HTMLElement>("#game-root");
  if (root === null) {
    throw new Error("Game root was not found");
  }

  const uiRoot = document.querySelector<HTMLElement>("#ui-root");
  if (uiRoot === null) {
    throw new Error("UI root was not found");
  }

  const engineSelect = document.querySelector<HTMLSelectElement>("#engine-select");
  const localeButtons = document.querySelectorAll<HTMLButtonElement>("[data-locale]");
  const soundToggle = document.querySelector<HTMLButtonElement>("#sound-toggle");
  const musicToggle = document.querySelector<HTMLButtonElement>("#music-toggle");
  const fullscreenToggle = document.querySelector<HTMLButtonElement>("#fullscreen-toggle");

  const params = new URLSearchParams(window.location.search);

  let locale = params.get("locale") ?? localStorage.getItem("smashing-cats-locale") ?? "en";
  let t = createTranslator(locale);

  let soundsEnabled = localStorage.getItem(SOUNDS_ENABLED_KEY) !== "false";
  let musicEnabled = localStorage.getItem(MUSIC_ENABLED_KEY) !== "false";

  audio.setSoundsEnabled(soundsEnabled);
  audio.setMusicEnabled(musicEnabled);

  let viewKind = parseViewKind(params.get("view") ?? localStorage.getItem("smashing-cats-view"));
  let selectedCharacterKind = localStorage.getItem("smashing-cats-character") as EntityKind | null;

  let view: GameView = createView(viewKind, root);
  view.setLocale?.(locale, t);

  let characters: CharacterDefinition[] = [];
  let hasSelectedCharacter = false;
  let playerId: PlayerId | undefined;
  let inputSeq = 1;
  let wasJumpPressed = false;
  let wasSmashing = false;

  let interpolator = new SnapshotInterpolator();
  let snapshotStore = new SnapshotStore();
  let predictor = new LocalPlayerPredictor();
  let audioEventPlayer = new AudioEventPlayer();
  let socket = createSocket();

  const hud = new Hud(uiRoot, t);
  const pauseOverlay = new PauseOverlay(uiRoot, t);

  const send = (msg: ClientToServerMessage) => socket.send(minifyMessage(msg));

  const restartGame = (): void => {
    audioEvents.uiClick();

    hasSelectedCharacter = false;
    playerId = undefined;
    inputSeq = 1;
    wasJumpPressed = false;
    wasSmashing = false;

    characters = [];

    interpolator = new SnapshotInterpolator();
    snapshotStore = new SnapshotStore();
    predictor = new LocalPlayerPredictor();
    audioEventPlayer = new AudioEventPlayer();

    socket.close();
    socket = createSocket();
    bindSocketEvents();

    characterSelect.render(characters, hasSelectedCharacter);
    hud.render(undefined, undefined);
    view.render(undefined, undefined);
    pauseOverlay.render(undefined, undefined);
  };

  const touchControls = TouchControls.isTouchDevice() ? new TouchControls(uiRoot) : undefined;

  const gameOverPopup = new GameOverPopup(uiRoot, t, {
    onRestart: restartGame,
  });

  const characterSelect = new CharacterSelect(uiRoot, {
    locale,
    t,
    initialCharacterKind: selectedCharacterKind ?? undefined,
    onSelect: (characterKind: EntityKind) => {
      if (socket.readyState !== WebSocket.OPEN || playerId === undefined) {
        return;
      }

      audioEvents.uiClick();

      selectedCharacterKind = characterKind;
      localStorage.setItem("smashing-cats-character", characterKind);

      characterSelect.setPreferredCharacter(characterKind);

      hasSelectedCharacter = true;
      characterSelect.render(characters, hasSelectedCharacter);

      send({
        type: "selectCharacter",
        characterKind,
        matchCode: ensureMatchCode(params),
      });
    },
  });

  characterSelect.render(characters, hasSelectedCharacter);
  applyStaticTranslations(locale, t);
  updateLocaleButtons(localeButtons, locale);
  updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);
  updateFullscreenButton(fullscreenToggle);

  document.addEventListener("fullscreenchange", () => updateFullscreenButton(fullscreenToggle));

  function requestFullscreenFromUserGesture(): void {
    if (document.fullscreenElement !== null) {
      return;
    }

    document.documentElement.requestFullscreen().catch((error: unknown) => {
      console.error("Fullscreen failed", error);
    });
  }

  if (TouchControls.isTouchDevice()) {
    window.addEventListener(
      "pointerup",
      () => {
        requestFullscreenFromUserGesture();
      },
      {
        once: true,
        capture: true,
      },
    );
  }

  if (engineSelect !== null) {
    engineSelect.value = viewKind;

    engineSelect.addEventListener("change", () => {
      audioEvents.uiClick();

      viewKind = parseViewKind(engineSelect.value);
      localStorage.setItem("smashing-cats-view", viewKind);

      view = createView(viewKind, root);
      view.setLocale?.(locale, t);
    });
  }

  soundToggle?.addEventListener("click", () => {
    soundsEnabled = !soundsEnabled;

    localStorage.setItem(SOUNDS_ENABLED_KEY, String(soundsEnabled));
    audio.setSoundsEnabled(soundsEnabled);

    if (soundsEnabled) {
      audioEvents.uiClick();
    }

    updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);
  });

  musicToggle?.addEventListener("click", () => {
    musicEnabled = !musicEnabled;

    localStorage.setItem(MUSIC_ENABLED_KEY, String(musicEnabled));
    audio.setMusicEnabled(musicEnabled);

    audioEvents.uiClick();
    musicEvents.gameplay();

    updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);
  });

  fullscreenToggle?.addEventListener("click", async () => {
    if (document.fullscreenElement === null) {
      await document.documentElement.requestFullscreen();
      return;
    }

    await document.exitFullscreen();
  });

  for (const button of localeButtons) {
    button.addEventListener("click", () => {
      audioEvents.uiClick();

      locale = button.dataset.locale ?? "en";
      t = createTranslator(locale);

      localStorage.setItem("smashing-cats-locale", locale);

      applyStaticTranslations(locale, t);
      updateLocaleButtons(localeButtons, locale);
      updateAudioButtons(soundToggle, musicToggle, soundsEnabled, musicEnabled, t);

      hud.setTranslator(t);

      characterSelect.setLocale(locale, t);
      characterSelect.render(characters, hasSelectedCharacter);

      view.setLocale?.(locale, t);
    });
  }

  function bindSocketEvents(): void {
    socket.addEventListener("open", () => {
      send({ type: "join" });
    });

    socket.addEventListener("message", (event) => {
      const message = parseServerMessage(event.data);

      if (message === undefined) {
        return;
      }

      if (message.type === "welcome") {
        playerId = message.playerId;
        characters = message.characters;
        characterSelect.render(characters, hasSelectedCharacter);
        return;
      }

      if (message.type === "snapshot") {
        const snapshot = snapshotStore.setFullSnapshot(message.snapshot);
        interpolator.add(snapshot);

        return;
      }

      if (message.type === "delta") {
        const snapshot = snapshotStore.applyDelta(message.delta);

        if (snapshot !== undefined) {
          interpolator.add(snapshot);
        }

        return;
      }
    });
  }

  bindSocketEvents();

  function frame(): void {
    const canSend = socket.readyState === WebSocket.OPEN && playerId !== undefined && hasSelectedCharacter;

    if (consumePauseToggle() && canSend) {
      send({
        type: "pause",
        paused: isPaused(),
      });
    }

    const keyboardInput = readInput();
    const touchInput = touchControls?.getInput();

    const input = {
      left: keyboardInput.left || touchInput?.left === true,
      right: keyboardInput.right || touchInput?.right === true,
      jump: keyboardInput.jump || touchInput?.jump === true,
    };

    const currentInputSeq = inputSeq++;

    const jumpPressed = input.jump && !wasJumpPressed;
    wasJumpPressed = input.jump;

    if (canSend && !isPaused()) {
      const snapshotTick = interpolator.getRenderedTick();

      const inputMessage: InputMessage =
        snapshotTick === undefined
          ? {
              type: "input",
              inputSeq: currentInputSeq,
              input,
            }
          : {
              type: "input",
              inputSeq: currentInputSeq,
              snapshotTick,
              input,
            };

      send(inputMessage);
    }

    const interpolatedSnapshot = interpolator.get(playerId);
    const latestSnapshot = interpolator.getLatest();

    const localPlayer = latestSnapshot?.players.find((player) => player.playerId === playerId);

    const snapshot =
      localPlayer?.paused === true
        ? interpolatedSnapshot
        : predictor.apply(interpolatedSnapshot, latestSnapshot, playerId, currentInputSeq, input, characters);
    if (jumpPressed && hasSelectedCharacter && localPlayer !== undefined && !isPaused()) {
      if (localPlayer.smashing && !wasSmashing) {
        audioEvents.playerSmash();
      } else {
        audioEvents.playerJump();
      }
    }

    wasSmashing = localPlayer?.smashing ?? false;

    audioEventPlayer.play(snapshot, playerId);

    view.render(snapshot, playerId);
    hud.render(snapshot, playerId);
    pauseOverlay.render(snapshot, playerId);
    gameOverPopup.render(snapshot, playerId);

    requestAnimationFrame(frame);
  }

  frame();
}

class AudioEventPlayer {
  private readonly playedEventIds = new Set<string>();

  public play(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    if (snapshot === undefined) {
      return;
    }

    for (const event of snapshot.events) {
      if (this.playedEventIds.has(event.id)) {
        continue;
      }

      this.playedEventIds.add(event.id);
      this.playEvent(event, snapshot, localPlayerId);
    }

    if (this.playedEventIds.size > 300) {
      this.playedEventIds.clear();
    }
  }

  private playEvent(event: GameEvent, snapshot: GameSnapshot, localPlayerId: PlayerId | undefined): void {
    switch (event.type) {
      case "playerHit": {
        if (event.playerId !== localPlayerId) {
          return;
        }

        const player = snapshot.players.find((item) => item.playerId === localPlayerId);

        if (player !== undefined && !player.alive) {
          audioEvents.playerDie();
          return;
        }

        audioEvents.playerHurt();
        return;
      }

      case "enemyKilled":
        audioEvents.enemyDie();
        return;

      case "civilianKilled":
      case "civilianKilledByEnemy":
        audioEvents.civilianDie();
        return;
    }
  }
}

function createSocket(): WebSocket {
  return new WebSocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080");
}

function ensureMatchCode(params: URLSearchParams): string {
  const existingMatchCode = params.get("match");

  if (existingMatchCode !== null && existingMatchCode.trim() !== "") {
    return existingMatchCode;
  }

  const nextMatchCode = generateMatchCode();

  params.set("match", nextMatchCode);

  const nextUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
  window.history.replaceState(null, "", nextUrl);

  return nextMatchCode;
}

function generateMatchCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const length = 6;

  let code = "";

  for (let i = 0; i < length; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)];
  }

  return code;
}

function applyStaticTranslations(locale: string, t: (key: string) => string): void {
  document.documentElement.lang = locale;

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    element.textContent = t(element.dataset.i18n ?? "");
  }
}

function parseServerMessage(data: unknown): ServerToClientMessage | undefined {
  if (typeof data !== "string") {
    return undefined;
  }

  try {
    return normalizeMessage(JSON.parse(data)) as ServerToClientMessage;
  } catch {
    return undefined;
  }
}

function updateLocaleButtons(buttons: NodeListOf<HTMLButtonElement>, locale: string): void {
  for (const button of buttons) {
    button.classList.toggle("active", button.dataset.locale === locale);
  }
}

function updateAudioButtons(
  soundToggle: HTMLButtonElement | null,
  musicToggle: HTMLButtonElement | null,
  soundsEnabled: boolean,
  musicEnabled: boolean,
  t: (key: string) => string,
): void {
  if (soundToggle !== null) {
    soundToggle.classList.toggle("muted", !soundsEnabled);
    soundToggle.title = soundsEnabled ? t("soundsOn") : t("soundsOff");
    soundToggle.setAttribute("aria-label", soundsEnabled ? t("soundsOn") : t("soundsOff"));
  }

  if (musicToggle !== null) {
    musicToggle.classList.toggle("muted", !musicEnabled);
    musicToggle.title = musicEnabled ? t("musicOn") : t("musicOff");
    musicToggle.setAttribute("aria-label", musicEnabled ? t("musicOn") : t("musicOff"));
  }
}

function updateFullscreenButton(fullscreenToggle: HTMLButtonElement | null): void {
  fullscreenToggle?.classList.toggle("active", document.fullscreenElement !== null);
}
