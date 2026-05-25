import { Capacitor } from "@capacitor/core";

type BackListener = () => void;
type AppStateListener = (isActive: boolean) => void;

export const isNativeApp = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

class CapacitorBridge {
  private readonly backListeners = new Set<BackListener>();
  private readonly appStateListeners = new Set<AppStateListener>();

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
      });
    } catch {
      // Ignore capacitor errors
    }
  }

  public onBack(listener: BackListener): () => void {
    this.backListeners.add(listener);

    return () => {
      this.backListeners.delete(listener);
    };
  }

  public onAppStateChange(listener: AppStateListener): () => void {
    this.appStateListeners.add(listener);

    return () => {
      this.appStateListeners.delete(listener);
    };
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
}

export const capacitorBridge = new CapacitorBridge();
