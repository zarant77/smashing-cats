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
          playSound("sound.player_die");
          return;
        }

        playSound("sound.player_hurt");
        return;
      }

      case "enemyKilled":
        playSound(getEnemyDieSoundKey(event.entityKind));
        return;

      case "civilianKilled":
      case "civilianKilledByEnemy":
        playSound("sound.civilian_die");
        return;
    }
  }
}

function getEnemyDieSoundKey(kind: string): `sound.${string}` {
  switch (kind) {
    case "boar":
      return "sound.boar_enemy_die";

    case "crow":
      return "sound.crow_enemy_die";

    case "orc":
      return "sound.orc_enemy_die";

    case "rat":
      return "sound.rat_enemy_die";

    default:
      return "sound.enemy_die";
  }
}
