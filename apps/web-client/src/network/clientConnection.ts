import {
  minifyMessage,
  normalizeMessage,
  type ClientToServerMessage,
  type ServerToClientMessage,
} from "@smashing-cats/protocol";
import { sendWithSimulatedLag } from "../networkDebug.js";

export function createSocket(): WebSocket {
  return new WebSocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080");
}

export function sendClientMessage(socket: WebSocket | undefined, message: ClientToServerMessage): void {
  if (socket !== undefined) {
    sendWithSimulatedLag(socket, minifyMessage(message));
  }
}

export function parseServerMessage(data: unknown): ServerToClientMessage | undefined {
  if (typeof data !== "string") {
    return undefined;
  }

  try {
    return normalizeMessage(JSON.parse(data)) as unknown as ServerToClientMessage;
  } catch {
    return undefined;
  }
}
