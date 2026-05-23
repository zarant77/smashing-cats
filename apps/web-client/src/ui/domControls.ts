import { i18n } from "@smashing-cats/i18n";

export function getRequiredElement<T extends HTMLElement>(selector: string, label: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`${label} was not found`);
  }

  return element;
}

export function applyStaticTranslations(): void {
  document.documentElement.lang = i18n.getLocale();

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    element.innerHTML = i18n.t(element.dataset.i18n ?? "");
  }

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n-title]")) {
    const label = i18n.t(element.dataset.i18nTitle ?? "");

    element.title = label;
    element.setAttribute("aria-label", label);
  }
}

export function requestFullscreenFromUserGesture(): void {
  if (document.fullscreenElement !== null) {
    return;
  }

  document.documentElement.requestFullscreen().catch((error: unknown) => {
    console.error("Fullscreen failed", error);
  });
}

export async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement === null) {
    await document.documentElement.requestFullscreen();
    return;
  }

  await document.exitFullscreen();
}
