"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
// v2.9.21 GÖREV 8: Genişletilmiş dil desteği + auto-detect
import { DEFAULT_LOCALE, LOCALES, detectLocaleFromBrowser, type Locale } from "./types";
import { dict } from "./dict";

const STORAGE_KEY = "tm.locale";

type I18nValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nValue | null>(null);

function interpolate(template: string, params?: Record<string, string | number>) {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (_, k) =>
    params[k] !== undefined ? String(params[k]) : `{${k}}`
  );
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  // v2.9.21 GÖREV 8: Auto-detect browser language (Google Play'den indirenler için)
  // 1. localStorage'da kullanıcı tercihi varsa onu kullan
  // 2. Yoksa navigator.language'den tahmin et (detectLocaleFromBrowser)
  // 3. O da yoksa DEFAULT_LOCALE (tr)
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && LOCALES.includes(stored)) return stored;
    } catch {
      /* ignore */
    }
    // v2.9.21 GÖREV 8: Browser dilini otomatik algıla
    return detectLocaleFromBrowser();
  });

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const entry = dict[key];
      if (!entry) return key;
      // v2.9.21 GÖREV 8: Çeviri — eksik dil fallback yapar (translate fonksiyonu)
      // Eski kod: entry[locale] ?? entry.tr
      // Yeni: locale es/de/fr/pt ise ve Dict'te yoksa en'ye fallback
      let raw: string;
      switch (locale) {
        case "tr": raw = entry.tr; break;
        case "en": raw = entry.en; break;
        case "es": raw = entry.es ?? entry.en; break;
        case "de": raw = entry.de ?? entry.en; break;
        case "fr": raw = entry.fr ?? entry.en; break;
        case "pt": raw = entry.pt ?? entry.en; break;
        default: raw = entry.en;
      }
      return interpolate(raw, params);
    },
    [locale]
  );

  const value = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within LocaleProvider");
  }
  return ctx;
}
