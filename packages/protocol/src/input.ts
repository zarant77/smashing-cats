export type PlayerInput = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

export const INPUT_LEFT = 1;
export const INPUT_RIGHT = 2;
export const INPUT_JUMP = 4;

export function encodeInputMask(input: PlayerInput): number {
  return (input.left ? INPUT_LEFT : 0) | (input.right ? INPUT_RIGHT : 0) | (input.jump ? INPUT_JUMP : 0);
}

export function decodeInputMask(mask: number): PlayerInput {
  return {
    left: (mask & INPUT_LEFT) !== 0,
    right: (mask & INPUT_RIGHT) !== 0,
    jump: (mask & INPUT_JUMP) !== 0,
  };
}
