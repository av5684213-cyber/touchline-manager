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
 * - Hazırlık Maçı (friendly)
 * - Yerleşke (facilities)
 * - Kupa (cup)
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
  const { t } = useI18n();

  return (
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center gap-1 px-2 py-1.5 overflow-x-auto tm-no-scrollbar tm-safe-top">
        {TOP_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (!isActive) haptic("light");
                onChange(tab.key as TabKey);
              }}
              className={cn(
                "tm-tap flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              )}
            >
              <Icon size={13} />
              {tab.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
