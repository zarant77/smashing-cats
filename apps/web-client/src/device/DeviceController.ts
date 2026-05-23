export type DeviceTilt = {
  x: number;
  y: number;
};

type DeviceControllerEvents = {
  tilt: DeviceTilt;
  orientationChange: {
    isPortrait: boolean;
    angle: number;
  };
};

type Listener<T> = (payload: T) => void;

type DeviceOrientationWithPermission = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<PermissionState>;
};

export class DeviceController {
  public static readonly instance = new DeviceController();

  private readonly listeners = new Map<keyof DeviceControllerEvents, Set<Listener<DeviceControllerEvents[keyof DeviceControllerEvents]>>>();

  private tiltEnabled = false;
  private tiltAllowed = true;
  private vibrationEnabled = true;

  private constructor() {
    window.addEventListener("resize", this.emitOrientationChange);
    window.addEventListener("orientationchange", this.emitOrientationChange);
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

  public vibrate(pattern: number | number[]): void {
    if (!this.vibrationEnabled || !("vibrate" in navigator)) {
      return;
    }

    navigator.vibrate(pattern);
  }

  public async enableTilt(): Promise<boolean> {
    if (!this.tiltAllowed || this.tiltEnabled) {
      return this.tiltEnabled;
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

  public getOrientationState(): DeviceControllerEvents["orientationChange"] {
    return {
      isPortrait: window.innerHeight > window.innerWidth,
      angle: screen.orientation?.angle ?? window.orientation ?? 0,
    };
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

  private readonly emitOrientationChange = (): void => {
    this.emit("orientationChange", this.getOrientationState());
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

  private clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
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

    setTimeout(() => {
      void deviceController.enableTilt();
      deviceController.vibrate(10);
    }, 2000);
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
