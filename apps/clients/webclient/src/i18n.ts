export type Locale = "en" | "uk";

export type Translator = (key: string) => string;

const TRANSLATIONS: Record<Locale, Record<string, string>> = {
  en: {
    engine: "Engine",
    locale: "Locale",
    chooseCat: "Choose your cat",
    hp: "HP",
    speed: "Speed",
    jump: "Jump",
    points: "pts",
    connecting: "connecting...",
    placeholder: "placeholder",
    restart: "Restart",
    score: "Score",
    gameOverTitle: "Game Over",

    // Character names
    batcat: "Batcat",
    ironcat: "Ironcat",
    darkcat: "Darkcat",
    robocat: "Robocat",
    termicator: "Termicator",
    punishcat: "Punishcat",
    carrambacat: "Carrambacat",
    commandocat: "Commandocat",
    cybercat: "Cybercat",
    samurcat: "Samurcat",
    zombocat: "Zombocat",
    ghostcat: "Ghostcat",
  },
  uk: {
    engine: "Рушій",
    locale: "Мова",
    chooseCat: "Обери кота",
    hp: "HP",
    speed: "Швидкість",
    jump: "Стрибок",
    points: "оч.",
    connecting: "підключення...",
    placeholder: "заглушка",
    restart: "Перезапустити",
    score: "Рахунок",
    gameOverTitle: "Гра закінчена",

    // Character names
    batcat: "Кажанкіт",
    ironcat: "Залізнокіт",
    darkcat: "Темнокіт",
    robocat: "Робокіт",
    termicator: "Термікатор",
    punishcat: "Каракіт",
    carrambacat: "Каррамбакіт",
    commandocat: "Командокіт",
    cybercat: "Кіберкіт",
    samurcat: "Самуркіт",
    zombocat: "Зомбокіт",
    ghostcat: "Привидокіт",
  },
};

export function parseLocale(value: string | null): Locale {
  return value === "uk" ? "uk" : "en";
}

export function createTranslator(locale: Locale): Translator {
  return (key) => TRANSLATIONS[locale][key] ?? key;
}
