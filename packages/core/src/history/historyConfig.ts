import { GAME_CONFIG } from "../config.js";

export const LAG_COMPENSATION_SECONDS = 0.5;

export const MAX_ENTITY_HISTORY_TICKS = Math.ceil(GAME_CONFIG.tickRate * LAG_COMPENSATION_SECONDS);
