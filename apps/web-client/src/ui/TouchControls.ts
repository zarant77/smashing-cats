import type { Translator } from "@smashing-cats/i18n";
import type { PlayerInput } from "@smashing-cats/protocol";

type TouchState = {
  pointerId: number;
  startX: number;
  x: number;
};

const MOVE_ENTER_RATIO = 0.05;
const MOVE_EXIT_RATIO = 0.04;
const JOY_CENTER_MAX_OFFSET_RATIO = 0.05;

export class TouchControls {
  private readonly root: HTMLDivElement;
  private readonly joyCenter: HTMLDivElement;

  private touch: TouchState | undefined;

  private leftPressed = false;
  private rightPressed = false;
  private jumpPressed = false;

  public constructor(parent: HTMLElement, _t: Translator) {
    this.root = document.createElement("div");
    this.root.className = "touch-controls touch-controls-gesture";

    const moveHint = this.createMoveHint();
    const actionHint = this.createActionHint();

    this.joyCenter = moveHint.querySelector(".joy-center") as HTMLDivElement;

    this.root.append(moveHint, actionHint);
    parent.append(this.root);

    this.bindGestures();
  }

  public static isTouchDevice(): boolean {
    return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
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
