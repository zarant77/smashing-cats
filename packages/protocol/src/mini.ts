import type { ClientToServerMessage, ServerToClientMessage } from "./messages.js";

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const FIELD_MAP = {
  type: "t",
  matchCode: "m",
  characterKind: "k",
  inputSeq: "s",
  snapshotTick: "st",
  input: "i",
  left: "l",
  right: "r",
  jump: "j",
  paused: "pa",
  playerId: "p",
  characters: "c",
  snapshot: "ss",
  delta: "d",
  simulation: "sm",
  rngState: "rs",
  nextEntityIndex: "nei",
  nextEventIndex: "nev",
  nextSpawnX: "nsx",
} as const;

const NORMAL_FIELD_MAP = Object.fromEntries(Object.entries(FIELD_MAP).map(([normal, mini]) => [mini, normal])) as Record<string, string>;

export function minifyMessage(message: ClientToServerMessage | ServerToClientMessage): string {
  return JSON.stringify(mapJsonKeys(message as unknown as JsonValue, FIELD_MAP));
}

export function normalizeMessage(value: unknown): JsonValue | undefined {
  if (!isJsonValue(value)) {
    return undefined;
  }

  return mapJsonKeys(value, NORMAL_FIELD_MAP);
}

function mapJsonKeys(value: JsonValue, fieldMap: Record<string, string>): JsonValue {
  if (Array.isArray(value)) {
    return value.map((item) => mapJsonKeys(item, fieldMap));
  }

  if (!isJsonObject(value)) {
    return value;
  }

  const result: JsonObject = {};

  for (const [key, item] of Object.entries(value)) {
    result[fieldMap[key] ?? key] = mapJsonKeys(item, fieldMap);
  }

  return result;
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return true;
  }

  if (Array.isArray(value)) {
    return value.every(isJsonValue);
  }

  if (!isJsonObject(value)) {
    return false;
  }

  return Object.values(value).every(isJsonValue);
}

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
