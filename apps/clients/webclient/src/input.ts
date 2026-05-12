import type { PlayerInput } from "@smashing-cats/protocol";

const keys = new Set<string>();

const blockedBrowserKeys = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

window.addEventListener("keydown", (event) => {
  if (blockedBrowserKeys.has(event.code)) {
    event.preventDefault();
  }

  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  if (blockedBrowserKeys.has(event.code)) {
    event.preventDefault();
  }

  keys.delete(event.code);
});

window.addEventListener("blur", () => {
  keys.clear();
});

export function readInput(): PlayerInput {
  return {
    left: keys.has("ArrowLeft") || keys.has("KeyA"),
    right: keys.has("ArrowRight") || keys.has("KeyD"),
    jump: keys.has("Space") || keys.has("ArrowUp") || keys.has("KeyW"),
  };
}
