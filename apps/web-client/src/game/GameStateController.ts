import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";

type GameStateEventMap = {
  localPlayerSmashStarted: { playerId: PlayerId };
  localPlayerHurt: { playerId: PlayerId; damage: number; kind: string | undefined; type: string | undefined };
  localPlayerDied: { playerId: PlayerId; kind: string | undefined; type: string | undefined };

  playerHurt: { playerId: PlayerId; damage: number; kind: string | undefined; type: string | undefined };
  playerDied: { playerId: PlayerId; kind: string | undefined; type: string | undefined };

  entityKilled: { id: string; kind: string; type: string | undefined };
  enemyKilled: { id: string; kind: string; type: string | undefined };
  civilianKilled: { id: string; kind: string; type: string | undefined };
};

type Listener<K extends keyof GameStateEventMap> = (event: GameStateEventMap[K]) => void;

export class GameStateController {
  private readonly listeners: {
    [K in keyof GameStateEventMap]: Set<Listener<K>>;
  } = {
    localPlayerSmashStarted: new Set(),
    localPlayerHurt: new Set(),
    localPlayerDied: new Set(),

    playerHurt: new Set(),
    playerDied: new Set(),

    entityKilled: new Set(),
    enemyKilled: new Set(),
    civilianKilled: new Set(),
  };

  private previousSnapshot: GameSnapshot | undefined;

  public on<K extends keyof GameStateEventMap>(event: K, listener: Listener<K>): this {
    this.listeners[event].add(listener);
    return this;
  }

  public off<K extends keyof GameStateEventMap>(event: K, listener: Listener<K>): this {
    this.listeners[event].delete(listener);
    return this;
  }

  public update(snapshot: GameSnapshot | undefined, localPlayerId: PlayerId | undefined): void {
    if (snapshot === undefined) {
      return;
    }

    if (this.previousSnapshot === undefined) {
      this.previousSnapshot = snapshot;
      return;
    }

    this.detectPlayerEvents(this.previousSnapshot, snapshot, localPlayerId);
    this.detectEntityEvents(this.previousSnapshot, snapshot);

    this.previousSnapshot = snapshot;
  }

  public reset(): void {
    this.previousSnapshot = undefined;
  }

  private detectPlayerEvents(previousSnapshot: GameSnapshot, currentSnapshot: GameSnapshot, localPlayerId: PlayerId | undefined): void {
    const previousPlayers = new Map(previousSnapshot.players.map((player) => [player.playerId, player]));

    for (const currentPlayer of currentSnapshot.players) {
      const previousPlayer = previousPlayers.get(currentPlayer.playerId);

      if (previousPlayer === undefined) {
        continue;
      }

      const hitEvent = currentSnapshot.events.find((event) => event.type === "playerHit" && event.playerId === currentPlayer.playerId);

      const kind = hitEvent?.type === "playerHit" ? hitEvent.entityKind : undefined;
      const type = hitEvent?.type === "playerHit" ? hitEvent.entityType : undefined;

      if (currentPlayer.playerId === localPlayerId && currentPlayer.smashing && !previousPlayer.smashing) {
        this.emit("localPlayerSmashStarted", {
          playerId: currentPlayer.playerId,
        });
      }

      if (currentPlayer.hp < previousPlayer.hp) {
        const damage = previousPlayer.hp - currentPlayer.hp;

        this.emit("playerHurt", {
          playerId: currentPlayer.playerId,
          damage,
          kind,
          type,
        });

        if (currentPlayer.playerId === localPlayerId) {
          this.emit("localPlayerHurt", {
            playerId: currentPlayer.playerId,
            damage,
            kind,
            type,
          });
        }
      }

      if (previousPlayer.alive && !currentPlayer.alive) {
        this.emit("playerDied", {
          playerId: currentPlayer.playerId,
          kind,
          type,
        });

        if (currentPlayer.playerId === localPlayerId) {
          this.emit("localPlayerDied", {
            playerId: currentPlayer.playerId,
            kind,
            type,
          });
        }
      }
    }
  }

  private detectEntityEvents(previousSnapshot: GameSnapshot, currentSnapshot: GameSnapshot): void {
    const currentEntities = new Map(currentSnapshot.entities.map((entity) => [entity.id, entity]));

    for (const previousEntity of previousSnapshot.entities) {
      const currentEntity = currentEntities.get(previousEntity.id);

      if (currentEntity === undefined || !previousEntity.alive || currentEntity.alive) {
        continue;
      }

      const payload = {
        id: previousEntity.id,
        kind: previousEntity.kind,
        type: previousEntity.type,
      };

      this.emit("entityKilled", payload);

      if (previousEntity.kind === "villager") {
        this.emit("civilianKilled", payload);
      } else {
        this.emit("enemyKilled", payload);
      }
    }
  }

  private emit<K extends keyof GameStateEventMap>(event: K, payload: GameStateEventMap[K]): void {
    for (const listener of this.listeners[event]) {
      listener(payload);
    }
  }
}
