import { capacitorBridge, isNativeApp } from "./capacitor.js";

export type DeviceTilt = { x: number; y: number };

type DeviceControllerEvents = { tilt: DeviceTilt };

type Listener<T> = (payload: T) => void;

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const ORIENTATION_CLASSES = [
  "portrait-primary",
  "portrait-secondary",
  "landscape-primary",
  "landscape-secondary",
] as const;

const unlockEvents = ["pointerdown", "touchstart", "mousedown", "keydown"] as const;

export class DeviceController {
  public static readonly instance = new DeviceController();

  private readonly listeners = new Map<
    keyof DeviceControllerEvents,
    Set<Listener<DeviceControllerEvents[keyof DeviceControllerEvents]>>
  >();

  private unlockSetup = false;
  private tiltEnabled = false;
  private vibrationEnabled = true;

  private constructor() {
    window.addEventListener("resize", this.syncOrientation);
    window.addEventListener("orientationchange", this.syncOrientation);

    this.syncOrientation();
  }

  public setVibrationEnabled(isEnabled: boolean): this {
    this.vibrationEnabled = isEnabled;

    return this;
  }

  public on<K extends keyof DeviceControllerEvents>(event: K, listener: Listener<DeviceControllerEvents[K]>): this {
    this.getListeners(event).add(listener as Listener<DeviceControllerEvents[keyof DeviceControllerEvents]>);

    return this;
  }

  public off<K extends keyof DeviceControllerEvents>(event: K, listener: Listener<DeviceControllerEvents[K]>): this {
    this.getListeners(event).delete(listener as Listener<DeviceControllerEvents[keyof DeviceControllerEvents]>);

    return this;
  }

  public vibrate(pattern: number | number[]): boolean {
    if (!this.vibrationEnabled || !this.vibrationSupported) {
      return false;
    }

    if (isNativeApp) {
      void capacitorBridge.vibrate(pattern);
      return true;
    }

    if (!isNativeApp && navigator.userActivation?.isActive !== true) {
      return false;
    }

    try {
      return navigator.vibrate(pattern);
    } catch {
      console.warn("Failed to vibrate");
      return false;
    }
  }

  public async enableTilt(): Promise<boolean> {
    if (this.tiltEnabled) {
      return true;
    }

    if (!("DeviceOrientationEvent" in window)) {
      return false;
    }

    const orientationEvent = DeviceOrientationEvent as DeviceOrientationWithPermission;

    if (!isNativeApp && typeof orientationEvent.requestPermission === "function") {
      const permission = await orientationEvent.requestPermission();

      if (permission !== "granted") {
        return false;
      }
    }

    window.addEventListener("deviceorientation", this.handleDeviceOrientation);

    this.tiltEnabled = true;

    return true;
  }

  public disableTilt(): this {
    if (!this.tiltEnabled) {
      return this;
    }

    window.removeEventListener("deviceorientation", this.handleDeviceOrientation);

    this.tiltEnabled = false;

    return this;
  }

  public get vibrationSupported(): boolean {
    if (isNativeApp) {
      return true;
    }

    if (!("vibrate" in navigator)) {
      return false;
    }

    return window.matchMedia("(pointer: coarse)").matches;
  }

  public setupUnlock(): this {
    if (this.unlockSetup || this.tiltEnabled) {
      return this;
    }

    this.unlockSetup = true;

    const unlock = (): void => {
      void this.enableTilt();

      for (const eventName of unlockEvents) {
        window.removeEventListener(eventName, unlock);
      }

      this.unlockSetup = false;
    };

    for (const eventName of unlockEvents) {
      window.addEventListener(eventName, unlock, { once: true, passive: true });
    }

    return this;
  }

  private readonly syncOrientation = (): void => {
    document.body.classList.remove(...ORIENTATION_CLASSES);

    const isPortrait = window.innerHeight > window.innerWidth;

    if (isPortrait) {
      document.body.classList.add(this.getPortraitOrientationClass());

      return;
    }

    document.body.classList.add(this.getLandscapeOrientationClass());
  };

  private getPortraitOrientationClass(): "portrait-primary" | "portrait-secondary" {
    return screen.orientation?.angle === 180 ? "portrait-secondary" : "portrait-primary";
  }

  private getLandscapeOrientationClass(): "landscape-primary" | "landscape-secondary" {
    return Math.abs(screen.orientation?.angle ?? 0) === 90 ? "landscape-primary" : "landscape-secondary";
  }

  private readonly handleDeviceOrientation = (event: DeviceOrientationEvent): void => {
    this.emit("tilt", { x: event.beta ?? 0, y: event.gamma ?? 0 });
  };

  private emit<K extends keyof DeviceControllerEvents>(event: K, payload: DeviceControllerEvents[K]): void {
    for (const listener of this.getListeners(event)) {
      (listener as Listener<DeviceControllerEvents[K]>)(payload);
    }
  }

  private getListeners<K extends keyof DeviceControllerEvents>(
    event: K,
  ): Set<Listener<DeviceControllerEvents[keyof DeviceControllerEvents]>> {
    let eventListeners = this.listeners.get(event);

    if (eventListeners === undefined) {
      eventListeners = new Set();

      this.listeners.set(event, eventListeners);
    }

    return eventListeners;
  }
}

export const deviceController = DeviceController.instance;
