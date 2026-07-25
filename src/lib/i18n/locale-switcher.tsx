"use client";

import { useState, useRef, useEffect } from "react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/types";
import { ChevronDown, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * v2.9.21 GÖREV 8 — Dil seçici dropdown.
 *
 * 6 dil: tr, en, es, de, fr, pt
 * Eski sadece 2 buton (TR | EN) gösteriyordu — şimdi dropdown ile 6 dil.
 */
export function LocaleSwitcher() {
  const { locale, setLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const current = LOCALE_NAMES[locale];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="tm-tap flex items-center gap-1 px-2 py-1 rounded-full border border-border bg-card text-[10px] font-bold hover:bg-accent/30 transition-colors"
        aria-label="Dil seç"
      >
        <Globe size={11} className="text-muted-foreground" />
        <span>{current.flag}</span>
        <span>{locale.toUpperCase()}</span>
        <ChevronDown size={10} className={cn("transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 tm-card p-1 min-w-[140px] shadow-lg">
          {LOCALES.map((l: Locale) => {
            const info = LOCALE_NAMES[l];
            return (
              <button
                key={l}
                onClick={() => {
                  setLocale(l);
                  setOpen(false);
                }}
                className={cn(
                  "tm-tap w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-xs font-semibold transition-colors",
                  locale === l
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-accent/50"
                )}
              >
                <span className="text-sm">{info.flag}</span>
                <span className="flex-1 text-left">{info.native}</span>
                <span className="text-[10px] opacity-60">{l.toUpperCase()}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
