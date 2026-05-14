import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";

export class GameAsciiRenderer {
  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): string {
    if (snapshot === undefined) {
      return "Waiting for snapshot...";
    }

    const localPlayer = snapshot.players.find((player) => player.playerId === playerId);

    return [
      `Tick: ${snapshot.tick}`,
      `Scroll: ${Math.round(snapshot.world.scrollX)}`,
      "",
      `Player: ${localPlayer === undefined ? "not spawned" : `${Math.round(localPlayer.x)}, ${Math.round(localPlayer.y)}`}`,
      "",
      JSON.stringify(snapshot, null, 2).slice(0, 2500),
    ].join("\n");
  }
}
