import blessed from "blessed";
import { GameScreen } from "./screens/GameScreen.js";
import type { Screen } from "./screens/Screen.js";
import { StartScreen, type StartGameOptions } from "./screens/StartScreen.js";

export class AppController {
  private readonly screen: blessed.Widgets.Screen;
  private currentScreen: Screen | undefined;
  private lastGameOptions: StartGameOptions | undefined;

  public constructor(private readonly serverUrl: string) {
    this.screen = blessed.screen({
      smartCSR: true,
      title: "Smashing Cats CLI",
    });

    this.screen.key(["C-c"], () => {
      process.exit(0);
    });
  }

  public start(): void {
    this.showStartScreen();
  }

  private showStartScreen(): void {
    this.setScreen(
      new StartScreen({
        screen: this.screen,
        onStart: (options: StartGameOptions) => {
          this.startGame(options);
        },
      }),
    );
  }

  private startGame(options: StartGameOptions): void {
    this.lastGameOptions = options;

    this.setScreen(
      new GameScreen({
        screen: this.screen,
        serverUrl: this.serverUrl,
        characterKind: options.characterKind,
        matchCode: options.matchCode,
        onExit: () => {
          this.showStartScreen();
        },
        onRestart: () => {
          this.restartGame();
        },
      }),
    );
  }

  private restartGame(): void {
    if (this.lastGameOptions === undefined) {
      this.showStartScreen();
      return;
    }

    this.startGame(this.lastGameOptions);
  }

  private setScreen(screen: Screen): void {
    this.currentScreen?.destroy();
    this.currentScreen = screen;
    this.currentScreen.show();
  }
}
