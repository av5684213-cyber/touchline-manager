"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { DEFAULT_LOCALE, type Locale } from "./types";
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
  // Lazy initializer — bir kez çalışır, SSR-safe (window yoksa default döner).
  // Hydration mismatch olursa html'deki suppressHydrationWarning yakalar.
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored === "tr" || stored === "en") return stored;
    } catch {
      /* ignore */
    }
    return DEFAULT_LOCALE;
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
      const raw = entry[locale] ?? entry.tr;
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
