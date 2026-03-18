"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { en } from "./i18n/en";
import { fi } from "./i18n/fi";
import type { Locale } from "./i18n";

type TranslationObj = typeof en;

const translations: Record<Locale, TranslationObj> = {
  en,
  fi: fi as unknown as TranslationObj,
};

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationObj;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    console.debug("[locale] Fetching user locale");
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.locale) {
          console.info("[locale] User locale:", data.user.locale);
          setLocaleState(data.user.locale as Locale);
        }
      })
      .catch((err) => console.error("[locale] Failed to load locale:", err));
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    console.info("[locale] Switching to", newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = translations[locale] || translations.en;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
