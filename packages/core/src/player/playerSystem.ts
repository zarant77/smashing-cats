import { GAME_CONFIG, getCharacterConfig } from "../config.js";
import { simulatePlayerMovement } from "../movement.js";
import { updateDeadPlayer } from "./playerState.js";

import type { Player } from "../types.js";

type UpdatePlayersOptions = {
  players: Iterable<Player>;
  dt: number;
};

export function updatePlayers({ players, dt }: UpdatePlayersOptions): void {
  for (const player of players) {
    player.previousX = player.x;
    player.previousY = player.y;

    if (!player.alive) {
      player.smashingForCollision = false;
      updateDeadPlayer(player, dt);
      continue;
    }

    const characterConfig = getCharacterConfig(player.kind);

    const result = simulatePlayerMovement(
      player,
      player.lastInput,
      characterConfig,
      {
        width: GAME_CONFIG.worldWidth,
        groundY: GAME_CONFIG.groundY,
        gravity: GAME_CONFIG.gravity,
      },
      dt,
    );

    player.lastProcessedInputSeq = player.lastReceivedInputSeq;

    if (result.startedSmash) {
      player.smashSnapshotTick = player.lastInputSnapshotTick;
    }

    if (player.grounded && !player.smashing) {
      player.smashSnapshotTick = undefined;
    }
  }
}
