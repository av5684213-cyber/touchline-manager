"use client";

import {
  LayoutDashboard,
  ClipboardList,
  Trophy,
  ArrowLeftRight,
  Dumbbell,
  Grid2x2,
  Calendar,
  Search,
  GraduationCap,
  Award,
  BarChart3,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import { cn } from "@/lib/utils";

export type TabKey =
  | "dashboard"
  | "tactics"
  | "match"
  | "transfer"
  | "training"
  // Diğer drawer'ındaki sekmeler
  | "standings"
  | "fixture"
  | "scouting"
  | "youth"
  | "facilities"
  | "finance"
  | "awards"
  | "reports"
  | "cup"
  // Üst şerit sekmesi — coming-soon
  | "friendly";

export const MAIN_TABS: { key: TabKey; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { key: "tactics", icon: ClipboardList, labelKey: "nav.tactics" },
  { key: "match", icon: Trophy, labelKey: "nav.match" },
  { key: "transfer", icon: ArrowLeftRight, labelKey: "nav.transfer" },
];

export const OTHER_TABS: { key: TabKey; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { key: "youth", icon: GraduationCap, labelKey: "nav.youth" },
  { key: "finance", icon: LayoutDashboard, labelKey: "nav.finance" },
  { key: "awards", icon: Award, labelKey: "nav.awards" },
  { key: "reports", icon: BarChart3, labelKey: "nav.reports" },
];

export function BottomNav({
  active,
  onChange,
  onOpenOther,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
  onOpenOther: () => void;
}) {
  const { t } = useI18n();
  // 'Diğer' drawer'ındaki sekmelerden biri aktifse, 'Diğer' butonu vurgulu
  const otherActive = OTHER_TABS.some((tab) => tab.key === active);

  return (
    <nav
      className="tm-bottom-nav grid grid-cols-5 gap-0"
      role="tablist"
      aria-label="tabs"
    >
      {MAIN_TABS.map((tab) => {
        const Icon = tab.icon;
        const isActive = tab.key === active;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            aria-label={t(tab.labelKey)}
            onClick={() => {
              if (!isActive) haptic("light");
              onChange(tab.key);
            }}
            className={cn(
              "tm-tap flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
              isActive
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon size={20} strokeWidth={isActive ? 2.4 : 2} />
            <span className="truncate max-w-full px-1">{t(tab.labelKey)}</span>
            <span
              className={cn(
                "h-0.5 w-6 rounded-full transition-all",
                isActive ? "bg-primary opacity-100" : "opacity-0"
              )}
            />
          </button>
        );
      })}
      <button
        role="tab"
        aria-label={t("nav.other")}
        aria-selected={otherActive}
        onClick={() => {
          haptic("light");
          onOpenOther();
        }}
        className={cn(
          "tm-tap flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium transition-colors",
          otherActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        <Grid2x2 size={20} strokeWidth={otherActive ? 2.4 : 2} />
        <span className="truncate max-w-full px-1">{t("nav.other")}</span>
        <span
          className={cn(
            "h-0.5 w-6 rounded-full transition-all",
            otherActive ? "bg-primary opacity-100" : "opacity-0"
          )}
        />
      </button>
    </nav>
  );
}
