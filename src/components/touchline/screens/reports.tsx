"use client";

import { useMemo, useState } from "react";
import { BarChart3, FileText, TrendingUp, TrendingDown, Wallet, Search, Calendar } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { computeStandings, SEASON_INFO } from "@/lib/mock/season";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";

type ReportTab = "match" | "financial" | "performance" | "scout" | "season";

export function ReportsScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { clubs, fixtures, facilities, seasonNumber } = useAppStore();
  const [activeReport, setActiveReport] = useState<ReportTab>("match");

  if (!team) return null;

  const tabs: { key: ReportTab; icon: typeof FileText; label: string }[] = [
    { key: "match", icon: FileText, label: "Maç Raporu" },
    { key: "financial", icon: Wallet, label: "Finansal" },
    { key: "performance", icon: TrendingUp, label: "Performans" },
    { key: "scout", icon: Search, label: "Scout" },
    { key: "season", icon: Calendar, label: "Sezon" },
  ];

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      <h1 className="text-base font-bold">Raporlar</h1>

      {/* Tab seçici */}
      <div className="flex gap-1 overflow-x-auto tm-thin-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveReport(tab.key)}
              className={cn(
                "tm-tap shrink-0 px-3 py-1.5 rounded text-[10px] font-bold border whitespace-nowrap",
                activeReport === tab.key ? "bg-primary text-primary-foreground border-primary" : "border-border bg-card text-muted-foreground"
              )}
            >
              <Icon size={12} className="inline mr-1" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Rapor içerikleri */}
      {activeReport === "match" && <MatchReport team={team} clubs={clubs} fixtures={fixtures} locale={locale} />}
      {activeReport === "financial" && <FinancialReport team={team} facilities={facilities} locale={locale} seasonNumber={seasonNumber} />}
      {activeReport === "performance" && <PerformanceReport team={team} locale={locale} />}
      {activeReport === "scout" && <ScoutReport team={team} clubs={clubs} />}
      {activeReport === "season" && <SeasonReport team={team} clubs={clubs} fixtures={fixtures} seasonNumber={seasonNumber} />}
    </div>
  );
}

// ===== Maç Raporu =====
function MatchReport({ team, clubs, fixtures, locale }: any) {
  const myRecent = fixtures
    .filter((f: any) => f.played && (f.homeId === team.id || f.awayId === team.id))
    .sort((a: any, b: any) => b.matchday - a.matchday)
    .slice(0, 5);

  if (myRecent.length === 0) {
    return <div className="tm-card p-4 text-center text-xs text-muted-foreground">Henüz oynanan maç yok.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs font-bold text-muted-foreground">Son 5 Maç Raporu</div>
      {myRecent.map((f: any, i: number) => {
        const isHome = f.homeId === team.id;
        const us = isHome ? f.homeScore : f.awayScore;
        const them = isHome ? f.awayScore : f.homeScore;
        const opp = clubs.find((c: any) => c.id === (isHome ? f.awayId : f.homeId));
        const won = (us ?? 0) > (them ?? 0);
        const lost = (us ?? 0) < (them ?? 0);
        const gd = (us ?? 0) - (them ?? 0);

        return (
          <div key={i} className={cn("tm-card p-2.5",
            won ? "border-l-2 border-l-emerald-500" : lost ? "border-l-2 border-l-red-500" : "border-l-2 border-l-amber-500")}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-muted-foreground">Hafta {f.matchday}</span>
              <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded",
                won ? "bg-emerald-500/20 text-emerald-300" : lost ? "bg-red-500/20 text-red-300" : "bg-amber-500/20 text-amber-300")}>
                {won ? "GALİBİYET" : lost ? "MAĞLUBİYET" : "BERABERLİK"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold truncate">{isHome ? "Ev" : "Dep"} vs {opp?.shortName ?? "—"}</span>
              <span className="text-sm font-bold tabular-nums">{us} - {them}</span>
            </div>
            <div className="text-[9px] text-muted-foreground mt-0.5">
              Averaj: {gd > 0 ? `+${gd}` : gd} · {isHome ? "Ev sahibi" : "Deplasman"}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ===== Finansal Rapor =====
function FinancialReport({ team, facilities, locale, seasonNumber }: any) {
  const totalWages = team.players.reduce((s: number, p: any) => s + (p.weeklyWage ?? 0), 0);
  const staffWages = facilities.staff.reduce((s: number, st: any) => s + st.weeklyWage, 0);
  const facilityCost = Object.values(facilities.levels).reduce((s: number, l: any) => s + l * 5000, 0);
  const stadiumCap = 5000 + facilities.levels.stadium * 10000;
  const stadiumMult = 1 + facilities.levels.stadium * 0.1;
  const ticketRev = Math.round(stadiumCap * 0.6 * facilities.ticketPrice * stadiumMult);
  const sponsor = 200_000 + facilities.levels.stadium * 30_000;
  const tv = 150_000;
  const merch = Math.round(stadiumCap * 0.4 * 2);
  const totalIncome = ticketRev + sponsor + tv + merch;
  const totalExpense = totalWages + staffWages + facilityCost;
  const net = totalIncome - totalExpense;

  return (
    <div className="space-y-2">
      <div className="tm-card p-3">
        <div className="text-xs font-bold mb-2">Haftalık Finansal Özet</div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Bilet Geliri</span>
            <span className="font-bold text-emerald-400 tabular-nums">{formatEuro(ticketRev, locale)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Sponsor</span>
            <span className="font-bold text-emerald-400 tabular-nums">{formatEuro(sponsor, locale)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">TV Geliri</span>
            <span className="font-bold text-emerald-400 tabular-nums">{formatEuro(tv, locale)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Lisanslı Ürün</span>
            <span className="font-bold text-emerald-400 tabular-nums">{formatEuro(merch, locale)}</span>
          </div>
          <div className="border-t border-border pt-1 flex justify-between text-[10px]">
            <span className="text-muted-foreground font-bold">Toplam Gelir</span>
            <span className="font-bold text-emerald-400 tabular-nums">{formatEuro(totalIncome, locale)}</span>
          </div>
        </div>
      </div>

      <div className="tm-card p-3">
        <div className="text-xs font-bold mb-2">Giderler</div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Oyuncu Maaşları</span>
            <span className="font-bold text-red-400 tabular-nums">{formatEuro(totalWages, locale)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Personel Maaşları</span>
            <span className="font-bold text-red-400 tabular-nums">{formatEuro(staffWages, locale)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Tesis Bakım</span>
            <span className="font-bold text-red-400 tabular-nums">{formatEuro(facilityCost, locale)}</span>
          </div>
          <div className="border-t border-border pt-1 flex justify-between text-[10px]">
            <span className="text-muted-foreground font-bold">Toplam Gider</span>
            <span className="font-bold text-red-400 tabular-nums">{formatEuro(totalExpense, locale)}</span>
          </div>
        </div>
      </div>

      <div className={cn("tm-card p-3 text-center",
        net >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
        <div className="text-[10px] text-muted-foreground uppercase">Haftalık Net</div>
        <div className={cn("text-xl font-bold tabular-nums", net >= 0 ? "text-emerald-400" : "text-red-400")}>
          {net >= 0 ? "+" : ""}{formatEuro(net, locale)}
        </div>
        <div className="text-[9px] text-muted-foreground mt-0.5">Mevcut bütçe: {formatEuro(team.budget, locale)}</div>
      </div>
    </div>
  );
}

// ===== Oyuncu Performans Raporu =====
function PerformanceReport({ team, locale }: any) {
  const players = [...team.players]
    .sort((a: any, b: any) => (b.formRating ?? 0) - (a.formRating ?? 0));

  const top5 = players.slice(0, 5);
  const bottom5 = players.slice(-5).reverse();

  return (
    <div className="space-y-2">
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingUp size={14} className="text-emerald-400" />
          <span className="text-xs font-bold">En İyi Formda (5)</span>
        </div>
        <div className="space-y-0.5">
          {top5.map((p: any, i: number) => (
            <div key={p.id} className="flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20">
              <span className="text-[9px] text-muted-foreground w-4">{i + 1}</span>
              <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
              <span className="text-[8px] text-muted-foreground">{p.specificPosition}</span>
              <span className="text-[10px] font-bold tabular-nums text-emerald-400">{(p.formRating ?? 0).toFixed(1)}</span>
              <span className="text-[8px] text-muted-foreground">{p.goals ?? 0}G {p.assists ?? 0}A</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <TrendingDown size={14} className="text-red-400" />
          <span className="text-xs font-bold">En Düşük Formda (5)</span>
        </div>
        <div className="space-y-0.5">
          {bottom5.map((p: any, i: number) => (
            <div key={p.id} className="flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20">
              <span className="text-[9px] text-muted-foreground w-4">{i + 1}</span>
              <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
              <span className="text-[8px] text-muted-foreground">{p.specificPosition}</span>
              <span className="text-[10px] font-bold tabular-nums text-red-400">{(p.formRating ?? 0).toFixed(1)}</span>
              <span className="text-[8px] text-muted-foreground">{p.cond ?? 0}% kond.</span>
            </div>
          ))}
        </div>
      </div>

      <div className="tm-card p-3">
        <div className="text-xs font-bold mb-2">Takım Özeti</div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Ort. Rating</div>
            <div className="text-sm font-bold">{(players.reduce((s: number, p: any) => s + p.rating, 0) / players.length).toFixed(0)}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Ort. Form</div>
            <div className="text-sm font-bold">{(players.reduce((s: number, p: any) => s + (p.formRating ?? 0), 0) / players.length).toFixed(1)}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Ort. Kondisyon</div>
            <div className="text-sm font-bold">{(players.reduce((s: number, p: any) => s + (p.cond ?? 0), 0) / players.length).toFixed(0)}%</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Ort. Moral</div>
            <div className="text-sm font-bold">{(players.reduce((s: number, p: any) => s + (p.morale ?? 0), 0) / players.length).toFixed(0)}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Sakat</div>
            <div className="text-sm font-bold text-red-400">{players.filter((p: any) => p.is_injured).length}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Kadro</div>
            <div className="text-sm font-bold">{players.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Scout Raporu =====
function ScoutReport({ team, clubs }: any) {
  const transfer = useAppStore.getState().transfer;
  const freeAgents = transfer.freeAgents;
  const watchlist = transfer.watchlist ?? [];

  return (
    <div className="space-y-2">
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Search size={14} className="text-sky-400" />
          <span className="text-xs font-bold">Pazar Durumu</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Serbest</div>
            <div className="text-sm font-bold">{freeAgents.length}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">İzleme</div>
            <div className="text-sm font-bold">{watchlist.length}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[8px] text-muted-foreground uppercase">Gelen Teklif</div>
            <div className="text-sm font-bold">{transfer.incomingOffers.length}</div>
          </div>
        </div>
      </div>

      {watchlist.length > 0 && (
        <div className="tm-card p-3">
          <div className="text-xs font-bold mb-2">İzleme Listesi ({watchlist.length})</div>
          <div className="space-y-0.5">
            {watchlist.slice(0, 10).map((id: string, i: number) => {
              const listing = freeAgents.find((l: any) => l.player.id === id);
              if (!listing) return null;
              const p = listing.player;
              return (
                <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20">
                  <span className="text-[9px] text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
                  <span className="text-[8px] text-muted-foreground">{p.specificPosition}</span>
                  <span className="text-[10px] font-bold tabular-nums">{p.rating}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="tm-card p-3">
        <div className="text-xs font-bold mb-2">Önerilen Oyuncular</div>
        <div className="space-y-0.5">
          {freeAgents
            .filter((l: any) => !watchlist.includes(l.player.id))
            .sort((a: any, b: any) => b.player.rating - a.player.rating)
            .slice(0, 5)
            .map((l: any, i: number) => {
              const p = l.player;
              return (
                <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20">
                  <span className="text-[9px] text-muted-foreground w-4">{i + 1}</span>
                  <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
                  <span className="text-[8px] text-muted-foreground">{p.specificPosition}</span>
                  <span className="text-[10px] font-bold tabular-nums">{p.rating}</span>
                  <span className="text-[8px] text-muted-foreground">{p.age}yaş</span>
                </div>
              );
            })}
          {freeAgents.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-2">Serbest oyuncu yok.</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== Sezon İlerleme Raporu =====
function SeasonReport({ team, clubs, fixtures, seasonNumber }: any) {
  const standings = computeStandings(clubs, fixtures);
  const myStat = standings.find((s: any) => s.teamId === team.id);
  const myPos = standings.findIndex((s: any) => s.teamId === team.id) + 1;
  const currentMd = SEASON_INFO.matchday;
  const totalMd = SEASON_INFO.totalMatchdays;
  const playedFixtures = fixtures.filter((f: any) => f.played && (f.homeId === team.id || f.awayId === team.id));
  const wins = playedFixtures.filter((f: any) => {
    const isHome = f.homeId === team.id;
    return (isHome ? f.homeScore : f.awayScore) > (isHome ? f.awayScore : f.homeScore);
  }).length;
  const draws = playedFixtures.filter((f: any) => {
    const isHome = f.homeId === team.id;
    return (isHome ? f.homeScore : f.awayScore) === (isHome ? f.awayScore : f.homeScore);
  }).length;
  const losses = playedFixtures.length - wins - draws;
  const goalsFor = myStat?.goalsFor ?? 0;
  const goalsAgainst = myStat?.goalsAgainst ?? 0;
  const points = myStat?.points ?? 0;
  const projectedPoints = Math.round((points / Math.max(1, playedFixtures.length)) * totalMd);

  return (
    <div className="space-y-2">
      <div className="tm-card p-3">
        <div className="flex items-center gap-2 mb-2">
          <Calendar size={14} className="text-amber-400" />
          <span className="text-xs font-bold">Sezon {seasonNumber} İlerlemesi</span>
        </div>
        <div className="mb-2">
          <div className="flex justify-between text-[9px] text-muted-foreground mb-0.5">
            <span>Hafta {currentMd}/{totalMd}</span>
            <span>{playedFixtures.length} maç oynandı</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(currentMd / totalMd) * 100}%` }} />
          </div>
        </div>
      </div>

      <div className="tm-card p-3">
        <div className="text-xs font-bold mb-2">Lig Performansı</div>
        <div className="grid grid-cols-2 gap-1.5">
          <div className="bg-muted/20 rounded p-1.5 text-center">
            <div className="text-[8px] text-muted-foreground uppercase">Sıra</div>
            <div className="text-lg font-bold">{myPos}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5 text-center">
            <div className="text-[8px] text-muted-foreground uppercase">Puan</div>
            <div className="text-lg font-bold">{points}</div>
          </div>
          <div className="bg-emerald-500/10 rounded p-1.5 text-center">
            <div className="text-[8px] text-muted-foreground uppercase">Galibiyet</div>
            <div className="text-lg font-bold text-emerald-400">{wins}</div>
          </div>
          <div className="bg-amber-500/10 rounded p-1.5 text-center">
            <div className="text-[8px] text-muted-foreground uppercase">Beraberlik</div>
            <div className="text-lg font-bold text-amber-400">{draws}</div>
          </div>
          <div className="bg-red-500/10 rounded p-1.5 text-center">
            <div className="text-[8px] text-muted-foreground uppercase">Mağlubiyet</div>
            <div className="text-lg font-bold text-red-400">{losses}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5 text-center">
            <div className="text-[8px] text-muted-foreground uppercase">Averaj</div>
            <div className="text-lg font-bold">{goalsFor - goalsAgainst > 0 ? "+" : ""}{goalsFor - goalsAgainst}</div>
          </div>
        </div>
      </div>

      <div className="tm-card p-3">
        <div className="text-xs font-bold mb-2">Tahminler</div>
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Tahmini Sezon Sonu Puanı</span>
            <span className="font-bold tabular-nums">{projectedPoints}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Maç Başına Gol</span>
            <span className="font-bold tabular-nums">{(goalsFor / Math.max(1, playedFixtures.length)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Maç Başına Gol Yeme</span>
            <span className="font-bold tabular-nums">{(goalsAgainst / Math.max(1, playedFixtures.length)).toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Galibiyet Oranı</span>
            <span className="font-bold tabular-nums">{((wins / Math.max(1, playedFixtures.length)) * 100).toFixed(0)}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
