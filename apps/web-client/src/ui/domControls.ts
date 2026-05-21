import type { Translator } from "@smashing-cats/i18n";

export function getRequiredElement<T extends HTMLElement>(selector: string, label: string): T {
  const element = document.querySelector<T>(selector);

  if (element === null) {
    throw new Error(`${label} was not found`);
  }

  return element;
}

export function applyStaticTranslations(locale: string, t: Translator): void {
  document.documentElement.lang = locale;

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n]")) {
    element.innerHTML = t(element.dataset.i18n ?? "");
  }

  for (const element of document.querySelectorAll<HTMLElement>("[data-i18n-title]")) {
    const label = t(element.dataset.i18nTitle ?? "");

    element.title = label;
    element.setAttribute("aria-label", label);
  }
}

export function updateLocaleButtons(buttons: NodeListOf<HTMLButtonElement>, locale: string): void {
  for (const button of buttons) {
    button.classList.toggle("active", button.dataset.locale === locale);
  }
}

export function updateAudioButtons(
  soundToggle: HTMLButtonElement | null,
  musicToggle: HTMLButtonElement | null,
  soundsEnabled: boolean,
  musicEnabled: boolean,
  t: Translator,
): void {
  if (soundToggle !== null) {
    const label = soundsEnabled ? t("soundsOn") : t("soundsOff");

    soundToggle.classList.toggle("muted", !soundsEnabled);
    soundToggle.title = label;
    soundToggle.setAttribute("aria-label", label);
  }

  if (musicToggle !== null) {
    const label = musicEnabled ? t("musicOn") : t("musicOff");

    musicToggle.classList.toggle("muted", !musicEnabled);
    musicToggle.title = label;
    musicToggle.setAttribute("aria-label", label);
  }
}

export function updateFullscreenButton(fullscreenToggle: HTMLButtonElement | null): void {
  fullscreenToggle?.classList.toggle("active", document.fullscreenElement !== null);
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
