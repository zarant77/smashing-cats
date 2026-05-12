import type { PlayerInput } from "@smashing-cats/protocol";

const keys = new Set<string>();

window.addEventListener("keydown", (event) => {
  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

export function readInput(): PlayerInput {
  return {
    left: keys.has("ArrowLeft") || keys.has("KeyA"),
    right: keys.has("ArrowRight") || keys.has("KeyD"),
    jump: keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW"),
  };
}
