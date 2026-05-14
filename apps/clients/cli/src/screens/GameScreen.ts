import blessed from "blessed";
import type { Translator } from "@smashing-cats/i18n";
import type { EntityKind, GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import { CliConnection, type PlayerInput } from "../network/CliConnection.js";
import { GameAsciiRenderer } from "../render/GameAsciiRenderer.js";
import type { Screen } from "./Screen.js";

type GameScreenOptions = {
  screen: blessed.Widgets.Screen;
  serverUrl: string;
  characterKind: EntityKind;
  sessionCode: string;
  t: Translator;
  onExit: () => void;
};

export class GameScreen implements Screen {
  private readonly root: blessed.Widgets.BoxElement;
  private readonly status: blessed.Widgets.BoxElement;
  private readonly viewport: blessed.Widgets.BoxElement;
  private readonly renderer = new GameAsciiRenderer();

  private connection: CliConnection | undefined;
  private inputTimer: NodeJS.Timeout | undefined;
  private playerId: PlayerId | undefined;

  private input: PlayerInput = {
    left: false,
    right: false,
    jump: false,
  };

  public constructor(private readonly options: GameScreenOptions) {
    this.root = blessed.box({
      top: 0,
      left: 0,
      width: "100%",
      height: "100%",
      tags: true,
      style: {
        bg: "black",
        fg: "white",
      },
    });

    this.status = blessed.box({
      parent: this.root,
      top: 0,
      left: 0,
      width: "100%",
      height: 3,
      border: "line",
      tags: true,
      content: "Connecting...",
      style: {
        border: {
          fg: "cyan",
        },
      },
    });

    this.viewport = blessed.box({
      parent: this.root,
      top: 3,
      left: 0,
      width: "100%",
      height: "100%-5",
      border: "line",
      tags: true,
      content: "Waiting for snapshot...",
      style: {
        border: {
          fg: "green",
        },
      },
    });

    blessed.box({
      parent: this.root,
      bottom: 0,
      left: 0,
      width: "100%",
      height: 2,
      tags: true,
      content: "A/D or ←/→ move | W/Space/↑ jump | ESC back | Q quit",
      style: {
        fg: "gray",
      },
    });

    this.bindEvents();
  }

  public show(): void {
    this.options.screen.append(this.root);
    this.root.focus();

    this.connect();
    this.startInputLoop();

    this.options.screen.render();
  }

  public destroy(): void {
    this.stopInputLoop();
    this.connection?.close();
    this.root.detach();
    this.options.screen.render();
  }

  private bindEvents(): void {
    this.root.key(["escape"], () => {
      this.options.onExit();
    });

    this.root.key(["q", "C-c"], () => {
      process.exit(0);
    });

    this.root.key(["a", "left"], () => {
      this.input.left = true;
      this.input.right = false;
    });

    this.root.key(["d", "right"], () => {
      this.input.right = true;
      this.input.left = false;
    });

    this.root.key(["w", "space", "up"], () => {
      this.input.jump = true;
    });

    this.root.key(["s", "down"], () => {
      this.input.left = false;
      this.input.right = false;
    });
  }

  private connect(): void {
    this.connection = new CliConnection({
      serverUrl: this.options.serverUrl,
      characterKind: this.options.characterKind,
      sessionCode: this.options.sessionCode,

      onWelcome: (playerId) => {
        this.playerId = playerId;
        this.setStatus(`Player: ${playerId} | Cat: ${this.options.t(this.options.characterKind)}`);
      },

      onSnapshot: (snapshot: GameSnapshot) => {
        this.viewport.setContent(this.renderer.render(snapshot, this.playerId));
        this.options.screen.render();
      },

      onStatus: (message) => {
        this.setStatus(message);
      },
    });

    this.connection.connect();
  }

  private startInputLoop(): void {
    this.inputTimer = setInterval(() => {
      this.connection?.sendInput(this.input);

      this.input = {
        left: false,
        right: false,
        jump: false,
      };
    }, 1000 / 30);
  }

  private stopInputLoop(): void {
    if (this.inputTimer === undefined) {
      return;
    }

    clearInterval(this.inputTimer);
    this.inputTimer = undefined;
  }

  private setStatus(message: string): void {
    this.status.setContent(` ${message}`);
    this.options.screen.render();
  }
}
