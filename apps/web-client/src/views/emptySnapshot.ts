import { GameSnapshot } from "@smashing-cats/protocol";

export const EMPTY_SNAPSHOT: GameSnapshot = {
  tick: 0,
  seed: 0,
  gamePaused: false,
  tutorial: {
    active: false,
    completed: false,
    targetsDestroyed: 0,
    targetsRequired: 0,
  },
  simulation: {
    rngState: 0,
    nextEntityIndex: 0,
    nextEventIndex: 0,
    nextSpawnX: 0,
  },
  world: {
    scrollX: 0,
    speed: 0,
    width: 960,
    height: 540,
    groundY: 440,
    gravity: 1700,
  },
  players: [],
  entities: [],
  events: [],
};
