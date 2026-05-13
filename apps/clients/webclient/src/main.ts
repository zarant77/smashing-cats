import type { CharacterDefinition, EntityKind, PlayerId, ServerToClientMessage } from "@smashing-cats/protocol";
import { preloadAssets } from "./assets/assets.js";
import { createTranslator, parseLocale } from "./i18n.js";
import { readInput } from "./input.js";
import { SnapshotInterpolator } from "./interpolation.js";
import { receiveWithSimulatedLag, sendWithSimulatedLag } from "./networkDebug.js";
import { LocalPlayerPredictor } from "./prediction.js";
import { SnapshotStore } from "./snapshot/SnapshotStore.js";
import { Hud } from "./ui/Hud.js";
import { CharacterSelect } from "./ui/CharacterSelect.js";
import { GameOverPopup } from "./ui/GameOverPopup.js";
import { createView, parseViewKind } from "./views/createView.js";
import type { GameView } from "./views/types.js";

import "./styles/index.css";

void bootstrap();

async function bootstrap(): Promise<void> {
  await preloadAssets();

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

  const params = new URLSearchParams(window.location.search);
  const matchCode = ensureMatchCode(params);

  let locale = parseLocale(params.get("locale") ?? localStorage.getItem("smashing-cats-locale"));
  let t = createTranslator(locale);

  let viewKind = parseViewKind(params.get("view") ?? localStorage.getItem("smashing-cats-view"));
  let selectedCharacterKind = localStorage.getItem("smashing-cats-character") as EntityKind | null;

  let view: GameView = createView(viewKind, root);
  view.setLocale?.(locale, t);

  let characters: CharacterDefinition[] = [];
  let hasSelectedCharacter = false;
  let playerId: PlayerId | undefined;
  let inputSeq = 1;

  const interpolator = new SnapshotInterpolator();
  const snapshotStore = new SnapshotStore();
  const predictor = new LocalPlayerPredictor();
  const socket = new WebSocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080");

  const hud = new Hud(uiRoot, t);
  const gameOverPopup = new GameOverPopup(uiRoot, t);

  const characterSelect = new CharacterSelect(uiRoot, {
    locale,
    t,
    initialCharacterKind: selectedCharacterKind ?? undefined,
    onSelect: (characterKind: EntityKind) => {
      if (socket.readyState !== WebSocket.OPEN || playerId === undefined) {
        return;
      }

      selectedCharacterKind = characterKind;
      localStorage.setItem("smashing-cats-character", characterKind);

      characterSelect.setPreferredCharacter(characterKind);

      hasSelectedCharacter = true;
      characterSelect.render(characters, hasSelectedCharacter);

      socket.send(
        JSON.stringify({
          type: "selectCharacter",
          characterKind,
        }),
      );
    },
  });

  characterSelect.render(characters, hasSelectedCharacter);
  applyStaticTranslations(locale, t);

  if (engineSelect !== null) {
    engineSelect.value = viewKind;

    engineSelect.addEventListener("change", () => {
      viewKind = parseViewKind(engineSelect.value);
      localStorage.setItem("smashing-cats-view", viewKind);

      view = createView(viewKind, root);
      view.setLocale?.(locale, t);
    });
  }

  updateLocaleButtons(localeButtons, locale);

  for (const button of localeButtons) {
    button.addEventListener("click", () => {
      locale = parseLocale(button.dataset.locale ?? null);
      t = createTranslator(locale);

      localStorage.setItem("smashing-cats-locale", locale);

      applyStaticTranslations(locale, t);
      updateLocaleButtons(localeButtons, locale);

      hud.setTranslator(t);

      characterSelect.setLocale(locale, t);
      characterSelect.render(characters, hasSelectedCharacter);

      view.setLocale?.(locale, t);
    });
  }

  socket.addEventListener("open", () => {
    socket.send(
      JSON.stringify({
        type: "join",
        name: "Cat",
        matchCode,
      }),
    );
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
      receiveWithSimulatedLag(() => {
        const snapshot = snapshotStore.setFullSnapshot(message.snapshot);
        interpolator.add(snapshot);
      });

      return;
    }

    if (message.type === "delta") {
      receiveWithSimulatedLag(() => {
        const snapshot = snapshotStore.applyDelta(message.delta);

        if (snapshot !== undefined) {
          interpolator.add(snapshot);
        }
      });

      return;
    }
  });

  function frame(): void {
    const input = readInput();
    const currentInputSeq = inputSeq++;

    if (socket.readyState === WebSocket.OPEN && playerId !== undefined && hasSelectedCharacter) {
      sendWithSimulatedLag(
        socket,
        JSON.stringify({
          type: "input",
          inputSeq: currentInputSeq,
          snapshotTick: interpolator.getRenderedTick(),
          input,
        }),
      );
    }

    const snapshot = predictor.apply(interpolator.get(playerId), interpolator.getLatest(), playerId, currentInputSeq, input, characters);

    view.render(snapshot, playerId);
    hud.render(snapshot, playerId);
    gameOverPopup.render(snapshot, playerId);

    requestAnimationFrame(frame);
  }

  frame();
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
    const key = element.dataset.i18n;

    if (key === "engine" || key === "locale") {
      element.textContent = t(key);
    }
  }
}

function parseServerMessage(data: unknown): ServerToClientMessage | undefined {
  if (typeof data !== "string") {
    return undefined;
  }

  try {
    return JSON.parse(data) as ServerToClientMessage;
  } catch {
    return undefined;
  }
}

function updateLocaleButtons(buttons: NodeListOf<HTMLButtonElement>, locale: string): void {
  for (const button of buttons) {
    button.classList.toggle("active", button.dataset.locale === locale);
  }
}
