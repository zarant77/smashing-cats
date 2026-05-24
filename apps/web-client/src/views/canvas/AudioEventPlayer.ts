import type { GameEvent, GameSnapshot, PlayerId } from "@smashing-cats/protocol";

import { playSound } from "../../audio/audio.js";

type PlayerAudioState = {
  wasJumpPressed: boolean;
  smashing: boolean;
};

export class AudioEventPlayer {
  private readonly playedEventIds = new Set<string>();
  private readonly playerStates = new Map<PlayerId, PlayerAudioState>();

  public play(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    if (snapshot === undefined || localPlayerId === undefined) {
      return;
    }

    this.playPlayerStateSounds(snapshot, localPlayerId);
    this.playGameEvents(snapshot, localPlayerId);
  }

  private playPlayerStateSounds(snapshot: GameSnapshot, localPlayerId: PlayerId): void {
    const player = snapshot.players.find((item) => item.playerId === localPlayerId);

    if (player === undefined || !player.alive) {
      return;
    }

    const previous = this.playerStates.get(localPlayerId) ?? {
      wasJumpPressed: false,
      smashing: false,
    };

    const jumpStarted = player.wasJumpPressed && !previous.wasJumpPressed;
    const smashStarted = player.smashing && !previous.smashing;

    if (smashStarted) {
      playSound("sound.player_smash");
    } else if (jumpStarted) {
      playSound("sound.player_jump");
    }

    this.playerStates.set(localPlayerId, {
      wasJumpPressed: player.wasJumpPressed,
      smashing: player.smashing,
    });
  }

  private playGameEvents(snapshot: GameSnapshot, localPlayerId: PlayerId): void {
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

  private playEvent(event: GameEvent, snapshot: GameSnapshot, localPlayerId: PlayerId): void {
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
    case "dummy":
      return "sound.dummy_enemy_die";

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
