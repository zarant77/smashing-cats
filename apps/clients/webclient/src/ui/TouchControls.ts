import type { PlayerInput } from "@smashing-cats/protocol";

export class TouchControls {
  private readonly root: HTMLDivElement;

  private leftPressed = false;
  private rightPressed = false;
  private jumpPressed = false;

  public constructor(parent: HTMLElement) {
    this.root = document.createElement("div");
    this.root.className = "touch-controls";

    const jumpZone = this.createZone("touch-zone-jump");
    const leftZone = this.createZone("touch-zone-left");
    const rightZone = this.createZone("touch-zone-right");

    const jumpHint = this.createHint("⬆", "touch-hint-jump");
    const leftHint = this.createHint("⬅", "touch-hint-left");
    const rightHint = this.createHint("➡", "touch-hint-right");

    this.bindZone(jumpZone, "jump");
    this.bindZone(leftZone, "left");
    this.bindZone(rightZone, "right");

    this.root.append(
      jumpZone,
      leftZone,
      rightZone,

      jumpHint,
      leftHint,
      rightHint,
    );

    parent.append(this.root);
  }

  public static isTouchDevice(): boolean {
    // return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    return navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches;
  }

  public getInput(): PlayerInput {
    return {
      left: this.leftPressed,
      right: this.rightPressed,
      jump: this.jumpPressed,
    };
  }

  private createZone(className: string): HTMLDivElement {
    const element = document.createElement("div");

    element.className = `touch-zone ${className}`;

    return element;
  }

  private createHint(text: string, className: string): HTMLDivElement {
    const element = document.createElement("div");

    element.className = `touch-hint ${className}`;
    element.textContent = text;

    return element;
  }

  private bindZone(element: HTMLElement, action: "left" | "right" | "jump"): void {
    element.addEventListener("pointerdown", (event) => {
      event.preventDefault();

      element.setPointerCapture(event.pointerId);

      this.setPressed(action, true);
    });

    element.addEventListener("pointerup", (event) => {
      event.preventDefault();

      this.setPressed(action, false);
    });

    element.addEventListener("pointercancel", () => {
      this.setPressed(action, false);
    });

    element.addEventListener("lostpointercapture", () => {
      this.setPressed(action, false);
    });
  }

  private setPressed(action: "left" | "right" | "jump", pressed: boolean): void {
    if (action === "left") {
      this.leftPressed = pressed;
      return;
    }

    if (action === "right") {
      this.rightPressed = pressed;
      return;
    }

    this.jumpPressed = pressed;
  }
}
