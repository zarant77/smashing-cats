import blessed from "blessed";
import clipboard from "clipboardy";
import type { Translator } from "@smashing-cats/i18n";
import type { CharacterDefinition, EntityKind, GameSnapshot, PlayerId, PlayerSnapshot } from "@smashing-cats/protocol";
import { SnapshotInterpolator } from "@smashing-cats/client-netcode";
import { CliConnection } from "../network/CliConnection.js";
import { GameAsciiRenderer } from "../render/GameAsciiRenderer.js";
import { terminalBell } from "../audio/TerminalBell.js";
import { TerminalInput } from "../input/TerminalInput.js";
import { GameOverOverlay } from "./GameOverOverlay.js";
import type { Screen } from "./Screen.js";

type GameScreenOptions = {
  screen: blessed.Widgets.Screen;
  serverUrl: string;
  characterKind: EntityKind;
  matchCode: string;
  t: Translator;
  onExit: () => void;
  onRestart: () => void;
};

const VIEW_WIDTH = 100;
const VIEW_HEIGHT = 28;

export class GameScreen implements Screen {
  private readonly root: blessed.Widgets.BoxElement;
  private readonly status: blessed.Widgets.BoxElement;
  private readonly viewport: blessed.Widgets.BoxElement;
  private readonly renderer = new GameAsciiRenderer();
  private readonly interpolator = new SnapshotInterpolator();

  private readonly terminalInput: TerminalInput;

  private connection: CliConnection | undefined;
  private inputTimer: NodeJS.Timeout | undefined;
  private renderTimer: NodeJS.Timeout | undefined;

  private playerId: PlayerId | undefined;
  private previousLocalPlayer: PlayerSnapshot | undefined;
  private gameOverOverlay: GameOverOverlay | undefined;

  private characters: CharacterDefinition[] = [];
  private inputSeq = 1;

  private paused = false;

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
      content: this.options.t("gameScreenHint"),
      style: {
        fg: "gray",
      },
    });

    this.terminalInput = new TerminalInput({
      screen: this.options.screen,
      onPause: () => {
        this.togglePause();
      },
      onExit: () => {
        process.exit(0);
      },
    });

    this.bindEvents();
  }

  public show(): void {
    this.options.screen.append(this.root);
    this.root.focus();

    this.terminalInput.attach();

    this.connect();
    this.startInputLoop();
    this.startRenderLoop();

    this.options.screen.render();
  }

  public destroy(): void {
    this.terminalInput.detach();

    this.stopInputLoop();
    this.stopRenderLoop();
    this.connection?.close();
    this.gameOverOverlay?.destroy();
    this.root.detach();
    this.options.screen.render();
  }

  private bindEvents(): void {
    this.status.on("click", async () => {
      await clipboard.write(this.options.matchCode);
      terminalBell.ui();
    });
  }

  private connect(): void {
    this.connection = new CliConnection({
      serverUrl: this.options.serverUrl,
      characterKind: this.options.characterKind,
      matchCode: this.options.matchCode,

      onWelcome: (playerId, characters) => {
        this.playerId = playerId;
        this.characters = characters;
        this.setStatus(this.options.matchCode);
      },

      onSnapshot: (snapshot: GameSnapshot) => {
        this.interpolator.add(snapshot);
      },

      onStatus: (message) => {
        this.setStatus(this.options.matchCode, message);
      },
    });

    this.connection.connect();
  }

  private startInputLoop(): void {
    this.inputTimer = setInterval(() => {
      if (this.gameOverOverlay !== undefined || this.paused) {
        this.terminalInput.clear();
        return;
      }

      const currentInputSeq = this.inputSeq++;
      const input = this.terminalInput.read();

      this.connection?.sendInput(currentInputSeq, input, this.interpolator.getRenderedTick());
    }, 1000 / 30);
  }

  private startRenderLoop(): void {
    this.renderTimer = setInterval(() => {
      const snapshot = this.interpolator.get(undefined);

      const content = this.renderer.render(snapshot, this.playerId, this.options.t);
      this.viewport.setContent(this.paused ? this.withPauseOverlay(content) : content);

      if (snapshot !== undefined) {
        this.handleSnapshotSounds(snapshot);
        this.handleGameOver(snapshot);
      }

      this.options.screen.render();
    }, 1000 / 30);
  }

  private handleSnapshotSounds(snapshot: GameSnapshot): void {
    if (this.playerId === undefined || this.gameOverOverlay !== undefined) {
      return;
    }

    const player = snapshot.players.find((item) => item.playerId === this.playerId);

    if (player === undefined) {
      return;
    }

    if (this.previousLocalPlayer !== undefined) {
      this.playPlayerDeltaSounds(this.previousLocalPlayer, player);
    }

    this.previousLocalPlayer = { ...player };
  }

  private playPlayerDeltaSounds(previous: PlayerSnapshot, current: PlayerSnapshot): void {
    if (current.hp > previous.hp) {
      terminalBell.hpUp();
    } else if (current.hp < previous.hp) {
      terminalBell.hpDown();
    }

    if (current.score > previous.score) {
      terminalBell.scoreUp();
    } else if (current.score < previous.score) {
      terminalBell.scoreDown();
    }
  }

  private handleGameOver(snapshot: GameSnapshot): void {
    if (this.playerId === undefined || this.gameOverOverlay !== undefined) {
      return;
    }

    const player = snapshot.players.find((item) => item.playerId === this.playerId);

    if (player === undefined || player.hp > 0) {
      return;
    }

    this.showGameOverOverlay(player.score);
  }

  private showGameOverOverlay(score: number): void {
    this.terminalInput.clear();

    this.gameOverOverlay = new GameOverOverlay({
      parent: this.root,
      screen: this.options.screen,
      score,
      t: this.options.t,
      onRestart: () => {
        this.options.onRestart();
      },
      onExit: () => {
        this.options.onExit();
      },
    });

    this.gameOverOverlay.show();
  }

  private stopInputLoop(): void {
    if (this.inputTimer === undefined) {
      return;
    }

    clearInterval(this.inputTimer);
    this.inputTimer = undefined;
  }

  private stopRenderLoop(): void {
    if (this.renderTimer === undefined) {
      return;
    }

    clearInterval(this.renderTimer);
    this.renderTimer = undefined;
  }

  private setStatus(matchCode: string, message?: string): void {
    let statusContent = `${this.options.t("matchCode")}: ${matchCode}`;

    if (message !== undefined) {
      statusContent += ` | ${message}`;
    }

    this.status.setContent(statusContent);
    this.options.screen.render();
  }

  private togglePause(): void {
    if (this.gameOverOverlay !== undefined) {
      return;
    }

    this.paused = !this.paused;
    this.terminalInput.clear();

    this.connection?.sendPause(this.paused);
    terminalBell.ui();
  }

  private withPauseOverlay(content: string): string {
    const lines = content.split("\n");

    if (lines.length === 0) {
      return content;
    }

    const label = "{bold}{yellow-fg}PAUSE{/yellow-fg}{/bold}";
    const plainLabel = "PAUSE";

    const y = Math.floor(lines.length / 2);
    const width = Math.max(...lines.map((line) => line.length));
    const x = Math.max(0, Math.floor((width - plainLabel.length) / 2));

    const line = lines[y] ?? "";
    const paddedLine = line.padEnd(width, " ");

    lines[y] = `${paddedLine.slice(0, x)}${label}${paddedLine.slice(x + plainLabel.length)}`;

    return lines.join("\n");
  }
}
