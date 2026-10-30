import { en, type TranslationSchema } from './en';

export type Locale = 'en';

const dictionaries: Record<Locale, TranslationSchema> = {
  en,
};

let currentLocale: Locale = 'en';

export function setLocale(locale: Locale): void {
  currentLocale = locale;
}

export function getLocale(): Locale {
  return currentLocale;
}

export function t(): TranslationSchema {
  return dictionaries[currentLocale];
}
