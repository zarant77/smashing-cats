import { Capacitor } from "@capacitor/core";

export const isNativeApp = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform();

export async function initCapacitor(): Promise<void> {
  if (!isNativeApp) {
    return;
  }

  try {
    const [{ StatusBar }, { App }] = await Promise.all([import("@capacitor/status-bar"), import("@capacitor/app")]);

    await StatusBar.hide();

    App.addListener("backButton", () => {
      window.dispatchEvent(new Event("android-back"));
    });
  } catch {
    // Ignore capacitor errors
  }
}
