"use client";

import { CalendarDays, ClipboardList, Dumbbell, Trophy, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import type { TabKey } from "./bottom-nav";
import { cn } from "@/lib/utils";

type QuickAction = {
  key: TabKey;
  icon: typeof Trophy;
  labelKey: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { key: "match", icon: Trophy, labelKey: "dash.play_match" },
  { key: "standings", icon: Users, labelKey: "dash.standings" },
  { key: "fixture", icon: CalendarDays, labelKey: "dash.fixtures" },
  { key: "training", icon: Dumbbell, labelKey: "dash.training" },
  { key: "tactics", icon: ClipboardList, labelKey: "dash.tactics" },
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
    <div
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="grid grid-cols-5 gap-0.5 px-2 py-1.5">
        {QUICK_ACTIONS.map((action, i) => {
          const Icon = action.icon;
          const isActive = activeTab === action.key;
          return (
            <button
              key={i}
              onClick={() => {
                haptic("light");
                onChange(action.key);
              }}
              className={cn(
                "tm-tap flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-accent"
              )}
              aria-label={t(action.labelKey)}
            >
              <Icon size={16} strokeWidth={isActive ? 2.4 : 2} />
              <span className="text-[9px] font-semibold leading-tight text-center px-0.5 line-clamp-1">
                {t(action.labelKey)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
