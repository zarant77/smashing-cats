import type { PlayerInput } from "@smashing-cats/protocol";

export function normalizeInput(input: PlayerInput): PlayerInput {
  return {
    left: input.left === true,
    right: input.right === true,
    jump: input.jump === true,
  };
}
