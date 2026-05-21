import type { Translator } from "@smashing-cats/i18n";

type HelpPopupOptions = {
  onClose?: () => void;
};

export class HelpPopup {
  private readonly element: HTMLDivElement;

  private readonly onClose?: () => void;

  public constructor(root: HTMLElement, t: Translator, options: HelpPopupOptions = {}) {
    this.onClose = options.onClose;

    this.element = document.createElement("div");
    this.element.className = "help-popup popup-open";

    this.element.innerHTML = `
      <div class="help-popup-backdrop11"></div>

      <div class="help-popup-card">
        <h2 data-i18n="help">${t("help")}</h2>

        <div class="help-popup-content" data-i18n="helpContent">
          ${t("helpContent")}
        </div>

        <button class="help-popup-close-button" type="button" data-i18n="close">
          ${t("close")}
        </button>
      </div>
    `;

    root.append(this.element);

    this.hide();
    this.bindEvents();
  }

  public show(): void {
    this.element.hidden = false;
  }

  public hide(): void {
    this.element.hidden = true;
  }

  public toggle(): void {
    this.element.hidden = !this.element.hidden;
  }

  public isVisible(): boolean {
    return !this.element.hidden;
  }

  private bindEvents(): void {
    this.element.querySelector<HTMLButtonElement>(".help-popup-close-button")?.addEventListener("click", () => {
      this.hide();

      this.onClose?.();
    });

    this.element.querySelector<HTMLDivElement>(".help-popup-backdrop")?.addEventListener("click", () => {
      this.hide();

      this.onClose?.();
    });
  }
}
