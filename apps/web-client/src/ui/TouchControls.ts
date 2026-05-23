import type { GameSnapshot, PlayerId, PlayerInput } from "@smashing-cats/protocol";

type TouchState = {
  pointerId: number;
  startX: number;
  x: number;
};

type ActionMode = "jump" | "smash";

const MOVE_ENTER_RATIO = 0.05;
const MOVE_EXIT_RATIO = 0.04;
const JOY_CENTER_MAX_OFFSET_RATIO = 0.05;

export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly joyCenter: HTMLDivElement;
  private readonly jumpButton: HTMLDivElement;
  private readonly smashButton: HTMLDivElement;

  private touch: TouchState | undefined;

  private leftPressed = false;
  private rightPressed = false;
  private jumpPressed = false;

  public constructor() {
    this.root = document.querySelector<HTMLDivElement>("#touch-control-placeholder") as HTMLDivElement;
    this.root.className = "touch-controls touch-controls-gesture";

    const moveHint = this.createMoveHint();
    const actionHint = this.createActionHint();

    const joyCenter = moveHint.querySelector(".joy-center");
    const jumpButton = actionHint.querySelector(".joy-jump");
    const smashButton = actionHint.querySelector(".joy-smash");

    if (!(joyCenter instanceof HTMLDivElement)) {
      throw new Error("Missing .joy-center element");
    }

    if (!(jumpButton instanceof HTMLDivElement)) {
      throw new Error("Missing .joy-jump element");
    }

    if (!(smashButton instanceof HTMLDivElement)) {
      throw new Error("Missing .joy-smash element");
    }

    this.joyCenter = joyCenter;
    this.jumpButton = jumpButton;
    this.smashButton = smashButton;

    this.root.append(moveHint, actionHint);

    this.setActionMode("jump");
    this.bindGestures();
  }

  public static isTouchDevice(): boolean {
    return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  }

  public render(snapshot: GameSnapshot | undefined, playerId: PlayerId | undefined): void {
    const player = snapshot?.players.find((item) => item.playerId === playerId);

    this.root.style.display = snapshot === undefined ? "none" : "block";

    this.setActionMode(player !== undefined && !player.grounded ? "smash" : "jump");
  }

  public getInput(): PlayerInput {
    const input: PlayerInput = {
      left: this.leftPressed,
      right: this.rightPressed,
      jump: this.jumpPressed,
    };

    this.jumpPressed = false;

    return input;
  }

  private setActionMode(mode: ActionMode): void {
    const isSmash = mode === "smash";

    this.jumpButton.hidden = isSmash;
    this.smashButton.hidden = !isSmash;
  }

  private createMoveHint(): HTMLDivElement {
    const element = document.createElement("div");

    element.className = "touch-hint touch-hint-move";

    element.innerHTML = `
      <div class="joy-arrow joy-arrow-left"></div>
      <div class="joy-center"></div>
      <div class="joy-arrow joy-arrow-right"></div>
    `;

    return element;
  }

  private createActionHint(): HTMLDivElement {
    const element = document.createElement("div");

    element.className = "touch-hint touch-hint-action";

    element.innerHTML = `
      <div class="joy-action joy-jump"></div>
      <div class="joy-action joy-smash"></div>
    `;

    return element;
  }

  private bindGestures(): void {
    this.root.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      const isRightHalf = event.clientX >= window.innerWidth / 2;

      if (isRightHalf) {
        this.jumpPressed = true;
        return;
      }

      if (this.touch !== undefined) {
        return;
      }

      this.root.setPointerCapture(event.pointerId);

      this.touch = {
        pointerId: event.pointerId,
        startX: event.clientX,
        x: event.clientX,
      };

      this.leftPressed = false;
      this.rightPressed = false;

      this.updateJoyCenter(0);
    });

    this.root.addEventListener("pointermove", (event) => {
      if (this.touch === undefined || event.pointerId !== this.touch.pointerId) {
        return;
      }

      event.preventDefault();

      this.touch.x = event.clientX;

      this.updateMovement();
      this.updateJoyCenter(this.touch.x - this.touch.startX);
    });

    this.root.addEventListener("pointerup", (event) => {
      if (this.touch === undefined || event.pointerId !== this.touch.pointerId) {
        return;
      }

      event.preventDefault();

      this.resetMovement();
    });

    this.root.addEventListener("pointercancel", (event) => {
      if (this.touch === undefined || event.pointerId !== this.touch.pointerId) {
        return;
      }

      this.resetMovement();
    });

    this.root.addEventListener("lostpointercapture", (event) => {
      if (this.touch === undefined || event.pointerId !== this.touch.pointerId) {
        return;
      }

      this.resetMovement();
    });
  }

  private getMoveEnterThreshold(): number {
    return window.innerHeight * MOVE_ENTER_RATIO;
  }

  private getMoveExitThreshold(): number {
    return window.innerHeight * MOVE_EXIT_RATIO;
  }

  private getJoyCenterMaxOffset(): number {
    return window.innerHeight * JOY_CENTER_MAX_OFFSET_RATIO;
  }

  private updateMovement(): void {
    if (this.touch === undefined) {
      return;
    }

    const deltaX = this.touch.x - this.touch.startX;

    const enterThreshold = this.getMoveEnterThreshold();
    const exitThreshold = this.getMoveExitThreshold();

    if (!this.leftPressed && !this.rightPressed) {
      this.leftPressed = deltaX < -enterThreshold;
      this.rightPressed = deltaX > enterThreshold;

      return;
    }

    if (this.leftPressed) {
      this.leftPressed = deltaX < -exitThreshold;
      this.rightPressed = deltaX > enterThreshold;

      return;
    }

    if (this.rightPressed) {
      this.rightPressed = deltaX > exitThreshold;
      this.leftPressed = deltaX < -enterThreshold;
    }
  }

  private updateJoyCenter(deltaX: number): void {
    const maxOffset = this.getJoyCenterMaxOffset();
    const offsetX = Math.max(-maxOffset, Math.min(maxOffset, deltaX));

    this.joyCenter.style.transform = `translate(calc(-50% + ${offsetX}px), -50%)`;
  }

  private resetMovement(): void {
    this.touch = undefined;

    this.leftPressed = false;
    this.rightPressed = false;

    this.updateJoyCenter(0);
  }
}
