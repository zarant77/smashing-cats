import type { CharacterDefinition } from "./character.js";
import type { EntityKind, PlayerId } from "./entity.js";
import { decodeInputMask, encodeInputMask } from "./input.js";
import type { ClientToServerMessage, ServerToClientMessage } from "./messages.js";
import type { DeltaSnapshot, GameSnapshot } from "./snapshot.js";

export type MiniInputMessage = {
  t: "i";
  s: number;
  k?: number;
  m: number;
};

export type MiniJoinMessage = {
  t: "j";
  n?: string;
};

export type MiniSelectCharacterMessage = {
  t: "c";
  k: EntityKind;
  n?: string;
};

export type MiniClientToServerMessage = MiniJoinMessage | MiniSelectCharacterMessage | MiniInputMessage;

export type MiniWelcomeMessage = {
  t: "w";
  p: PlayerId;
  c: CharacterDefinition[];
};

export type MiniSnapshotMessage = {
  t: "s";
  d: GameSnapshot;
};

export type MiniDeltaSnapshotMessage = {
  t: "d";
  d: DeltaSnapshot;
};

export type MiniServerToClientMessage = MiniWelcomeMessage | MiniSnapshotMessage | MiniDeltaSnapshotMessage;

export function toMiniClientMessage(message: ClientToServerMessage): MiniClientToServerMessage {
  switch (message.type) {
    case "join": {
      const mini: MiniJoinMessage = {
        t: "j",
      };

      if (message.name !== undefined) {
        mini.n = message.name;
      }

      return mini;
    }

    case "selectCharacter": {
      const mini: MiniSelectCharacterMessage = {
        t: "c",
        k: message.characterKind,
      };

      if (message.name !== undefined) {
        mini.n = message.name;
      }

      return mini;
    }

    case "input": {
      const mini: MiniInputMessage = {
        t: "i",
        s: message.inputSeq,
        m: encodeInputMask(message.input),
      };

      if (message.snapshotTick !== undefined) {
        mini.k = message.snapshotTick;
      }

      return mini;
    }
  }
}

export function toMiniServerMessage(message: ServerToClientMessage): MiniServerToClientMessage {
  switch (message.type) {
    case "welcome":
      return {
        t: "w",
        p: message.playerId,
        c: message.characters,
      };

    case "snapshot":
      return {
        t: "s",
        d: message.snapshot,
      };

    case "delta":
      return {
        t: "d",
        d: message.delta,
      };
  }
}

export function normalizeClientMessage(value: unknown): ClientToServerMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.t === "j") {
    return normalizeMiniJoinMessage(value);
  }

  if (value.t === "c") {
    return normalizeMiniSelectCharacterMessage(value);
  }

  if (value.t === "i") {
    return normalizeMiniInputMessage(value);
  }

  if (value.type === "join") {
    return normalizeJoinMessage(value);
  }

  if (value.type === "selectCharacter") {
    return normalizeSelectCharacterMessage(value);
  }

  if (value.type === "input") {
    return normalizeInputMessage(value);
  }

  return undefined;
}

export function normalizeServerMessage(value: unknown): ServerToClientMessage | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  if (value.t === "w") {
    return normalizeMiniWelcomeMessage(value);
  }

  if (value.t === "s") {
    return normalizeMiniSnapshotMessage(value);
  }

  if (value.t === "d") {
    return normalizeMiniDeltaSnapshotMessage(value);
  }

  if (value.type === "welcome") {
    return normalizeWelcomeMessage(value);
  }

  if (value.type === "snapshot") {
    return normalizeSnapshotMessage(value);
  }

  if (value.type === "delta") {
    return normalizeDeltaSnapshotMessage(value);
  }

  return undefined;
}

function normalizeMiniJoinMessage(value: Record<string, unknown>): ClientToServerMessage {
  const message = {
    type: "join",
  } satisfies ClientToServerMessage;

  if (typeof value.n !== "string") {
    return message;
  }

  return {
    ...message,
    name: value.n,
  };
}

function normalizeMiniSelectCharacterMessage(value: Record<string, unknown>): ClientToServerMessage | undefined {
  const characterKind = readEntityKind(value.k);

  if (characterKind === undefined) {
    return undefined;
  }

  const message = {
    type: "selectCharacter",
    characterKind,
  } satisfies ClientToServerMessage;

  if (typeof value.n !== "string") {
    return message;
  }

  return {
    ...message,
    name: value.n,
  };
}

function normalizeMiniInputMessage(value: Record<string, unknown>): ClientToServerMessage | undefined {
  const inputSeq = readNumber(value.s);
  const inputMask = readNumber(value.m);

  if (inputSeq === undefined || inputMask === undefined) {
    return undefined;
  }

  const message = {
    type: "input",
    inputSeq,
    input: decodeInputMask(inputMask),
  } satisfies ClientToServerMessage;

  const snapshotTick = readOptionalNumber(value.k);

  if (snapshotTick === undefined) {
    return message;
  }

  return {
    ...message,
    snapshotTick,
  };
}

function normalizeJoinMessage(value: Record<string, unknown>): ClientToServerMessage {
  const message = {
    type: "join",
  } satisfies ClientToServerMessage;

  if (typeof value.name !== "string") {
    return message;
  }

  return {
    ...message,
    name: value.name,
  };
}

function normalizeSelectCharacterMessage(value: Record<string, unknown>): ClientToServerMessage | undefined {
  const characterKind = readEntityKind(value.characterKind);

  if (characterKind === undefined) {
    return undefined;
  }

  const message = {
    type: "selectCharacter",
    characterKind,
  } satisfies ClientToServerMessage;

  if (typeof value.name !== "string") {
    return message;
  }

  return {
    ...message,
    name: value.name,
  };
}

function normalizeInputMessage(value: Record<string, unknown>): ClientToServerMessage | undefined {
  const inputSeq = readNumber(value.inputSeq);

  if (inputSeq === undefined || !isRecord(value.input)) {
    return undefined;
  }

  const message = {
    type: "input",
    inputSeq,
    input: {
      left: value.input.left === true,
      right: value.input.right === true,
      jump: value.input.jump === true,
    },
  } satisfies ClientToServerMessage;

  const snapshotTick = readOptionalNumber(value.snapshotTick);

  if (snapshotTick === undefined) {
    return message;
  }

  return {
    ...message,
    snapshotTick,
  };
}

function normalizeMiniWelcomeMessage(value: Record<string, unknown>): ServerToClientMessage | undefined {
  if (typeof value.p !== "string" || !Array.isArray(value.c)) {
    return undefined;
  }

  return {
    type: "welcome",
    playerId: value.p,
    characters: value.c as CharacterDefinition[],
  };
}

function normalizeMiniSnapshotMessage(value: Record<string, unknown>): ServerToClientMessage | undefined {
  if (!isRecord(value.d)) {
    return undefined;
  }

  return {
    type: "snapshot",
    snapshot: value.d as GameSnapshot,
  };
}

function normalizeMiniDeltaSnapshotMessage(value: Record<string, unknown>): ServerToClientMessage | undefined {
  if (!isRecord(value.d)) {
    return undefined;
  }

  return {
    type: "delta",
    delta: value.d as DeltaSnapshot,
  };
}

function normalizeWelcomeMessage(value: Record<string, unknown>): ServerToClientMessage | undefined {
  if (typeof value.playerId !== "string" || !Array.isArray(value.characters)) {
    return undefined;
  }

  return {
    type: "welcome",
    playerId: value.playerId,
    characters: value.characters as CharacterDefinition[],
  };
}

function normalizeSnapshotMessage(value: Record<string, unknown>): ServerToClientMessage | undefined {
  if (!isRecord(value.snapshot)) {
    return undefined;
  }

  return {
    type: "snapshot",
    snapshot: value.snapshot as GameSnapshot,
  };
}

function normalizeDeltaSnapshotMessage(value: Record<string, unknown>): ServerToClientMessage | undefined {
  if (!isRecord(value.delta)) {
    return undefined;
  }

  return {
    type: "delta",
    delta: value.delta as DeltaSnapshot,
  };
}

function readNumber(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function readOptionalNumber(value: unknown): number | undefined {
  return value === undefined ? undefined : readNumber(value);
}

function readEntityKind(value: unknown): EntityKind | undefined {
  return typeof value === "string" ? (value as EntityKind) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
