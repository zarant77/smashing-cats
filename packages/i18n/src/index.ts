import { TRANSLATIONS, DEATH_PHRASES } from "./locales/index.js";

export type TranslationLocale = keyof typeof TRANSLATIONS;
export type TranslationKey = keyof typeof TRANSLATIONS.en;
export type TranslationValue = string | readonly string[];

export type Translator = (key: string) => string;

type LocaleChangedListener = (locale: TranslationLocale) => void;

class I18n {
  private locale: TranslationLocale = "en";

  private readonly listeners = new Set<LocaleChangedListener>();
  private readonly phraseBags = new Map<string, string[]>();

  public t: Translator = (key) => {
    const dictionary = TRANSLATIONS[this.locale] as Record<string, TranslationValue>;
    const fallbackDictionary = TRANSLATIONS.en as Record<string, TranslationValue>;

    const value = dictionary[key] ?? fallbackDictionary[key];

    if (value === undefined) {
      return key;
    }

    return this.resolveTranslationValue(key, value);
  };

  public getDeathPhrase(kind: string): string {
    const localePhrases = DEATH_PHRASES[this.locale] as Record<string, readonly string[]>;
    const fallbackPhrases = DEATH_PHRASES.en as Record<string, readonly string[]>;

    const phrases = localePhrases[kind] ?? fallbackPhrases[kind];

    if (phrases === undefined || phrases.length === 0) {
      return kind;
    }

    const index = Math.floor(Math.random() * phrases.length);

    return phrases[index] ?? kind;
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

  private resolveTranslationValue(key: string, value: TranslationValue): string {
    if (typeof value === "string") {
      return value;
    }

    if (value.length === 0) {
      return key;
    }

    const bagKey = `${this.locale}:${key}`;

    let bag = this.phraseBags.get(bagKey);

    if (bag === undefined || bag.length === 0) {
      bag = this.shuffle([...value]);
      this.phraseBags.set(bagKey, bag);
    }

    return bag.shift() ?? key;
  }

  private shuffle(items: string[]): string[] {
    for (let index = items.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));

      const item = items[index];
      items[index] = items[swapIndex];
      items[swapIndex] = item;
    }

    return items;
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
