import { en } from "./en";
import { fi } from "./fi";

export type Locale = "en" | "fi";
export type Translations = Record<string, Record<string, string>>;

const translations: Record<Locale, Translations> = {
  en: en as unknown as Translations,
  fi: fi as unknown as Translations,
};

export function getTranslations(locale: Locale): Translations {
  return translations[locale] || translations.en;
}

export function t(locale: Locale, path: string): string {
  const keys = path.split(".");
  let result: unknown = translations[locale] || translations.en;
  for (const key of keys) {
    if (result && typeof result === "object" && key in result) {
      result = (result as Record<string, unknown>)[key];
    } else {
      return path;
    }
  }
  return typeof result === "string" ? result : path;
}
