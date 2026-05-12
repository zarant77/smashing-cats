export type Locale = "en" | "uk";

export type Translator = (key: TranslationKey) => string;

type TranslationKey = "view" | "locale" | "chooseCat" | "hp" | "speed" | "jump" | "points" | "connecting" | "placeholder";

const TRANSLATIONS: Record<Locale, Record<TranslationKey, string>> = {
  en: {
    view: "View",
    locale: "Locale",
    chooseCat: "Choose your cat",
    hp: "HP",
    speed: "Speed",
    jump: "Jump",
    points: "pts",
    connecting: "connecting...",
    placeholder: "placeholder",
  },
  uk: {
    view: "Вигляд",
    locale: "Мова",
    chooseCat: "Обери кота",
    hp: "HP",
    speed: "Швидкість",
    jump: "Стрибок",
    points: "оч.",
    connecting: "підключення...",
    placeholder: "заглушка",
  },
};

export function parseLocale(value: string | null): Locale {
  return value === "uk" ? "uk" : "en";
}

export function createTranslator(locale: Locale): Translator {
  return (key) => TRANSLATIONS[locale][key];
}
