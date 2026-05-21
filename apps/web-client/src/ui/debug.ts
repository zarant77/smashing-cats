type Settings = {
  showFPS?: boolean;
  boundings?: boolean;
};

class Debug {
  private readonly storageKey = "smashing-cats-debug";

  private readonly fpsElement: HTMLDivElement;

  private fpsEnabled = false;

  private boundingsEnabled = false;

  private frames = 0;

  private lastTime = 0;

  public constructor() {
    this.fpsElement = document.createElement("div");

    this.fpsElement.id = "fps-counter";

    this.fpsElement.style.position = "fixed";
    this.fpsElement.style.top = "8px";
    this.fpsElement.style.right = "8px";
    this.fpsElement.style.zIndex = "50";

    this.fpsElement.style.color = "#00ff00";
    this.fpsElement.style.fontFamily = "monospace";
    this.fpsElement.style.fontSize = "18px";
    this.fpsElement.style.fontWeight = "bold";

    this.fpsElement.style.pointerEvents = "none";
    this.fpsElement.style.userSelect = "none";
    this.fpsElement.style.display = "none";

    document.body.append(this.fpsElement);

    this.applySettings(this.loadSettings());

    requestAnimationFrame(this.loop);
  }

  public set showFPS(value: boolean) {
    this.setShowFPS(value);
    this.saveSettings();
  }

  public get showFPS(): boolean {
    return this.fpsEnabled;
  }

  public set boundings(value: boolean) {
    this.boundingsEnabled = value;
    this.saveSettings();
  }

  public get boundings(): boolean {
    return this.boundingsEnabled;
  }

  private applySettings(settings: Settings): void {
    this.setShowFPS(!!settings.showFPS);
    this.boundingsEnabled = !!settings.boundings;
  }

  private setShowFPS(value: boolean): void {
    this.fpsEnabled = value;

    if (value) {
      this.frames = 0;
      this.lastTime = performance.now();
      this.fpsElement.style.display = "block";

      return;
    }

    this.fpsElement.style.display = "none";
    this.fpsElement.textContent = "";
  }

  private readonly loop = (): void => {
    if (this.fpsEnabled) {
      this.frames++;

      const now = performance.now();

      if (now - this.lastTime >= 1000) {
        this.fpsElement.textContent = `${this.frames} FPS`;

        this.frames = 0;
        this.lastTime = now;
      }
    }

    requestAnimationFrame(this.loop);
  };

  private loadSettings(): Settings {
    try {
      const json = localStorage.getItem(this.storageKey);

      if (!json) {
        return {};
      }

      return JSON.parse(json) as Settings;
    } catch {
      return {};
    }
  }

  private saveSettings(): void {
    const settings: Settings = {
      showFPS: this.showFPS,
      boundings: this.boundings,
    };

    localStorage.setItem(this.storageKey, JSON.stringify(settings));
  }
}

declare global {
  interface Window {
    debug: {
      showFPS: boolean;
      boundings: boolean;
    };
  }
}

const debug = new Debug();

window.debug = {
  get showFPS(): boolean {
    return debug.showFPS;
  },

  set showFPS(value: boolean) {
    debug.showFPS = value;
  },

  get boundings(): boolean {
    return debug.boundings;
  },

  set boundings(value: boolean) {
    debug.boundings = value;
  },
};
