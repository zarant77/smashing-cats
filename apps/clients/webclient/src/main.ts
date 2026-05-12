import type {
  CharacterDefinition,
  EntitySnapshot,
  EntityKind,
  GameSnapshot,
  PlayerId,
  PlayerSnapshot,
  ServerToClientMessage,
} from "@smashing-cats/protocol";
import { createTranslator, parseLocale } from "./i18n.js";
import { readInput } from "./input.js";
import { SnapshotInterpolator } from "./interpolation.js";
import { receiveWithSimulatedLag, sendWithSimulatedLag } from "./networkDebug.js";
import { LocalPlayerPredictor } from "./prediction.js";
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
const predictor = new LocalPlayerPredictor();
const socket = new WebSocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080");
const reportedEntityCollisions = new Set<string>();
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
let localTick = 1;

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
    receiveWithSimulatedLag(() => {
      interpolator.add(message.snapshot);
    });
  }
});

setInterval(() => {
  if (socket.readyState !== WebSocket.OPEN || !hasSelectedCharacter) {
    return;
  }

  const input = readInput();
  const inputSeq = localTick++;
  const playerState = predictor.getPlayerState();
  if (playerState === undefined) {
    return;
  }

  sendWithSimulatedLag(
    socket,
    JSON.stringify({
      type: "playerState",
      inputSeq,
      snapshotTick: interpolator.getRenderedTick(),
      x: playerState.x,
      y: playerState.y,
      vx: playerState.vx,
      vy: playerState.vy,
      grounded: playerState.grounded,
      smashing: playerState.smashing,
      jumpStartY: playerState.jumpStartY,
      wasJumpPressed: playerState.wasJumpPressed,
    }),
  );
}, 1000 / 60);

function frame(): void {
  const snapshot = predictor.apply(interpolator.get(playerId), interpolator.getLatest(), playerId, readInput(), characters);
  reportLocalEntityCollisions(snapshot);
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

function reportLocalEntityCollisions(snapshot: GameSnapshot | undefined): void {
  if (snapshot === undefined || playerId === undefined || socket.readyState !== WebSocket.OPEN) {
    return;
  }

  const player = snapshot.players.find((candidate) => candidate.playerId === playerId);
  if (player === undefined || !player.alive) {
    return;
  }

  for (const entity of snapshot.entities) {
    if (!entity.alive || reportedEntityCollisions.has(entity.id)) {
      continue;
    }

    if (!intersectsPlayerEntity(player, entity, snapshot.world.scrollX)) {
      continue;
    }

    reportedEntityCollisions.add(entity.id);
    sendWithSimulatedLag(
      socket,
      JSON.stringify({
        type: "entityCollision",
        entityId: entity.id,
        collisionKind: player.smashing ? "smash" : "touch",
        snapshotTick: interpolator.getRenderedTick(),
      }),
    );
  }
}

function intersectsPlayerEntity(player: PlayerSnapshot, entity: EntitySnapshot, scrollX: number): boolean {
  const entityScreenX = entity.x - scrollX;
  return player.x < entityScreenX + entity.width &&
    player.x + player.width > entityScreenX &&
    player.y < entity.y + entity.height &&
    player.y + player.height > entity.y;
}
