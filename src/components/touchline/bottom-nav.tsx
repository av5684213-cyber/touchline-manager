"use client";

import { LayoutDashboard, ClipboardList, Trophy, ArrowLeftRight, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import { cn } from "@/lib/utils";

export type TabKey = "dashboard" | "tactics" | "match" | "transfer" | "finance";

const TABS: { key: TabKey; icon: typeof LayoutDashboard; labelKey: string }[] = [
  { key: "dashboard", icon: LayoutDashboard, labelKey: "nav.dashboard" },
  { key: "tactics", icon: ClipboardList, labelKey: "nav.tactics" },
  { key: "match", icon: Trophy, labelKey: "nav.match" },
  { key: "transfer", icon: ArrowLeftRight, labelKey: "nav.transfer" },
  { key: "finance", icon: Wallet, labelKey: "nav.finance" },
];

export function BottomNav({
  active,
  onChange,
}: {
  active: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const { t } = useI18n();
  return (
    <nav
      className="tm-bottom-nav grid grid-cols-5 gap-0"
      role="tablist"
      aria-label="tabs"
    >
      {TABS.map((tab) => {
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
    </nav>
  );
}
