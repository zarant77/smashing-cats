import type { PlayerInput, Size } from "@smashing-cats/protocol";

export type CharacterMovementConfig = {
  moveSpeed: number;
  jumpForce: number;
  smashSpeed: number;
  smashMinJumpProgress: number;
};

export type GameMovementConfig = {
  width: number;
  groundY: number;
  gravity: number;
};

export type PlayerMovementState = {
  x: number;
  y: number;

  vx: number;
  vy: number;

  size: Size;

  grounded: boolean;

  smashing: boolean;
  smashingForCollision: boolean;

  jumpStartY: number;
  canJump: boolean;
  wasJumpPressed: boolean;
};

export type PlayerMovementResult = {
  startedSmash: boolean;
};

export function simulatePlayerMovement(
  player: PlayerMovementState,
  input: PlayerInput,
  characterConfig: CharacterMovementConfig,
  gameConfig: GameMovementConfig,
  dt: number,
): PlayerMovementResult {
  const [, height] = player.size;

  const wasSmashing = player.smashing;
  const moveDirection = Number(input.right) - Number(input.left);
  const jumpPressed = input.jump && !player.wasJumpPressed;

  let startedSmash = false;

  player.vx = player.smashing ? 0 : moveDirection * characterConfig.moveSpeed;

  if (jumpPressed && player.grounded && player.canJump) {
    player.vy = -characterConfig.jumpForce;
    player.grounded = false;
    player.canJump = false;
    player.smashing = false;
    player.smashingForCollision = false;
    player.jumpStartY = player.y;
  } else if (jumpPressed && !player.grounded && !player.smashing && canSmash(player, characterConfig, gameConfig)) {
    player.vy = characterConfig.smashSpeed;
    player.smashing = true;
    player.smashingForCollision = true;
    startedSmash = true;
  }

  if (!player.grounded) {
    player.vy += gameConfig.gravity * dt;
  }

  if (player.smashing && !player.grounded) {
    player.vy = Math.max(player.vy, characterConfig.smashSpeed);
  }

  player.x += player.vx * dt;
  player.y += player.vy * dt;

  player.x = clamp(player.x, 20, gameConfig.width - 20);

  if (player.y + height >= gameConfig.groundY) {
    player.y = gameConfig.groundY - height;
    player.vy = 0;
    player.grounded = true;
    player.canJump = true;
    player.smashing = false;
    player.jumpStartY = player.y;
  } else {
    player.grounded = false;
  }

  player.smashingForCollision = wasSmashing || startedSmash || player.smashing;

  player.wasJumpPressed = input.jump;

  return {
    startedSmash,
  };
}

function canSmash(player: PlayerMovementState, characterConfig: CharacterMovementConfig, gameConfig: GameMovementConfig): boolean {
  return getJumpProgress(player, characterConfig, gameConfig) >= characterConfig.smashMinJumpProgress;
}

function getJumpProgress(
  player: PlayerMovementState,
  characterConfig: CharacterMovementConfig,
  gameConfig: GameMovementConfig,
): number {
  const maxJumpHeight = (characterConfig.jumpForce * characterConfig.jumpForce) / (2 * gameConfig.gravity);
  const currentJumpHeight = player.jumpStartY - player.y;

  return maxJumpHeight <= 0 ? 0 : currentJumpHeight / maxJumpHeight;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
