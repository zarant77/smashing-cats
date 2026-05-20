import type { GameSnapshot, PlayerId } from "@smashing-cats/protocol";
import type { Translator } from "@smashing-cats/i18n";
import type { GameView, ViewOptions } from "../types.js";
import { EMPTY_SNAPSHOT } from "../emptySnapshot.js";
import { getViewSize } from "../viewport.js";
import { SmashingCatsThreeScene } from "./SmashingCatsThreeScene.js";
import { ThreeModelFactory } from "./models/ThreeModelFactory.js";

export class ThreeView implements GameView {
  private readonly models = new ThreeModelFactory();
  private readonly scene: SmashingCatsThreeScene;

  private ready = false;
  private pendingSnapshot: GameSnapshot | undefined = EMPTY_SNAPSHOT;
  private pendingPlayerId: PlayerId | undefined;

  public constructor(
    private readonly root: HTMLElement,
    private readonly options: ViewOptions,
  ) {
    this.root.replaceChildren();

    const size = getViewSize(this.root);

    this.scene = new SmashingCatsThreeScene(size.width, size.height, this.models);

    this.root.appendChild(this.scene.domElement);

    this.resize();

    void this.init();

    window.addEventListener("resize", this.resize);
    window.addEventListener("orientationchange", this.resize);
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    this.pendingSnapshot = snapshot;
    this.pendingPlayerId = playerId;

    if (!this.ready) {
      return;
    }

    this.scene.setState(snapshot, playerId);
    this.scene.render();
  }

  public setLocale(_locale: string, t: Translator): void {
    this.scene.setTranslator(t);
  }

  public destroy(): void {
    window.removeEventListener("resize", this.resize);
    window.removeEventListener("orientationchange", this.resize);

    this.scene.destroy();
    this.root.replaceChildren();
  }

  private async init(): Promise<void> {
    await this.scene.init();

    this.ready = true;

    this.scene.setState(this.pendingSnapshot, this.pendingPlayerId);
    this.scene.render();
  }

  private readonly resize = (): void => {
    const size = getViewSize(this.root);

    this.scene.resize(size.width, size.height);

    this.scene.domElement.style.width = `${size.styleWidth}px`;
    this.scene.domElement.style.height = `${size.styleHeight}px`;
  };
}
