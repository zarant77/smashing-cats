const STORAGE_PREFIX = "smashing-cats-";

class StorageManager {
  public get sounds(): boolean {
    return this.get("sounds-enabled") !== "false";
  }

  public set sounds(v: boolean) {
    this.set("sounds-enabled", String(v));
  }

  public get music(): boolean {
    return this.get("music-enabled") !== "false";
  }

  public set music(v: boolean) {
    this.set("music-enabled", String(v));
  }

  public get vibration(): boolean {
    return this.get("vibration-enabled") !== "false";
  }

  public set vibration(v: boolean) {
    this.set("vibration-enabled", String(v));
  }

  public get tutorialDone(): boolean {
    return this.get("tutorial-done") === "true";
  }

  public set tutorialDone(v: boolean) {
    if (v) {
      this.set("tutorial-done", "true");
    } else {
      this.remove("tutorial-done");
    }
  }

  public get locale(): string {
    return this.get("locale") || this.getBrowserLocale();
  }

  public set locale(v: string) {
    this.set("locale", v);
  }

  public get view(): string {
    return this.get("view") ?? "";
  }

  public set view(v: string) {
    this.set("view", v);
  }

  public get character(): string {
    return this.get("character") ?? "";
  }

  public set character(v: string) {
    this.set("character", v);
  }

  public get debug(): Record<string, unknown> {
    const v = this.get("debug");

    if (!v) {
      return {};
    }

    try {
      return JSON.parse(v);
    } catch {
      return {};
    }
  }

  public set debug(v: Record<string, unknown>) {
    this.set("debug", JSON.stringify(v));
  }

  private get(k: string): string | null {
    return localStorage.getItem(`${STORAGE_PREFIX}${k}`);
  }

  private set(k: string, v: string): void {
    localStorage.setItem(`${STORAGE_PREFIX}${k}`, v);
  }

  private remove(k: string): void {
    localStorage.removeItem(`${STORAGE_PREFIX}${k}`);
  }

  private getBrowserLocale(): string {
    return navigator.language.split("-")[0] || "";
  }
}

export const storage = new StorageManager();
