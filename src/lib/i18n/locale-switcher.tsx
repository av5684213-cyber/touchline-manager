"use client";

import { useI18n } from "@/lib/i18n/locale-provider";
import { LOCALES } from "@/lib/i18n/types";

export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  return (
    <div
      className="inline-flex rounded-full border border-border bg-card p-0.5 text-xs font-semibold"
      role="group"
      aria-label="locale switcher"
    >
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`tm-tap px-3 rounded-full transition-colors ${
            locale === l
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          aria-pressed={locale === l}
          style={{ minHeight: 28, minWidth: 36 }}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
