"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { X, Trophy, Clock, Play } from "lucide-react";
import type { Team } from "@/lib/mock/data";
import { simulateEnhancedMatch } from "@/lib/match/engine";
import { DEFAULT_TACTIC } from "@/lib/tactics/types";
import { cn } from "@/lib/utils";
import { haptic } from "@/hooks/touchline";

type Event = {
  minute: number;
  type: string;
  team: string;
  player?: string;
  side?: string;
};

type MatchResult = {
  homeScore: number;
  awayScore: number;
  events: Event[];
  motmPlayerId?: string;
  playerRatings: Record<string, number>;
  stats: {
    possession: [number, number];
    shotsOnTarget: [number, number];
    corners: [number, number];
    fouls: [number, number];
  };
};

/**
 * Maç tekrar izleme modal'ı — herhangi iki takım arasındaki maçı simüle edip gösterir.
 * Puan tablosu, fikstür, takım detayından skorlara tıklanınca açılır.
 */
export function MatchReplayModal({
  homeTeam,
  awayTeam,
  homeScore,
  awayScore,
  matchday,
  onClose,
}: {
  homeTeam: Team;
  awayTeam: Team;
  homeScore?: number;
  awayScore?: number;
  matchday?: number;
  onClose: () => void;
}) {
  const [watching, setWatching] = useState(false);
  const [visibleCount, setVisibleCount] = useState(0);
  const [currentScore, setCurrentScore] = useState({ home: 0, away: 0 });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Maçı simüle et (sadece bir kez)
  const result = useMemo<MatchResult | null>(() => {
    try {
      const homeXI = [...homeTeam.players].sort((a, b) => b.rating - a.rating).slice(0, 11);
      const awayXI = [...awayTeam.players].sort((a, b) => b.rating - a.rating).slice(0, 11);
      const res = simulateEnhancedMatch(
        homeXI as any,
        awayXI as any,
        { ...DEFAULT_TACTIC, formation: "4-4-2" } as any,
        { ...DEFAULT_TACTIC, formation: "4-4-2" } as any,
        { homeTeamName: homeTeam.name, awayTeamName: awayTeam.name } as any
      );
      return {
        homeScore: homeScore ?? res.homeScore,
        awayScore: awayScore ?? res.awayScore,
        events: (res.events || []).sort((a: any, b: any) => a.minute - b.minute),
        motmPlayerId: res.manOfTheMatch,
        playerRatings: {},
        stats: {
          possession: [res.homePossession || 50, res.awayPossession || 50],
          shotsOnTarget: [res.homeStats?.shotsOnTarget || 0, res.awayStats?.shotsOnTarget || 0],
          corners: [res.homeStats?.corners || 0, res.awayStats?.corners || 0],
          fouls: [res.homeStats?.fouls || 0, res.awayStats?.fouls || 0],
        },
      };
    } catch (e) {
      return null;
    }
  }, [homeTeam, awayTeam, homeScore, awayScore]);

  const displayScore = result ?? { homeScore: homeScore ?? 0, awayScore: awayScore ?? 0, events: [], stats: { possession: [50, 50], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0] }, playerRatings: {} };
  const sortedEvents = [...displayScore.events].sort((a, b) => a.minute - b.minute);

  // MOTM bul
  const motm = displayScore.motmPlayerId
    ? [...homeTeam.players, ...awayTeam.players].find((p) => p.id === displayScore.motmPlayerId)
    : null;

  // "Özeti İzle" — yavaş yavaş olayları göster
  useEffect(() => {
    if (!watching || sortedEvents.length === 0) return;
    setVisibleCount(0);
    setCurrentScore({ home: 0, away: 0 });
    let idx = 0;
    const interval = setInterval(() => {
      if (idx >= sortedEvents.length) {
        clearInterval(interval);
        setCurrentScore({ home: displayScore.homeScore, away: displayScore.awayScore });
        return;
      }
      const ev = sortedEvents[idx];
      // Gol varsa skoru güncelle
      if (ev.type === "goal") {
        const isHome = ev.team === "home" || ev.side === "home";
        setCurrentScore((prev) => ({
          home: isHome ? prev.home + 1 : prev.home,
          away: !isHome ? prev.away + 1 : prev.away,
        }));
      }
      setVisibleCount(idx + 1);
      idx++;
      // Auto-scroll
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    }, 800); // 800ms per event
    return () => clearInterval(interval);
  }, [watching]);

  const finalScore = watching ? currentScore : { home: displayScore.homeScore, away: displayScore.awayScore };
  const shownEvents = watching ? sortedEvents.slice(0, visibleCount) : sortedEvents;
  const goals = shownEvents.filter((e) => e.type === "goal");
  const cards = shownEvents.filter((e) => e.type === "yellow_card" || e.type === "red_card" || e.type === "yellow" || e.type === "red");

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/80" onClick={onClose} />

      <div className="relative w-full max-w-[390px] bg-background rounded-t-2xl border-t border-border tm-safe-bottom max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-border" style={{ background: "var(--primary)" }}>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-white/60" />
            <span className="text-xs font-bold text-white">
              {matchday ? `Hafta ${matchday} · ` : ""}Maç Özeti
            </span>
          </div>
          <button onClick={onClose} className="tm-tap p-1 text-white/80">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto tm-thin-scrollbar p-3 space-y-3" ref={scrollRef}>
          {/* Skor kartı — izlerken canlı güncellenir */}
          <div className="tm-card p-4 text-center">
            <div className="flex items-center justify-center gap-4">
              <div className="flex-1 text-right">
                <div className="text-sm font-bold truncate">{homeTeam.name}</div>
                <div className="text-[10px] text-muted-foreground">Ev</div>
              </div>
              <div className="text-4xl font-bold tabular-nums text-amber-300">
                {finalScore.home} - {finalScore.away}
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-bold truncate">{awayTeam.name}</div>
                <div className="text-[10px] text-muted-foreground">Dep</div>
              </div>
            </div>

            {/* Özeti İzle butonu */}
            {!watching && sortedEvents.length > 0 && (
              <button
                onClick={() => { haptic("medium"); setWatching(true); }}
                className="mt-3 w-full py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <Play size={16} /> Özeti İzle
              </button>
            )}
            {watching && visibleCount < sortedEvents.length && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-amber-400">
                <span className="animate-pulse">▶</span> Maç akıyor... ({visibleCount}/{sortedEvents.length})
              </div>
            )}
            {watching && visibleCount >= sortedEvents.length && (
              <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-emerald-400 font-bold">
                ✓ Maç sona erdi
              </div>
            )}

            {motm && (!watching || visibleCount >= sortedEvents.length) && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="text-[9px] text-muted-foreground uppercase">Maçın Oyuncusu</div>
                <div className="text-xs font-bold text-amber-300">
                  ⭐ {motm.firstName} {motm.lastName}
                </div>
              </div>
            )}
          </div>

          {/* İstatistikler */}
          <div className="tm-card p-3 space-y-2">
            <div className="text-[10px] text-muted-foreground uppercase font-bold mb-1">İstatistikler</div>
            {[
              { label: "Topla Oynama", home: displayScore.stats.possession[0], away: displayScore.stats.possession[1], unit: "%" },
              { label: "İsabetli Şut", home: displayScore.stats.shotsOnTarget[0], away: displayScore.stats.shotsOnTarget[1], unit: "" },
              { label: "Korner", home: displayScore.stats.corners[0], away: displayScore.stats.corners[1], unit: "" },
              { label: "Faul", home: displayScore.stats.fouls[0], away: displayScore.stats.fouls[1], unit: "" },
            ].map((stat) => {
              const total = stat.home + stat.away || 1;
              const homePct = (stat.home / total) * 100;
              return (
                <div key={stat.label}>
                  <div className="flex justify-between text-[10px] mb-0.5">
                    <span className="font-bold tabular-nums">{stat.home}{stat.unit}</span>
                    <span className="text-muted-foreground">{stat.label}</span>
                    <span className="font-bold tabular-nums">{stat.away}{stat.unit}</span>
                  </div>
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-muted">
                    <div className="bg-sky-500" style={{ width: `${homePct}%` }} />
                    <div className="bg-rose-500" style={{ width: `${100 - homePct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Goller */}
          {goals.length > 0 && (
            <div className="tm-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">⚽ Goller</div>
              <div className="space-y-1.5">
                {goals.map((g, i) => {
                  const isHome = g.team === "home" || g.side === "home";
                  return (
                    <div key={i} className={cn("flex items-center gap-2 text-[10px]", !isHome && "flex-row-reverse text-right")}>
                      <span className="font-bold tabular-nums text-muted-foreground w-8">{g.minute}'</span>
                      <span className="text-base">⚽</span>
                      <span className="font-semibold flex-1 truncate">{g.player || "Bilinmiyor"}</span>
                      <span className={cn("text-[9px] px-1 py-0.5 rounded font-bold", isHome ? "bg-sky-500/20 text-sky-300" : "bg-rose-500/20 text-rose-300")}>
                        {isHome ? homeTeam.shortName : awayTeam.shortName}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Kartlar */}
          {cards.length > 0 && (
            <div className="tm-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">🟨🟥 Kartlar</div>
              <div className="space-y-1.5">
                {cards.map((c, i) => {
                  const isHome = c.team === "home" || c.side === "home";
                  const isRed = c.type === "red";
                  return (
                    <div key={i} className={cn("flex items-center gap-2 text-[10px]", !isHome && "flex-row-reverse text-right")}>
                      <span className="font-bold tabular-nums text-muted-foreground w-8">{c.minute}'</span>
                      <span className="text-base">{isRed ? "🟥" : "🟨"}</span>
                      <span className="font-semibold flex-1 truncate">{c.player || "Bilinmiyor"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Olay zaman çizelgesi — izlerken yavaş yavaş akar */}
          {shownEvents.length > 0 && (
            <div className="tm-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Maç Akışı</div>
              <div className="space-y-1">
                {shownEvents.map((e, i) => {
                  const isHome = e.team === "home" || e.side === "home";
                  const icon = e.type === "goal" ? "⚽" : e.type === "yellow" ? "🟨" : e.type === "red" ? "🟥" : e.type === "sub" ? "🔄" : e.type === "injury" ? "🤕" : e.type === "chance" ? "🔥" : e.type === "foul" ? "⚙️" : e.type === "shot_wide" ? "❌" : e.type === "shot_post" ? "🎯" : e.type === "shot_saved" ? "🧤" : e.type === "corner" ? "🚩" : e.type === "offside" ? "🚩" : e.type === "penalty" ? "⚡" : e.type === "free_kick" ? "🎯" : "📋";
                  const teamShort = isHome ? homeTeam.shortName : e.team === "away" || e.side === "away" ? awayTeam.shortName : "";
                  const playerName = (e as any).player || (e as any).playerName || "";
                  const labels: Record<string, string> = {
                    goal: `GOL! ${playerName}`,
                    yellow_card: `${playerName} sarı kart`,
                    red_card: `${playerName} kırmızı kart`,
                    injury: `${playerName} sakatlandı`,
                    substitution: `${playerName} oyuna girdi`,
                    foul: `Faul — ${playerName}`,
                    corner: `Korner — ${teamShort}`,
                    shot_saved: `Kurtarış — ${playerName}`,
                    shot_wide: `Iska — ${playerName}`,
                    shot_post: `Direk! — ${playerName}`,
                    penalty: `Penaltı — ${teamShort}`,
                    offside: `Ofsayt — ${playerName}`,
                    free_kick: `Serbest vuruş — ${teamShort}`,
                    chance: `Fırsat — ${playerName}`,
                    tackle: `Müdahale — ${playerName}`,
                    interception: `Top kesişti — ${playerName}`,
                    var_review: `VAR incelemesi`,
                    goal_overturned: `Gol iptal!`,
                  };
                  const text = labels[e.type] || (e as any).description || playerName || e.type;
                  return (
                    <div key={i} className={cn("flex items-center gap-1.5 text-[9px]", !isHome && "flex-row-reverse text-right")}>
                      <span className="font-bold tabular-nums text-muted-foreground w-7">{e.minute}'</span>
                      <span>{icon}</span>
                      <span className="text-muted-foreground flex-1 truncate">{text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {sortedEvents.length === 0 && goals.length === 0 && (
            <div className="tm-card p-4 text-center text-xs text-muted-foreground">
              Bu maç için detaylı olay verisi bulunmuyor.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
