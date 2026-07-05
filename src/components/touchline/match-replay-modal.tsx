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

  // Maç sonucu — stored score kullan (re-simülasyon YOK)
  // Sorun: eskiden simulateEnhancedMatch yeniden çağrılıyordu, farklı skor çıkıyordu
  // Çözüm: homeScore/awayScore prop'ları varsa direkt kullan, event'leri skordan üret
  const result = useMemo<MatchResult | null>(() => {
    try {
      const homeXI = [...homeTeam.players].sort((a, b) => b.rating - a.rating).slice(0, 11);
      const awayXI = [...awayTeam.players].sort((a, b) => b.rating - a.rating).slice(0, 11);

      // Stored score varsa re-simülasyon yapma — event'leri skordan üret
      if (homeScore != null && awayScore != null) {
        const events: any[] = [];
        const playerRatings: Record<string, number> = {};

        const pickScorer = (squad: any[]) => {
          const attackers = squad.filter(p => ["ST", "CF", "LW", "RW", "LM", "RM", "CAM", "CM"].includes(p.specificPosition));
          const pool = attackers.length > 0 ? attackers : squad;
          return pool[Math.floor(Math.random() * pool.length)];
        };

        for (let i = 0; i < homeScore; i++) {
          const scorer = pickScorer(homeXI);
          const minute = Math.floor(Math.random() * 90) + 1;
          const assistPool = homeXI.filter(p => p.id !== scorer?.id);
          const assister = assistPool.length > 0 && Math.random() > 0.4
            ? assistPool[Math.floor(Math.random() * assistPool.length)] : null;
          events.push({
            minute, type: "goal", team: "home", side: "home",
            player: scorer ? `${scorer.firstName} ${scorer.lastName}` : "Bilinmiyor",
            playerId: scorer?.id, assistPlayerId: assister?.id,
          });
          if (scorer) playerRatings[scorer.id] = 7 + Math.random() * 2;
        }

        for (let i = 0; i < awayScore; i++) {
          const scorer = pickScorer(awayXI);
          const minute = Math.floor(Math.random() * 90) + 1;
          const assistPool = awayXI.filter(p => p.id !== scorer?.id);
          const assister = assistPool.length > 0 && Math.random() > 0.4
            ? assistPool[Math.floor(Math.random() * assistPool.length)] : null;
          events.push({
            minute, type: "goal", team: "away", side: "away",
            player: scorer ? `${scorer.firstName} ${scorer.lastName}` : "Bilinmiyor",
            playerId: scorer?.id, assistPlayerId: assister?.id,
          });
          if (scorer) playerRatings[scorer.id] = 7 + Math.random() * 2;
        }

        // Kart event'leri
        const cardCount = Math.floor(Math.random() * 3);
        for (let i = 0; i < cardCount; i++) {
          const isHome = Math.random() > 0.5;
          const squad = isHome ? homeXI : awayXI;
          const player = squad[Math.floor(Math.random() * squad.length)];
          if (player) {
            events.push({
              minute: Math.floor(Math.random() * 90) + 1,
              type: "yellow_card", team: isHome ? "home" : "away",
              player: `${player.firstName} ${player.lastName}`, playerId: player.id,
            });
          }
        }

        events.sort((a, b) => a.minute - b.minute);

        // MOTM
        const homeWon = homeScore > awayScore;
        const motmPool = homeWon ? homeXI : awayScore > homeScore ? awayXI : [...homeXI, ...awayXI];
        const motm = motmPool.sort((a, b) => b.rating - a.rating)[0];

        // Stats
        const homeStr = homeXI.reduce((s, p) => s + p.rating, 0) / 11;
        const awayStr = awayXI.reduce((s, p) => s + p.rating, 0) / 11;
        const homePoss = Math.round((homeStr / (homeStr + awayStr)) * 100);

        return {
          homeScore, awayScore, events,
          motmPlayerId: motm?.id, playerRatings,
          homePlayerRatings: [], awayPlayerRatings: [],
          stats: {
            possession: [homePoss, 100 - homePoss],
            shotsOnTarget: [homeScore + Math.floor(Math.random() * 3), awayScore + Math.floor(Math.random() * 3)],
            corners: [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)],
            fouls: [Math.floor(Math.random() * 8) + 2, Math.floor(Math.random() * 8) + 2],
          },
        };
      }

      // Stored score YOK — simüle et (pre-match preview)
      const res = simulateEnhancedMatch(
        homeXI as any, awayXI as any,
        { ...DEFAULT_TACTIC, formation: "4-4-2" } as any,
        { ...DEFAULT_TACTIC, formation: "4-4-2" } as any,
        { homeTeamName: homeTeam.name, awayTeamName: awayTeam.name } as any
      );
      return {
        homeScore: res.homeScore, awayScore: res.awayScore,
        events: (res.events || []).sort((a: any, b: any) => a.minute - b.minute),
        motmPlayerId: res.manOfTheMatch, playerRatings: {},
        homePlayerRatings: [], awayPlayerRatings: [],
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
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center">
      <div className="absolute inset-0 bg-black/90" onClick={onClose} />

      <div className="relative w-full max-w-[440px] bg-background h-screen flex flex-col overflow-hidden">
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

          {/* Maç öncesi spiker */}
          {watching && visibleCount === 0 && (
            <div className="tm-card p-3 bg-amber-500/10 border-amber-500/30">
              <div className="text-[10px] font-bold text-amber-300 mb-1">🎙️ Maç Başlıyor!</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                {homeTeam.name} sahasında {awayTeam.name} konuk ediyor. Stadyum dopdolu! Hakem düdüğü çaldı, maç başladı!
              </p>
            </div>
          )}

          {/* Devre arası */}
          {watching && shownEvents.some((e) => e.minute > 45) && !shownEvents.some((e, idx) => idx >= visibleCount - 1 && e.minute <= 45) && shownEvents.some((e) => e.minute <= 45) && shownEvents.filter((e) => e.minute > 45).length > 0 && visibleCount === shownEvents.filter((e) => e.minute <= 45).length && (
            <div className="tm-card p-3 bg-sky-500/10 border-sky-500/30">
              <div className="text-[10px] font-bold text-sky-300 mb-1">⏸️ Devre Arası</div>
              <p className="text-[10px] leading-relaxed text-muted-foreground">
                İlk yarı sona erdi. {homeTeam.name} {currentScore.home} - {currentScore.away} {awayTeam.name}. {currentScore.home > currentScore.away ? "Ev sahibi üstün." : currentScore.home < currentScore.away ? "Deplasman önde." : "Beraberlik."}
              </p>
            </div>
          )}

          {/* Olay zaman çizelgesi — izlerken yavaş yavaş akar */}
          {shownEvents.length > 0 && (
            <div className="tm-card p-3">
              <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">Maç Akışı</div>
              <div className="space-y-1.5">
                {shownEvents.map((e, i) => {
                  const isHome = e.team === "home" || e.side === "home";
                  const teamShort = isHome ? homeTeam.shortName : (e.team === "away" || e.side === "away") ? awayTeam.shortName : "";
                  const teamName = isHome ? homeTeam.name : (e.team === "away" || e.side === "away") ? awayTeam.name : "";
                  const playerName = (e as any).player || (e as any).playerName || "";

                  // Detaylı spiker metni — her tip için zengin açıklama
                  const commentary = getDetailedCommentary(e, playerName, teamShort, teamName, isHome);
                  const icon = getEventIcon(e.type);
                  const isGoal = e.type === "goal";
                  const isCard = e.type === "yellow_card" || e.type === "yellow" || e.type === "red_card" || e.type === "red";
                  const isInjury = e.type === "injury";

                  return (
                    <div key={i} className={cn(
                      "flex items-start gap-2 p-1.5 rounded text-[10px] leading-snug transition-all",
                      isGoal && "bg-emerald-500/10 border-l-2 border-emerald-500",
                      isCard && "bg-amber-500/5 border-l-2 border-amber-500",
                      isInjury && "bg-orange-500/5 border-l-2 border-orange-500",
                      !isGoal && !isCard && !isInjury && "border-l-2 border-transparent"
                    )}>
                      <span className="font-bold tabular-nums text-muted-foreground w-7 shrink-0 mt-0.5">{e.minute > 90 ? `90+${e.minute - 90}'` : `${e.minute}'`}</span>
                      <span className="text-sm shrink-0">{icon}</span>
                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          "font-semibold",
                          isGoal && "text-emerald-300",
                          isCard && "text-amber-300",
                          isInjury && "text-orange-300",
                          !isGoal && !isCard && !isInjury && "text-muted-foreground"
                        )}>{commentary.title}</span>
                        <p className="text-[9px] text-muted-foreground/70 mt-0.5 leading-tight">{commentary.detail}</p>
                      </div>
                      {teamShort && (
                        <span className={cn("text-[8px] px-1 py-0.5 rounded font-bold shrink-0", isHome ? "bg-emerald-500/20 text-emerald-300" : "bg-sky-500/20 text-sky-300")}>{teamShort}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Maç sonu spiker — zengin hikaye anlatımı */}
          {watching && visibleCount >= sortedEvents.length && sortedEvents.length > 0 && (
            <div className="space-y-2">
              {/* Maç sonu özet */}
              <div className="tm-card p-3 bg-emerald-500/10 border-emerald-500/30">
                <div className="text-[10px] font-bold text-emerald-300 mb-1.5">🏁 Maç Sona Erdi</div>
                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  {getMatchSummary(finalScore.home, finalScore.away, homeTeam.name, awayTeam.name, sortedEvents)}
                </p>
              </div>

              {/* Maçın Adamı açıklaması */}
              {motm && (
                <div className="tm-card p-3 bg-amber-500/10 border-amber-500/30">
                  <div className="text-[10px] font-bold text-amber-300 mb-1.5">⭐ Maçın Adamı</div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full text-[10px] font-bold text-white shrink-0"
                      style={{ background: homeTeam.players.some((p) => p.id === motm.id) ? homeTeam.primaryColor : awayTeam.primaryColor }}>
                      {motm.specificPosition}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-bold truncate">{motm.firstName} {motm.lastName}</div>
                      <div className="text-[9px] text-muted-foreground">{motm.specificPosition} · {homeTeam.players.some((p) => p.id === motm.id) ? homeTeam.name : awayTeam.name}</div>
                    </div>
                    <div className="text-lg font-bold tabular-nums text-amber-300">{(displayScore as any).playerRatings?.[motm.id]?.toFixed(1) ?? "8.0"}</div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-muted-foreground/80">
                    {getMotmCommentary(motm.firstName, motm.lastName, motm.specificPosition, finalScore.home, finalScore.away, sortedEvents, homeTeam.players.some((p) => p.id === motm.id))}
                  </p>
                </div>
              )}

              {/* İstatistik özeti */}
              <div className="tm-card p-3">
                <div className="text-[10px] text-muted-foreground uppercase font-bold mb-2">📊 Maç Notları</div>
                <div className="space-y-1 text-[10px] text-muted-foreground">
                  {(() => {
                    const totalGoals = sortedEvents.filter((e) => e.type === "goal").length;
                    const totalCards = sortedEvents.filter((e) => ["yellow_card", "yellow", "red_card", "red"].includes(e.type)).length;
                    const totalChances = sortedEvents.filter((e) => e.type === "chance").length;
                    const totalSaves = sortedEvents.filter((e) => e.type === "shot_saved" || e.type === "save").length;
                    const totalFouls = sortedEvents.filter((e) => e.type === "foul").length;
                    const notes: string[] = [];
                    if (totalGoals >= 4) notes.push(`⚡ ${totalGoals} gollü bir maç! Taraftarlar bol eğlenceli bir maç izledi.`);
                    else if (totalGoals === 0) notes.push("🛡️ Kaleci günündeydi — gol yok, defans ağır bastı.");
                    else if (totalGoals <= 1) notes.push("🔒 Az gollü maç, defansif taktikler ağır bastı.");
                    if (totalCards >= 4) notes.push(`🟨 ${totalCards} kart gördü — sert ve gergin bir maçtı.`);
                    if (totalChances >= 5) notes.push(`🔥 ${totalChances} gol pozisyonu — bol fırsat var ama verim düşük.`);
                    if (totalSaves >= 3) notes.push(`🧤 Kaleciler parladı — ${totalSaves} kritik kurtarış.`);
                    if (totalFouls >= 6) notes.push(`⚠️ ${totalFouls} faul — oyun sık sık kesildi.`);
                    if (notes.length === 0) notes.push("Dengeli ve tempolu bir maçti. İki takım da mücadele etti.");
                    return notes.map((n, i) => <div key={i}>{n}</div>);
                  })()}
                </div>
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

// ===== Detaylı spiker metni üretici =====
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getEventIcon(type: string): string {
  const map: Record<string, string> = {
    goal: "⚽",
    yellow_card: "🟨",
    yellow: "🟨",
    red_card: "🟥",
    red: "🟥",
    injury: "🤕",
    substitution: "🔄",
    sub: "🔄",
    foul: "⚠️",
    corner: "🚩",
    shot_saved: "🧤",
    shot_wide: "❌",
    shot_post: "🎯",
    penalty: "⚡",
    offside: "🚩",
    free_kick: "🎯",
    chance: "🔥",
    tackle: "🛡️",
    interception: "✋",
    var_review: "📺",
    goal_overturned: "❌",
  };
  return map[type] ?? "📋";
}

function getDetailedCommentary(
  e: any,
  playerName: string,
  teamShort: string,
  teamName: string,
  isHome: boolean
): { title: string; detail: string } {
  const side = isHome ? "Ev sahibi" : "Deplasman";
  const sideShort = isHome ? "Ev" : "Dep";

  switch (e.type) {
    case "goal":
      return {
        title: pick([
          `GOL! ${playerName} ağları sarstı!`,
          `GOOOL! ${playerName} topu ağlara gönderdi!`,
          `Muhteşem gol! ${playerName} kaleyi buldu!`,
          `${playerName} ceza sahasında soğukkanlı! GOL!`,
        ]),
        detail: pick([
          `${teamName} öne geçti! Stadyum çalkalanıyor!`,
          `${side} takımı gole yaklaşmıştı, fırsatı değerlendirdi!`,
          `Kalecinin yapacak bir şeyi yoktu, çok yerinde bir vuruş.`,
          `Taraftarlar ayakta! ${teamShort} için kritik bir gol!`,
        ]),
      };
    case "yellow_card":
    case "yellow":
      return {
        title: `${playerName} sarı kart gördü`,
        detail: pick([
          `Hakem sert müdahale sonrası kartını çıkardı. ${side} oyuncusu uyarıldı.`,
          `Taktiksel faul diyebiliriz. ${playerName}risk aldı ve kartını aldı.`,
          `Hakem oyunu sıkı tutuyor. Bu kart ${teamShort} için riskli.`,
        ]),
      };
    case "red_card":
    case "red":
      return {
        title: `KIRMIZI KART! ${playerName} gönderildi!`,
        detail: pick([
          `${teamShort} 10 kişi kaldı! Maçın kaderi değişebilir.`,
          `Hakem tereddüt etmedi. ${playerName} doğrudan kırmızı kart.`,
          `${side} takımı için büyük darbe! Kalan dakikalar zor geçecek.`,
        ]),
      };
    case "injury":
      return {
        title: `${playerName} sakatlandı`,
        detail: pick([
          `Sağlık ekibi sahaya girdi. Durum ciddi görünüyor.`,
          `${playerName} yerde kaldı. Değişiklik gerekebilir.`,
          `Üzücü bir sakatlık. ${teamShort} forveti oyuna devam edemeyebilir.`,
        ]),
      };
    case "substitution":
    case "sub":
      return {
        title: `Oyuncu değişikliği: ${playerName}`,
        detail: pick([
          `${side} takımı taze kan istiyor. ${teamShort} oyunun kaderini değiştirmek istiyor.`,
          `Teknik direktör hamlesini yaptı. ${playerName} oyuna dahil oluyor.`,
          `Yorgun bacaklar çıkıyor, dinamik oyuncu giriyor.`,
        ]),
      };
    case "foul":
      return {
        title: `Faul — ${playerName}`,
        detail: pick([
          `Orta saha bölgesinde faul. Oyun kısa süre durdu.`,
          `${playerName} rakibini yere indirdi. Hakem düdük çaldı.`,
          `Savunma faulü. ${teamShort} serbest vuruşla başlayacak.`,
        ]),
      };
    case "corner":
      return {
        title: `Korner — ${teamShort}`,
        detail: pick([
          `${side} takımı köşe vuruşu kazandı. Tehlikeli bölge!`,
          `Kaleci topu kornere çeldi. ${teamShort} atağa kalkıyor.`,
          `Korner başlıyor. Ceza sahası doluyor!`,
        ]),
      };
    case "shot_saved":
      return {
        title: `Kaleci kurtardı! — ${playerName}`,
        detail: pick([
          `Şut çok güzeldi ama kaleci biraz daha iyiydi. Müthiş kurtarış!`,
          `${playerName} şutunu çıkardı. Bu pozisyon gol olabilirdi!`,
          `Kaleci uçtu ve topu kornere gönderdi. Maçın kurtarışı!`,
        ]),
      };
    case "shot_wide":
      return {
        title: `Iska geçti — ${playerName}`,
        detail: pick([
          `${playerName} topu auta gönderdi. Yakındı ama gol değildi.`,
          `Şut yan ağlarda. ${playerName}'in vuruşu biraz düzgün değildi.`,
          `İyi pozisyon ama son vuruş eksikti. Aut.`,
        ]),
      };
    case "shot_post":
      return {
        title: `DİREKTEN DÖNDÜ! — ${playerName}`,
        detail: pick([
          `İnanılmaz! Direk ${teamShort} için yıkıldı! Çok yaklaşmıştı!`,
          `${playerName} direği deldi ama gol olmadı. Şanssız!`,
          `Direk diyecek — bu pozisyonda gol beklenirdi.`,
        ]),
      };
    case "penalty":
      return {
        title: `PENALTI! — ${teamShort}`,
        detail: pick([
          `Hakem penaltı noktasını gösterdi! ${side} takımı için altın fırsat!`,
          `Ceza sahasında elle oynama! Penaltı kararı tartışmasız.`,
          `${teamShort} 11 metreden gol arıyor. Stadyum tutuluyor!`,
        ]),
      };
    case "offside":
      return {
        title: `Ofsayt — ${playerName}`,
        detail: pick([
          `Bayrak havada! ${playerName} bir adım erken başladı.`,
          `Savunma hattı çok iyi. Ofsayt tuzağı çalıştı.`,
          `Gol çizgisinde çok erken. Hakem bayrağını kaldırdı.`,
        ]),
      };
    case "free_kick":
      return {
        title: `Serbest vuruş — ${teamShort}`,
        detail: pick([
          `Tehlikeli bölgeden serbest vuruş. ${teamShort} için fırsat!`,
          `${side} takımı duvar örgüsü kuruyor. Geri sayım başladı.`,
          `Serbest vuruş ${teamShort} için. Kaleci hazır.`,
        ]),
      };
    case "chance":
      return {
        title: `Fırsat! — ${playerName}`,
        detail: pick([
          `${playerName} tehlikeli bir atak başlattı! Savunma geriliyor.`,
          `${side} takımı kaleye yaklaşıyor. Bu pozisyon gol olabilir!`,
          `${teamShort} hızlı hücum! ${playerName} topu taşıyor.`,
        ]),
      };
    case "tackle":
      return {
        title: `Müdahale — ${playerName}`,
        detail: pick([
          `Mükemmel bir müdahale! Topu kazandı ve atağı kesti.`,
          `${playerName} temiz bir tackle yaptı. Savunma direnci.`,
          `Sert ama düzgün müdahale. Oyun devam ediyor.`,
        ]),
      };
    case "interception":
      return {
        title: `Top kesişti — ${playerName}`,
        detail: pick([
          `${playerName} pas arasına girdi. ${teamShort} topu kazandı.`,
          `Savunma dikkatli! Pas kesildi, tehlike önlendi.`,
          `${side} takımı topu kaptı. Hızlı hücum başlayabilir.`,
        ]),
      };
    case "var_review":
      return {
        title: `VAR incelemesi`,
        detail: pick([
          `Hakem monitöre gidiyor. Stadyum bekliyor...`,
          `VAR çağrısı! Olası penaltı/kart durumu inceleniyor.`,
          `Kontroller yapılıyor. Karar bekleniyor.`,
        ]),
      };
    case "goal_overturned":
      return {
        title: `Gol iptal edildi!`,
        detail: pick([
          `VAR incelemesi sonrası gol iptal! Ofsayt tespit edildi.`,
          `İnceleme bitti — gol geçersiz sayıldı. Şanssızlık.`,
          `Hakem kararı verdi: gol yok! ${teamShort} hayal kırıklığı.`,
        ]),
      };
    default:
      return {
        title: (e as any).description || playerName || e.type,
        detail: "",
      };
  }
}

// ===== Maç sonu özeti — zengin hikaye anlatımı =====
function getMatchSummary(
  home: number, away: number,
  homeName: string, awayName: string,
  events: any[]
): string {
  const diff = home - away;
  const totalGoals = events.filter((e) => e.type === "goal").length;
  const totalCards = events.filter((e) => ["yellow_card", "yellow", "red_card", "red"].includes(e.type)).length;
  const winner = diff > 0 ? homeName : diff < 0 ? awayName : null;
  const loser = diff > 0 ? awayName : diff < 0 ? homeName : null;
  const winnerSide = diff > 0 ? "ev sahibi" : diff < 0 ? "deplasman" : "";

  // Çok çeşitli maç sonu özetleri
  if (diff > 3) {
    return pick([
      `${homeName} sahasında ${awayName}'i ${home}-${away} gibi ezici bir skorla mağlup etti! Ev sahibi adeta sahayı işgal etti, rakibine nefes aldırmadı. Bu galibiyet taraftarı coşturdu, lig iddiasını güçlendirdi. ${loser} için unutulması zor bir gece olacak.`,
      `Fark ${home}-${away}! ${homeName} sahasında adeta bir gösteri sergiledi. ${awayName} savunması çaresiz kaldı, her hücum golle sonuçlandı. ${winner} bu formu sürdürürse ligde durdurulamaz gibi görünüyor.`,
      `${home}-${away}! Stadyum gök gürültüsüyle inliyor. ${homeName} bu akşam futbolun tüm kurallarını koydu. ${awayName} teknik direktörü kenarda ne yapacağını şaşırmış halde. Bu kadar net bir üstünlük her gün görülmüyor.`,
    ]);
  }
  if (diff === 2 || diff === 3) {
    return pick([
      `${homeName} sahasında ${awayName}'i ${home}-${away} yendi. İlk yarıdan itibaren oyunun hakimiydi, gol fırsatlarını değerlendirmesini bildi. ${loser} mücadele etti ama bu akşam yetersizdi. ${winner} üç puanı fazlasıyla hak etti.`,
      `${home}-${away} sona eren maçta ${winner} ${winnerSide} avantajını iyi kullandı. İkinci yarıda tempoyu düşürmeden baskıyı sürdürdü ve farkı korudu. ${loser} için deplasmanda zor bir akşamdı.`,
      `Net bir ${home}-${away}. ${homeName} sahasında ${awayName}'e haddini bildirdi. İlk yarısı dengeli geçen maçın ikinci yarısında ev sahibi farkı koydu. ${winner} bu galibiyetle moral depoladı.`,
    ]);
  }
  if (diff === 1) {
    return pick([
      `Çekişmeli bir maçtı! ${homeName} sahasında ${awayName}'i ${home}-${away} mağlup etti. Fark tek golde kaldı ama ${winner} sahadan galip ayrılmayı başardı. ${loser} son dakikalarda eşitliği aradı ama bulamadı. Tribünler nefesini tuttu.`,
      `${home}-${away}! Kırılma anı tek goldü. ${winner} fırsatı değerlendirdi ve skoru korudu. ${loser} çok denedi, pozisyonlar buldu ama son vuruşta şans yüzüne gülmedi. Bu kadar dar bir fark her zaman çekişmeli bir maçın göstergesi.`,
      `Maç boyunca iki takım da üstünlük kurmak için mücadele etti. ${homeName} sahasında ${awayName}'e ${home}-${away} üstünlük kurdu. Tek golle ayrılmak her zaman risklidir ama bu akşam ${winner} dayandı.`,
    ]);
  }
  if (diff === 0) {
    return pick([
      `${home}-${away} beraberlik! İki takım da sahada varını yoğunu ortaya koydu ama kazanan çıkmadı. Beraberlik maçın gidişatına göre adil bir sonuç oldu. ${homeName} sahasında puan kaybetti, ${awayName} deplasmanda en azından yenilmedi.`,
      `Maç ${home}-${away} bitti. İlk yarıda ${homeName} üstün görünüyordu ama ${awayName} ikinci yarıda döndü. Beraberlik her iki tarafa da yetti. İki takım da bir gol daha atabilirdi ama kaleciler bu akşam parladı.`,
      `İki takımın da kazanabileceği bir maç ${home}-${away} beraberlikle sona erdi. Kimse risk almak istemedi, defansif oyun ağırlık kazandı. Bu bir puan her iki takım için de düşündürücü olabilir.`,
    ]);
  }
  if (diff === -1) {
    return pick([
      `${awayName} deplasmandan ${home}-${away} galibiyetle döndü! ${homeName} sahasında şaşırtıldı. Deplasman takımı soğukkanlıydı, fırsatı kaçırmadı. Ev sahibi tribünleri hayal kırıklığına uğradı.`,
      `${home}-${away}! ${awayName} deplasmanda ${homeName}'i devirdi. Tek gol yetti. ${homeName} baskı kurdu ama gol yolu bulamadı. ${winner} için değerli bir deplasman galibiyeti, ${loser} için ise evinde yas.`,
      `Sürpriz deplasman galibiyeti! ${awayName}, ${homeName}'in sahasından ${home}-${away} galip ayrıldı. Ev sahibi ilk yarısı baskın geçirmesine rağmen ikinci yarıda yıkıldı. ${winner} kontra ataklarla rakibi cezalandırdı.`,
    ]);
  }
  if (diff < -1) {
    return pick([
      `${awayName} deplasmanda ${homeName}'i ${away}-${home} gibi net bir skorla mağlup etti! ${homeName} sahasında perişan oldu. ${winner} için harika bir deplasman performansı, ${loser} için kabus gibi bir akşam.`,
      `Deplasmanda ${away}-${home}! ${awayName} ${homeName}'in sahasında şov yaptı. Savunma düzenli, hücum verimli, orta saha dominant. ${loser} hiçbir bölümde rakibine yaklaşamadı. Bu galibiyet ${winner}'in iddiasını güçlendiriyor.`,
      `${homeName} sahasında ${awayName}'e ${away}-${home} mağlup oldu. Ev sahibi için utanç verici bir sonuç. Taraftarlar futbolcuları yuhaladı. ${winner} ise deplasmanda adeta yürüyüş yaptı. Bu skoru kimse tahmin edemezdi.`,
    ]);
  }
  return `Maç ${home}-${away} sona erdi.`;
}

// ===== Maçın Adamı açıklaması =====
function getMotmCommentary(
  firstName: string, lastName: string,
  position: string,
  homeScore: number, awayScore: number,
  events: any[],
  isHome: boolean
): string {
  const fullName = `${firstName} ${lastName}`;
  const playerGoals = events.filter((e) => e.type === "goal" && ((e as any).player === fullName || (e as any).playerName === fullName)).length;
  const isGK = position === "GK";
  const isDef = ["CB", "LB", "RB", "LWB", "RWB"].includes(position);
  const isMid = ["CDM", "CM", "CAM", "LM", "RM"].includes(position);
  const isFwd = ["ST", "CF", "LW", "RW"].includes(position);

  if (isGK) {
    const saves = events.filter((e) => e.type === "shot_saved" || e.type === "save").length;
    return pick([
      `${fullName} kalede adeta duvar ördü! ${saves > 0 ? `${saves} kritik kurtarışa imza attı` : "tüm şutları uzaklaştırdı"}. Rakip forvetler onun karşısında çaresiz kaldı. ${homeScore === awayScore ? "Beraberliği büyük ölçüde ona borçlular." : "Takımının galibiyetinin mimarlarından biri oydu."}`,
      `Bu akşam kaleci ${fullName} show yaptı. Çıkışları timing'i, reflakesi her şeyi yerli yerindeydi. ${homeScore < awayScore ? "Mağlup olsalar bile o puan kurtaran bir performans sergiledi." : "Takımına güven aşılayan bir performans oldu."}`,
      `${fullName} bu akşam sahaya yalnız çıkmadı, sanki arkasında bir duvar vardı. Her pozisyonda doğru yerde, doğru zamanda. Maçın adamı seçimi tartışmasız.`,
    ]);
  }
  if (playerGoals >= 2) {
    return pick([
      `${fullName} bu akşam sahanın yıldızıydı! ${playerGoals} gol atarak takımını sırtladı. ${playerGoals === 3 ? "Hat-trick yaptı, taraftarlar onun adını haykırıyor!" : "Çok gollü bir performans sergiledi."} Bu performansı sürdürürse ligin en çok konuşulan ismi olacak.`,
      `${playerGoals} gol! ${fullName} ceza sahasında bir avcı gibi dolaştı. Her pozisyonu golle çevirdi, soğukkanlılığı dikkate değer. Rakip savunma onu durdurmak için elinden geleni yaptı ama başaramadı.`,
      `Multigollü performans! ${fullName} bu akşam tek başına maçı bitirdi. ${playerGoals} gol atarak takımını zafere taşıdı. Bu akşamki performansı sezonun en iyilerinden biri olabilir.`,
    ]);
  }
  if (playerGoals === 1) {
    return pick([
      `${fullName} bu akşam hem gol attı hem de takımına liderlik etti. ${position} mevkiinde mücadelesi, hava topu kazanımı ve oyun zekâsıyla fark yarattı. Golü sadece buzdağının görünen kısmıydı.`,
      `Gol atan isim ${fullName} ama katkısı sadece golle sınırlı değildi. Savunmada yardımcı oldu, hücumda topu taşıdı, taktik disiplini bozmadı. Tam takım oyuncusu performansı.`,
      `${fullName} golünü attı ama asıl etkisi oyunun tüm alanlarında hissedildi. ${position} olarak hem savunmaya hem hücuma katkı verdi. Bu tür oyuncular her takımda altın değerinde.`,
    ]);
  }
  if (isDef) {
    return pick([
      `${fullName} savunmada kaya gibi durdu! Rakip forvetler onun bölgesinden geçemedi. Top çalmaları, müdahale zamanlaması ve hava toplarındaki üstünlüğüyle takımının güvenliğini sağladı.`,
      `Defansif performansla maçın adamı! ${fullName} bu akşam neredeyse hiç hata yapmadı. Ofsayt tuzağı kurdu, kontra atakları kesti, sağlam savunma örgütledi. ${homeScore === awayScore ? "Beraberliği büyük ölçüde ona borçlular." : "Takımının sıfır çekmesinde pay sahibi."}`,
      `${fullName} savunmanın değişmez ismiydi. Top kayıplarını affetmedi, her tehlikeli pası kesti. Forvetlere hava topu bile bırakmadı. Bu akşam savunma sanatını sergiledi.`,
    ]);
  }
  if (isMid) {
    return pick([
      `${fullName} orta sahanın patronuydu! Top dağıtımı, oyun görüşü, pas isabeti... Her şeyi kusursuzdu. Takımının hücumlarını o organize etti, savunmaya da destek verdi. Tam bir box-to-box performans.`,
      `Orta saha motoru ${fullName} bu akşam durmak bilmedi. Koştu, mücadele etti, paslarıyla oyunu yönlendirdi. ${position === "CAM" ? "Yaratıcı paslarıyla sayısız fırsat yarattı." : position === "CDM" ? "Savunma önünde duvar gibi durdu." : "Hem defansa hem hücuma katkı verdi."}`,
      `${fullName}'in bu akşamki performansı orta saha ustalığının textbook örneğiydi. Pas ağının merkezindeydi, her topa ilk o ulaştı. Rakip orta sahayı etkisiz kıldı. Maçın adamı tam hak etti.`,
    ]);
  }
  if (isFwd) {
    return pick([
      `${fullName} forvet hattında rakip savunmanın kabusuydu. Topu ayağında tuttu, boş alan yarattı, takım arkadaşlarını oyuna dahil etti. ${playerGoals === 0 ? "Gol atamadı ama katkısı sayıyla ölçülemez." : "Golü de cabası."}`,
      `Forvet olarak ${fullName} bu akşam her şeyi yaptı. Pres yaptı, top kazandı, kanatları açtı. ${playerGoals === 0 ? "Gol yok ama asist ve yaratıcılık boldu." : "Golle de katkı verdi."} Rakip savunma onu durdurmak için 2-3 oyuncu kullandı, bu da diğer alanlarda boşluk yarattı.`,
      `${fullName} forvet hattında yalnız başına bir ordu gibi savaştı. Hava topları, çalım atışları, top tutma... Her şey tam kıvamındaydı. ${playerGoals === 0 ? "Skora yansımasa bile en etkili isimdi." : "Gol atarak şovu tamamladı."}`,
    ]);
  }
  return `${fullName} bu akşam takımının en etkili isimlerinden biriydi. ${position} mevkiinde mücadelesi ve oyun zekâsıyla öne çıktı. Maçın adamı seçimi tam hak edildi.`;
}
