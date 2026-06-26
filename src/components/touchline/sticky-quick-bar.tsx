"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Trophy, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { haptic } from "@/hooks/touchline";
import type { TabKey } from "./bottom-nav";
import { cn } from "@/lib/utils";
import { useAppStore, useMyTeam } from "@/lib/store";
import { formatCountdown, getMatchScheduleStatus } from "@/lib/match/scheduler";
import { formatEuro } from "@/lib/format";
import { computeStandings } from "@/lib/mock/season";

/**
 * StickyQuickBar — üst şerit.
 *
 * Eskiden alt nav ile duplicate sekmeler içeriyordu (match, training, tactics, standings, fixture).
 * Artık anlamlı bir widget: sol "Sonraki Maç" kartı + sağ "Hızlı Bilgi" (bakiye, sıra).
 * Tab navigasyonu yalnızca alttaki BottomNav'da.
 */
export function StickyQuickBar({
  activeTab,
  onChange,
}: {
  activeTab: TabKey;
  onChange: (k: TabKey) => void;
}) {
  const { t } = useI18n();
  const team = useMyTeam();
  const { clubs, fixtures } = useAppStore();

  // Scheduler — her saniye güncellenir (geri sayım için)
  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const schedule = useMemo(() => getMatchScheduleStatus(new Date(nowTick)), [nowTick]);

  // Bir sonraki rakip
  const nextOpponent = useMemo(() => {
    if (!team) return null;
    const nextFx = fixtures.find(
      (f) =>
        !f.played &&
        (f.homeId === team.id || f.awayId === team.id)
    );
    if (!nextFx) return null;
    const oppId = nextFx.homeId === team.id ? nextFx.awayId : nextFx.homeId;
    return clubs.find((c) => c.id === oppId) ?? null;
  }, [team, fixtures, clubs]);

  // Lig sıralaması — kullanıcının kaçıncı sırada olduğu
  const myStanding = useMemo(() => {
    if (!team) return null;
    // Standings hesapla — aynı ligdeki takımlar
    const myLeagueClubs = clubs.filter(
      (c) => c.leagueTier === team.leagueTier && c.department === team.department
    );
    const table = computeStandings(myLeagueClubs, fixtures);
    const idx = table.findIndex((r) => r.teamId === team.id);
    if (idx === -1) return null;
    return { position: idx + 1, points: table[idx].points };
  }, [team, clubs, fixtures]);

  if (!team) return null;

  return (
    <div
      className="sticky top-0 z-30 bg-background/95 backdrop-blur-sm border-b border-border"
      style={{ paddingTop: "var(--safe-top)" }}
    >
      <div className="grid grid-cols-3 gap-1 px-2 py-1.5 items-stretch">
        {/* Sol — Sonraki Maç kartı */}
        <button
          onClick={() => {
            haptic("light");
            onChange("match");
          }}
          className={cn(
            "tm-tap flex flex-col justify-center px-2 py-1.5 rounded-md transition-colors col-span-2",
            activeTab === "match" ? "bg-primary/10" : "hover:bg-accent"
          )}
          aria-label="Sonraki Maç"
        >
          <div className="flex items-center gap-1.5 text-[9px] text-muted-foreground uppercase font-bold tracking-wide">
            <CalendarClock size={10} />
            <span>Sonraki Maç</span>
            {schedule.inWindow && (
              <span className="ml-auto px-1 py-0 rounded bg-red-500 text-white text-[7px] font-bold animate-pulse">
                CANLI
              </span>
            )}
          </div>
          <div className="flex items-baseline gap-1.5 mt-0.5">
            <span className="text-sm font-bold tabular-nums text-primary">
              {schedule.nextMatchTimeTr}
            </span>
            <span className="text-[9px] text-muted-foreground">
              {nextOpponent ? `vs ${nextOpponent.shortName}` : "—"}
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground tabular-nums">
            {schedule.inWindow
              ? "Maç saati — İzle!"
              : `${formatCountdown(schedule.msUntilNext)} sonra`}
          </div>
        </button>

        {/* Sağ — Hızlı bilgi (bakiye + sıra) */}
        <div className="flex flex-col justify-center px-2 py-1.5 rounded-md bg-muted/40 gap-0.5">
          <div className="flex items-center gap-1 text-[9px]">
            <Wallet size={10} className="text-emerald-500" />
            <span className="font-bold tabular-nums text-emerald-700 truncate">
              {formatEuro(team.budget)}
            </span>
          </div>
          {myStanding && (
            <div className="flex items-center gap-1 text-[9px]">
              <Trophy size={10} className="text-amber-500" />
              <span className="font-bold tabular-nums">
                {myStanding.position}.
              </span>
              <span className="text-muted-foreground">sıra · {myStanding.points}p</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
