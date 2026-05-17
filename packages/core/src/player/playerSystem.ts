import { GAME_CONFIG, getCharacterConfig } from "../config.js";
import { clearJumpRequest, consumeJumpRequest } from "../input/applyPlayerInput.js";
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
      clearJumpRequest(player);
      player.smashingForCollision = false;
      updateDeadPlayer(player, dt);
      continue;
    }

    if (player.paused) {
      clearJumpRequest(player);
      player.vx = 0;
      player.vy = 0;
      player.smashing = false;
      player.smashingForCollision = false;
      player.smashSnapshotTick = undefined;
      player.lastProcessedInputSeq = player.lastReceivedInputSeq;
      continue;
    }

    const characterConfig = getCharacterConfig(player.kind);

    const actionInput = {
      ...player.lastInput,
      jump: consumeJumpRequest(player),
    };

    const result = simulatePlayerMovement(
      player,
      actionInput,
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
