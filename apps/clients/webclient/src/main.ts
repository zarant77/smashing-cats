import type { CharacterDefinition, EntityKind, PlayerId, ServerToClientMessage } from "@smashing-cats/protocol";
import { createTranslator, parseLocale } from "./i18n.js";
import { readInput } from "./input.js";
import { SnapshotInterpolator } from "./interpolation.js";
import { CharacterSelect } from "./ui/CharacterSelect.js";
import { Hud } from "./ui/Hud.js";
import { createView, parseViewKind } from "./views/createView.js";
import type { GameView } from "./views/types.js";

import "./styles/index.css";

const root = document.querySelector<HTMLElement>("#game-root");
if (root === null) {
  throw new Error("Game root was not found");
}

const uiRoot = document.querySelector<HTMLElement>("#ui-root");
if (uiRoot === null) {
  throw new Error("UI root was not found");
}

const engineSelect = document.querySelector<HTMLSelectElement>("#engine-select");
const localeSelect = document.querySelector<HTMLSelectElement>("#locale-select");
const params = new URLSearchParams(window.location.search);
let locale = parseLocale(params.get("locale") ?? localStorage.getItem("smashing-cats-locale"));
let t = createTranslator(locale);
let viewKind = parseViewKind(params.get("view") ?? localStorage.getItem("smashing-cats-view"));
let selectedCharacterKind = localStorage.getItem("smashing-cats-character") as EntityKind | null;
let view: GameView = createView(viewKind, root);
view.setLocale?.(locale, t);
let characters: CharacterDefinition[] = [];
let hasSelectedCharacter = false;
const interpolator = new SnapshotInterpolator();
const socket = new WebSocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080");
const hud = new Hud(uiRoot, t);
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

let playerId: PlayerId | undefined;
let localTick = 0;

characterSelect.render(characters, hasSelectedCharacter);

if (engineSelect !== null) {
  engineSelect.value = viewKind;
  engineSelect.addEventListener("change", () => {
    viewKind = parseViewKind(engineSelect.value);
    localStorage.setItem("smashing-cats-view", viewKind);
    view = createView(viewKind, root);
    view.setLocale?.(locale, t);
  });
}

if (localeSelect !== null) {
  localeSelect.value = locale;
  localeSelect.addEventListener("change", () => {
    locale = parseLocale(localeSelect.value);
    t = createTranslator(locale);
    localStorage.setItem("smashing-cats-locale", locale);
    applyStaticTranslations();
    hud.setTranslator(t);
    characterSelect.setLocale(locale, t);
    characterSelect.render(characters, hasSelectedCharacter);
    view.setLocale?.(locale, t);
  });
}

applyStaticTranslations();

socket.addEventListener("open", () => {
  socket.send(JSON.stringify({ type: "join", name: "Cat" }));
});

socket.addEventListener("message", (event) => {
  const message = JSON.parse(event.data as string) as ServerToClientMessage;

  if (message.type === "welcome") {
    playerId = message.playerId;
    characters = message.characters;
    characterSelect.render(characters, hasSelectedCharacter);
  }

  if (message.type === "snapshot") {
    interpolator.add(message.snapshot);
  }
});

setInterval(() => {
  if (socket.readyState !== WebSocket.OPEN || !hasSelectedCharacter) {
    return;
  }

  socket.send(
    JSON.stringify({
      type: "input",
      tick: localTick++,
      input: readInput(),
    }),
  );
}, 1000 / 60);

function frame(): void {
  const snapshot = interpolator.get(playerId);
  view.render(snapshot, playerId);
  hud.render(snapshot, playerId);
  requestAnimationFrame(frame);
}

frame();

function applyStaticTranslations(): void {
  document.documentElement.lang = locale;
  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (key === "engine" || key === "locale") {
      element.textContent = t(key);
    }
  }
}
