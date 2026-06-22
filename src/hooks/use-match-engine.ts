"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  simulateEnhancedMatch,
  type EnhancedMatchResult,
  type EnhancedMatchEvent,
  type MatchEnginePlayer,
} from "@/lib/match/engine";
import type { Player, Team } from "@/lib/mock/data";

const TICK_MS = 800; // 1 oyun dakikası = 800ms

/**
 * İlk 11'i formasyon bazlı seçer (1 GK + 4 DEF + 4 MID + 2 FWD).
 * Pozisyon gruplarına göre en yüksek OVR'li oyuncuları alır.
 */
function pickStartingXI(players: Player[]): Player[] {
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const gk = sorted.filter((p) => p.specificPosition === "GK").slice(0, 1);
  const def = sorted
    .filter((p) => ["CB", "LB", "RB", "LWB", "RWB"].includes(p.specificPosition))
    .slice(0, 4);
  const mid = sorted
    .filter((p) => ["CDM", "CM", "CAM", "LM", "RM"].includes(p.specificPosition))
    .slice(0, 4);
  const fwd = sorted
    .filter((p) => ["LW", "RW", "ST", "CF"].includes(p.specificPosition))
    .slice(0, 2);
  return [...gk, ...def, ...mid, ...fwd];
}

/**
 * Yeni maç motoru hook'u.
 *
 * Eski hook tick-by-tick simülasyon yapardı. Yeni motor (enhancedMatchEngine)
 * tüm maç'ı tek seferde simüle eder (pure function). Biz de event'leri
 * 800ms aralıkla kullanıcıya gösteririz — canlı yayın efekti.
 *
 * Akış:
 * 1. start() → simulateEnhancedMatch çağrılır, tüm sonuç kaydedilir
 * 2. Her 800ms'de bir sonraki event gösterilir
 * 3. 90. dakikada tüm event'ler gösterilince finished olur
 */

// Motorun Player tipi ile bizim Player tipimiz aynı şemayı paylaşır
// ama TypeScript ayrı tipler olarak görür. Cast yapacağız.
type AnyPlayer = MatchEnginePlayer & Player;

export type MatchStatus = "idle" | "live" | "paused" | "finished";

export type LiveMatchState = {
  status: MatchStatus;
  minute: number;
  homeScore: number;
  awayScore: number;
  events: EnhancedMatchEvent[]; // gösterilen event'ler (en yeni üstte)
  stats: {
    possession: [number, number];
    shotsOnTarget: [number, number];
    corners: [number, number];
    fouls: [number, number];
  };
  referee: { name: string; personality: string };
  weather: string;
  motmPlayerId?: string;
  playerRatings: Record<string, number>;
  playerMatchStats: Record<
    string,
    { goals: number; assists: number; yellow: number; red: number }
  >;
  subsUsed: { home: number; away: number };
};

export function useMatchEngine(home: Team, away: Team, locale: "tr" | "en") {
  // Tam simülasyon sonucu (start çağrılınca doluyor)
  const fullResultRef = useRef<EnhancedMatchResult | null>(null);
  // Kaçıncı event'e kadar gösterdiğimiz
  const eventCursorRef = useRef(0);

  const [snapshot, setSnapshot] = useState<LiveMatchState>(() => ({
    status: "idle",
    minute: 0,
    homeScore: 0,
    awayScore: 0,
    events: [],
    stats: { possession: [50, 50], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0] },
    referee: { name: "", personality: "balanced" },
    weather: "sunny",
    playerRatings: {},
    playerMatchStats: {},
    subsUsed: { home: 0, away: 0 },
  }));

  const [isReplaying, setIsReplaying] = useState(false);
  const [replayIdx, setReplayIdx] = useState(0);
  const [replayEvents, setReplayEvents] = useState<EnhancedMatchEvent[]>([]);

  // Tüm event'leri dakikaya göre sırala (en küçük dakika önce)
  const sortedEvents = useCallback((events: EnhancedMatchEvent[]) => {
    return [...events].sort((a, b) => a.minute - b.minute);
  }, []);

  // State'i cursor'a kadar güncelle
  const syncToCursor = useCallback(() => {
    const result = fullResultRef.current;
    if (!result) return;
    const cursor = eventCursorRef.current;
    const allEvents = sortedEvents(result.events);
    const shownEvents = allEvents.slice(0, cursor);

    // Gösterilen event'lerden score/stats hesapla
    let homeScore = 0;
    let awayScore = 0;
    let shotsHome = 0;
    let shotsAway = 0;
    let cornersHome = 0;
    let cornersAway = 0;
    let foulsHome = 0;
    let foulsAway = 0;
    const playerStats: Record<string, { goals: number; assists: number; yellow: number; red: number }> = {};

    for (const ev of shownEvents) {
      if (ev.type === "goal") {
        if (ev.team === "home") homeScore++;
        else awayScore++;
        shotsHome += ev.team === "home" ? 1 : 0;
        shotsAway += ev.team === "away" ? 1 : 0;
        if (ev.playerId) {
          if (!playerStats[ev.playerId]) playerStats[ev.playerId] = { goals: 0, assists: 0, yellow: 0, red: 0 };
          playerStats[ev.playerId].goals++;
        }
        if (ev.assistPlayerId) {
          if (!playerStats[ev.assistPlayerId]) playerStats[ev.assistPlayerId] = { goals: 0, assists: 0, yellow: 0, red: 0 };
          playerStats[ev.assistPlayerId].assists++;
        }
      } else if (ev.type === "yellow_card") {
        if (ev.playerId) {
          if (!playerStats[ev.playerId]) playerStats[ev.playerId] = { goals: 0, assists: 0, yellow: 0, red: 0 };
          playerStats[ev.playerId].yellow++;
        }
        if (ev.team === "home") foulsHome++;
        else foulsAway++;
      } else if (ev.type === "red_card") {
        if (ev.playerId) {
          if (!playerStats[ev.playerId]) playerStats[ev.playerId] = { goals: 0, assists: 0, yellow: 0, red: 0 };
          playerStats[ev.playerId].red++;
        }
        if (ev.team === "home") foulsHome++;
        else foulsAway++;
      } else if (ev.type === "corner") {
        if (ev.team === "home") cornersHome++;
        else cornersAway++;
      } else if (ev.type === "foul") {
        if (ev.team === "home") foulsHome++;
        else foulsAway++;
      }
    }

    const lastMinute = shownEvents.length > 0 ? shownEvents[shownEvents.length - 1].minute : 0;

    setSnapshot({
      status: eventCursorRef.current >= allEvents.length ? "finished" : "live",
      minute: Math.max(lastMinute, cursor === 0 ? 0 : 1),
      homeScore,
      awayScore,
      events: [...shownEvents].reverse(), // en yeni üstte
      stats: {
        possession: [result.homePossession, result.awayPossession],
        shotsOnTarget: [shotsHome, shotsAway],
        corners: [cornersHome, cornersAway],
        fouls: [foulsHome, foulsAway],
      },
      referee: {
        name: result.refereeName ?? "",
        personality: result.refereePersonality ?? "balanced",
      },
      weather: result.weather,
      motmPlayerId: result.manOfTheMatch,
      playerRatings: Object.fromEntries(
        [...result.homePlayerRatings, ...result.awayPlayerRatings].map((r) => [r.playerId, r.rating])
      ),
      playerMatchStats: playerStats,
      subsUsed: snapshot.subsUsed ?? { home: 0, away: 0 },
    });
  }, [sortedEvents, snapshot.subsUsed]);

  const start = useCallback(() => {
    if (snapshot.status === "finished") return;

    // İlk başlatma — tüm maç'ı simüle et
    if (!fullResultRef.current) {
      // İlk 11'i formasyon bazlı seç (1 GK + 4 DEF + 4 MID + 2 FWD)
      const homeSquad = pickStartingXI(home.players) as unknown as MatchEnginePlayer[];
      const awaySquad = pickStartingXI(away.players) as unknown as MatchEnginePlayer[];

      // Basit taktikler — motorun ActiveTactic şemasına uygun
      const homeTactic = {
        formation: "4-4-2",
        tactic_type: "4-4-2",
        mentality: 3,
        pressing: false,
        passingStyle: "Karışık",
        intensity: "normal" as const,
        aggression: 50,
        width: 50,
        passingIntensity: 50,
        lineHeight: 50,
        screenKeeper: false,
        wasteTime: false,
        parkTheBus: false,
        crossGame: false,
        loneStrikerCounter: false,
        offsideTrap: false,
        playStyle: "balanced",
      };
      const awayTactic = { ...homeTactic };

      const result = simulateEnhancedMatch(
        homeSquad,
        awaySquad,
        homeTactic as any,
        awayTactic as any,
        {
          homeTeamName: home.name,
          awayTeamName: away.name,
        }
      );
      fullResultRef.current = result;
      eventCursorRef.current = 0;
    }

    setSnapshot((s) => ({ ...s, status: "live" }));
  }, [snapshot.status, home, away]);

  const pause = useCallback(() => {
    setSnapshot((s) => (s.status === "live" ? { ...s, status: "paused" } : s));
  }, []);

  const reset = useCallback(() => {
    fullResultRef.current = null;
    eventCursorRef.current = 0;
    setIsReplaying(false);
    setReplayIdx(0);
    setReplayEvents([]);
    setSnapshot({
      status: "idle",
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      events: [],
      stats: { possession: [50, 50], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0] },
      referee: { name: "", personality: "balanced" },
      weather: "sunny",
      playerRatings: {},
      playerMatchStats: {},
      subsUsed: { home: 0, away: 0 },
    });
  }, []);

  // Tick interval — her 800ms'de bir event göster
  useEffect(() => {
    if (snapshot.status !== "live") return;
    const id = setInterval(() => {
      const result = fullResultRef.current;
      if (!result) return;
      const allEvents = sortedEvents(result.events);
      if (eventCursorRef.current >= allEvents.length) {
        // Tüm event'ler gösterildi — bitir
        setSnapshot((s) => ({ ...s, status: "finished" }));
        clearInterval(id);
        return;
      }
      eventCursorRef.current += 1;
      syncToCursor();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [snapshot.status, sortedEvents, syncToCursor]);

  // Taktik değişikliği — motor zaten simüle edildi, sadece event ekle
  const applyTactics = useCallback((_side: "home" | "away", _newTactics: unknown) => {
    // Yeni motor tüm maç'ı simüle ettiği için taktik değişikliği olayı ekle
    const result = fullResultRef.current;
    if (!result) return;
    const tacticEvent: EnhancedMatchEvent = {
      minute: snapshot.minute,
      type: "foul", // tactic yerine foul kullanıyoruz (geçici)
      team: _side,
      playerName: "Taktik Değişikliği",
      playerId: "",
      description: `Taktik değişikliği — formasyon ${(_newTactics as any)?.formation ?? "4-4-2"}`,
      x: 50,
      y: 50,
      ratingImpact: 0,
    };
    result.events.push(tacticEvent);
    syncToCursor();
  }, [snapshot.minute, syncToCursor]);

  // Oyuncu değişikliği — event ekle
  const makeSub = useCallback(
    (_side: "home" | "away", outPlayer: Player, inPlayer: Player): boolean => {
      const result = fullResultRef.current;
      if (!result) return false;
      if ((snapshot.subsUsed[_side] ?? 0) >= 5) return false;
      const subEvent: EnhancedMatchEvent = {
        minute: snapshot.minute,
        type: "substitution",
        team: _side,
        playerName: `${outPlayer.firstName} ${outPlayer.lastName} ➜ ${inPlayer.firstName} ${inPlayer.lastName}`,
        playerId: inPlayer.id,
        description: `Oyuncu değişikliği: ${outPlayer.firstName} ${outPlayer.lastName} ➜ ${inPlayer.firstName} ${inPlayer.lastName}`,
        x: 50,
        y: 50,
        ratingImpact: 0,
      };
      result.events.push(subEvent);
      // subsUsed'i artır
      setSnapshot((s) => ({
        ...s,
        subsUsed: {
          ...s.subsUsed,
          [_side]: (s.subsUsed[_side] ?? 0) + 1,
        },
      }));
      return true;
    },
    [snapshot.minute, snapshot.subsUsed]
  );

  // Replay — 3× hız
  const startReplay = useCallback(() => {
    if (!fullResultRef.current) return;
    setReplayEvents(sortedEvents(fullResultRef.current.events));
    setReplayIdx(0);
    setIsReplaying(true);
  }, [sortedEvents]);

  useEffect(() => {
    if (!isReplaying) return;
    if (replayIdx >= replayEvents.length) {
      setTimeout(() => {
        setIsReplaying(false);
        setReplayIdx(0);
      }, TICK_MS / 3);
      return;
    }
    const id = setTimeout(() => {
      setReplayIdx((i) => i + 1);
    }, TICK_MS / 3);
    return () => clearTimeout(id);
  }, [isReplaying, replayIdx, replayEvents.length]);

  const stopReplay = useCallback(() => {
    setIsReplaying(false);
    setReplayIdx(0);
  }, []);

  return {
    state: snapshot,
    home,
    away,
    tactics: {
      home: { formation: "4-4-2", pressing: 60, defensiveLine: 50, tempo: 60, width: 60 },
      away: { formation: "4-4-2", pressing: 55, defensiveLine: 55, tempo: 55, width: 55 },
    },
    start,
    pause,
    reset,
    applyTactics,
    makeSub,
    replay: {
      active: isReplaying,
      events: replayEvents.slice(0, replayIdx),
      start: startReplay,
      stop: stopReplay,
      progress: replayEvents.length > 0 ? replayIdx / replayEvents.length : 0,
    },
  };
}
