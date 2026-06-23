"use client";

import { useMemo } from "react";
import { BarChart3, Calendar, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { computeStandings, SEASON_INFO } from "@/lib/mock/season";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

export function WeeklyReportScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { clubs, fixtures, facilities } = useAppStore();

  const report = useMemo(() => {
    if (!team) return null;
    const standings = computeStandings(clubs, fixtures);
    const myStat = standings.find((s) => s.teamId === team.id);
    const myPos = standings.findIndex((s) => s.teamId === team.id) + 1;

    // Son maç
    const myFixtures = fixtures
      .filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id))
      .sort((a, b) => b.matchday - a.matchday);
    const lastMatch = myFixtures[0];

    // En iyi oyuncu (en yüksek rating)
    const bestPlayer = [...team.players].sort((a, b) => b.rating - a.rating)[0];

    // Gelir/gider (basit hesaplama)
    const stadiumCapacity = 5000 + facilities.levels.stadium * 10000;
    const ticketRev = Math.round(stadiumCapacity * 0.6 * facilities.ticketPrice);
    const sponsor = 200_000 + facilities.levels.stadium * 30_000;
    const tv = 150_000;
    const merch = Math.round(stadiumCapacity * 0.4 * 2);
    const totalIncome = ticketRev + sponsor + tv + merch;

    const wages = team.players.reduce((s, p) => s + p.weeklyWage, 0);
    const staffWages = facilities.staff.reduce((s, st) => s + st.weeklyWage, 0);
    const facilityCost = Object.values(facilities.levels).reduce((s, l) => s + l * 5000, 0);
    const totalExpense = wages + staffWages + facilityCost;

    return {
      myPos,
      myStat,
      lastMatch,
      bestPlayer,
      totalIncome,
      totalExpense,
      net: totalIncome - totalExpense,
      ticketRev, sponsor, tv, merch,
      wages, staffWages, facilityCost,
    };
  }, [clubs, fixtures, team, facilities]);

  if (!team || !report) return null;

  const isHome = report.lastMatch?.homeId === team.id;
  const us = isHome ? report.lastMatch?.homeScore : report.lastMatch?.awayScore;
  const them = isHome ? report.lastMatch?.awayScore : report.lastMatch?.homeScore;
  const won = (us ?? 0) > (them ?? 0);
  const lost = (us ?? 0) < (them ?? 0);

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("reports.title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {t("fixture.matchday")} {SEASON_INFO.matchday}/{SEASON_INFO.totalMatchdays}
          </p>
        </div>
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
          <BarChart3 size={20} className="text-primary" />
        </div>
      </div>

      {/* Summary — position + last match */}
      <div className="grid grid-cols-2 gap-2">
        <div className="tm-card p-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">{t("reports.league_pos")}</div>
          <div className="text-2xl font-bold tabular-nums">{report.myPos}</div>
          <div className="text-[9px] text-muted-foreground">/ 18</div>
        </div>
        <div className="tm-card p-3 text-center">
          <div className="text-[10px] uppercase text-muted-foreground">{t("reports.matches")}</div>
          <div className={cn(
            "text-2xl font-bold tabular-nums",
            won ? "text-emerald-400" : lost ? "text-red-400" : "text-amber-400"
          )}>
            {us}-{them}
          </div>
          <div className="text-[9px] text-muted-foreground">
            {won ? "Kazandı" : lost ? "Kaybetti" : "Berabere"}
          </div>
        </div>
      </div>

      {/* Best player */}
      {report.bestPlayer && (
        <div className="tm-card p-3 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-sm font-bold text-primary">
              {report.bestPlayer.rating}
            </span>
          </div>
          <div className="flex-1">
            <div className="text-[10px] text-muted-foreground">{t("reports.best_player")}</div>
            <div className="text-sm font-bold">
              {report.bestPlayer.firstName} {report.bestPlayer.lastName}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {report.bestPlayer.specificPosition} · {report.bestPlayer.goals}G · {report.bestPlayer.assists}A
            </div>
          </div>
        </div>
      )}

      {/* Financial summary */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Wallet size={14} className="text-muted-foreground" />
          <span className="text-xs font-bold">{t("finance.income")} / {t("finance.expense")}</span>
        </div>
        <div className="space-y-1.5">
          {/* Income */}
          <div className="flex justify-between text-[11px]">
            <span className="text-emerald-400">+ {t("finance.income.tickets")}</span>
            <span className="tabular-nums">{formatEuro(report.ticketRev, locale)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-emerald-400">+ {t("finance.income.sponsor")}</span>
            <span className="tabular-nums">{formatEuro(report.sponsor, locale)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-emerald-400">+ {t("finance.income.tv")}</span>
            <span className="tabular-nums">{formatEuro(report.tv, locale)}</span>
          </div>
          {/* Expense */}
          <div className="flex justify-between text-[11px] border-t border-border pt-1.5">
            <span className="text-red-400">− {t("finance.expense.wages")}</span>
            <span className="tabular-nums">{formatEuro(report.wages, locale)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-red-400">− {t("finance.expense.staff")}</span>
            <span className="tabular-nums">{formatEuro(report.staffWages, locale)}</span>
          </div>
          <div className="flex justify-between text-[11px]">
            <span className="text-red-400">− {t("finance.expense.facilities")}</span>
            <span className="tabular-nums">{formatEuro(report.facilityCost, locale)}</span>
          </div>
          {/* Net */}
          <div className="flex justify-between text-xs font-bold border-t border-border pt-1.5">
            <span>{t("reports.net")}</span>
            <span className={cn(
              "tabular-nums",
              report.net >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              {report.net >= 0 ? "+" : ""}{formatEuro(report.net, locale)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
