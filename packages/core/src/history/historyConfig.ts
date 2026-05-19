import { TICK_RATE } from "../config.js";

export const LAG_COMPENSATION_SECONDS = 0.5;

export const MAX_ENTITY_HISTORY_TICKS = Math.ceil(TICK_RATE * LAG_COMPENSATION_SECONDS);
