import type { GameSnapshot } from "@smashing-cats/protocol";

export function isSnapshotGameRunning(snapshot: GameSnapshot): boolean {
  return snapshot.players.some((player) => player.alive);
}
