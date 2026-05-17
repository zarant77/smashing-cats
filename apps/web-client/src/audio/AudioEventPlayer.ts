import type { GameEvent, GameSnapshot, PlayerId } from "@smashing-cats/protocol";

import { playSound } from "./audio.js";

export class AudioEventPlayer {
  private readonly playedEventIds = new Set<string>();

  public play(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    if (snapshot === undefined) {
      return;
    }

    for (const event of snapshot.events) {
      if (this.playedEventIds.has(event.id)) {
        continue;
      }

      this.playedEventIds.add(event.id);
      this.playEvent(event, snapshot, localPlayerId);
    }

    if (this.playedEventIds.size > 300) {
      this.playedEventIds.clear();
    }
  }

  private playEvent(event: GameEvent, snapshot: GameSnapshot, localPlayerId: PlayerId | undefined): void {
    switch (event.type) {
      case "playerHit": {
        if (event.playerId !== localPlayerId) {
          return;
        }

        const player = snapshot.players.find((item) => item.playerId === localPlayerId);

        if (player !== undefined && !player.alive) {
          playSound("PlayerDie");
          return;
        }

        playSound("PlayerHurt");
        return;
      }

      case "enemyKilled":
        playSound("EnemyDie", event.entityKind);
        return;

      case "civilianKilled":
      case "civilianKilledByEnemy":
        playSound("CivilianDie", event.entityKind);
        return;
    }
  }
}
