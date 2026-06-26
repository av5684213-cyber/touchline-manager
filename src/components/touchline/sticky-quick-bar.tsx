"use client";

import { CalendarDays, Search, Grid2x2, Trophy, Users, Medal } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import type { TabKey } from "./bottom-nav";
import { cn } from "@/lib/utils";

/**
 * StickyQuickBar — üst şerit.
 *
 * Alt nav (BottomNav) ile çakışmayacak şekilde yan menüleri içerir:
 * - Puan Durumu (standings)
 * - Scout (scouting)
 * - Fikstür (fixture)
 * - Hazırlık Maçı (friendly) — henüz ekranı yok, coming-soon gösterir
 * - Yerleşke (facilities)
 * - Kupa (cup)
 *
 * Alt nav ana akışı taşır: dashboard / tactics / match / transfer / training / Diğer.
 */
type TopTabKey =
  | "standings"
  | "scouting"
  | "fixture"
  | "friendly"
  | "facilities"
  | "cup";

const TOP_TABS: { key: TopTabKey; icon: typeof Trophy; label: string }[] = [
  { key: "standings", icon: Trophy, label: "Puan Durumu" },
  { key: "scouting", icon: Search, label: "Scout" },
  { key: "fixture", icon: CalendarDays, label: "Fikstür" },
  { key: "friendly", icon: Users, label: "Hazırlık Maçı" },
  { key: "facilities", icon: Grid2x2, label: "Yerleşke" },
  { key: "cup", icon: Medal, label: "Kupa" },
];

export function StickyQuickBar({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (k: TabKey) => void;
}) {
  return (
    <div
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="grid grid-cols-6 gap-0.5 px-2 py-1.5">
        {TOP_TABS.map((action) => {
          const Icon = action.icon;
          const isActive = activeTab === (action.key as TabKey);
          return (
            <button
              key={action.key}
              onClick={() => {
                haptic("light");
                onChange(action.key as TabKey);
              }}
              className={cn(
                "tm-tap flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-accent"
              )}
              aria-label={action.label}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[9px] font-semibold leading-tight text-center px-0.5 line-clamp-1">
                {action.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
