import type { PlayerInput } from "@smashing-cats/protocol";

const keys = new Set<string>();

const blockedBrowserKeys = new Set(["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
const jumpKeys = new Set(["Space", "ArrowUp", "ArrowDown", "KeyW", "KeyS"]);

let paused = false;
let pausePressed = false;
let pendingJumpPress = false;

function isTextInputTarget(target: EventTarget | null): boolean {
  return target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement;
}

window.addEventListener("keydown", (event) => {
  if (isTextInputTarget(event.target)) {
    return;
  }

  if (blockedBrowserKeys.has(event.code)) {
    event.preventDefault();
  }

  if (event.code === "Escape" && !event.repeat) {
    paused = !paused;
    pausePressed = true;
    return;
  }

  if (jumpKeys.has(event.code) && !event.repeat && !keys.has(event.code)) {
    pendingJumpPress = true;
  }

  keys.add(event.code);
});

window.addEventListener("keyup", (event) => {
  if (isTextInputTarget(event.target)) {
    return;
  }

  if (blockedBrowserKeys.has(event.code)) {
    event.preventDefault();
  }

  keys.delete(event.code);
});

window.addEventListener("blur", () => {
  keys.clear();
  pendingJumpPress = false;
});

export function consumePauseToggle(): boolean {
  if (!pausePressed) {
    return false;
  }

  pausePressed = false;
  return true;
}

export function isPaused(): boolean {
  return paused;
}

export function setPaused(nextPaused: boolean): void {
  paused = nextPaused;
}

export function togglePause(): void {
  paused = !paused;
}

export function consumeJumpPress(): boolean {
  if (!pendingJumpPress) {
    return false;
  }

  if (paused) {
    pendingJumpPress = false;
    return false;
  }

  pendingJumpPress = false;
  return true;
}

export function readInput(): PlayerInput {
  if (paused) {
    return {
      left: false,
      right: false,
      jump: false,
    };
  }

  return {
    left: keys.has("ArrowLeft") || keys.has("KeyA"),
    right: keys.has("ArrowRight") || keys.has("KeyD"),
    jump: keys.has("Space") || keys.has("ArrowUp") || keys.has("ArrowDown") || keys.has("KeyW") || keys.has("KeyS"),
  };
}
