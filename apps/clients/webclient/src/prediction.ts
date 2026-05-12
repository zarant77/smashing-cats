import { simulatePlayerMovement } from "@smashing-cats/core";
import type { CharacterDefinition, GameSnapshot, PlayerId, PlayerInput, PlayerSnapshot } from "@smashing-cats/protocol";
import type { PlayerMovementState } from "@smashing-cats/core";

const FALLBACK_GRAVITY = 1700;
const MAX_DT = 1 / 30;

export class LocalPlayerPredictor {
  private state: PlayerMovementState | undefined;
  private playerId: PlayerId | undefined;
  private lastSnapshotPlayer: PlayerSnapshot | undefined;
  private lastUpdatedAt: number | undefined;

  public apply(
    snapshot: GameSnapshot | undefined,
    latest: GameSnapshot | undefined,
    playerId: PlayerId | undefined,
    input: PlayerInput,
    characters: CharacterDefinition[],
    now = performance.now(),
  ): GameSnapshot | undefined {
    if (snapshot === undefined || latest === undefined || playerId === undefined) {
      this.reset();
      return snapshot;
    }

    const authoritativePlayer = latest.players.find((player) => player.playerId === playerId);
    if (authoritativePlayer === undefined || !authoritativePlayer.alive) {
      this.reset();
      return snapshot;
    }

    const character = characters.find((candidate) => candidate.kind === authoritativePlayer.kind);
    if (character === undefined) {
      this.reset();
      return snapshot;
    }

    if (this.state === undefined || this.playerId !== playerId) {
      this.state = createMovementState(authoritativePlayer);
      this.playerId = playerId;
      this.lastUpdatedAt = now;
    }

    this.lastSnapshotPlayer = authoritativePlayer;
    const dt = this.lastUpdatedAt === undefined ? 0 : Math.min(MAX_DT, (now - this.lastUpdatedAt) / 1000);
    this.lastUpdatedAt = now;
    simulatePlayerMovement(this.state, input, character, createGameConfig(latest.world), dt);

    return {
      ...snapshot,
      players: snapshot.players.map((player) => (player.playerId === playerId ? this.createPredictedPlayer(authoritativePlayer) : player)),
    };
  }

  public getPlayerState(): PlayerMovementState | undefined {
    return this.state;
  }

  private createPredictedPlayer(authoritativePlayer: PlayerSnapshot): PlayerSnapshot {
    if (this.state === undefined) {
      return authoritativePlayer;
    }

    return {
      ...authoritativePlayer,
      x: this.state.x,
      y: this.state.y,
      vx: this.state.vx,
      vy: this.state.vy,
      grounded: this.state.grounded,
      smashing: this.state.smashing,
      jumpStartY: this.state.jumpStartY,
      wasJumpPressed: this.state.wasJumpPressed,
    };
  }

  private reset(): void {
    this.state = undefined;
    this.playerId = undefined;
    this.lastSnapshotPlayer = undefined;
    this.lastUpdatedAt = undefined;
  }
}

function createMovementState(player: PlayerSnapshot): PlayerMovementState {
  return {
    x: player.x,
    y: player.y,
    vx: player.vx,
    vy: player.vy,
    width: player.width,
    height: player.height,
    grounded: player.grounded,
    smashing: player.smashing,
    smashingForCollision: player.smashing,
    jumpStartY: player.jumpStartY,
    wasJumpPressed: player.wasJumpPressed,
  };
}

function createGameConfig(world: GameSnapshot["world"]): { width: number; groundY: number; gravity: number } {
  return {
    width: world.width,
    groundY: world.groundY,
    gravity: Number.isFinite(world.gravity) ? world.gravity : FALLBACK_GRAVITY,
  };
}
