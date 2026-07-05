"use client";

import { useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { computeStandings, generateFixtures, SEASON_INFO } from "@/lib/mock/season";
import { ClubBadge } from "../ui-bits";
import { TeamDetailModal } from "../team-detail-modal";
import { TeamMessageModal } from "../team-message-modal";
import { LEAGUE_NAMES, generateClubsForLeague, type Team, type LeagueTier, type Department } from "@/lib/mock/data";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";
import type { FormResult } from "@/lib/mock/season";

// Lig başına 18 takım; 3. Lig (tier 4) 5 departman
const TIER_DEPTS: Record<LeagueTier, number> = { 1: 1, 2: 1, 3: 1, 4: 5 };

// 18 takım: idx 0-2 → üst lige çıkma, idx 15-17 → düşme
// Backend (store.ts) ile tam senkron: myFinalIdx < 3 → promote, >= 15 → relegate
function getZone(idx: number, tier: number = 2): "promotion" | "relegation" | "middle" {
  if (tier === 1) {
    if (idx >= 15) return "relegation";
    return "middle";
  }
  if (idx <= 2) return "promotion";
  if (idx >= 15) return "relegation";
  return "middle";
}

const ZONE_COLORS: Record<string, string> = {
  promotion: "border-l-emerald-500",
  relegation: "border-l-red-500",
  middle: "border-l-transparent",
};

const ZONE_DOT: Record<string, string> = {
  promotion: "bg-emerald-500",
  relegation: "bg-red-500",
  middle: "bg-transparent",
};

export function StandingsScreen() {
  const { t, locale } = useI18n();
  const { clubs, fixtures } = useAppStore();
  const team = useMyTeam();
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [messageTeam, setMessageTeam] = useState<Team | null>(null);

  // Seçili lig ve departman — varsayılan kullanıcının ligi
  const userTier = (team?.leagueTier ?? 2) as LeagueTier;
  const userDept = (team?.department ?? 1) as Department;
  const [selTier, setSelTier] = useState<LeagueTier>(userTier);
  const [selDept, setSelDept] = useState<Department>(userDept);

  // Kullanıcının kendi ligi mi?
  const isMyLeague = selTier === userTier && selDept === userDept;

  // Seçili ligdeki kulüpler — kullanıcı kendi ligi ise store'dan, değilse generate et
  // Sabit seed ile — her açılışta aynı takımlar görünsün
  const leagueClubs = useMemo<Team[]>(() => {
    if (isMyLeague) return clubs;
    // Diğer ligler için de generate et ama stable tut
    return generateClubsForLeague(selTier, selDept);
  }, [isMyLeague, clubs, selTier, selDept]);

  // Diğer ligler için de sahte fikstür üret + standings hesapla
  const otherLeagueFixtures = useMemo(() => {
    if (isMyLeague) return fixtures;
    // Diğer lig için sahte fikstür üret — aynı takımlarla round-robin
    return generateFixtures(leagueClubs);
  }, [isMyLeague, fixtures, leagueClubs]);

  // Maçları random simüle et (sadece gösterim için)
  const simulatedFixtures = useMemo(() => {
    if (isMyLeague) return fixtures;
    // Diğer ligler için random sonuçlar üret
    return otherLeagueFixtures.map(f => {
      if (f.played) return f;
      const homeTeam = leagueClubs.find(c => c.id === f.homeId);
      const awayTeam = leagueClubs.find(c => c.id === f.awayId);
      if (!homeTeam || !awayTeam) return f;
      const homeStr = homeTeam.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
      const awayStr = awayTeam.players.slice(0, 11).reduce((s, p) => s + p.rating, 0) / 11;
      const diff = homeStr - awayStr;
      const homeAdv = diff > 5 ? 0.3 : diff < -5 ? -0.3 : 0;
      const hs = Math.max(0, Math.floor(Math.random() * 4 + homeAdv * 2));
      const as = Math.max(0, Math.floor(Math.random() * 3 - homeAdv * 2));
      return { ...f, homeScore: hs, awayScore: as, played: true };
    });
  }, [isMyLeague, fixtures, otherLeagueFixtures, leagueClubs]);

  const standings = useMemo(
    () => computeStandings(leagueClubs, isMyLeague ? fixtures : simulatedFixtures),
    [leagueClubs, fixtures, simulatedFixtures, isMyLeague]
  );

  // Power ranking artık kullanılmıyor — tüm ligler için standings var
  const powerRanking: any[] = [];

  const myPos = useMemo(
    () => standings.findIndex((s) => s.teamId === (team?.id ?? "")),
    [standings, team]
  );

  const onTierChange = (newTier: LeagueTier) => {
    haptic("light");
    setSelTier(newTier);
    // Tüm tier'lar için 1. departmana sıfırla
    setSelDept(1 as Department);
  };

  const onDeptChange = (newDept: Department) => {
    haptic("light");
    setSelDept(newDept);
  };

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header */}
      <div className="tm-card p-3 flex items-center justify-between">
        <div>
          <h1 className="text-base font-bold">{t("standings.title")}</h1>
          <p className="text-[11px] text-muted-foreground">
            {LEAGUE_NAMES[selTier][locale]}{TIER_DEPTS[selTier] > 1 ? ` D${selDept}` : ""} · {t("standings.matchday")} {SEASON_INFO.matchday}/{SEASON_INFO.totalMatchdays}
          </p>
        </div>
        <div className="text-right">
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide">
            {t("standings.col.pos")}
          </div>
          <div className="text-2xl font-bold tabular-nums">
            {isMyLeague && myPos >= 0 ? myPos + 1 : "—"}
          </div>
        </div>
      </div>

      {/* Lig sekmeleri — toolbox */}
      <div className="tm-card p-1.5 space-y-1.5">
        {/* Tier tabs */}
        <div className="flex gap-1">
          {([1, 2, 3, 4] as LeagueTier[]).map((tier) => (
            <button
              key={tier}
              onClick={() => onTierChange(tier)}
              className={cn(
                "tm-tap flex-1 py-1.5 rounded-md text-[10px] font-bold transition-colors",
                selTier === tier
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              )}
            >
              {LEAGUE_NAMES[tier][locale]}
            </button>
          ))}
        </div>
        {/* Department tabs — only for tier 4 */}
        {TIER_DEPTS[selTier] > 1 && (
          <div className="flex gap-1">
            {Array.from({ length: TIER_DEPTS[selTier] }, (_, i) => (i + 1) as Department).map((dept) => (
              <button
                key={dept}
                onClick={() => onDeptChange(dept)}
                className={cn(
                  "tm-tap flex-1 py-1 rounded-md text-[9px] font-bold transition-colors",
                  selDept === dept
                    ? "bg-amber-500 text-white"
                    : "bg-muted/40 text-muted-foreground hover:bg-muted"
                )}
              >
                D{dept}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Standings / Power ranking table — yatay kaydırmada # ve Takım sabit */}
      <div className="tm-card overflow-hidden">
        <div className="overflow-x-auto tm-thin-scrollbar">
          {/* Header row */}
          <div className="grid grid-cols-[24px_1fr_22px_22px_22px_22px_24px_28px_22px_22px] gap-1 px-2 py-2 text-[9px] font-bold uppercase text-muted-foreground border-b border-border bg-muted/30 min-w-[360px]">
            <div className="text-center sticky left-0 bg-muted/30 z-10">{t("standings.col.pos")}</div>
            <div className="sticky left-[26px] bg-muted/30 z-10">{t("standings.col.team")}</div>
            <div className="text-center">{t("standings.col.played")}</div>
            <div className="text-center">{t("standings.col.won")}</div>
            <div className="text-center">{t("standings.col.drawn")}</div>
            <div className="text-center">{t("standings.col.lost")}</div>
            <div className="text-center">{t("standings.col.gd")}</div>
            <div className="text-center font-bold text-foreground">{t("standings.col.points")}</div>
            <div className="text-center" style={{ gridColumn: "span 2" }}>{t("standings.col.form")}</div>
          </div>

          {/* Rows */}
          <div className="overflow-y-auto tm-thin-scrollbar max-h-[55vh]">
              {standings.map((row, idx) => {
                const isMe = row.teamId === team?.id;
                const zone = getZone(idx, selTier);
                const gd = row.goalsFor - row.goalsAgainst;
                const teamData = leagueClubs.find((c) => c.id === row.teamId);
                return (
                  <button
                    key={row.teamId}
                    onClick={() => {
                      haptic("light");
                      if (teamData) setSelectedTeam(teamData);
                    }}
                    className={cn(
                      "grid grid-cols-[24px_1fr_22px_22px_22px_22px_24px_28px_22px_22px] gap-1 px-2 py-2 text-xs items-center border-l-2 border-b border-border/40 last:border-b-0 w-full text-left hover:bg-accent/50 transition-colors min-w-[360px]",
                      ZONE_COLORS[zone],
                      isMe && "bg-primary/5"
                    )}
                  >
                    <div className="flex items-center gap-1 sticky left-0 bg-background z-10">
                      <span className="text-[10px] font-bold tabular-nums w-4 text-center">{idx + 1}</span>
                      <span className={cn("w-1 h-3 rounded-full shrink-0", ZONE_DOT[zone])} />
                    </div>
                    <div className="flex items-center gap-1.5 min-w-0 sticky left-[26px] bg-background z-10 pr-2">
                      <ClubBadge short={row.shortName} primaryColor={row.primaryColor} size={18} />
                      <span className={cn("truncate text-[11px]", isMe ? "font-bold text-primary" : "font-medium")}>
                        {row.teamName}
                      </span>
                      {isMe && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-primary text-primary-foreground font-bold shrink-0">
                          {t("standings.you")}
                        </span>
                      )}
                    </div>
                    <div className="text-center tabular-nums">{row.played}</div>
                    <div className="text-center tabular-nums text-emerald-700">{row.won}</div>
                    <div className="text-center tabular-nums text-muted-foreground">{row.drawn}</div>
                    <div className="text-center tabular-nums text-red-600">{row.lost}</div>
                    <div className="text-center tabular-nums">{gd > 0 ? `+${gd}` : gd}</div>
                    <div className="text-center tabular-nums font-bold">{row.points}</div>
                    <div className="col-span-2 flex items-center justify-center gap-0.5">
                      {row.form.length === 0 ? (
                        <span className="text-[9px] text-muted-foreground">—</span>
                      ) : (
                        row.form.map((f, i) => <FormDot key={i} result={f} />)
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>
      </div>

      {/* Legend — sadece kullanıcının liginde */}
      {isMyLeague && (
        <div className="tm-card p-3">
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold mb-2">
            {t("standings.legend")}
          </div>
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <LegendItem color="bg-emerald-500" label={t("standings.zone.promotion")} />
            <LegendItem color="bg-red-500" label={t("standings.zone.relegation")} />
          </div>
        </div>
      )}

      {/* Bilgi notu — başka lig görüntülenirken */}
      {!isMyLeague && (
        <div className="tm-card p-2.5 text-center text-[10px] text-muted-foreground">
          Diğer liglerin takım güç sıralaması (OVR). Maç sonuçları yalnızca kendi liginden sonra görünecek.
        </div>
      )}

      {/* Team detail modal */}
      {selectedTeam && team && (
        <TeamDetailModal
          team={selectedTeam}
          isMyTeam={selectedTeam.id === team.id}
          onClose={() => setSelectedTeam(null)}
          onMessage={(t) => {
            setSelectedTeam(null);
            setMessageTeam(t);
          }}
        />
      )}

      {/* Team message modal */}
      {messageTeam && team && (
        <TeamMessageModal
          team={messageTeam}
          myTeam={team}
          onClose={() => setMessageTeam(null)}
        />
      )}
    </div>
  );
}

function FormDot({ result }: { result: FormResult }) {
  const cls =
    result === "W"
      ? "bg-emerald-500 text-white"
      : result === "D"
      ? "bg-amber-400 text-amber-900"
      : "bg-red-500 text-white";
  const label = result === "W" ? "G" : result === "D" ? "B" : "M";
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold",
        cls
      )}
    >
      {label}
    </span>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", color)} />
      <span className="text-[10px] leading-tight">{label}</span>
    </div>
  );
}
