"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  simulateEnhancedMatch,
  type EnhancedMatchResult,
  type EnhancedMatchEvent,
  type MatchEnginePlayer,
} from "@/lib/match/engine";
import type { Player, Team } from "@/lib/mock/data";
import { useAppStore } from "@/lib/store";
import { FORMATION_SLOTS, DEFAULT_TACTIC, TACTICAL_INSTRUCTIONS } from "@/lib/tactics/types";

const TICK_MS = 800; // 1 oyun dakikası = 800ms

/**
 * İlk 11'i formasyon bazlı seçer.
 * store.tactics.active.formation'a göre slot pozisyonlarını alır,
 * her slot için en uygun oyuncuyu seçer.
 */
function pickStartingXIByFormation(
  players: Player[],
  formation: string
): Player[] {
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const used = new Set<string>();
  const lineup: Player[] = [];

  for (const slotPos of slots) {
    // Önce tam pozisyon eşleşmesi ara
    let candidate = players
      .filter((p) => !used.has(p.id) && p.specificPosition === slotPos)
      .sort((a, b) => b.rating - a.rating)[0];

    // Yoksa aynı gruptan al
    if (!candidate) {
      const group = getGroup(slotPos);
      candidate = players
        .filter((p) => !used.has(p.id) && getGroup(p.specificPosition) === group)
        .sort((a, b) => b.rating - a.rating)[0];
    }

    // Hala yoksa en yüksek OVR'li boş oyuncu
    if (!candidate) {
      candidate = players
        .filter((p) => !used.has(p.id))
        .sort((a, b) => b.rating - a.rating)[0];
    }

    if (candidate) {
      used.add(candidate.id);
      lineup.push(candidate);
    }
  }

  return lineup;
}

function getGroup(pos: string): "GK" | "DEF" | "MID" | "FWD" {
  if (pos === "GK") return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(pos)) return "DEF";
  if (["CDM", "CM", "CAM", "LM", "RM"].includes(pos)) return "MID";
  return "FWD";
}

// 6 hakem kişiliği
const REFEREE_PERSONALITIES = ["strict", "balanced", "balanced", "lenient", "home_bias", "volatile", "var_lover"] as const;
const REFEREE_NAMES = [
  "Halil Umut Meler", "Cüneyt Çakır", "Fırat Aydınus", "Mete Kalkavan",
  "Mustafa Öğretmenoğlu", "Ali Palabıyık",
];
function pickRandomReferee(): string {
  return REFEREE_PERSONALITIES[Math.floor(Math.random() * REFEREE_PERSONALITIES.length)];
}
function pickRandomRefereeName(): string {
  return REFEREE_NAMES[Math.floor(Math.random() * REFEREE_NAMES.length)];
}

/**
 * activeInstructions'ı motorun beklediği homeTacticModifiers'a çevirir.
 * Her talimatın effects'i toplanır, hücum/savunma/kontra çarpanları hesaplanır.
 */
function computeInstructionModifiers(
  activeInstructions: Record<string, string>
): { goalMod: number; conceedMod: number; counterMod: number } {
  let goalMod = 0;
  let conceedMod = 0;
  let counterMod = 0;

  for (const [instName, selectedOption] of Object.entries(activeInstructions)) {
    const inst = TACTICAL_INSTRUCTIONS.find((i) => i.name === instName);
    if (!inst) continue;

    // Sadece "Evet" veya ilk opsiyon (örn "Yüksek", "Direkt", "Geniş") seçilmişse etkili
    const isFirstOption = selectedOption === inst.options[0];
    if (!isFirstOption) continue;

    // Effects'i kategorilere göre modifier'lara çevir
    for (const [effectKey, effectVal] of Object.entries(inst.effects)) {
      // Hücum efektleri
      if (["crossing_chance", "wide_attack", "central_attack", "dribbling_success",
           "long_shot_chance", "shot_volume", "clear_cut_chance", "early_cross_chance",
           "fast_break", "first_time_shot", "cutback_chance", "crossing_accuracy",
           "crossing_speed", "heading_opportunity", "goal_from_corner", "near_post_goal",
           "quick_goal_chance", "counter_attack", "patient_buildup"].includes(effectKey)) {
        goalMod += effectVal * 0.003;
      }
      // Savunma efektleri
      else if (["defensive_depth", "defensive_shape", "compact_defense", "formation_integrity",
                "possession_regain", "ball_recovery", "tackle_intensity", "set_piece_defense",
                "zonal_coverage", "man_marking_tightness", "offside_success"].includes(effectKey)) {
        conceedMod -= effectVal * 0.003;
      }
      // Risk / savunma zaafı
      else if (["defensive_risk", "through_ball_vuln", "interception_risk", "turnover_risk",
                "foul_risk", "counter_vuln", "defensive_vuln", "crowd_frustration"].includes(effectKey)) {
        conceedMod += effectVal * 0.003;
      }
      // Kontra
      else if (["counter_attack", "fast_break", "counter_vuln"].includes(effectKey)) {
        counterMod += effectVal * 0.003;
      }
      // Faul kazanma
      else if (["foul_won"].includes(effectKey)) {
        goalMod += effectVal * 0.002;
      }
      // Hava düellosu
      else if (["ariel_duel"].includes(effectKey)) {
        goalMod += effectVal * 0.002;
      }
    }
  }

  // Çarpanları sınırla
  return {
    goalMod: Math.max(-0.15, Math.min(0.15, goalMod)),
    conceedMod: Math.max(-0.15, Math.min(0.15, conceedMod)),
    counterMod: Math.max(-0.10, Math.min(0.10, counterMod)),
  };
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

export type MatchStatus = "idle" | "live" | "paused" | "halftime" | "finished";

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
  halftimeSecondsLeft?: number; // devre arası geri sayım (30 sn)
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
      // Store'dan kullanıcının taktiğini al (fallback: DEFAULT_TACTIC)
      const storeState = useAppStore.getState();
      const userTactic = storeState.tactics.active ?? DEFAULT_TACTIC;
      const formation = userTactic.formation || "4-4-2";

      // İlk 11'i formasyon bazlı seç
      const homeSquad = pickStartingXIByFormation(home.players, formation) as unknown as MatchEnginePlayer[];
      const awaySquad = pickStartingXIByFormation(away.players, "4-4-2") as unknown as MatchEnginePlayer[];

      // Kullanıcının taktiğini home için kullan, away için default
      const slotRoles = storeState.tactics.slotRoles;
      // playerRoles map'i oluştur: playerId → roleId
      const playerRoles: Record<string, string> = {};
      storeState.tactics.lineup.forEach((p, i) => {
        if (p && slotRoles[i]) {
          playerRoles[p.id] = slotRoles[i];
        }
      });
      const homeTactic = { ...userTactic, tactic_type: userTactic.formation, playerRoles };
      const awayTactic = {
        formation: "4-4-2",
        tactic_type: "4-4-2",
        mentality: 3 as const,
        pressing: false,
        passingStyle: "Karışık" as const,
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

      // Stadyum seviyelerini al (Yerleşke ekranından)
      const facilities = storeState.facilities;
      const stadiumLevel = facilities.levels.stadium;
      const pitchLevel = facilities.levels.pitch;
      // Atmosfer skoru — stadyum kapasitesine göre
      const atmosphereScore = Math.min(100, 40 + stadiumLevel * 6);

      // Pitch pass accuracy bonus (seviye 0 = 0, seviye 10 = +20%)
      const pitchPassBonus = pitchLevel > 0 ? pitchLevel * 0.02 : undefined;

      // Tactical instructions'ı motora modifier olarak çevir
      const homeTacticModifiers = computeInstructionModifiers(
        storeState.tactics.activeInstructions ?? {}
      );

      const result = simulateEnhancedMatch(
        homeSquad,
        awaySquad,
        homeTactic as any,
        awayTactic as any,
        {
          homeTeamName: home.name,
          awayTeamName: away.name,
          // Rastgele hakem kişiliği (6 tip)
          refereePersonality: pickRandomReferee() as any,
          refereeName: pickRandomRefereeName(),
          // Atmosfer (ev sahibi avantajı)
          atmosphereScore,
          // Pitch pass bonus (stadiumMatrix.getPitchPassAccuracyBonus)
          pitchPassBonus,
          // Tactical instructions (20 talimat → modifier)
          homeTacticModifiers,
        } as any
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

  // Maç sonrası oyuncu kondisyon/form/morale/sakatlık güncelle
  const applyPostMatchEffects = useCallback((result: EnhancedMatchResult) => {
    const store = useAppStore.getState();
    const teamId = store.myTeamId;
    if (!teamId) return;
    const clubs = [...store.clubs];
    const team = clubs.find((c) => c.id === teamId);
    if (!team) return;

    // Son 5 maçtan galibiyet serisi hesapla
    const fixtures = store.fixtures
      .filter((f) => f.played && (f.homeId === teamId || f.awayId === teamId))
      .sort((a, b) => b.matchday - a.matchday)
      .slice(0, 5);
    let streakBonus = 0;
    if (fixtures.length >= 2) {
      const results = fixtures.map((f) => {
        const isHome = f.homeId === teamId;
        const us = isHome ? f.homeScore : f.awayScore;
        const them = isHome ? f.awayScore : f.homeScore;
        return (us ?? 0) > (them ?? 0) ? "W" : (us ?? 0) < (them ?? 0) ? "L" : "D";
      });
      // Mevcut seri
      let streak = 0;
      const lastResult = results[0];
      for (const r of results) {
        if (r === lastResult) streak++;
        else break;
      }
      // 3+ galibiyet serisi: +2 ekstra moral
      if (lastResult === "W" && streak >= 3) streakBonus = 2;
      // 3+ mağlubiyet serisi: -2 ekstra moral cezası
      if (lastResult === "L" && streak >= 3) streakBonus = -2;
    }

    // Oyuncu ID → rating
    const ratingMap = new Map<string, number>();
    [...result.homePlayerRatings, ...result.awayPlayerRatings].forEach((r) => {
      ratingMap.set(r.playerId, r.rating);
    });

    // Sakat olan oyuncular
    const injuredIds = new Set<string>();
    for (const ev of result.events) {
      if (ev.type === "injury" && ev.playerId) {
        injuredIds.add(ev.playerId);
      }
    }

    const updatedPlayers = team.players.map((p) => {
      const matchRating = ratingMap.get(p.id);
      if (matchRating === undefined) return p;

      const condDrain = Math.floor(8 + Math.random() * 8 + (matchRating < 6 ? 4 : 0));
      const formChange = matchRating >= 6.5 ? 2 : matchRating < 5.5 ? -3 : 0;
      const isHome = result.homePlayerRatings.some((r) => r.playerId === p.id);
      const won = isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore;
      const lost = isHome ? result.homeScore < result.awayScore : result.awayScore < result.homeScore;
      const moraleChange = won ? 3 + streakBonus : lost ? -3 + streakBonus : 0;

      const newCond = Math.max(20, Math.min(100, p.cond - condDrain));
      const newForm = Math.max(30, Math.min(100, p.form + formChange));
      const newMorale = Math.max(20, Math.min(100, p.morale + moraleChange));

      const isInjured = injuredIds.has(p.id);
      const injury = isInjured
        ? { type: "light" as const, remaining_days: Math.floor(Math.random() * 14) + 3, severity: Math.floor(Math.random() * 5) + 1 }
        : p.injury;

      return {
        ...p,
        cond: newCond,
        condition: newCond,
        form: newForm,
        morale: newMorale,
        confidence: Math.max(30, Math.min(100, p.confidence + (won ? 2 : lost ? -2 : 0))),
        last_match_rating: matchRating,
        match_ratings: [...(p.match_ratings ?? []), matchRating].slice(-10),
        is_injured: isInjured,
        injury,
      };
    });

    const updatedTeam = { ...team, players: updatedPlayers };
    const updatedClubs = clubs.map((c) => (c.id === teamId ? updatedTeam : c));

    // MOTM ödul sayısını artır
    if (result.manOfTheMatch) {
      const motmClub = updatedClubs.find((c) => c.players.some((p) => p.id === result.manOfTheMatch));
      if (motmClub) {
        motmClub.players = motmClub.players.map((p) =>
          p.id === result.manOfTheMatch
            ? { ...p, motmAwards: (p.motmAwards ?? 0) + 1 }
            : p
        );
      }
    }

    useAppStore.setState({ clubs: updatedClubs });
  }, []);

  // Tick interval — her 800ms'de bir event göster
  useEffect(() => {
    if (snapshot.status !== "live") return;
    const id = setInterval(() => {
      const result = fullResultRef.current;
      if (!result) return;
      const allEvents = sortedEvents(result.events);

      // DEVRE ARASI: 45. dakikaya gelince 30 saniyelik pause
      const nextEvent = allEvents[eventCursorRef.current];
      if (nextEvent && nextEvent.minute > 45 && snapshot.minute <= 45) {
        // Devre arası başlat — 30 saniye geri sayım
        setSnapshot((s) => ({ ...s, status: "halftime", halftimeSecondsLeft: 30 }));
        clearInterval(id);
        return;
      }

      if (eventCursorRef.current >= allEvents.length) {
        // Tüm event'ler gösterildi — bitir + kondisyon/form güncelle + fikstür güncelle
        setSnapshot((s) => ({ ...s, status: "finished" }));
        applyPostMatchEffects(result);
        // Fikstüre sonucu yaz
        useAppStore.getState().recordMatchResult(
          home.id,
          away.id,
          result.homeScore,
          result.awayScore
        );
        clearInterval(id);
        return;
      }
      eventCursorRef.current += 1;
      syncToCursor();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [snapshot.status, snapshot.minute, sortedEvents, syncToCursor, applyPostMatchEffects]);

  // DEVRE ARASI geri sayım — 30 saniye sonra ikinci yarıya başla
  useEffect(() => {
    if (snapshot.status !== "halftime") return;
    const id = setInterval(() => {
      setSnapshot((s) => {
        if (s.halftimeSecondsLeft && s.halftimeSecondsLeft > 1) {
          return { ...s, halftimeSecondsLeft: s.halftimeSecondsLeft - 1 };
        }
        // Devre arası bitti — ikinci yarıya başla
        return { ...s, status: "live", halftimeSecondsLeft: undefined };
      });
    }, 1000);
    return () => clearInterval(id);
  }, [snapshot.status]);

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
