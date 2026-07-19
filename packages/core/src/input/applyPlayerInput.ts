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
  const command = player.pendingInputCommands.at(-1);

  if (command === undefined) {
    return undefined;
  }

  // A network packet can deliver several client ticks at once. The server has
  // already simulated the elapsed ticks with the last known held input, so
  // replaying every delayed command here would create an ever-later input
  // queue. Apply the freshest held state and preserve a one-shot jump from any
  // command that was coalesced into this server tick.
  let jumpHeld = player.wasJumpPressed;
  let jumpCommand: PlayerInputCommand | undefined;

  for (const pendingCommand of player.pendingInputCommands) {
    if (pendingCommand.input.jump && !jumpHeld) {
      jumpCommand = pendingCommand;
    }

    jumpHeld = pendingCommand.input.jump;
  }

  const consumedCommand: PlayerInputCommand = {
    ...command,
    snapshotTick: jumpCommand?.snapshotTick ?? command.snapshotTick,
    input: {
      ...command.input,
      jump: jumpCommand === undefined ? command.input.jump : true,
    },
  };

  if (jumpCommand !== undefined) {
    player.wasJumpPressed = false;
  }

  player.pendingInputCommands = [];
  player.lastInput = consumedCommand.input;
  player.lastInputSnapshotTick = consumedCommand.snapshotTick;

  return consumedCommand;
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
