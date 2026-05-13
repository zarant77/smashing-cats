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

export function applyPlayerInput({ player, input, snapshotTick, inputSeq }: ApplyPlayerInputOptions): void {
  player.lastInput = normalizeInput(input);

  player.lastInputSnapshotTick = normalizeSnapshotTick(snapshotTick);

  player.lastReceivedInputSeq = normalizeInputSeq(inputSeq, player.lastReceivedInputSeq);
}
