import { catsEN } from "./locales/cats-en.js";
import { catsPL } from "./locales/cats-pl.js";
import { catsUK } from "./locales/cats-uk.js";
import { commonEN } from "./locales/common-en.js";
import { commonPL } from "./locales/common-pl.js";
import { commonUK } from "./locales/common-uk.js";

const DEFAULT_DEATH_PHRASES = [
  "I meant to do that.",
  "That floor looked suspicious.",
  "Tell my food bowl I loved it.",
] as const;

export const TRANSLATIONS = {
  en: {
    ...commonEN,
    ...catsEN.cats,
  },
  uk: {
    ...commonUK,
    ...catsUK.cats,
  },
  pl: {
    ...commonPL,
    ...catsPL.cats,
  },
} as const;

const DEATH_PHRASES = {
  en: catsEN.deathPhrases,
  pl: catsPL.deathPhrases,
  uk: catsUK.deathPhrases,
} as const;

export type TranslationLocale = keyof typeof TRANSLATIONS;
export type TranslationKey = keyof typeof TRANSLATIONS.en;

export type Translator = (key: string) => string;

type LocaleChangedListener = (locale: TranslationLocale) => void;

class I18n {
  private locale: TranslationLocale = "en";

  private readonly listeners = new Set<LocaleChangedListener>();

  public t: Translator = (key) => {
    const dictionary = TRANSLATIONS[this.locale] as Record<string, string>;

    return dictionary[key] ?? key;
  };

  public getDeathPhrase(kind: string): string {
    const localePhrases = DEATH_PHRASES[this.locale] as Record<string, readonly string[]>;
    const fallbackPhrases = DEATH_PHRASES.en as Record<string, readonly string[]>;

    const phrases = localePhrases[kind] ?? fallbackPhrases[kind] ?? DEFAULT_DEATH_PHRASES;
    const index = Math.floor(Math.random() * phrases.length);

    return phrases[index] ?? DEFAULT_DEATH_PHRASES[0];
  }

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
export const getDeathPhrase = i18n.getDeathPhrase.bind(i18n);
