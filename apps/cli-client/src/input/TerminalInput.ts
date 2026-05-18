import type { PlayerInput } from "../network/CliConnection.js";
import { terminalBell } from "../audio/TerminalBell.js";

type BlessedKey = {
  name?: string;
  sequence?: string;
  full?: string;
  ctrl?: boolean;
};

type BlessedScreenLike = {
  program?: {
    on(event: "keypress", listener: (ch: string | undefined, key: BlessedKey) => void): void;
    removeListener(event: "keypress", listener: (ch: string | undefined, key: BlessedKey) => void): void;
  };
};

type TerminalInputOptions = {
  screen: BlessedScreenLike;
  onPause: () => void;
  onExit: () => void;
};

type MoveDirection = "left" | "right" | "none";

export class TerminalInput {
  private moveDirection: MoveDirection = "none";
  private jumpPressed = false;

  private readonly onKeyPress = (ch: string | undefined, key: BlessedKey): void => {
    const name = key.name ?? ch ?? "";

    if (key.ctrl === true && name === "c") {
      this.options.onExit();
      return;
    }

    if (name === "escape") {
      this.clear();
      this.options.onPause();
      return;
    }

    if (name === "left" || ch === "a") {
      this.moveDirection = "left";
      terminalBell.move();
      return;
    }

    if (name === "right" || ch === "d") {
      this.moveDirection = "right";
      terminalBell.move();
      return;
    }

    if (name === "down" || ch === "s") {
      this.moveDirection = "none";
      terminalBell.move();
      return;
    }

    if (name === "space" || name === "up" || ch === "w") {
      this.jumpPressed = true;
      terminalBell.jump();
    }
  };

  public constructor(private readonly options: TerminalInputOptions) {}

  public attach(): void {
    this.options.screen.program?.on("keypress", this.onKeyPress);
  }

  public detach(): void {
    this.options.screen.program?.removeListener("keypress", this.onKeyPress);
    this.clear();
  }

  public read(): PlayerInput {
    const input: PlayerInput = {
      left: this.moveDirection === "left",
      right: this.moveDirection === "right",
      jump: this.jumpPressed,
    };

    this.jumpPressed = false;

    return input;
  }

  public clear(): void {
    this.moveDirection = "none";
    this.jumpPressed = false;
  }
}
