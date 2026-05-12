import type { CharacterDefinition, GameSnapshot, PlayerId, PlayerInput, PlayerSnapshot } from "@smashing-cats/protocol";

const MAX_DT = 1 / 30;
const SNAP_DISTANCE = 140;
const RECONCILE_FACTOR = 0.08;

type PredictionState = {
  player: PlayerSnapshot;
  vy: number;
  grounded: boolean;
  smashing: boolean;
  jumpStartY: number;
  wasJumpPressed: boolean;
};

export class LocalPlayerPredictor {
  private state: PredictionState | undefined;
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
      this.state = undefined;
      this.lastUpdatedAt = undefined;
      return snapshot;
    }

    const renderedPlayer = snapshot.players.find((player) => player.playerId === playerId);
    const authoritativePlayer = latest.players.find((player) => player.playerId === playerId);
    if (renderedPlayer === undefined || authoritativePlayer === undefined || !authoritativePlayer.alive) {
      this.state = undefined;
      this.lastUpdatedAt = undefined;
      return snapshot;
    }

    const character = characters.find((candidate) => candidate.kind === authoritativePlayer.kind);
    if (character === undefined) {
      this.state = undefined;
      this.lastUpdatedAt = undefined;
      return snapshot;
    }

    if (this.state === undefined || this.state.player.id !== authoritativePlayer.id) {
      this.state = createState(authoritativePlayer);
      this.lastUpdatedAt = now;
    }

    this.reconcile(authoritativePlayer);

    const dt = this.lastUpdatedAt === undefined ? 0 : Math.min(MAX_DT, (now - this.lastUpdatedAt) / 1000);
    this.lastUpdatedAt = now;
    this.update(dt, input, character, snapshot.world);

    return {
      ...snapshot,
      players: snapshot.players.map((player) => (player.playerId === playerId ? this.state!.player : player)),
    };
  }

  private reconcile(authoritativePlayer: PlayerSnapshot): void {
    if (this.state === undefined) {
      return;
    }

    const predicted = this.state.player;
    const distance = Math.hypot(predicted.x - authoritativePlayer.x, predicted.y - authoritativePlayer.y);
    if (distance > SNAP_DISTANCE) {
      this.state = createState(authoritativePlayer);
      return;
    }

    this.state.player = {
      ...predicted,
      hp: authoritativePlayer.hp,
      maxHp: authoritativePlayer.maxHp,
      score: authoritativePlayer.score,
      alive: authoritativePlayer.alive,
      invulnerable: authoritativePlayer.invulnerable,
      x: lerp(predicted.x, authoritativePlayer.x, RECONCILE_FACTOR),
      y: lerp(predicted.y, authoritativePlayer.y, RECONCILE_FACTOR),
    };
  }

  private update(
    dt: number,
    input: PlayerInput,
    character: CharacterDefinition,
    world: GameSnapshot["world"],
  ): void {
    if (this.state === undefined || dt <= 0) {
      return;
    }

    const player = this.state.player;
    const moveDirection = Number(input.right) - Number(input.left);
    const jumpPressed = input.jump && !this.state.wasJumpPressed;
    const vx = this.state.smashing ? 0 : moveDirection * character.moveSpeed;

    if (jumpPressed && this.state.grounded) {
      this.state.vy = -character.jumpForce;
      this.state.grounded = false;
      this.state.jumpStartY = player.y;
    } else if (jumpPressed && !this.state.grounded && !this.state.smashing && canSmash(this.state, character, world)) {
      this.state.vy = character.smashSpeed;
      this.state.smashing = true;
    }

    const nextX = clamp(player.x + vx * dt, 20, world.width - player.width - 20);
    const nextY = player.y + this.state.vy * dt;
    this.state.vy += world.gravity * dt;

    this.state.player = {
      ...player,
      x: nextX,
      y: nextY,
      grounded: this.state.grounded,
      smashing: this.state.smashing,
    };

    if (this.state.player.y + this.state.player.height >= world.groundY) {
      this.state.player.y = world.groundY - this.state.player.height;
      this.state.vy = 0;
      this.state.grounded = true;
      this.state.smashing = false;
      this.state.jumpStartY = this.state.player.y;
    }

    this.state.player.grounded = this.state.grounded;
    this.state.player.smashing = this.state.smashing;
    this.state.wasJumpPressed = input.jump;
  }
}

function createState(player: PlayerSnapshot): PredictionState {
  return {
    player,
    vy: 0,
    grounded: player.grounded,
    smashing: player.smashing,
    jumpStartY: player.y,
    wasJumpPressed: false,
  };
}

function canSmash(
  state: PredictionState,
  character: CharacterDefinition,
  world: GameSnapshot["world"],
): boolean {
  const maxJumpHeight = (character.jumpForce * character.jumpForce) / (2 * world.gravity);
  return state.jumpStartY - state.player.y >= maxJumpHeight * character.smashMinJumpProgress;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function lerp(from: number, to: number, alpha: number): number {
  return from + (to - from) * alpha;
}
