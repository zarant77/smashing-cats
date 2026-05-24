import { catsEN } from "./cats-en.js";
import { catsPL } from "./cats-pl.js";
import { catsUK } from "./cats-uk.js";

import { commonEN } from "./common-en.js";
import { commonPL } from "./common-pl.js";
import { commonUK } from "./common-uk.js";

import { tutorialEN } from "./tutorial-en.js";
import { tutorialPL } from "./tutorial-pl.js";
import { tutorialUK } from "./tutorial-uk.js";

export const TRANSLATIONS = {
  en: { ...commonEN, ...catsEN.cats, ...tutorialEN },
  uk: { ...commonUK, ...catsUK.cats, ...tutorialUK },
  pl: { ...commonPL, ...catsPL.cats, ...tutorialPL },
} as const;

export const DEATH_PHRASES = {
  en: catsEN.deathPhrases,
  pl: catsPL.deathPhrases,
  uk: catsUK.deathPhrases,
} as const;
