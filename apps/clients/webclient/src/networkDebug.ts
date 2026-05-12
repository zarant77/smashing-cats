export const SIMULATED_INPUT_LAG_MS = 0;
export const SIMULATED_SNAPSHOT_LAG_MS = 0;
export const SIMULATED_JITTER_MS = 0;

export function sendWithSimulatedLag(socket: WebSocket, payload: string): void {
  runWithSimulatedLag(SIMULATED_INPUT_LAG_MS, () => {
    if (socket.readyState === WebSocket.OPEN) {
      socket.send(payload);
    }
  });
}

export function receiveWithSimulatedLag(callback: () => void): void {
  runWithSimulatedLag(SIMULATED_SNAPSHOT_LAG_MS, callback);
}

function runWithSimulatedLag(baseLagMs: number, callback: () => void): void {
  const delay = Math.max(0, baseLagMs + getJitterMs());
  if (delay <= 0) {
    callback();
    return;
  }

  window.setTimeout(callback, delay);
}

function getJitterMs(): number {
  if (SIMULATED_JITTER_MS <= 0) {
    return 0;
  }

  return (Math.random() * 2 - 1) * SIMULATED_JITTER_MS;
}
