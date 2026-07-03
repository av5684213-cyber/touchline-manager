"use client";

import { CalendarDays, Search, Grid2x2, Trophy, Users, Medal, type LucideIcon } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import type { TabKey } from "./bottom-nav";
import { cn } from "@/lib/utils";

type TopTabKey =
  | "standings"
  | "scouting"
  | "fixture"
  | "friendly"
  | "facilities"
  | "cup";

const TOP_TABS: { key: TopTabKey; icon: LucideIcon; label: string }[] = [
  { key: "standings", icon: Trophy, label: "Puan Durumu" },
  { key: "scouting", icon: Search, label: "Scout" },
  { key: "fixture", icon: CalendarDays, label: "Fikstür" },
  { key: "friendly", icon: Users, label: "Hazırlık" },
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
    <div className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
      <div className="flex items-center justify-center gap-1 px-2 py-1.5 overflow-x-auto tm-no-scrollbar tm-safe-top">
        {TOP_TABS.map((tab) => {
          const TabIcon = tab.icon;
          const isActive = tab.key === activeTab;
          return (
            <button
              key={tab.key}
              onClick={() => {
                if (!isActive) haptic("light");
                onChange(tab.key as TabKey);
              }}
              className={cn(
                "tm-tap flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded-lg text-[9px] font-semibold whitespace-nowrap transition-colors min-w-[52px]",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted/50"
              )}
            >
              <TabIcon size={18} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
