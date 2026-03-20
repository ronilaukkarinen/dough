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
  decimals: number;
  setDecimals: (d: number) => void;
  fmt: (n: number) => string;
  privacyMode: boolean;
  setPrivacyMode: (v: boolean) => void;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en",
  setLocale: () => {},
  t: en,
  decimals: 0,
  setDecimals: () => {},
  fmt: (n: number) => n.toFixed(0),
  privacyMode: false,
  setPrivacyMode: () => {},
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");
  const [decimals, setDecimalsState] = useState(0);
  const [privacyMode, setPrivacyModeState] = useState(false);

  useEffect(() => {
    console.debug("[locale] Fetching user locale and settings");
    Promise.all([
      fetch("/api/auth/me").then((r) => r.json()),
      fetch("/api/household").then((r) => r.json()),
    ]).then(([userData, householdData]) => {
      if (userData.user?.locale) {
        console.info("[locale] User locale:", userData.user.locale);
        setLocaleState(userData.user.locale as Locale);
      }
      if (householdData.settings?.decimal_places !== undefined) {
        const d = parseInt(householdData.settings.decimal_places, 10);
        if (d >= 0 && d <= 2) {
          console.info("[locale] Decimal places:", d);
          setDecimalsState(d);
        }
      }
    }).catch((err) => console.error("[locale] Failed to load settings:", err));
  }, []);

  const setLocale = useCallback((newLocale: Locale) => {
    console.info("[locale] Switching to", newLocale);
    setLocaleState(newLocale);
  }, []);

  const setDecimals = useCallback((d: number) => {
    console.info("[locale] Setting decimals to", d);
    setDecimalsState(d);
  }, []);

  const setPrivacyMode = useCallback((v: boolean) => setPrivacyModeState(v), []);

  const fmt = useCallback((n: number) => {
    const formatted = n.toFixed(decimals);
    if (!privacyMode) return formatted;
    // Replace each digit with a bullet, keep decimal dots
    return formatted.replace(/\d/g, "\u2022");
  }, [decimals, privacyMode]);

  const t = translations[locale] || translations.en;

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, decimals, setDecimals, fmt, privacyMode, setPrivacyMode }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  return useContext(LocaleContext);
}
