"use client";

import { useState, useMemo } from "react";
import {
  ArrowLeft,
  Calendar,
  ChevronRight,
  MessageSquare,
  TrendingDown,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/locale-provider";
import { useAppStore } from "@/lib/store";
import { computeStandings } from "@/lib/mock/season";
import { POSITION_GROUP, type Player, type PositionGroup, type Team } from "@/lib/mock/data";
import { ClubBadge, PlayerAvatar, PositionPill, RatingBadge, GrowthBadge } from "./ui-bits";
import { PlayerProfileModal } from "./player-profile-modal";
import { MatchReplayModal } from "./match-replay-modal";
import { formatEuro } from "@/lib/format";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

// Mevki sıralaması
const POSITION_ORDER: Record<string, number> = {
  GK: 0, CB: 1, LB: 2, RB: 3, LWB: 4, RWB: 5,
  CDM: 6, CM: 7, CAM: 8, LM: 9, RM: 10,
  LW: 11, RW: 12, CF: 13, ST: 14,
};

const POSITION_ROW_BG: Record<PositionGroup, string> = {
  GK: "bg-amber-100/70 dark:bg-amber-950/30",
  DEF: "bg-sky-100/70 dark:bg-sky-950/30",
  MID: "bg-emerald-100/70 dark:bg-emerald-950/30",
  FWD: "bg-rose-100/70 dark:bg-rose-950/30",
};

const LEAGUE_NAMES: Record<number, string> = {
  1: "Süper Lig",
  2: "1. Lig",
  3: "2. Lig",
  4: "3. Lig",
};

export function TeamDetailModal({
  team,
  isMyTeam,
  onClose,
  onMessage,
}: {
  team: Team;
  isMyTeam: boolean;
  onClose: () => void;
  onMessage: (team: Team) => void;
}) {
  const { t, locale } = useI18n();
  const [profilePlayer, setProfilePlayer] = useState<Player | null>(null);
  const [posFilter, setPosFilter] = useState<"ALL" | "GK" | "DEF" | "MID" | "FWD">("ALL");
  const [detailTab, setDetailTab] = useState<"squad" | "matches" | "stats">("squad");
  const [replayMatch, setReplayMatch] = useState<{ homeId: string; awayId: string; homeScore: number; awayScore: number; matchday: number } | null>(null);
  const { clubs, fixtures } = useAppStore();

  // Takım fikstürü
  const teamFixtures = useMemo(() => {
    return fixtures
      .filter((f) => f.homeId === team.id || f.awayId === team.id)
      .sort((a, b) => a.matchday - b.matchday);
  }, [fixtures, team.id]);

  // Lig sıralaması
  const standings = useMemo(() => computeStandings(clubs, fixtures), [clubs, fixtures]);
  const myStanding = standings.find((s) => s.teamId === team.id);
  const myPosition = standings.findIndex((s) => s.teamId === team.id) + 1;

  // Form (son 5 maç)
  const recentForm = useMemo(() => {
    const played = teamFixtures.filter((f) => f.played).slice(-5);
    return played.map((f) => {
      const isHome = f.homeId === team.id;
      const us = isHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
      const them = isHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
      return (us > them ? "W" : us < them ? "L" : "D") as "W" | "D" | "L";
    });
  }, [teamFixtures, team.id]);

  // Kadro hesaplamaları
  const sortedPlayers = useMemo(() => {
    const filtered = posFilter === "ALL"
      ? team.players
      : team.players.filter((p) => POSITION_GROUP[p.specificPosition] === posFilter);
    return filtered.sort((a, b) => {
      const pa = POSITION_ORDER[a.specificPosition] ?? 99;
      const pb = POSITION_ORDER[b.specificPosition] ?? 99;
      if (pa !== pb) return pa - pb;
      return b.rating - a.rating;
    });
  }, [team.players, posFilter]);

  const avgOvr = Math.round(team.players.reduce((s, p) => s + p.rating, 0) / team.players.length);
  const totalValue = team.players.reduce((s, p) => s + p.marketValue, 0);
  const injuredCount = team.players.filter((p) => p.is_injured).length;

  // En iyi oyuncular
  const topPlayers = useMemo(() => {
    return [...team.players].sort((a, b) => b.rating - a.rating).slice(0, 5);
  }, [team.players]);

  // Gol/asist kralları (takım içi)
  const topScorer = useMemo(() => {
    return [...team.players].filter((p) => p.specificPosition !== "GK").sort((a, b) => (b.goals ?? 0) - (a.goals ?? 0))[0];
  }, [team.players]);
  const topAssister = useMemo(() => {
    return [...team.players].filter((p) => p.specificPosition !== "GK").sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))[0];
  }, [team.players]);

  // Pozisyon dağılımı
  const posCounts = useMemo(() => {
    const counts: Record<string, number> = { GK: 0, DEF: 0, MID: 0, FWD: 0 };
    for (const p of team.players) {
      const g = POSITION_GROUP[p.specificPosition] ?? "MID";
      counts[g]++;
    }
    return counts;
  }, [team.players]);

  // Gol/atılan/yenilen
  const goalsFor = myStanding?.goalsFor ?? 0;
  const goalsAgainst = myStanding?.goalsAgainst ?? 0;
  const goalDiff = goalsFor - goalsAgainst;
  const points = myStanding?.points ?? 0;
  const played = myStanding?.played ?? 0;
  const wins = myStanding?.won ?? 0;
  const draws = myStanding?.drawn ?? 0;
  const losses = myStanding?.lost ?? 0;

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      {/* ===== Header — takım renkleri ===== */}
      <div
        className="px-3 py-3 flex items-center gap-3 shrink-0"
        style={{ background: `linear-gradient(135deg, ${team.primaryColor} 0%, ${team.primaryColor}cc 100%)` }}
      >
        <button
          onClick={() => { haptic("light"); onClose(); }}
          className="tm-tap p-1.5 rounded-full bg-black/20 text-white shrink-0"
        >
          <ArrowLeft size={18} />
        </button>
        <ClubBadge short={team.shortName} primaryColor={team.primaryColor} size={40} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-white truncate">{team.name}</div>
          <div className="text-[10px] text-white/70">
            {LEAGUE_NAMES[team.leagueTier] ?? "1. Lig"} · {myPosition}. sırada
          </div>
        </div>
        {!isMyTeam && (
          <button
            onClick={() => { haptic("light"); onMessage(team); }}
            className="tm-tap p-1.5 rounded-full bg-black/20 text-white shrink-0"
          >
            <MessageSquare size={16} />
          </button>
        )}
      </div>

      {/* ===== Özet kartları — 4'lü grid ===== */}
      <div className="grid grid-cols-4 gap-1.5 p-2.5 shrink-0">
        <div className="tm-card p-1.5 text-center">
          <div className="text-base font-bold tabular-nums text-amber-400">{myPosition || "—"}</div>
          <div className="text-[7px] text-muted-foreground uppercase">Sıra</div>
        </div>
        <div className="tm-card p-1.5 text-center">
          <div className="text-base font-bold tabular-nums text-emerald-400">{points}</div>
          <div className="text-[7px] text-muted-foreground uppercase">Puan</div>
        </div>
        <div className="tm-card p-1.5 text-center">
          <div className="text-base font-bold tabular-nums">{avgOvr}</div>
          <div className="text-[7px] text-muted-foreground uppercase">OVR</div>
        </div>
        <div className="tm-card p-1.5 text-center">
          <div className="text-[10px] font-bold tabular-nums">{formatEuro(totalValue, locale)}</div>
          <div className="text-[7px] text-muted-foreground uppercase">Değer</div>
        </div>
      </div>

      {/* ===== Form bar — son 5 maç ===== */}
      <div className="px-2.5 pb-2 shrink-0">
        <div className="tm-card p-2 flex items-center gap-2">
          <span className="text-[9px] text-muted-foreground uppercase font-bold shrink-0">Form</span>
          <div className="flex gap-1 flex-1">
            {recentForm.length > 0 ? recentForm.map((r, i) => (
              <span key={i} className={cn(
                "flex-1 py-1 rounded text-[10px] font-bold text-center",
                r === "W" ? "bg-emerald-500/20 text-emerald-300"
                : r === "D" ? "bg-amber-500/20 text-amber-300"
                : "bg-red-500/20 text-red-300"
              )}>
                {r === "W" ? "G" : r === "D" ? "B" : "M"}
              </span>
            )) : (
              <span className="text-[9px] text-muted-foreground">Henüz maç oynanmadı</span>
            )}
          </div>
        </div>
      </div>

      {/* ===== Tab navigation ===== */}
      <div className="flex border-b border-border shrink-0">
        {([
          { key: "squad", label: "Kadro", icon: Users },
          { key: "matches", label: "Maçlar", icon: Calendar },
          { key: "stats", label: "İstatistik", icon: TrendingUp },
        ] as const).map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => { haptic("light"); setDetailTab(tab.key); }}
              className={cn(
                "tm-tap flex-1 py-2 text-xs font-bold flex items-center justify-center gap-1.5",
                detailTab === tab.key ? "text-primary border-b-2 border-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={12} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ===== Content ===== */}
      <div className="flex-1 overflow-y-auto tm-thin-scrollbar">
        {/* ===== KADRO TAB ===== */}
        {detailTab === "squad" && (
          <div className="p-2 space-y-2">
            {/* Pozisyon filtre */}
            <div className="flex gap-1 overflow-x-auto tm-no-scrollbar">
              {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((g) => (
                <button
                  key={g}
                  onClick={() => { haptic("light"); setPosFilter(g); }}
                  className={cn(
                    "tm-tap px-2.5 py-1 rounded-full text-[10px] font-semibold border whitespace-nowrap",
                    posFilter === g ? "bg-foreground text-background border-foreground" : "bg-card border-border"
                  )}
                >
                  {g === "ALL" ? `Tümü (${team.players.length})` : `${t(`pos.${g.toLowerCase()}`)} (${posCounts[g] || 0})`}
                </button>
              ))}
            </div>

            {/* Oyuncu listesi */}
            <div className="tm-card divide-y divide-border">
              {sortedPlayers.map((p) => {
                const posGroup = POSITION_GROUP[p.specificPosition];
                return (
                  <button
                    key={p.id}
                    onClick={() => { haptic("light"); setProfilePlayer(p); }}
                    className={cn(
                      "tm-tap w-full flex items-center gap-2 p-2 text-left transition-colors hover:bg-accent/30",
                      POSITION_ROW_BG[posGroup]
                    )}
                  >
                    <PositionPill label={p.specificPosition} group={posGroup} />
                    <PlayerAvatar initials={p.specificPosition} color={team.primaryColor} size={28} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-semibold truncate">{p.firstName} {p.lastName}</span>
                        {p.is_injured && <span className="text-[8px]">🤕</span>}
                        {p.archetype && <span className="text-[8px] text-amber-300 truncate">{p.archetype}</span>}
                      </div>
                      <div className="text-[9px] text-muted-foreground">
                        {p.age}{t("common.year")} · {p.nationality === "TR" ? "🇹🇷" : "🌍"} · {p.specificPosition === "GK" ? `${p.saves ?? 0}K` : `${p.goals ?? 0}G·${p.assists ?? 0}A`}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <GrowthBadge currentRating={p.rating} playerId={p.id} />
                      <span className="text-sm font-bold tabular-nums text-amber-400">{p.rating}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== MAÇLAR TAB ===== */}
        {detailTab === "matches" && (
          <div className="p-2 space-y-1">
            {teamFixtures.map((f) => {
              const isHome = f.homeId === team.id;
              const oppId = isHome ? f.awayId : f.homeId;
              const opp = clubs.find((c) => c.id === oppId);
              if (!opp) return null;
              const us = isHome ? f.homeScore : f.awayScore;
              const them = isHome ? f.awayScore : f.homeScore;
              const outcome = f.played
                ? (us ?? 0) > (them ?? 0) ? "W" : (us ?? 0) < (them ?? 0) ? "L" : "D"
                : null;
              return (
                <div key={f.id} className="tm-card p-2 flex items-center gap-2">
                  <div className="w-7 text-center shrink-0">
                    <div className="text-[7px] uppercase text-muted-foreground">Hf</div>
                    <div className="text-[10px] font-bold tabular-nums">{f.matchday}</div>
                  </div>
                  <span className={cn(
                    "text-[8px] px-1 py-0.5 rounded font-bold shrink-0 w-6 text-center",
                    isHome ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300"
                  )}>
                    {isHome ? "Ev" : "Dep"}
                  </span>
                  <ClubBadge short={opp.shortName} primaryColor={opp.primaryColor} size={18} />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-semibold truncate">{opp.shortName}</div>
                  </div>
                  {f.played ? (
                    <button
                      onClick={() => {
                        haptic("light");
                        setReplayMatch({ homeId: f.homeId, awayId: f.awayId, homeScore: f.homeScore ?? 0, awayScore: f.awayScore ?? 0, matchday: f.matchday });
                      }}
                      className={cn(
                        "tm-tap text-sm font-bold tabular-nums px-1.5 py-0.5 rounded hover:bg-accent/50 transition-colors",
                        outcome === "W" ? "text-emerald-400" : outcome === "L" ? "text-red-400" : "text-amber-400"
                      )}
                    >
                      {us} - {them}
                    </button>
                  ) : (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ===== İSTATİSTİK TAB ===== */}
        {detailTab === "stats" && (
          <div className="p-2 space-y-2">
            {/* Lig performansı */}
            <div className="tm-card p-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Lig Performansı</div>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-emerald-500/10 rounded p-2 text-center">
                  <div className="text-lg font-bold text-emerald-400">{wins}</div>
                  <div className="text-[8px] text-muted-foreground uppercase">Galibiyet</div>
                </div>
                <div className="bg-amber-500/10 rounded p-2 text-center">
                  <div className="text-lg font-bold text-amber-400">{draws}</div>
                  <div className="text-[8px] text-muted-foreground uppercase">Beraberlik</div>
                </div>
                <div className="bg-red-500/10 rounded p-2 text-center">
                  <div className="text-lg font-bold text-red-400">{losses}</div>
                  <div className="text-[8px] text-muted-foreground uppercase">Mağlubiyet</div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-border flex justify-between text-[10px]">
                <span className="text-muted-foreground">Oynanan: <span className="font-bold text-foreground">{played}</span></span>
                <span className="text-muted-foreground">Gol: <span className="font-bold text-emerald-400">{goalsFor}</span></span>
                <span className="text-muted-foreground">Yenilen: <span className="font-bold text-red-400">{goalsAgainst}</span></span>
                <span className={cn("font-bold", goalDiff > 0 ? "text-emerald-400" : goalDiff < 0 ? "text-red-400" : "text-muted-foreground")}>
                  AVR: {goalDiff > 0 ? "+" : ""}{goalDiff}
                </span>
              </div>
            </div>

            {/* Pozisyon dağılımı */}
            <div className="tm-card p-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">Kadro Dağılımı</div>
              <div className="space-y-1.5">
                {([
                  { label: "🧤 Kaleci", group: "GK", color: "bg-amber-500" },
                  { label: "🛡️ Defans", group: "DEF", color: "bg-sky-500" },
                  { label: "⚔️ Orta Saha", group: "MID", color: "bg-emerald-500" },
                  { label: "🎯 Forvet", group: "FWD", color: "bg-rose-500" },
                ]).map(({ label, group, color }) => {
                  const count = posCounts[group] || 0;
                  const pct = (count / team.players.length) * 100;
                  return (
                    <div key={group}>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-muted-foreground">{label}</span>
                        <span className="font-bold tabular-nums">{count}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* En iyi 5 oyuncu */}
            <div className="tm-card p-3">
              <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2">En İyi 5 Oyuncu</div>
              <div className="space-y-0.5">
                {topPlayers.map((p, i) => (
                  <button
                    key={p.id}
                    onClick={() => { haptic("light"); setProfilePlayer(p); }}
                    className="tm-tap w-full flex items-center gap-2 py-1 px-1.5 rounded bg-muted/20 hover:bg-accent/30 transition-colors"
                  >
                    <span className="text-[9px] text-muted-foreground w-4">{i + 1}</span>
                    <PlayerAvatar initials={p.specificPosition} color={team.primaryColor} size={24} />
                    <span className="text-[10px] font-semibold flex-1 truncate text-left">{p.firstName} {p.lastName}</span>
                    <PositionPill label={p.specificPosition} group={POSITION_GROUP[p.specificPosition]} />
                    <span className="text-[10px] font-bold tabular-nums text-amber-400">{p.rating}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Takım içi gol/asist kralları */}
            <div className="grid grid-cols-2 gap-2">
              {topScorer && (
                <div className="tm-card p-2.5 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase mb-1">⚽ Gol Kralı</div>
                  <button
                    onClick={() => { haptic("light"); setProfilePlayer(topScorer); }}
                    className="tm-tap"
                  >
                    <div className="text-[11px] font-bold truncate">{topScorer.firstName} {topScorer.lastName}</div>
                    <div className="text-lg font-bold text-emerald-400 tabular-nums">{topScorer.goals ?? 0}</div>
                    <div className="text-[8px] text-muted-foreground">gol</div>
                  </button>
                </div>
              )}
              {topAssister && (
                <div className="tm-card p-2.5 text-center">
                  <div className="text-[8px] text-muted-foreground uppercase mb-1">🅰 Asist Kralı</div>
                  <button
                    onClick={() => { haptic("light"); setProfilePlayer(topAssister); }}
                    className="tm-tap"
                  >
                    <div className="text-[11px] font-bold truncate">{topAssister.firstName} {topAssister.lastName}</div>
                    <div className="text-lg font-bold text-sky-400 tabular-nums">{topAssister.assists ?? 0}</div>
                    <div className="text-[8px] text-muted-foreground">asist</div>
                  </button>
                </div>
              )}
            </div>

            {/* Sakat oyuncular */}
            {injuredCount > 0 && (
              <div className="tm-card p-2.5 border-red-500/30 bg-red-500/5">
                <div className="text-[9px] text-red-400 font-bold uppercase">🤕 Sakat Oyuncular: {injuredCount}</div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Player profile modal (nested) */}
      {profilePlayer && (
        <PlayerProfileModal
          player={profilePlayer}
          teamColor={team.primaryColor}
          onClose={() => setProfilePlayer(null)}
        />
      )}

      {/* Maç tekrar izleme */}
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
    </div>
  );
}
