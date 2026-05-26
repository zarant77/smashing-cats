import { storage } from "../storage.js";

export const PLAYER_NAME_MAX_LENGTH = 10;
export const PLAYER_NAME_ALLOWED_PATTERN = "[A-Z0-9\\-_~]";
export const PLAYER_NAME_SANITIZE_PATTERN = /[^A-Z0-9\-_~]/;
const PLAYER_NAME_INVALID_CHARS_PATTERN = /[^A-Z0-9\-_~]/g;

const FUNNY_NAMES = [
  "KOTAN",
  "SMASH",
  "MEOW",
  "PAWS",
  "ZOOM",
  "BONK",
  "FANG",
  "NYANC",
  "WHISK",
  "CLUWS",
  "BUBU",
  "MURRR",
  "FLOOF",
  "BOOP",
  "SCRAT",
  "CHOMP",
  "ZAR",
  "ORKER",
  "BONKY",
  "MIAU",
  "PUNCH",
  "SLASH",
  "BLADE",
  "GHOST",
  "RAGE",
  "CRITS",
  "BITE",
  "MUNCH",
  "FLUFF",
  "SMOL",
];

const allowedControlKeys = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Backspace",
  "Delete",
  "Tab",
  "Enter",
  "Escape",
];

export function getRandomFunnyName(): string {
  const name = FUNNY_NAMES[Math.floor(Math.random() * FUNNY_NAMES.length)];
  const digits = Math.floor(Math.random() * 90 + 10);

  return `${name}-${digits}`;
}

export function getPlayerName(): string {
  return storage.playerName || getRandomFunnyName();
}

export function setPlayerName(name: string): void {
  storage.playerName = name;
}

export function sanitizePlayerName(value: string): string {
  return value.toUpperCase().replace(PLAYER_NAME_SANITIZE_PATTERN, "").slice(0, PLAYER_NAME_MAX_LENGTH);
}

export function isAllowedKey(key: string): boolean {
  return allowedControlKeys.includes(key);
}

export function isAllowedPlayerNameCharacter(value: string): boolean {
  return PLAYER_NAME_INVALID_CHARS_PATTERN.test(value);
}
