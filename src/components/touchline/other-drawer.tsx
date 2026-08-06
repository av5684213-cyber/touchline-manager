"use client";

import { X, Globe } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import { cn } from "@/lib/utils";
import type { TabKey } from "./bottom-nav";
import { LOCALES, LOCALE_NAMES, type Locale } from "@/lib/i18n/types";

type TabMeta = { key: TabKey; icon: typeof X; labelKey: string };

export function OtherDrawer({
  open,
  onClose,
  onSelect,
  activeTab,
  tabs,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (k: TabKey) => void;
  activeTab: TabKey;
  tabs: TabMeta[];
}) {
  const { t, locale, setLocale } = useI18n();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="close"
      />
      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[85vh] overflow-y-auto tm-thin-scrollbar">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="text-sm font-bold">{t("nav.other")}</h3>
          <button onClick={onClose} className="tm-tap p-1" aria-label={t("common.close")}>
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-1 p-3">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.key === activeTab;
            return (
              <button
                key={tab.key}
                onClick={() => {
                  haptic("light");
                  onSelect(tab.key);
                }}
                className={cn(
                  "tm-tap w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-semibold transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "hover:bg-accent"
                )}
              >
                <Icon size={18} />
                <span>{t(tab.labelKey)}</span>
              </button>
            );
          })}
        </div>

        {/* v2.9.85: Ayarlar bölümü — dil seçimi buraya taşındı (Dashboard'tan kaldırıldı) */}
        <div className="border-t border-border px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <Globe size={14} className="text-muted-foreground" />
            <span className="text-[11px] text-muted-foreground uppercase font-bold">Ayarlar</span>
          </div>
          <div className="flex gap-2">
            {(LOCALES as Locale[]).map((l) => (
              <button
                key={l}
                onClick={() => { haptic("light"); setLocale(l); }}
                className={cn(
                  "tm-tap px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors",
                  locale === l
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:bg-accent"
                )}
              >
                {LOCALE_NAMES[l].native}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
