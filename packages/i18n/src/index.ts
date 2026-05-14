import { en } from "./locales/en.js";
import { uk } from "./locales/uk.js";

export type TranslationKey = keyof typeof en;

export type Translator = (key: string) => string;

export const TRANSLATIONS = {
  en,
  uk,
} as const;

type TranslationLocale = keyof typeof TRANSLATIONS;

export function createTranslator(locale: string | null | undefined): Translator {
  const normalizedLocale = locale?.toLowerCase() ?? "en";

  const dictionary = normalizedLocale in TRANSLATIONS ? TRANSLATIONS[normalizedLocale as TranslationLocale] : TRANSLATIONS.en;

  return (key) => {
    return dictionary[key as TranslationKey] ?? key;
  };
}
