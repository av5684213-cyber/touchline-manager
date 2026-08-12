"use client";

import { useMemo, useState } from "react";
import { PlayerProfileModal } from "../player-profile-modal";
import { haptic } from "@/hooks/touchline";
import { type Locale } from "@/lib/i18n/types";
import {
  Activity,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  ClipboardList,
  DollarSign,
  FileText,
  Footprints,
  Heart,
  Home,
  MapPin,
  Minus,
  Search,
  Shield,
  Star,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { computeStandings, SEASON_INFO, type FixtureRow, type StandingRow, type FormResult } from "@/lib/mock/season";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Player, Team } from "@/lib/mock/data";

type ReportTab = "match" | "financial" | "performance" | "scout" | "season";

// =============================================================================
// Ana ReportsScreen
// =============================================================================
export function ReportsScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const clubs = useAppStore((s) => s.clubs);
  const fixtures = useAppStore((s) => s.fixtures);
  const facilities = useAppStore((s) => s.facilities);
  const seasonNumber = useAppStore((s) => s.seasonNumber);
  const [activeReport, setActiveReport] = useState<ReportTab>("match");

  if (!team) return null;

  const tabs: { key: ReportTab; icon: typeof FileText; label: string }[] = [
    { key: "match", icon: FileText, label: t("reports.tab.match") },
    { key: "financial", icon: Wallet, label: t("reports.tab.financial") },
    { key: "performance", icon: TrendingUp, label: t("reports.tab.performance") },
    { key: "scout", icon: Search, label: t("reports.tab.scout") },
    { key: "season", icon: Calendar, label: t("reports.tab.season") },
  ];

  return (
    <div className="px-4 py-4 pb-24 space-y-3">
      {/* Başlık kartı */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("reports.title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            Sezon {seasonNumber} · Hafta {SEASON_INFO.matchday}/{SEASON_INFO.totalMatchdays}
          </p>
        </div>
        <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center">
          <BarChart3 size={20} className="text-primary" />
        </div>
      </div>

      {/* Tab seçici */}
      {/* v2.9.145 M3 FIX: flex gap-1 overflow-x-auto tm-thin-scrollbar → tm-filter-row-visible (görünür scrollbar, kullanıcı son tab'ı görsün) */}
      <div className="tm-filter-row-visible">
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
      {activeReport === "financial" && <FinancialReport team={team} facilities={facilities} locale={locale} seasonNumber={seasonNumber} clubs={clubs} fixtures={fixtures} />}
      {activeReport === "performance" && <PerformanceReport team={team} clubs={clubs} fixtures={fixtures} locale={locale} />}
      {activeReport === "scout" && <ScoutReport team={team} clubs={clubs} facilities={facilities} />}
      {activeReport === "season" && <SeasonReport team={team} clubs={clubs} fixtures={fixtures} seasonNumber={seasonNumber} />}
    </div>
  );
}

// =============================================================================
// 1. MAÇ RAPORU — Son 10 maç + form analizi + gol analizleri
// =============================================================================
function MatchReport({
  team,
  clubs,
  fixtures,
  locale,
}: {
  team: Team;
  clubs: Team[];
  fixtures: FixtureRow[];
  locale: Locale;
}) {
  // v2.9.66 Faz 6: i18n — hardcoded string'leri t() ile değiştir
  const { t } = useI18n();
  // Son 10 maç
  const myRecent = useMemo(() =>
    fixtures
      .filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id))
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 10)
  , [fixtures, team.id]);

  // İstatistikler
  const stats = useMemo(() => {
    if (myRecent.length === 0) return null;
    let wins = 0, draws = 0, losses = 0;
    let goalsFor = 0, goalsAgainst = 0;
    let homeWins = 0, homeDraws = 0, homeGames = 0;
    let awayWins = 0, awayDraws = 0, awayGames = 0;
    let cleanSheets = 0;
    let failedToScore = 0;
    const form: FormResult[] = [];

    for (const f of myRecent) {
      const isHome = f.homeId === team.id;
      const us = isHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
      const them = isHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
      goalsFor += us;
      goalsAgainst += them;
      if (us > them) { wins++; form.push("W"); if (isHome) { homeWins++; homeGames++; } else { awayWins++; awayGames++; } }
      else if (us < them) { losses++; form.push("L"); if (isHome) homeGames++; else awayGames++; }
      else { draws++; form.push("D"); if (isHome) { homeDraws++; homeGames++; } else { awayDraws++; awayGames++; } }
      if (them === 0) cleanSheets++;
      if (us === 0) failedToScore++;
    }

    // Form serisi (en son 5 maç)
    const recent5 = form.slice(0, 5);
    let streakType: "W" | "D" | "L" | null = null;
    let streakLen = 0;
    if (recent5.length > 0) {
      streakType = recent5[0];
      for (const r of recent5) {
        if (r === streakType) streakLen++;
        else break;
      }
    }

    return {
      wins, draws, losses,
      goalsFor, goalsAgainst,
      homeWins, homeDraws, homeGames, awayWins, awayDraws, awayGames,
      cleanSheets, failedToScore,
      form: recent5,
      streakType, streakLen,
      points: wins * 3 + draws,
      avgGoalsFor: goalsFor / myRecent.length,
      avgGoalsAgainst: goalsAgainst / myRecent.length,
    };
  }, [myRecent, team.id]);

  if (myRecent.length === 0 || !stats) {
    return <div className="tm-card p-4 text-center text-xs text-muted-foreground">{t("reports.no_matches_played")}</div>;
  }

  return (
    <div className="space-y-2">
      {/* Form serisi (son 5 maç W/D/L rozetleri) */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Activity size={12} className="text-muted-foreground" />
            <span className="text-xs font-bold">{t("reports.recent_form")}</span>
          </div>
          <span className="text-[11px] text-muted-foreground">{t("reports.match_span", { n: myRecent.length })}</span>
        </div>
        <div className="flex gap-1 mb-2">
          {stats.form.map((r, i) => (
            <span key={i} className={cn(
              "flex-1 py-1.5 rounded text-[10px] font-bold text-center",
              r === "W" ? "bg-emerald-500/20 text-emerald-300"
              : r === "D" ? "bg-amber-500/20 text-amber-300"
              : "bg-red-500/20 text-red-300"
            )}>
              {r === "W" ? "G" : r === "D" ? "B" : "M"}
            </span>
          ))}
        </div>
        {stats.streakType && stats.streakLen > 1 && (
          <div className="text-[10px] text-muted-foreground text-center">
            {stats.streakType === "W" ? `${stats.streakLen} maçlık galibiyet serisi 🔥`
            : stats.streakType === "L" ? `${stats.streakLen} maçlık mağlubiyet serisi 😟`
            : `${stats.streakLen} maçlık beraberlik serisi`}
          </div>
        )}
      </div>

      {/* Özet kartları (4'lü grid) */}
      <div className="grid grid-cols-4 gap-1.5">
        <SummaryTile icon={Trophy} label="G" value={stats.wins} color="emerald" />
        <SummaryTile icon={Minus} label="B" value={stats.draws} color="amber" />
        <SummaryTile icon={TrendingDown} label="M" value={stats.losses} color="red" />
        <SummaryTile icon={Star} label="Puan" value={stats.points} color="primary" />
      </div>

      {/* Gol istatistikleri */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Target size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">{t("reports.goal_analysis", { n: myRecent.length })}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-500/10 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">{t("reports.goals_for")}</div>
            <div className="text-lg font-bold text-emerald-400 tabular-nums">{stats.goalsFor}</div>
            <div className="text-[10px] text-muted-foreground">{t("reports.per_match_avg", { n: stats.avgGoalsFor.toFixed(2) })}</div>
          </div>
          <div className="bg-red-500/10 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">{t("reports.goals_against")}</div>
            <div className="text-lg font-bold text-red-400 tabular-nums">{stats.goalsAgainst}</div>
            <div className="text-[10px] text-muted-foreground">{t("reports.per_match_avg", { n: stats.avgGoalsAgainst.toFixed(2) })}</div>
          </div>
          <div className="bg-sky-500/10 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">{t("reports.clean_sheets")}</div>
            <div className="text-lg font-bold text-sky-400 tabular-nums">{stats.cleanSheets}</div>
            <div className="text-[10px] text-muted-foreground">%{((stats.cleanSheets / myRecent.length) * 100).toFixed(0)}</div>
          </div>
          <div className="bg-orange-500/10 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">{t("reports.failed_to_score")}</div>
            <div className="text-lg font-bold text-orange-400 tabular-nums">{stats.failedToScore}</div>
            <div className="text-[10px] text-muted-foreground">%{((stats.failedToScore / myRecent.length) * 100).toFixed(0)}</div>
          </div>
        </div>
      </div>

      {/* Ev/Deplasman performansı */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <MapPin size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">{t("reports.home_away")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-muted/20 rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              <Home size={10} className="text-emerald-400" />
              <span className="text-[11px] font-bold uppercase">{t("reports.home_team")}</span>
            </div>
            {/* P2 FIX: "G-değil" yerine net G/B/M formatı */}
            <div className="text-[10px] text-muted-foreground">
              {stats.homeWins}G · {stats.homeDraws ?? 0}B · {(stats.homeGames ?? 0) - (stats.homeWins ?? 0) - (stats.homeDraws ?? 0)}M
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${stats.homeGames > 0 ? (stats.homeWins / stats.homeGames) * 100 : 0}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              %{stats.homeGames > 0 ? ((stats.homeWins / stats.homeGames) * 100).toFixed(0) : 0} {t("reports.win_rate")}
            </div>
          </div>
          <div className="bg-muted/20 rounded p-2">
            <div className="flex items-center gap-1 mb-1">
              <Footprints size={10} className="text-sky-400" />
              <span className="text-[11px] font-bold uppercase">{t("reports.away_team")}</span>
            </div>
            <div className="text-[10px] text-muted-foreground">
              {stats.awayWins}G · {stats.awayDraws ?? 0}B · {(stats.awayGames ?? 0) - (stats.awayWins ?? 0) - (stats.awayDraws ?? 0)}M
            </div>
            <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
              <div className="h-full bg-sky-500 rounded-full"
                style={{ width: `${stats.awayGames > 0 ? (stats.awayWins / stats.awayGames) * 100 : 0}%` }} />
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              %{stats.awayGames > 0 ? ((stats.awayWins / stats.awayGames) * 100).toFixed(0) : 0} {t("reports.win_rate")}
            </div>
          </div>
        </div>
      </div>

      {/* Maç listesi (detaylı kart) */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ClipboardList size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">{t("reports.match_list", { n: myRecent.length })}</span>
        </div>
        <div className="space-y-1.5">
          {myRecent.map((f, i) => {
            const isHome = f.homeId === team.id;
            const us = isHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
            const them = isHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
            const opp = clubs.find((c) => c.id === (isHome ? f.awayId : f.homeId));
            const won = us > them;
            const lost = us < them;
            const gd = us - them;

            return (
              <div key={i} className={cn(
                "flex items-center gap-2 p-1.5 rounded border-l-2",
                won ? "border-l-emerald-500 bg-emerald-500/5"
                : lost ? "border-l-red-500 bg-red-500/5"
                : "border-l-amber-500 bg-amber-500/5"
              )}>
                <div className="text-[11px] text-muted-foreground w-8 shrink-0">H{f.matchday}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-[10px] font-semibold truncate">
                    {isHome ? "Ev" : "Dep"} vs {opp?.shortName ?? "—"}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {isHome ? "Ev sahibi" : "Deplasman"} · {won ? "G" : lost ? "M" : "B"}
                    {gd !== 0 && ` · averaj ${gd > 0 ? "+" : ""}${gd}`}
                  </div>
                </div>
                <div className="text-sm font-bold tabular-nums">{us}-{them}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 2. FİNANSAL RAPOR — Detaylı gelir/gider + bütçe + maaş analizi + transferler
// =============================================================================
function FinancialReport({
  team,
  facilities,
  locale,
  seasonNumber,
  clubs,
  fixtures,
}: {
  team: Team;
  facilities: any;
  locale: Locale;
  seasonNumber: number;
  clubs: Team[];
  fixtures: FixtureRow[];
}) {
  // v2.9.47 Faz 5: t() kullanımı için useI18n
  const { t } = useI18n();
  // P1 FIX: Reaktif okuma — getState() yerine hook kullan
  const transfer = useAppStore((s) => s.transfer);

  // v2.9.55: Gelir hesapları — store.ts advanceMatchday ve finance.tsx ile BİREBİR AYNI
  const stadiumCap = 5000 + facilities.levels.stadium * 5000;
  const stadiumMult = 1 + facilities.levels.stadium * 0.05;
  const myTier = team.leagueTier ?? 2;
  const tierBonus = (5 - myTier) * 0.04;
  const fillRate = Math.max(0.2, Math.min(0.85, 1 - (facilities.ticketPrice / 250) + tierBonus));
  const ticketRev = Math.round(stadiumCap * fillRate * facilities.ticketPrice * stadiumMult);
  // v2.9.70 FIX: Reaktif sponsor okuma — stale read önle
  const sponsors = useAppStore((s) => s.sponsors);
  const dynamicSponsorIncome = (sponsors?.active ?? []).reduce(
    (s: number, sp: any) => s + (sp.amount ?? 0), 0
  );
  const sponsor = 50_000 + facilities.levels.stadium * 10_000 + dynamicSponsorIncome;
  // v2.9.55: TV geliri tier'a göre — store ve finance ile BİREBİR AYNI
  const tvByTier: Record<number, number> = { 1: 5_000_000, 2: 3_000_000, 3: 2_500_000, 4: 2_000_000 };
  const tv = tvByTier[myTier] ?? 50_000;
  const merch = Math.round(stadiumCap * 0.2 + facilities.levels.academy * 5000);
  const totalIncome = ticketRev + sponsor + tv + merch;

  // v2.9.55: OYUNCU MAAŞLARI artık gider olarak hesaplanıyor — store ve finance ile aynı
  const playerWages = team.players.reduce((s: number, p: any) => s + (p.weeklyWage ?? p.salary ?? 0), 0);
  const staffWages = facilities.staff.reduce((s: number, st: any) => s + st.weeklyWage, 0);
  const facilityCost = Object.values(facilities.levels).reduce((s: number, l: any) => s + l * 20000, 0);
  const totalExpense = playerWages + staffWages + facilityCost;
  const net = totalIncome - totalExpense;

  // Sezonluk projeksiyon (34 hafta)
  const seasonalNet = net * SEASON_INFO.totalMatchdays;
  const projectedBudget = team.budget + seasonalNet;

  // Toplam kadro değeri
  const squadValue = team.players.reduce((s, p) => s + (p.marketValue ?? 0), 0);

  return (
    <div className="space-y-2">
      {/* Bütçe özeti */}
      <div className={cn("tm-card p-3",
        net >= 0 ? "bg-emerald-500/5 border-emerald-500/30" : "bg-red-500/5 border-red-500/30")}>
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-muted-foreground uppercase">{t("reports.current_budget")}</span>
          <DollarSign size={12} className="text-muted-foreground" />
        </div>
        <div className="text-2xl font-bold tabular-nums">{formatEuro(team.budget, locale)}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {t("reports.season_end_estimate")}: {formatEuro(projectedBudget, locale)}
        </div>
      </div>

      {/* Haftalık net */}
      <div className={cn("tm-card p-3 text-center",
        net >= 0 ? "bg-emerald-500/10 border-emerald-500/30" : "bg-red-500/10 border-red-500/30")}>
        <div className="text-[10px] text-muted-foreground uppercase">{t("reports.weekly_net")}</div>
        <div className={cn("text-xl font-bold tabular-nums flex items-center justify-center gap-1",
          net >= 0 ? "text-emerald-400" : "text-red-400")}>
          {net >= 0 ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          {net >= 0 ? "+" : ""}{formatEuro(net, locale)}
        </div>
        <div className="text-[11px] text-muted-foreground mt-0.5">
          {t("reports.season_projection")}: {net >= 0 ? "+" : ""}{formatEuro(seasonalNet, locale)}
        </div>
      </div>

      {/* Gelirler */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ArrowUpRight size={12} className="text-emerald-400" />
          <span className="text-xs font-bold">{t("reports.weekly_income")}</span>
        </div>
        <div className="space-y-1">
          <FinRow label={t("reports.ticket_revenue")} value={ticketRev} color="emerald" locale={locale} />
          <FinRow label={t("reports.sponsor")} value={sponsor} color="emerald" locale={locale} />
          <FinRow label={t("reports.tv_revenue")} value={tv} color="emerald" locale={locale} />
          <FinRow label={t("reports.licensed_products")} value={merch} color="emerald" locale={locale} />
          <div className="border-t border-border pt-1">
            <FinRow label={t("reports.total_income")} value={totalIncome} color="emerald" bold locale={locale} />
          </div>
        </div>
      </div>

      {/* Giderler — P0 FIX: Oyuncu maaşları kaldırıldı, sadece personel + tesis */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <ArrowDownRight size={12} className="text-red-400" />
          <span className="text-xs font-bold">{t("reports.weekly_expense")}</span>
        </div>
        <div className="space-y-1">
          {/* v2.9.55: Oyuncu maaşları — en büyük gider */}
          <FinRow label={t("reports.player_wages")} value={playerWages} color="red" locale={locale} />
          <FinRow label={t("reports.staff_wages")} value={staffWages} color="red" locale={locale} />
          <FinRow label={t("reports.facility_maintenance")} value={facilityCost} color="red" locale={locale} />
          <div className="border-t border-border pt-1">
            <FinRow label={t("reports.total_expense")} value={totalExpense} color="red" bold locale={locale} />
          </div>
        </div>
      </div>

      {/* Kadro değeri */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy size={12} className="text-amber-400" />
          <span className="text-xs font-bold">{t("reports.squad_value")}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="bg-muted/20 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">{t("reports.total_value")}</div>
            <div className="text-base font-bold tabular-nums text-amber-300">{formatEuro(squadValue, locale)}</div>
          </div>
          <div className="bg-muted/20 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">{t("reports.value_per_player")}</div>
            <div className="text-base font-bold tabular-nums">
              {formatEuro(squadValue / team.players.length, locale)}
            </div>
          </div>
        </div>
      </div>

      {/* Transfer özeti */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Zap size={12} className="text-sky-400" />
          <span className="text-xs font-bold">{t("reports.transfer_status")}</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">Serbest</div>
            <div className="text-sm font-bold">{transfer.freeAgents.length}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">İzleme</div>
            <div className="text-sm font-bold">{transfer.watchlist?.length ?? 0}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">Gelen Teklif</div>
            <div className="text-sm font-bold">{transfer.incomingOffers.length}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// 3. OYUNCU PERFORMANS RAPORU — Form + gol/asist kralları + sakatlık + gelişim
// =============================================================================
function PerformanceReport({
  team,
  clubs,
  fixtures,
  locale,
}: {
  team: Team;
  clubs: Team[];
  fixtures: FixtureRow[];
  locale: Locale;
}) {
  // v2.9.76: Oyuncu profili modal'ı için state
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const onPlayerClick = (p: Player) => setProfilePlayer(p);
  // v2.9.66 Faz 6: i18n — hardcoded string'leri t() ile değiştir
  const { t } = useI18n();
  const players = team.players;

  // Takım özet istatistikleri
  const teamStats = useMemo(() => {
    const avgRating = players.reduce((s, p) => s + p.rating, 0) / players.length;
    const avgForm = players.reduce((s, p) => s + (p.formRating ?? 0), 0) / players.length;
    const avgCond = players.reduce((s, p) => s + (p.cond ?? 0), 0) / players.length;
    const avgMorale = players.reduce((s, p) => s + (p.morale ?? 0), 0) / players.length;
    const injured = players.filter((p) => p.is_injured).length;
    const totalGoals = players.reduce((s, p) => s + (p.goals ?? 0), 0);
    const totalAssists = players.reduce((s, p) => s + (p.assists ?? 0), 0);
    const totalSaves = players.reduce((s, p) => s + (p.saves ?? 0), 0);
    const foreignCount = players.filter((p) => p.nationality === "foreign").length;
    const avgAge = players.reduce((s, p) => s + p.age, 0) / players.length;
    return {
      avgRating, avgForm, avgCond, avgMorale,
      injured, totalGoals, totalAssists, totalSaves,
      foreignCount, avgAge,
    };
  }, [players]);

  // En iyi formda 5
  const topForm = useMemo(() =>
    [...players].sort((a, b) => (b.formRating ?? 0) - (a.formRating ?? 0)).slice(0, 5)
  , [players]);

  // En düşük formda 5
  const bottomForm = useMemo(() =>
    [...players].sort((a, b) => (a.formRating ?? 0) - (b.formRating ?? 0)).slice(0, 5)
  , [players]);

  // Gol kralları (5)
  const topScorers = useMemo(() =>
    [...players].filter((p) => p.specificPosition !== "GK")
      .sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))
      .slice(0, 5)
  , [players]);

  // Asist kralları (5)
  const topAssists = useMemo(() =>
    [...players].filter((p) => p.specificPosition !== "GK")
      .sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))
      .slice(0, 5)
  , [players]);

  // Sakat oyuncular
  const injuredPlayers = useMemo(() =>
    players.filter((p) => p.is_injured)
  , [players]);

  // Düşük kondisyon (<60)
  const lowCondPlayers = useMemo(() =>
    [...players].filter((p) => !p.is_injured && (p.cond ?? 100) < 60)
      .sort((a, b) => (a.cond ?? 100) - (b.cond ?? 100))
      .slice(0, 5)
  , [players]);

  // Pozisyon bazında ortalama rating
  const posRatings = useMemo(() => {
    const groups: Record<string, Player[]> = { GK: [], DEF: [], MID: [], FWD: [] };
    for (const p of players) {
      if (p.specificPosition === "GK") groups.GK.push(p);
      else if (["CB", "LB", "RB", "LWB", "RWB"].includes(p.specificPosition)) groups.DEF.push(p);
      else if (["CDM", "CM", "CAM", "LM", "RM"].includes(p.specificPosition)) groups.MID.push(p);
      else groups.FWD.push(p);
    }
    return {
      GK: groups.GK.length > 0 ? groups.GK.reduce((s, p) => s + p.rating, 0) / groups.GK.length : 0,
      DEF: groups.DEF.length > 0 ? groups.DEF.reduce((s, p) => s + p.rating, 0) / groups.DEF.length : 0,
      MID: groups.MID.length > 0 ? groups.MID.reduce((s, p) => s + p.rating, 0) / groups.MID.length : 0,
      FWD: groups.FWD.length > 0 ? groups.FWD.reduce((s, p) => s + p.rating, 0) / groups.FWD.length : 0,
      counts: {
        GK: groups.GK.length,
        DEF: groups.DEF.length,
        MID: groups.MID.length,
        FWD: groups.FWD.length,
      },
    };
  }, [players]);

  return (
    <div className="space-y-2">
      {/* Takım özeti (6'lı grid) */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Activity size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">Takım Özeti</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <StatTile label={t("reports.avg_rating")} value={teamStats.avgRating.toFixed(0)} />
          <StatTile label="Ort. Form" value={teamStats.avgForm.toFixed(1)} />
          <StatTile label="Ort. Kondisyon" value={`${teamStats.avgCond.toFixed(0)}%`} />
          <StatTile label="Ort. Moral" value={teamStats.avgMorale.toFixed(0)} />
          <StatTile label="Ort. Yaş" value={teamStats.avgAge.toFixed(1)} />
          <StatTile label="Kadro" value={players.length} />
          <StatTile label="Sakat" value={teamStats.injured} color="red" />
          <StatTile label="Yabancı" value={teamStats.foreignCount} color="amber" />
          <StatTile label="Toplam Gol" value={teamStats.totalGoals} color="emerald" />
        </div>
      </div>

      {/* Pozisyon bazında rating */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">Pozisyon Bazında Kalite</span>
        </div>
        <div className="space-y-1.5">
          {[
            { label: "Kaleci", key: "GK" as const, icon: "🧤", color: "bg-amber-500" },
            { label: "Defans", key: "DEF" as const, icon: "🛡️", color: "bg-sky-500" },
            { label: "Orta Saha", key: "MID" as const, icon: "⚔️", color: "bg-emerald-500" },
            { label: "Forvet", key: "FWD" as const, icon: "🎯", color: "bg-rose-500" },
          ].map(({ label, key, icon, color }) => {
            const rating = posRatings[key];
            const count = posRatings.counts[key];
            const pct = (rating / 100) * 100;
            return (
              <div key={key}>
                <div className="flex justify-between text-[10px] mb-0.5">
                  <span className="text-muted-foreground">{icon} {label} ({count})</span>
                  <span className="font-bold tabular-nums">{rating.toFixed(0)}</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                  <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Gol & Asist kralları (yan yana) */}
      <div className="grid grid-cols-2 gap-2">
        <div className="tm-card p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Target size={10} className="text-emerald-400" />
            <span className="text-[10px] font-bold">Gol Kralları</span>
          </div>
          <div className="space-y-0.5">
            {topScorers.map((p, i) => (
              <PlayerStatRow key={p.id} rank={i + 1} name={`${p.firstName} ${p.lastName}`} pos={p.specificPosition} value={p.goals ?? 0} valueLabel="G" color="emerald" player={p} onClickPlayer={onPlayerClick} />
            ))}
            {topScorers.length === 0 && (
              <div className="text-[11px] text-muted-foreground text-center py-1">Gol yok</div>
            )}
          </div>
        </div>
        <div className="tm-card p-2">
          <div className="flex items-center gap-1 mb-1.5">
            <Zap size={10} className="text-sky-400" />
            <span className="text-[10px] font-bold">Asist Kralları</span>
          </div>
          <div className="space-y-0.5">
            {topAssists.map((p, i) => (
              <PlayerStatRow key={p.id} rank={i + 1} name={`${p.firstName} ${p.lastName}`} pos={p.specificPosition} value={p.assists ?? 0} valueLabel="A" color="sky" player={p} onClickPlayer={onPlayerClick} />
            ))}
            {topAssists.length === 0 && (
              <div className="text-[11px] text-muted-foreground text-center py-1">Asist yok</div>
            )}
          </div>
        </div>
      </div>

      {/* En iyi formda 5 */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={12} className="text-emerald-400" />
          <span className="text-xs font-bold">En İyi Formda (5)</span>
        </div>
        <div className="space-y-0.5">
          {topForm.map((p, i) => (
            <PlayerStatRow key={p.id} rank={i + 1} name={`${p.firstName} ${p.lastName}`} pos={p.specificPosition} value={p.formRating ?? 0} valueLabel="form" color="emerald" decimals={1} extra={`${p.goals ?? 0}G ${p.assists ?? 0}A`} player={p} onClickPlayer={onPlayerClick} />
          ))}
        </div>
      </div>

      {/* En düşük formda 5 */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingDown size={12} className="text-red-400" />
          <span className="text-xs font-bold">En Düşük Formda (5)</span>
        </div>
        <div className="space-y-0.5">
          {bottomForm.map((p, i) => (
            <PlayerStatRow key={p.id} rank={i + 1} name={`${p.firstName} ${p.lastName}`} pos={p.specificPosition} value={p.formRating ?? 0} valueLabel="form" color="red" decimals={1} extra={`${p.cond ?? 0}% kond.`} player={p} onClickPlayer={onPlayerClick} />
          ))}
        </div>
      </div>

      {/* Sakat oyuncular */}
      {injuredPlayers.length > 0 && (
        <div className="tm-card p-3 border-red-500/30">
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle size={12} className="text-red-400" />
            <span className="text-xs font-bold text-red-400">{t("reports.injured_players")} ({injuredPlayers.length})</span>
          </div>
          <div className="space-y-0.5">
            {injuredPlayers.map((p) => (
              <div key={p.id} className="flex items-center gap-2 py-1 px-1.5 rounded bg-red-500/5">
                <span className="text-base">🚑</span>
                <span className="text-[10px] font-semibold flex-1 truncate">{p.firstName} {p.lastName}</span>
                <span className="text-[10px] text-muted-foreground">{p.specificPosition}</span>
                <span className="text-[11px] text-red-400 font-bold">
                  {p.injury?.remaining_days ?? 0}g
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Düşük kondisyon uyarısı */}
      {lowCondPlayers.length > 0 && (
        <div className="tm-card p-3 border-amber-500/30">
          <div className="flex items-center gap-1.5 mb-2">
            <Heart size={12} className="text-amber-400" />
            <span className="text-xs font-bold text-amber-400">Yorgun Oyuncular ({lowCondPlayers.length})</span>
          </div>
          <div className="space-y-0.5">
            {lowCondPlayers.map((p, i) => (
              <PlayerStatRow key={p.id} rank={i + 1} name={`${p.firstName} ${p.lastName}`} pos={p.specificPosition} value={p.cond ?? 0} valueLabel="kond." color="amber" player={p} onClickPlayer={onPlayerClick} />
            ))}
          </div>
        </div>
      )}

      {/* v2.9.76: Oyuncu profili modal'ı */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}
    </div>
  );
}

// =============================================================================
// 4. SCOUT RAPORU — İzleme listesi + serbestler + öneriler + kadro ihtiyaçları
// =============================================================================
function ScoutReport({
  team,
  clubs,
  facilities,
}: {
  team: Team;
  clubs: Team[];
  facilities: any;
}) {
  // P1 FIX: Reaktif okuma
  const transfer = useAppStore((s) => s.transfer);
  const freeAgents = transfer.freeAgents ?? [];
  const watchlist = transfer.watchlist ?? [];
  const incomingOffers = transfer.incomingOffers ?? [];

  // Kadro ihtiyaç analizi — her pozisyon grubu için oyuncu sayısı
  const squadNeeds = useMemo(() => {
    const groups: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const p of team.players) {
      if (p.specificPosition === "GK") groups.GK++;
      else if (["CB", "LB", "RB", "LWB", "RWB"].includes(p.specificPosition)) groups.DEF++;
      else if (["CDM", "CM", "CAM", "LM", "RM"].includes(p.specificPosition)) groups.MID++;
      else groups.FWD++;
    }
    // İdeal: 3 GK, 7 DEF, 7 MID, 4 FWD (21 kişi)
    const ideal = { GK: 3, DEF: 7, MID: 7, FWD: 4 };
    const needs = {
      GK: { current: groups.GK, ideal: ideal.GK, gap: ideal.GK - groups.GK, severity: groups.GK < 2 ? "high" : groups.GK < ideal.GK ? "medium" : "low" },
      DEF: { current: groups.DEF, ideal: ideal.DEF, gap: ideal.DEF - groups.DEF, severity: groups.DEF < 5 ? "high" : groups.DEF < ideal.DEF ? "medium" : "low" },
      MID: { current: groups.MID, ideal: ideal.MID, gap: ideal.MID - groups.MID, severity: groups.MID < 5 ? "high" : groups.MID < ideal.MID ? "medium" : "low" },
      FWD: { current: groups.FWD, ideal: ideal.FWD, gap: ideal.FWD - groups.FWD, severity: groups.FWD < 3 ? "high" : groups.FWD < ideal.FWD ? "medium" : "low" },
    };
    return needs;
  }, [team.players]);

  // İzleme listesindeki oyuncuları bul
  const watchlistPlayers = watchlist
    .map((id: string) => freeAgents.find((l: any) => l.player.id === id)?.player)
    .filter(Boolean) as any[];

  // Önerilen oyuncular — ihtiyaç duyulan pozisyon gruplarına göre filtrele
  const needsLabels: string[] = [];
  if (squadNeeds.GK.severity === "high") needsLabels.push("GK");
  if (squadNeeds.DEF.severity === "high") needsLabels.push("CB", "LB", "RB");
  if (squadNeeds.MID.severity === "high") needsLabels.push("CM", "CAM", "CDM");
  if (squadNeeds.FWD.severity === "high") needsLabels.push("ST", "LW", "RW");

  const recommended = [...freeAgents]
    .filter((l: any) => !watchlist.includes(l.player.id))
    .filter((l: any) => needsLabels.length === 0 || needsLabels.includes(l.player.specificPosition))
    .sort((a: any, b: any) => b.player.rating - a.player.rating)
    .slice(0, 8);

  // Scout personeli sayısı
  const scoutCount = facilities.staff.filter((s: any) => s.type === "scout").length;
  const scoutStars = facilities.staff
    .filter((s: any) => s.type === "scout")
    .reduce((s: number, st: any) => s + st.stars, 0);

  return (
    <div className="space-y-2">
      {/* Scout kadrosu özeti */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Search size={12} className="text-sky-400" />
          <span className="text-xs font-bold">Scout Birimi</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5 text-center">
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">Scout</div>
            <div className="text-sm font-bold">{scoutCount}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">Toplam Yıldız</div>
            <div className="text-sm font-bold text-amber-300">{"★".repeat(scoutStars) || "—"}</div>
          </div>
          <div className="bg-muted/20 rounded p-1.5">
            <div className="text-[10px] text-muted-foreground uppercase">Gelen Teklif</div>
            <div className="text-sm font-bold">{incomingOffers.length}</div>
          </div>
        </div>
      </div>

      {/* Pazar durumu */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">Pazar Durumu</span>
        </div>
        <div className="grid grid-cols-2 gap-1.5 text-center">
          <div className="bg-emerald-500/10 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">Serbest Oyuncu</div>
            <div className="text-lg font-bold text-emerald-400">{freeAgents.length}</div>
          </div>
          <div className="bg-sky-500/10 rounded p-2">
            <div className="text-[10px] text-muted-foreground uppercase">İzleme Listem</div>
            <div className="text-lg font-bold text-sky-400">{watchlist.length}</div>
          </div>
        </div>
      </div>

      {/* Kadro ihtiyaç analizi */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Shield size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">Kadro İhtiyaç Analizi</span>
        </div>
        <div className="space-y-1.5">
          {([
            { label: "Kaleci", icon: "🧤", key: "GK" as const },
            { label: "Defans", icon: "🛡️", key: "DEF" as const },
            { label: "Orta Saha", icon: "⚔️", key: "MID" as const },
            { label: "Forvet", icon: "🎯", key: "FWD" as const },
          ]).map(({ label, icon, key }) => {
            const need = squadNeeds[key];
            return (
              <div key={key} className="flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20">
                <span className="text-base">{icon}</span>
                <div className="flex-1">
                  <div className="text-[10px] font-bold">{label}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {need.current}/{need.ideal} oyuncu
                  </div>
                </div>
                <div className={cn(
                  "text-[11px] px-1.5 py-0.5 rounded font-bold",
                  need.severity === "high" ? "bg-red-500/20 text-red-300"
                  : need.severity === "medium" ? "bg-amber-500/20 text-amber-300"
                  : "bg-emerald-500/20 text-emerald-300"
                )}>
                  {need.severity === "high" ? "Acil"
                  : need.severity === "medium" ? "Eksik"
                  : "Tamam"}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* İzleme listesi */}
      {watchlistPlayers.length > 0 && (
        <div className="tm-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Star size={12} className="text-amber-400" />
            <span className="text-xs font-bold">İzleme Listesi ({watchlistPlayers.length})</span>
          </div>
          <div className="space-y-0.5">
            {watchlistPlayers.slice(0, 10).map((p: any, i: number) => (
              <ScoutPlayerRow key={p.id} rank={i + 1} player={p} />
            ))}
          </div>
        </div>
      )}

      {/* Önerilen oyuncular */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Trophy size={12} className="text-amber-400" />
          <span className="text-xs font-bold">Önerilen Oyuncular</span>
        </div>
        <div className="space-y-0.5">
          {recommended.map((l: any, i: number) => {
            const p = l.player;
            return <ScoutPlayerRow key={p.id} rank={i + 1} player={p} price={l.askingPrice} />;
          })}
          {recommended.length === 0 && (
            <div className="text-[10px] text-muted-foreground text-center py-2">
              {needsLabels.length > 0 ? "Bu ihtiyaçlara uygun serbest oyuncu yok." : "Serbest oyuncu yok."}
            </div>
          )}
        </div>
      </div>

      {/* Gelen teklifler */}
      {incomingOffers.length > 0 && (
        <div className="tm-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Zap size={12} className="text-amber-400" />
            <span className="text-xs font-bold">Gelen Transfer Teklifleri ({incomingOffers.length})</span>
          </div>
          <div className="space-y-0.5">
            {incomingOffers.slice(0, 5).map((o: any, i: number) => {
              const p = team.players.find((pl) => pl.id === o.playerId);
              return (
                <div key={i} className="flex items-center gap-2 py-1 px-1.5 rounded bg-amber-500/5">
                  <span className="text-base">💰</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold truncate">
                      {p ? `${p.firstName} ${p.lastName}` : "Oyuncu"}
                    </div>
                    <div className="text-[10px] text-muted-foreground">
                      {o.fromTeamName ?? "Takım"} · {o.amount ? formatEuroShort(o.amount) : "—"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// 5. SEZON İLERLEME RAPORU — Lig pozisyonu + hedefler + son 5 hafta trendi
// =============================================================================
function SeasonReport({
  team,
  clubs,
  fixtures,
  seasonNumber,
}: {
  team: Team;
  clubs: Team[];
  fixtures: FixtureRow[];
  seasonNumber: number;
}) {
  // v2.9.66 Faz 6: i18n — hardcoded string'leri t() ile değiştir
  const { t } = useI18n();
  const standings = useMemo(() => computeStandings(clubs, fixtures), [clubs, fixtures]);
  const myStat = standings.find((s) => s.teamId === team.id);
  const myPos = standings.findIndex((s) => s.teamId === team.id) + 1;
  const currentMd = SEASON_INFO.matchday;
  const totalMd = SEASON_INFO.totalMatchdays;

  const myFixtures = useMemo(() =>
    fixtures
      .filter((f) => f.played && (f.homeId === team.id || f.awayId === team.id))
      .sort((a, b) => a.matchday - b.matchday)
  , [fixtures, team.id]);

  // İlk yarı / ikinci yarı ayrımı
  const halfMark = Math.floor(totalMd / 2);
  const firstHalf = myFixtures.filter((f) => f.matchday <= halfMark);
  const secondHalf = myFixtures.filter((f) => f.matchday > halfMark);

  const calcStats = (fix: typeof myFixtures) => {
    let w = 0, d = 0, l = 0, gf = 0, ga = 0;
    for (const f of fix) {
      const isHome = f.homeId === team.id;
      const us = isHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
      const them = isHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
      gf += us; ga += them;
      if (us > them) w++;
      else if (us < them) l++;
      else d++;
    }
    return { w, d, l, gf, ga, pts: w * 3 + d };
  };

  const firstStats = calcStats(firstHalf);
  const secondStats = calcStats(secondHalf);
  const allStats = calcStats(myFixtures);

  // Sezon sonu tahmini puan
  const projectedPoints = myFixtures.length > 0
    ? Math.round((allStats.pts / myFixtures.length) * totalMd)
    : 0;

  // Lig hedefleri
  const targets = [
    { pos: 1, label: t("reports.championship"), color: "bg-amber-500/20 text-amber-300" },
    { pos: 2, label: "Yükselme", color: "bg-emerald-500/20 text-emerald-300" },
    { pos: 4, label: "Play-off", color: "bg-sky-500/20 text-sky-300" },
    { pos: 16, label: "Küme Düşme Hattı", color: "bg-red-500/20 text-red-300" },
  ];
  const currentTarget = targets.filter(t => myPos <= t.pos)[0] ?? targets[0];

  // Lig sıralamasında nearby takımlar (3 üstü + 3 altı)
  const myStanding = standings[myPos - 1];
  const nearby = standings.slice(Math.max(0, myPos - 4), myPos + 3);

  // Son 5 hafta puan trendi
  const last5Weeks = myFixtures.slice(-5);
  const last5Stats = calcStats(last5Weeks);

  return (
    <div className="space-y-2">
      {/* Sezon ilerleme bar'ı */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Calendar size={12} className="text-amber-400" />
          <span className="text-xs font-bold">{t("reports.season_progress_label", { n: seasonNumber })}</span>
        </div>
        <div className="mb-1">
          <div className="flex justify-between text-[11px] text-muted-foreground mb-0.5">
            <span>Hafta {currentMd}/{totalMd}</span>
            <span>{t("reports.matches_remaining", { played: myFixtures.length, remaining: totalMd - myFixtures.length })}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(currentMd / totalMd) * 100}%` }} />
          </div>
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {currentMd <= halfMark ? "İlk yarı" : "İkinci yarı"} · %{((currentMd / totalMd) * 100).toFixed(0)} tamamlandı
        </div>
      </div>

      {/* Mevcut hedef */}
      <div className="tm-card p-3 text-center">
        <div className="text-[10px] text-muted-foreground uppercase mb-1">Mevcut Hedef</div>
        <div className={cn("inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold", currentTarget.color)}>
          <Trophy size={12} />
          {currentTarget.label}
        </div>
        <div className="text-[11px] text-muted-foreground mt-1">
          {myPos}. sıradasın · hedefe {currentTarget.pos - myPos > 0 ? `${currentTarget.pos - myPos} sıra` : "ulaşıldı"}
        </div>
      </div>

      {/* Lig performansı (6'lı grid) */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <BarChart3 size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">Lig Performansı</span>
        </div>
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-muted/20 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Sıra</div>
            <div className="text-xl font-bold">{myPos}<span className="text-[10px] text-muted-foreground">/18</span></div>
          </div>
          <div className="bg-muted/20 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Puan</div>
            <div className="text-xl font-bold tabular-nums">{allStats.pts}</div>
          </div>
          <div className="bg-muted/20 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Averaj</div>
            <div className={cn("text-xl font-bold tabular-nums",
              allStats.gf - allStats.ga > 0 ? "text-emerald-400"
              : allStats.gf - allStats.ga < 0 ? "text-red-400" : "")}>
              {allStats.gf - allStats.ga > 0 ? "+" : ""}{allStats.gf - allStats.ga}
            </div>
          </div>
          <div className="bg-emerald-500/10 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Galibiyet</div>
            <div className="text-lg font-bold text-emerald-400">{allStats.w}</div>
          </div>
          <div className="bg-amber-500/10 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Beraberlik</div>
            <div className="text-lg font-bold text-amber-400">{allStats.d}</div>
          </div>
          <div className="bg-red-500/10 rounded p-2 text-center">
            <div className="text-[10px] text-muted-foreground uppercase">Mağlubiyet</div>
            <div className="text-lg font-bold text-red-400">{allStats.l}</div>
          </div>
        </div>
      </div>

      {/* İlk yarı vs İkinci yarı */}
      {firstHalf.length > 0 && (
        <div className="tm-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp size={12} className="text-muted-foreground" />
            <span className="text-xs font-bold">Yarı Sezon Karşılaştırma</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/20 rounded p-2">
              <div className="text-[11px] font-bold mb-1">İlk Yarı</div>
              <div className="text-[10px] text-muted-foreground">{firstStats.w}G {firstStats.d}B {firstStats.l}M</div>
              <div className="text-[10px] text-muted-foreground">{firstStats.gf}-{firstStats.ga} gol</div>
              <div className="text-sm font-bold text-emerald-400 mt-0.5">{firstStats.pts} puan</div>
            </div>
            <div className="bg-muted/20 rounded p-2">
              <div className="text-[11px] font-bold mb-1">İkinci Yarı</div>
              {secondHalf.length > 0 ? (
                <>
                  <div className="text-[10px] text-muted-foreground">{secondStats.w}G {secondStats.d}B {secondStats.l}M</div>
                  <div className="text-[10px] text-muted-foreground">{secondStats.gf}-{secondStats.ga} gol</div>
                  <div className="text-sm font-bold text-sky-400 mt-0.5">{secondStats.pts} puan</div>
                </>
              ) : (
                <div className="text-[11px] text-muted-foreground">Henüz başlamadı</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Son 5 hafta trendi */}
      {last5Weeks.length > 0 && (
        <div className="tm-card p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity size={12} className="text-muted-foreground" />
            <span className="text-xs font-bold">Son 5 Hafta Trendi</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-muted/20 rounded p-2 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Puan</div>
              <div className="text-lg font-bold text-amber-400">{last5Stats.pts}</div>
              <div className="text-[10px] text-muted-foreground">/ 15</div>
            </div>
            <div className="bg-muted/20 rounded p-2 text-center">
              <div className="text-[10px] text-muted-foreground uppercase">Form</div>
              <div className="text-lg font-bold">
                {last5Stats.w}-{last5Stats.d}-{last5Stats.l}
              </div>
              <div className="text-[10px] text-muted-foreground">G-B-M</div>
            </div>
          </div>
        </div>
      )}

      {/* Tahminler */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <TrendingUp size={12} className="text-sky-400" />
          <span className="text-xs font-bold">{t("reports.season_predictions")}</span>
        </div>
        <div className="space-y-1">
          <PredRow label={t("reports.estimated_season_points")} value={projectedPoints} />
          <PredRow label="Maç Başına Gol" value={(allStats.gf / Math.max(1, myFixtures.length)).toFixed(2)} />
          <PredRow label="Maç Başına Gol Yeme" value={(allStats.ga / Math.max(1, myFixtures.length)).toFixed(2)} />
          <PredRow label="Galibiyet Oranı" value={`%${((allStats.w / Math.max(1, myFixtures.length)) * 100).toFixed(0)}`} />
          <PredRow label="Toplam Gol" value={allStats.gf} />
          <PredRow label="Toplam Gol Yeme" value={allStats.ga} />
        </div>
      </div>

      {/* Yakındaki rakipler */}
      <div className="tm-card p-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Users size={12} className="text-muted-foreground" />
          <span className="text-xs font-bold">{t("reports.nearby_rivals")}</span>
        </div>
        <div className="space-y-0.5">
          {nearby.map((s, i) => {
            const isMe = s.teamId === team.id;
            const idx = Math.max(0, myPos - 4) + i + 1;
            return (
              <div key={s.teamId} className={cn(
                "flex items-center gap-2 py-1 px-1.5 rounded",
                isMe ? "bg-primary/15 border border-primary/30" : "bg-muted/20"
              )}>
                <span className="text-[11px] text-muted-foreground w-4 tabular-nums">{idx}</span>
                <span className="text-[10px] font-semibold flex-1 truncate">
                  {isMe ? "★ " : ""}{s.shortName}
                </span>
                <span className="text-[10px] text-muted-foreground">{s.played}m</span>
                <span className="text-[10px] text-muted-foreground">{s.goalsFor}-{s.goalsAgainst}</span>
                <span className="text-[10px] font-bold tabular-nums">{s.points}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// YARDIMCI BİLEŞENLER
// =============================================================================

function SummaryTile({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Trophy;
  label: string;
  value: number;
  color: "emerald" | "amber" | "red" | "primary";
}) {
  const colors = {
    emerald: "bg-emerald-500/10 text-emerald-300",
    amber: "bg-amber-500/10 text-amber-300",
    red: "bg-red-500/10 text-red-300",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className={cn("rounded p-1.5 text-center", colors[color])}>
      <Icon size={12} className="mx-auto mb-0.5" />
      <div className="text-[10px] uppercase opacity-80">{label}</div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </div>
  );
}

function StatTile({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color?: "red" | "amber" | "emerald";
}) {
  const colors = {
    red: "text-red-400",
    amber: "text-amber-400",
    emerald: "text-emerald-400",
  };
  return (
    <div className="bg-muted/20 rounded p-1.5">
      <div className="text-[10px] text-muted-foreground uppercase">{label}</div>
      <div className={cn("text-sm font-bold", color ? colors[color] : "")}>{value}</div>
    </div>
  );
}

function FinRow({
  label,
  value,
  color,
  bold,
  locale,
}: {
  label: string;
  value: number;
  color: "emerald" | "red";
  bold?: boolean;
  locale: Locale;
}) {
  return (
    <div className="flex justify-between text-[10px]">
      <span className={cn("text-muted-foreground", bold && "font-bold text-foreground")}>{label}</span>
      <span className={cn("font-bold tabular-nums",
        color === "emerald" ? "text-emerald-400" : "text-red-400")}>
        {formatEuro(value, locale)}
      </span>
    </div>
  );
}

function PlayerStatRow({
  rank,
  name,
  pos,
  value,
  valueLabel,
  color,
  decimals = 0,
  extra,
  player,
  onClickPlayer,
}: {
  rank: number;
  name: string;
  pos: string;
  value: number;
  valueLabel: string;
  color: "emerald" | "red" | "amber" | "sky";
  decimals?: number;
  extra?: string;
  player?: Player;
  onClickPlayer?: (p: Player) => void;
}) {
  const colors = {
    emerald: "text-emerald-400",
    red: "text-red-400",
    amber: "text-amber-400",
    sky: "text-sky-400",
  };
  return (
    <button
      onClick={() => { if (player && onClickPlayer) { haptic("light"); onClickPlayer(player); } }}
      className={cn(
        "flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20 w-full text-left",
        player && onClickPlayer && "tm-tap hover:bg-accent/30 transition-colors"
      )}
      disabled={!player || !onClickPlayer}
    >
      <span className="text-[11px] text-muted-foreground w-4">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold truncate">{name}</div>
        {extra && <div className="text-[10px] text-muted-foreground">{extra}</div>}
      </div>
      <span className="text-[10px] text-muted-foreground">{pos}</span>
      <span className={cn("text-[10px] font-bold tabular-nums", colors[color])}>
        {value.toFixed(decimals)}
        <span className="text-[10px] opacity-70 ml-0.5">{valueLabel}</span>
      </span>
    </button>
  );
}

function ScoutPlayerRow({
  rank,
  player,
  price,
}: {
  rank: number;
  player: any;
  price?: number;
}) {
  return (
    <div className="flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20">
      <span className="text-[11px] text-muted-foreground w-4">{rank}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[10px] font-semibold truncate">{player.firstName} {player.lastName}</div>
        {price && (
          <div className="text-[10px] text-muted-foreground">{formatEuroShort(price)}</div>
        )}
      </div>
      <span className="text-[10px] text-muted-foreground">{player.specificPosition}</span>
      <span className="text-[10px] text-muted-foreground">{player.age}yaş</span>
      <span className="text-[10px] font-bold tabular-nums">{player.rating}</span>
    </div>
  );
}

function PredRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between text-[10px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold tabular-nums">{value}</span>
    </div>
  );
}

function formatEuroShort(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M €`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}K €`;
  return `${amount} €`;
}
