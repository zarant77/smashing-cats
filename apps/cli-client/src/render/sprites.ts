const OBSTACLE_KINDS = new Set(["stump", "bush", "rock", "cactus"]);
const ENEMY_KINDS = new Set(["boar", "orc", "rat", "crow"]);
const CIVILIAN_KINDS = new Set(["dido", "baba"]);

export const ENTITY_COLORS = {
  enemy: "\x1b[33m",
  obstacle: "\x1b[31m",
  civilian: "\x1b[32m",
  localPlayer: "\x1b[36m",
  otherPlayer: "\x1b[35m",
} as const;

export type AsciiSprite = string[];
export type AnimatedAsciiSprite = AsciiSprite[];

export const ANSI_RESET = "\x1b[0m";

export const LOCAL_PLAYER_SPRITE: AnimatedAsciiSprite = [
  [" /\\_/\\ ", "( o.o )", " > ^ < "],
  [" /\\_/\\ ", "( o.o )", "  >^<  "],
];

export const OTHER_PLAYER_SPRITE: AnimatedAsciiSprite = [
  [" /\\_/\\ ", "( -.- )", " > ^ < "],
  [" /\\_/\\ ", "( -.- )", "  >^<  "],
];

export const ENTITY_SPRITES: Record<string, AnimatedAsciiSprite> = {
  crow: [["\\('v')/"], ["/('v')\\"]],

  rat: [
    ["  __", " ('>", " / )"],
    ["  __", " ('>", " /\\)"],
  ],

  boar: [
    [" /\\__/\\", "( 0 0 )", " /vvv\\ "],
    [" /\\__/\\", "( 0 0 )", " _/vvv\\"],
  ],

  orc: [
    ["  __ ", " (oo)", " /||\\"],
    ["  __ ", " (oo)", " /\\/\\"],
  ],

  stump: [
    ["  __ ", " /##\\", " |##|", "_/||\\_"],
    ["  __ ", " /##\\", " |##|", "_/||\\_"],
  ],

  bush: [
    [" .oo. ", "{oooo}", " 'oo' "],
    [" .OO. ", "{oooo}", " 'OO' "],
  ],

  rock: [
    [" ___ ", "/___\\"],
    [" ___ ", "/___\\"],
  ],

  cactus: [
    ["  |  ", "--|--", "  |  ", "  |  "],
    ["  |  ", "--|--", "  |--", "  |  "],
  ],

  dido: [
    ["  o ", " /|\\", " / \\"],
    ["  o ", " \\|/", " / \\"],
  ],

  baba: [
    ["  O ", " /|\\", " / \\"],
    ["  O ", " \\|/", " / \\"],
  ],
};

export const UNKNOWN_ENTITY_SPRITE: AnimatedAsciiSprite = [
  ["???", "???", "???"],
  ["???", "???", "???"],
];

export function getEntityColor(kind: string): string | undefined {
  if (OBSTACLE_KINDS.has(kind)) {
    return ENTITY_COLORS.obstacle;
  }

  if (ENEMY_KINDS.has(kind)) {
    return ENTITY_COLORS.enemy;
  }

  if (CIVILIAN_KINDS.has(kind)) {
    return ENTITY_COLORS.civilian;
  }

  return undefined;
}
