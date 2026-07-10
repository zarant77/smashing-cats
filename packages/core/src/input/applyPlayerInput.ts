import type { PlayerInput, PlayerInputCommand } from "@smashing-cats/protocol";

import { normalizeInput } from "./inputState.js";
import { normalizeInputSeq, normalizeSnapshotTick } from "./inputSeq.js";

import type { Player } from "../types.js";

type ApplyPlayerInputOptions = {
  player: Player;
  input: PlayerInput;
  snapshotTick: number | undefined;
  inputSeq: number | undefined;
};

const MAX_QUEUED_INPUT_COMMANDS = 120;
const MAX_ACCEPTED_SEQUENCE_AHEAD = 240;

export function applyPlayerInput({ player, input, snapshotTick, inputSeq }: ApplyPlayerInputOptions): void {
  queuePlayerInputCommand(player, {
    inputSeq: normalizeInputSeq(inputSeq, player.lastReceivedInputSeq + 1),
    clientTick: 0,
    snapshotTick,
    input,
  });
}

export function queuePlayerInputCommand(player: Player, command: PlayerInputCommand): void {
  const inputSeq = normalizeIncomingInputSeq(command.inputSeq, player.lastReceivedInputSeq + 1);

  if (inputSeq <= player.lastProcessedInputSeq) {
    return;
  }

  if (inputSeq > player.lastProcessedInputSeq + MAX_ACCEPTED_SEQUENCE_AHEAD) {
    return;
  }

  if (player.pendingInputCommands.some((pendingCommand) => pendingCommand.inputSeq === inputSeq)) {
    return;
  }

  player.pendingInputCommands.push({
    inputSeq,
    clientTick: normalizeSnapshotTick(command.clientTick) ?? 0,
    snapshotTick: normalizeSnapshotTick(command.snapshotTick),
    input: normalizeInput(command.input),
  });

  player.pendingInputCommands.sort((left, right) => left.inputSeq - right.inputSeq);
  player.lastReceivedInputSeq = Math.max(player.lastReceivedInputSeq, inputSeq);

  if (player.pendingInputCommands.length > MAX_QUEUED_INPUT_COMMANDS) {
    player.pendingInputCommands.splice(0, player.pendingInputCommands.length - MAX_QUEUED_INPUT_COMMANDS);
  }
}

export function consumePlayerInputCommand(player: Player): PlayerInputCommand | undefined {
  const command = player.pendingInputCommands.shift();

  if (command === undefined) {
    return undefined;
  }

  player.lastInput = command.input;
  player.lastInputSnapshotTick = command.snapshotTick;

  return command;
}

export function clearJumpRequest(player: Player): void {
  player.pendingInputCommands = [];
}

function normalizeIncomingInputSeq(inputSeq: number | undefined, fallback: number): number {
  if (inputSeq === undefined || !Number.isFinite(inputSeq)) {
    return fallback;
  }

  return Math.max(0, Math.floor(inputSeq));
}
