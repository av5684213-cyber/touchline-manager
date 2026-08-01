"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
// v2.9.21 GÖREV 8: Genişletilmiş dil desteği + auto-detect
// v2.9.54: Android native bridge + cloud-save senkron
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
  // v2.9.54: Dil seçimi öncelik sırası:
  // 1. localStorage'da kullanıcı tercihi varsa onu kullan (manuel seçim)
  // 2. AndroidNative.getLanguage() — cihaz dili (Google Play ülke dili)
  // 3. navigator.language — browser dili
  // 4. DEFAULT_LOCALE (tr)
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY) as Locale | null;
      if (stored && LOCALES.includes(stored)) return stored;
    } catch {
      /* ignore */
    }
    // v2.9.54: Android native + browser dilini otomatik algıla
    return detectLocaleFromBrowser();
  });

  // v2.9.54: Cloud-save'den gelen dili uygula (başka cihazda seçilmişse)
  // Ama sadece localStorage'da manuel seçim yoksa
  useEffect(() => {
    try {
      const hasManualChoice = localStorage.getItem(STORAGE_KEY) !== null;
      if (hasManualChoice) return; // kullanıcı manuel seçim yapmış, cloud'u geç

      // Cloud-save'den locale yükle (loadMultiplayerState'ten set edilir)
      const cloudLocale = localStorage.getItem("tm.cloud_locale") as Locale | null;
      if (cloudLocale && LOCALES.includes(cloudLocale)) {
        setLocaleState(cloudLocale);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {
      /* ignore */
    }
    // v2.9.54: Cloud-save için işaretle (store saveToCloud sırasında okuyacak)
    try {
      localStorage.setItem("tm.cloud_locale", l);
    } catch {
      /* ignore */
    }
  }, []);

  // HTML lang attribute güncelle (erişilebilirlik + SEO)
  useEffect(() => {
    if (typeof document !== "undefined") {
      document.documentElement.lang = locale;
    }
  }, [locale]);

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const entry = dict[key];
      if (!entry) return key;
      let raw: string;
      switch (locale) {
        case "tr": raw = entry.tr; break;
        case "en": raw = entry.en; break;
        // v2.9.65: es/de/fr/pt artık desteklenmiyor
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
