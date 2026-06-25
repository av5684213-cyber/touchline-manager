"use client";

import { Building2, Calendar, Mail, Search, Swords, Users } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import type { TabKey } from "./bottom-nav";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/lib/store";

type QuickAction = {
  key: TabKey;
  icon: typeof Users;
  labelKey: string;
};

const QUICK_ACTIONS: QuickAction[] = [
  { key: "friendly", icon: Swords, labelKey: "nav.friendly" },
  { key: "facilities", icon: Building2, labelKey: "nav.facilities" },
  { key: "scouting", icon: Search, labelKey: "nav.scouting" },
  { key: "standings", icon: Users, labelKey: "nav.standings" },
  { key: "fixture", icon: Calendar, labelKey: "nav.fixture" },
];

export function StickyQuickBar({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const { t } = useI18n();
  const unreadMessages = useAppStore((s) => s.transfer.messages.filter((m) => !m.read).length);
  const liveMatch: any = null; // live-match-store silindi, canlı maç şeridi暂 devre dışı
  const isLive = false;

  return (
    <div
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="flex items-center gap-1 px-2 py-1.5">
        <div className="grid grid-cols-5 gap-0.5 flex-1">
          {QUICK_ACTIONS.map((action, i) => {
            const Icon = action.icon;
            const isActive = activeTab === action.key;
            const isMatchAction = action.key === "match";
            const showLiveBadge = isMatchAction && isLive;
            return (
              <button
                key={i}
                onClick={() => {
                  haptic("light");
                  onChange(action.key);
                }}
                className={cn(
                  "tm-tap relative flex flex-col items-center justify-center gap-0.5 py-1.5 rounded-md transition-colors",
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
                {showLiveBadge && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center gap-0.5 px-1 py-0.5 rounded-full bg-red-600 text-white text-[7px] font-bold leading-none">
                    <span className="w-1 h-1 rounded-full bg-white animate-pulse" />
                    {liveMatch!.minute}'
                  </span>
                )}
                {isMatchAction && !showLiveBadge && liveMatch?.status === "finished" && (
                  <span className="absolute -top-0.5 -right-0.5 inline-flex items-center px-1 py-0.5 rounded-full bg-emerald-600 text-white text-[7px] font-bold leading-none">
                    FT
                  </span>
                )}
              </button>
            );
          })}
        </div>
        {/* Mesaj butonu — sağda ayrı */}
        <button
          onClick={() => { haptic("light"); onChange("messages"); }}
          className={cn(
            "tm-tap relative flex flex-col items-center justify-center gap-0.5 py-1.5 px-2 rounded-md transition-colors shrink-0",
            unreadMessages > 0
              ? "bg-amber-500/15 text-amber-300 tm-pulse-glow"
              : "text-foreground/80 hover:bg-accent"
          )}
          aria-label="Mesajlar"
        >
          <Mail size={16} />
          <span className="text-[9px] font-semibold leading-tight">Mesaj</span>
          {unreadMessages > 0 && (
            <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-red-600 text-white text-[8px] font-bold leading-none">
              {unreadMessages > 9 ? "9+" : unreadMessages}
            </span>
          )}
        </button>
      </div>
      {/* Canlı maç şeridi — skor + dakika */}
      {isLive && (
        <button
          onClick={() => { haptic("light"); onChange("match"); }}
          className="tm-tap w-full flex items-center justify-center gap-2 py-1.5 bg-gradient-to-r from-red-950/60 via-red-900/40 to-red-950/60 border-t border-red-500/30 text-[10px] font-semibold"
        >
          <span className="tm-chip bg-red-600 text-white tm-pulse-glow">
            <span className="w-1 h-1 rounded-full bg-white" />
            CANLI
          </span>
          <span className="tabular-nums text-xs font-bold">
            {liveMatch!.homeScore} - {liveMatch!.awayScore}
          </span>
          <span className="text-muted-foreground tabular-nums">
            {liveMatch!.minute > 90 ? `90+${liveMatch!.minute - 90}'` : `${liveMatch!.minute}'`}
          </span>
          {liveMatch!.status === "halftime" && (
            <span className="tm-chip bg-sky-600 text-white">HT</span>
          )}
          {liveMatch!.status === "paused" && (
            <span className="tm-chip bg-amber-600 text-white">Duraklatıldı</span>
          )}
          <span className="text-primary font-semibold">Maça dön →</span>
        </button>
      )}
    </div>
  );
}
