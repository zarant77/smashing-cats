import { Capacitor, registerPlugin } from "@capacitor/core";

type BackListener = () => void;
type AppStateListener = (isActive: boolean) => void;
type ResumeListener = () => void;

type SmashingCatsDevicePlugin = {
  vibrate(options: { pattern: number[] }): Promise<void>;
};

export const isNativeApp = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

const nativeDevice = registerPlugin<SmashingCatsDevicePlugin>("SmashingCatsDevice");

class CapacitorBridge {
  private readonly backListeners = new Set<BackListener>();
  private readonly appStateListeners = new Set<AppStateListener>();
  private readonly resumeListeners = new Set<ResumeListener>();

  private initialized = false;

  public async init(): Promise<void> {
    if (!isNativeApp || this.initialized) {
      return;
    }

    this.initialized = true;

    try {
      const [{ StatusBar }, { App }] = await Promise.all([import("@capacitor/status-bar"), import("@capacitor/app")]);

      await StatusBar.hide();

      App.addListener("backButton", () => {
        this.emitBack();
      });

      App.addListener("appStateChange", ({ isActive }) => {
        this.emitAppStateChange(isActive);

        if (isActive) {
          this.emitResume();
        }
      });

      App.addListener("resume", () => {
        this.emitResume();
      });
    } catch {
      // Ignore capacitor errors
    }
  }

  public onBack(listener: BackListener): this {
    this.backListeners.add(listener);

    return this;
  }

  public onAppStateChange(listener: AppStateListener): this {
    this.appStateListeners.add(listener);

    return this;
  }

  public onResume(listener: ResumeListener): this {
    this.resumeListeners.add(listener);

    return this;
  }

  public async exitApp(): Promise<void> {
    if (!isNativeApp) {
      return;
    }

    try {
      const { App } = await import("@capacitor/app");

      await App.exitApp();
    } catch {
      // Ignore capacitor errors
    }
  }

  public async vibrate(pattern: number | number[]): Promise<void> {
    if (!isNativeApp) {
      return;
    }

    try {
      await nativeDevice.vibrate({ pattern: Array.isArray(pattern) ? pattern : [pattern] });
    } catch {
      // Ignore capacitor errors
    }
  }

  private emitBack(): void {
    for (const listener of this.backListeners) {
      listener();
    }
  }

  private emitAppStateChange(isActive: boolean): void {
    for (const listener of this.appStateListeners) {
      listener(isActive);
    }
  }

  private emitResume(): void {
    for (const listener of this.resumeListeners) {
      listener();
    }
  }
}

export const capacitorBridge = new CapacitorBridge();
