export type DeviceTilt = {
  x: number;
  y: number;
};

type DeviceControllerEvents = {
  tilt: DeviceTilt;
};

type Listener<T> = (payload: T) => void;

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

const ORIENTATION_CLASSES = ["portrait-primary", "portrait-secondary", "landscape-primary", "landscape-secondary"] as const;

export async function initDevice(): Promise<void> {
  setupDeviceUnlock();
}

export class DeviceController {
  public static readonly instance = new DeviceController();

  private readonly listeners = new Map<keyof DeviceControllerEvents, Set<Listener<DeviceControllerEvents[keyof DeviceControllerEvents]>>>();

  public readonly isProbablyMobile = window.matchMedia("(pointer: coarse)").matches;

  private tiltEnabled = false;

  private tiltAllowed = true;
  private vibrationEnabled = true;
  private vibrationSupported = false;

  private constructor() {
    window.addEventListener("resize", this.syncOrientation);
    window.addEventListener("orientationchange", this.syncOrientation);

    this.syncOrientation();
  }

  public get isVibrationSupported(): boolean {
    return this.vibrationSupported;
  }

  public setVibrationEnabled(isEnabled: boolean): this {
    this.vibrationEnabled = isEnabled;

    return this;
  }

  public setTiltEnabled(isEnabled: boolean): this {
    this.tiltAllowed = isEnabled;

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

    return navigator.vibrate(pattern);
  }

  public async enableTilt(): Promise<boolean> {
    if (!this.tiltAllowed) {
      return false;
    }

    if (this.tiltEnabled) {
      return true;
    }

    if (!("DeviceOrientationEvent" in window)) {
      return false;
    }

    const orientationEvent = DeviceOrientationEvent as DeviceOrientationWithPermission;

    if (typeof orientationEvent.requestPermission === "function") {
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

  public detectCapabilities(): this {
    this.vibrationSupported = this.isProbablyMobile && "vibrate" in navigator;

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
    if (!this.tiltAllowed) {
      return;
    }

    this.emit("tilt", {
      x: event.beta ?? 0,
      y: event.gamma ?? 0,
    });
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

let deviceUnlocked = false;

export function setupDeviceUnlock(): void {
  const unlock = (): void => {
    if (deviceUnlocked) {
      return;
    }

    deviceUnlocked = true;

    window.removeEventListener("pointerdown", unlock);

    window.removeEventListener("keydown", unlock);

    window.removeEventListener("touchstart", unlock);

    deviceController.detectCapabilities();

    setTimeout(() => {
      void deviceController.enableTilt();

      deviceController.vibrate(10);
    }, 100);
  };

  window.addEventListener("pointerdown", unlock, {
    passive: true,
    once: true,
  });

  window.addEventListener("keydown", unlock, {
    once: true,
  });

  window.addEventListener("touchstart", unlock, {
    passive: true,
    once: true,
  });
}
