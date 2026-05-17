import type { PlayerInput } from "@smashing-cats/protocol";

import { normalizeInput } from "./inputState.js";
import { normalizeInputSeq, normalizeSnapshotTick } from "./inputSeq.js";

import type { Player } from "../types.js";

type ApplyPlayerInputOptions = {
  player: Player;
  input: PlayerInput;
  snapshotTick: number | undefined;
  inputSeq: number | undefined;
};

const jumpRequests = new WeakSet<Player>();

export function applyPlayerInput({ player, input, snapshotTick, inputSeq }: ApplyPlayerInputOptions): void {
  const normalizedInput = normalizeInput(input);
  const wasJumpPressed = player.lastInput.jump;

  if (normalizedInput.jump && !wasJumpPressed) {
    jumpRequests.add(player);
  }

  player.lastInput = normalizedInput;
  player.lastInputSnapshotTick = normalizeSnapshotTick(snapshotTick);
  player.lastReceivedInputSeq = normalizeInputSeq(inputSeq, player.lastReceivedInputSeq);
}

export function consumeJumpRequest(player: Player): boolean {
  if (!jumpRequests.has(player)) {
    return false;
  }

  jumpRequests.delete(player);

  return true;
}

export function clearJumpRequest(player: Player): void {
  jumpRequests.delete(player);
}
