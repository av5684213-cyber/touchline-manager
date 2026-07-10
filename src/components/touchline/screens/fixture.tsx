"use client";

import { useMemo, useState } from "react";
import { Calendar, ChevronRight, Clock, Play, RotateCcw } from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore, useMyTeam } from "@/lib/store";
import { SEASON_INFO, myRecentMatches, type FixtureRow } from "@/lib/mock/season";
import { ClubBadge } from "../ui-bits";
import { MatchReplayModal } from "../match-replay-modal";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type FilterKey = "all" | "played" | "upcoming";

export function FixtureScreen() {
  const { t, locale } = useI18n();
  const team = useMyTeam();
  const { clubs, fixtures } = useAppStore();
  const [filter, setFilter] = useState<FilterKey>("all");
  const [expandedMd, setExpandedMd] = useState<number | null>(null);
  const [replayMatch, setReplayMatch] = useState<{ homeId: string; awayId: string; homeScore: number; awayScore: number; matchday: number } | null>(null);

  // Kullanıcının takım ID'sine göre tüm fikstürünü bul
  const myFixtures = useMemo(() => {
    if (!team) return [];
    return fixtures
      .filter((f) => f.homeId === team.id || f.awayId === team.id)
      .sort((a, b) => a.matchday - b.matchday);
  }, [fixtures, team]);

  // Lig bazında tüm maçları matchday'e göre grupla
  const fixturesByMd = useMemo(() => {
    const map = new Map<number, FixtureRow[]>();
    for (const f of fixtures) {
      if (!map.has(f.matchday)) map.set(f.matchday, []);
      map.get(f.matchday)!.push(f);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [fixtures]);

  // Son 5 maç formu
  const recentForm = useMemo(() => {
    if (!team) return [];
    return myRecentMatches(fixtures, team.id, 5);
  }, [fixtures, team]);

  // Filtre uygula
  const filteredFixtures = useMemo(() => {
    if (filter === "all") return myFixtures;
    if (filter === "played") return myFixtures.filter((f) => f.played);
    return myFixtures.filter((f) => !f.played);
  }, [myFixtures, filter]);

  if (!team) return null;

  const currentMd = SEASON_INFO.matchday;
  const totalMd = SEASON_INFO.totalMatchdays;
  const playedCount = myFixtures.filter((f) => f.played).length;
  const nextMatch = myFixtures.find((f) => !f.played);

  const getTeam = (id: string) => clubs.find((c) => c.id === id);

  return (
    <div className="px-4 py-4 pb-6 space-y-3">
      {/* Header — sezon ilerlemesi */}
      <div className="tm-card p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-base font-bold">{t("fixture.title")}</h1>
            <p className="text-[11px] text-muted-foreground">
              {t("dash.1lig")} · {t("fixture.season_progress")}
            </p>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-muted-foreground uppercase">{t("fixture.current_week")}</div>
            <div className="text-xl font-bold tabular-nums">{currentMd}/{totalMd}</div>
          </div>
        </div>
        {/* Progress bar */}
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all"
            style={{ width: `${(playedCount / totalMd) * 100}%` }}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>{playedCount} {t("fixture.filter.played").toLowerCase()}</span>
          <span>{totalMd - playedCount} {t("fixture.filter.upcoming").toLowerCase()}</span>
        </div>
      </div>

      {/* Form göstergesi */}
      {recentForm.length > 0 && (
        <div className="tm-card p-3 flex items-center gap-3">
          <span className="text-[10px] text-muted-foreground uppercase font-bold">{t("fixture.form")}</span>
          <div className="flex gap-1">
            {recentForm.map((f, i) => {
              const isHome = f.homeId === team.id;
              const us = isHome ? f.homeScore : f.awayScore;
              const them = isHome ? f.awayScore : f.homeScore;
              const outcome = (us ?? 0) > (them ?? 0) ? "W" : (us ?? 0) < (them ?? 0) ? "L" : "D";
              const cls = outcome === "W" ? "bg-emerald-500" : outcome === "D" ? "bg-amber-400" : "bg-red-500";
              const opp = getTeam(isHome ? f.awayId : f.homeId);
              return (
                <div key={i} className="flex flex-col items-center gap-0.5">
                  <span className={cn("inline-flex items-center justify-center w-7 h-7 rounded text-[10px] font-bold text-white", cls)}>
                    {outcome === "W" ? "G" : outcome === "D" ? "B" : "M"}
                  </span>
                  <span className="text-[7px] text-muted-foreground truncate max-w-[60px]">{opp?.name ?? "—"}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sonraki maç kartı */}
      {nextMatch && (
        <div className="tm-card p-3 border-primary/30">
          <div className="text-[10px] uppercase tracking-wide text-primary font-bold mb-2 flex items-center gap-1">
            <Clock size={11} /> {t("fixture.next_match")} · {t("fixture.matchday")} {nextMatch.matchday}
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={36} />
              <span className="text-[10px] font-semibold truncate max-w-[100px]">{team.name}</span>
              <span className="text-[8px] text-muted-foreground">
                {nextMatch.homeId === team.id ? t("fixture.home") : t("fixture.away")}
              </span>
            </div>
            <span className="text-xs text-muted-foreground font-bold">{t("fixture.vs")}</span>
            {(() => {
              const opp = getTeam(nextMatch.homeId === team.id ? nextMatch.awayId : nextMatch.homeId);
              return opp ? (
                <div className="flex flex-col items-center gap-1">
                  <ClubBadge short={opp.shortName} primaryColor={opp.primaryColor} size={36} />
                  <span className="text-[10px] font-semibold truncate max-w-[100px]">{opp.name}</span>
                  <span className="text-[8px] text-muted-foreground">
                    {nextMatch.awayId === opp.id ? t("fixture.away") : t("fixture.home")}
                  </span>
                </div>
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* Filtre */}
      <div className="flex gap-1.5">
        {(["all", "played", "upcoming"] as FilterKey[]).map((f) => (
          <button
            key={f}
            onClick={() => { haptic("light"); setFilter(f); }}
            className={cn(
              "tm-tap flex-1 py-1.5 rounded-full text-[11px] font-semibold border",
              filter === f ? "bg-foreground text-background border-foreground" : "bg-card border-border"
            )}
            style={{ minHeight: 28 }}
          >
            {t(`fixture.filter.${f}`)}
          </button>
        ))}
      </div>

      {/* Fikstür listesi — kullanıcının maçları */}
      <div className="space-y-1.5">
        {filteredFixtures.length === 0 && (
          <div className="tm-card p-6 text-center text-xs text-muted-foreground">
            {filter === "upcoming" ? t("fixture.no_upcoming") : t("common.loading")}
          </div>
        )}
        {filteredFixtures.map((f) => {
          const isHome = f.homeId === team.id;
          const oppId = isHome ? f.awayId : f.homeId;
          const opp = getTeam(oppId);
          if (!opp) return null;
          const us = isHome ? f.homeScore : f.awayScore;
          const them = isHome ? f.awayScore : f.homeScore;
          const outcome = f.played
            ? (us ?? 0) > (them ?? 0) ? "W" : (us ?? 0) < (them ?? 0) ? "L" : "D"
            : null;
          const isCurrent = f.matchday === currentMd;
          return (
            <div
              key={f.id}
              className={cn(
                "tm-card p-2.5 flex items-center gap-2.5",
                isCurrent && "border-primary/50"
              )}
            >
              {/* Matchday */}
              <div className={cn(
                "w-8 text-center shrink-0",
                isCurrent ? "text-primary" : "text-muted-foreground"
              )}>
                <div className="text-[9px] uppercase">Hafta</div>
                <div className="text-sm font-bold tabular-nums">{f.matchday}</div>
              </div>

              {/* Home/Away badge */}
              <span className={cn(
                "text-[9px] px-1 py-0.5 rounded font-bold shrink-0 w-8 text-center",
                isHome ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
              )}>
                {isHome ? t("fixture.home") : t("fixture.away")}
              </span>

              {/* Opponent */}
              <ClubBadge short={opp.shortName} primaryColor={opp.primaryColor} size={24} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold truncate">{opp.name}</div>
                <div className="text-[9px] text-muted-foreground">
                  {new Intl.DateTimeFormat(locale === "tr" ? "tr-TR" : "en-US", {
                    day: "2-digit", month: "short",
                  }).format(new Date(f.date))}
                </div>
              </div>

              {/* Score or Play button */}
              {f.played ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => {
                      haptic("light");
                      setReplayMatch({
                        homeId: f.homeId,
                        awayId: f.awayId,
                        homeScore: f.homeScore ?? 0,
                        awayScore: f.awayScore ?? 0,
                        matchday: f.matchday,
                      });
                    }}
                    className={cn(
                      "tm-tap text-sm font-bold tabular-nums px-1.5 py-0.5 rounded hover:bg-accent/50 transition-colors",
                      outcome === "W" ? "text-emerald-400"
                      : outcome === "L" ? "text-red-400"
                      : "text-amber-400"
                    )}
                  >
                    {us} - {them}
                  </button>
                  <button
                    onClick={() => { haptic("light"); setExpandedMd(expandedMd === f.matchday ? null : f.matchday); }}
                    className="tm-tap p-1 text-muted-foreground"
                    aria-label={t("fixture.replay")}
                  >
                    <RotateCcw size={11} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => { haptic("medium"); }}
                  className={cn(
                    "tm-tap px-2.5 py-1 rounded text-[10px] font-bold shrink-0",
                    isCurrent ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}
                >
                  {isCurrent ? t("fixture.play") : "—"}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Maç tekrar izleme modal'ı */}
      {replayMatch && (() => {
        const home = clubs.find((c) => c.id === replayMatch.homeId);
        const away = clubs.find((c) => c.id === replayMatch.awayId);
        if (!home || !away) return null;
        return (
          <MatchReplayModal
            homeTeam={home}
            awayTeam={away}
            homeScore={replayMatch.homeScore}
            awayScore={replayMatch.awayScore}
            matchday={replayMatch.matchday}
            onClose={() => setReplayMatch(null)}
          />
        );
      })()}

      {/* Kupa maçları bölümü — store.cup'tan gelir */}
      <CupFixturesSection />
    </div>
  );
}

// Kupa fikstür bölümü — store.cup.matches'tan okur
function CupFixturesSection() {
  const { t } = useI18n();
  const { clubs, cup } = useAppStore();
  const team = useMyTeam();
  if (!team) return null;

  const getTeam = (id: string) => clubs.find((c) => c.id === id);
  const myCupMatches = cup.matches.filter(m => m.homeId === team.id || m.awayId === team.id);

  if (myCupMatches.length === 0 && !cup.champion) return null;

  const ROUND_NAMES: Record<number, string> = {
    2: "Çeyrek Final",
    3: "Yarı Final",
    4: "Final",
  };

  return (
    <div className="space-y-2 mt-4">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-amber-400">🏆 Kupa Maçları</span>
        {cup.champion && (
          <span className="text-[10px] text-amber-300 font-bold">
            Şampiyon: {getTeam(cup.champion)?.name ?? "—"}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {myCupMatches.length === 0 && !cup.champion && (
          <div className="tm-card p-3 text-center text-[10px] text-muted-foreground">
            Kupada maçınız yok.
          </div>
        )}
        {myCupMatches.map((m, i) => {
          const isHome = m.homeId === team.id;
          const opp = getTeam(isHome ? m.awayId : m.homeId);
          const us = isHome ? m.homeScore : m.awayScore;
          const them = isHome ? m.awayScore : m.homeScore;
          const outcome = m.played ? ((us ?? 0) > (them ?? 0) ? "G" : (us ?? 0) < (them ?? 0) ? "M" : "B") : null;
          return (
            <div key={i} className={cn("tm-card py-1.5 px-2.5 flex items-center gap-2", m.round === cup.currentRound && !m.played && "border-amber-500/40")}>
              <span className="text-[8px] text-amber-400 font-bold uppercase shrink-0 w-12">
                {ROUND_NAMES[m.round] ?? `Tur ${m.round}`}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                {isHome ? "EV" : "DEP"}
              </span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <ClubBadge short={isHome ? team.shortName : opp?.shortName ?? "—"}
                  primaryColor={isHome ? team.primaryColor : opp?.primaryColor ?? "#666"} size={18} />
                <span className="text-[10px] font-semibold truncate">
                  {isHome ? team.name : opp?.name ?? "—"}
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground font-bold">vs</span>
              <div className="flex items-center gap-1.5 flex-1 min-w-0 justify-end">
                <span className="text-[10px] font-semibold truncate text-right">
                  {isHome ? opp?.name ?? "—" : team.name}
                </span>
                <ClubBadge short={isHome ? opp?.shortName ?? "—" : team.shortName}
                  primaryColor={isHome ? opp?.primaryColor ?? "#666" : team.primaryColor} size={18} />
              </div>
              {m.played ? (
                <span className={cn("text-[10px] font-bold tabular-nums shrink-0 w-8 text-center",
                  outcome === "G" ? "text-emerald-400" : outcome === "M" ? "text-red-400" : "text-amber-400")}>
                  {us}-{them}
                </span>
              ) : (
                <span className="text-[9px] text-muted-foreground shrink-0 w-8 text-center">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
