import { en } from "./locales/en.js";
import { uk } from "./locales/uk.js";

export type TranslationKey = keyof typeof en;

export type Translator = (key: string) => string;

export const TRANSLATIONS = {
  en,
  uk,
} as const;

export type TranslationLocale = keyof typeof TRANSLATIONS;

type LocaleChangedListener = (locale: TranslationLocale) => void;

class I18n {
  private locale: TranslationLocale = "en";

  private readonly listeners = new Set<LocaleChangedListener>();

  public t: Translator = (key) => {
    const dictionary = TRANSLATIONS[this.locale];

    return dictionary[key as TranslationKey] ?? key;
  };

  public getLocale(): TranslationLocale {
    return this.locale;
  }

  public changeLocale(locale: string | null | undefined): void {
    const normalizedLocale = this.normalizeLocale(locale);

    if (normalizedLocale === this.locale) {
      return;
    }

    this.locale = normalizedLocale;

    for (const listener of this.listeners) {
      listener(this.locale);
    }
  }

  public onLocaleChanged(listener: LocaleChangedListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  private normalizeLocale(locale: string | null | undefined): TranslationLocale {
    const normalizedLocale = locale?.toLowerCase() ?? "en";

    if (normalizedLocale in TRANSLATIONS) {
      return normalizedLocale as TranslationLocale;
    }

    return "en";
  }
}

export const i18n = new I18n();

export const t = i18n.t;
