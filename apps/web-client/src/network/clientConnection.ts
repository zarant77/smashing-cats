import {
  minifyMessage,
  normalizeMessage,
  type ClientToServerMessage,
  type ServerToClientMessage,
} from "@smashing-cats/protocol";

export function createSocket(): WebSocket {
  return new WebSocket(import.meta.env.VITE_WS_URL ?? "ws://localhost:8080");
}

export function sendClientMessage(socket: WebSocket | undefined, message: ClientToServerMessage): void {
  socket?.send(minifyMessage(message));
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
