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
  "Selim Aydoğan", "Burak Yıldırımer", "Kaan Demirci", "Tolga Şahin",
  "Emre Karaca", "Onur Toprak", "Mert Yavuz", "Serkan Aksoy",
];
function pickRandomReferee(): string {
  return REFEREE_PERSONALITIES[Math.floor(Math.random() * REFEREE_PERSONALITIES.length)];
}
function pickRandomRefereeName(): string {
  return REFEREE_NAMES[Math.floor(Math.random() * REFEREE_NAMES.length)];
}

/**
 * activeInstructions'ı motorun beklediği TacticModifiers'a çevirir.
 * Tüm opsiyonlar (Yüksek/Normal/Düşük, Evet/Hayır, Açık/Kapalı) işlenir:
 *  - 3-lü opsiyonlarda ilk (örn "Yüksek") tam etki, ikinci ("Normal") 0.5x, üçüncü ("Düşük") ters yönde 0.5x
 *  - 2-li (Evet/Hayır) opsiyonlarda "Evet" tam etki, "Hayır" nötr
 *  - Evet/Hayır'da "Hayır" seçilince ilgili efekti ters yönde uygula (örn "Mücadeleye Gir → Hayır" = daha az tackle)
 */
function computeInstructionModifiers(
  activeInstructions: Record<string, string>
): {
  goalMod: number;
  conceedMod: number;
  counterMod: number;
  passAccMod: number;
  longBallMod: number;
  crossingMod: number;
  possessionMod: number;
  offsideSuccessMod: number;
  offsideRiskMod: number;
  gkSaveMod: number;
  defenseBonusMod: number;
  attackPenaltyMod: number;
  widthMod: number;
  tempoMod: number;
} {
  let goalMod = 0;
  let conceedMod = 0;
  let counterMod = 0;
  let passAccMod = 0;
  let longBallMod = 0;
  let crossingMod = 0;
  let possessionMod = 0;
  let offsideSuccessMod = 0;
  let offsideRiskMod = 0;
  let gkSaveMod = 0;
  let defenseBonusMod = 0;
  let attackPenaltyMod = 0;
  let widthMod = 0;
  let tempoMod = 0;

  // Effect key'leri kategoriye ayır
  const ATTACK_EFFECTS = new Set([
    "crossing_chance", "wide_attack", "central_attack", "dribbling_success",
    "long_shot_chance", "shot_volume", "clear_cut_chance", "early_cross_chance",
    "fast_break", "first_time_shot", "cutback_chance", "crossing_accuracy",
    "crossing_speed", "heading_opportunity", "goal_from_corner", "near_post_goal",
    "quick_goal_chance", "patient_buildup",
  ]);
  const DEFENSE_EFFECTS = new Set([
    "defensive_depth", "defensive_shape", "compact_defense", "formation_integrity",
    "possession_regain", "ball_recovery", "tackle_intensity", "set_piece_defense",
    "zonal_coverage", "man_marking_tightness", "offside_success",
  ]);
  const RISK_EFFECTS = new Set([
    "defensive_risk", "through_ball_vuln", "interception_risk", "turnover_risk",
    "foul_risk", "counter_vuln", "defensive_vuln", "crowd_frustration",
  ]);
  const COUNTER_EFFECTS = new Set(["counter_attack", "fast_break"]);
  const POSSESSION_EFFECTS = new Set(["possession_retention", "time_control", "patient_buildup"]);
  const PASS_ACC_EFFECTS = new Set(["pass_completion"]);
  const CROSS_EFFECTS = new Set(["crossing_chance", "crossing_accuracy", "crossing_speed", "early_cross_chance"]);
  const WIDTH_EFFECTS = new Set(["width_spread", "central_density", "wide_attack"]);
  const TEMPO_EFFECTS = new Set(["tempo_modifier"]);
  const STAMINA_EFFECTS = new Set(["stamina_drain"]);
  const OFFSIDE_EFFECTS = new Set(["offside_success", "offside_trap"]);
  const ARIEL_EFFECTS = new Set(["ariel_duel"]);
  const FOUL_WON_EFFECTS = new Set(["foul_won"]);

  for (const [instName, selectedOption] of Object.entries(activeInstructions)) {
    const inst = TACTICAL_INSTRUCTIONS.find((i) => i.name === instName);
    if (!inst) continue;
    if (!selectedOption) continue;

    // Opsiyon sayısına göre etki çarpanı hesapla
    const optCount = inst.options.length;
    const optIdx = inst.options.indexOf(selectedOption);
    if (optIdx < 0) continue;

    // 3-lü opsiyon (Yüksek/Normal/Düşük):
    //  - ilk (Yüksek) = 1.0
    //  - ikinci (Normal) = 0.0 (nötr)
    //  - üçüncü (Düşük) = -0.5 (ters yönde hafif)
    // 2-li opsiyon (Evet/Hayır):
    //  - ilk (Evet) = 1.0
    //  - ikinci (Hayır) = 0.0 (nötr — opsiyon kapalı demek)
    let effectMultiplier: number;
    if (optCount === 3) {
      if (optIdx === 0) effectMultiplier = 1.0;
      else if (optIdx === 1) effectMultiplier = 0.0; // Normal = nötr
      else effectMultiplier = -0.5; // Düşük = ters yönde hafif
    } else if (optCount === 2) {
      // Evet/Hayır — Evet (idx 0) tam etki, Hayır (idx 1) nötr
      effectMultiplier = optIdx === 0 ? 1.0 : 0.0;
    } else {
      // Bilinmeyen format — ilk opsiyon tam etki
      effectMultiplier = optIdx === 0 ? 1.0 : 0.0;
    }

    if (effectMultiplier === 0) continue;

    // Effects'i kategorilere göre modifier'lara çevir
    for (const [effectKey, effectVal] of Object.entries(inst.effects)) {
      const scaledVal = effectVal * effectMultiplier * 0.003;

      // Hücum efektleri
      if (ATTACK_EFFECTS.has(effectKey)) {
        goalMod += scaledVal;
        // Çapraz efektler
        if (CROSS_EFFECTS.has(effectKey)) crossingMod += scaledVal * 0.5;
        if (WIDTH_EFFECTS.has(effectKey)) widthMod += scaledVal * 0.3;
      }
      // Savunma efektleri
      else if (DEFENSE_EFFECTS.has(effectKey)) {
        conceedMod -= Math.abs(scaledVal);
        defenseBonusMod += Math.abs(scaledVal) * 0.5;
        if (OFFSIDE_EFFECTS.has(effectKey)) offsideSuccessMod += scaledVal * 0.5;
      }
      // Risk / savunma zaafı
      else if (RISK_EFFECTS.has(effectKey)) {
        conceedMod += Math.abs(scaledVal);
        if (effectKey === "through_ball_vuln" || effectKey === "counter_vuln") {
          offsideRiskMod += Math.abs(scaledVal) * 0.5;
        }
      }
      // Kontra
      else if (COUNTER_EFFECTS.has(effectKey)) {
        counterMod += scaledVal;
      }
      // Top tutma
      else if (POSSESSION_EFFECTS.has(effectKey)) {
        possessionMod += scaledVal;
      }
      // Pas isabeti
      else if (PASS_ACC_EFFECTS.has(effectKey)) {
        passAccMod += scaledVal;
      }
      // Tempo
      else if (TEMPO_EFFECTS.has(effectKey)) {
        tempoMod += scaledVal;
      }
      // Stamina drain (negatif etki)
      else if (STAMINA_EFFECTS.has(effectKey)) {
        // Yüksek tempo = yüksek stamina drain = küçük -goalMod (geç maç)
        if (effectMultiplier > 0) goalMod -= Math.abs(scaledVal) * 0.3;
      }
      // Hava düellosu
      else if (ARIEL_EFFECTS.has(effectKey)) {
        goalMod += scaledVal * 0.7;
      }
      // Faul kazanma
      else if (FOUL_WON_EFFECTS.has(effectKey)) {
        goalMod += scaledVal * 0.5;
      }
    }
  }

  // Çarpanları sınırla (aşırı stacklenmeyi önle)
  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
  return {
    goalMod: clamp(goalMod, -0.20, 0.20),
    conceedMod: clamp(conceedMod, -0.20, 0.20),
    counterMod: clamp(counterMod, -0.15, 0.15),
    passAccMod: clamp(passAccMod, -0.15, 0.15),
    longBallMod: clamp(longBallMod, -0.15, 0.15),
    crossingMod: clamp(crossingMod, -0.15, 0.15),
    possessionMod: clamp(possessionMod, -0.15, 0.15),
    offsideSuccessMod: clamp(offsideSuccessMod, -0.15, 0.15),
    offsideRiskMod: clamp(offsideRiskMod, -0.15, 0.15),
    gkSaveMod: clamp(gkSaveMod, -0.10, 0.10),
    defenseBonusMod: clamp(defenseBonusMod, -0.15, 0.15),
    attackPenaltyMod: clamp(attackPenaltyMod, -0.15, 0.15),
    widthMod: clamp(widthMod, -0.10, 0.10),
    tempoMod: clamp(tempoMod, -0.15, 0.15),
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

export function useMatchEngine(home: Team, away: Team, locale: "tr" | "en", isFriendly: boolean = false) {
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
      let atmosphereScore = Math.min(100, 40 + stadiumLevel * 6);

      // P6 FIX: İlk 5 takım maçı → seyirci yoğun ilgisi
      // Eğer kullanıcı ev sahibiyse ve rakip ilk 5'teyse, ya da kullanıcı ilk 5'teyse ve rakip de ilk 5'teyse
      // atmosfer skoru %30 artar (seyirci maça yoğun ilgi gösterir)
      try {
        const { computeStandings } = require("@/lib/mock/season");
        const standings = computeStandings(storeState.clubs, storeState.fixtures);
        const myPos = standings.findIndex((s: any) => s.teamId === home.id) + 1;
        const oppPos = standings.findIndex((s: any) => s.teamId === away.id) + 1;
        // Maçta en az biri ilk 5'teyse ve maç "büyük maç" sayılırsa
        const isBigMatch = (myPos > 0 && myPos <= 5) && (oppPos > 0 && oppPos <= 5);
        const isTopMatch = (myPos > 0 && myPos <= 5) || (oppPos > 0 && oppPos <= 5);
        if (isBigMatch) {
          // İki takım da ilk 5'te — çekişmeli maç, atmosfer maksimum
          atmosphereScore = Math.min(100, atmosphereScore + 30);
        } else if (isTopMatch) {
          // Sadece biri ilk 5'te — yine de yoğun ilgi
          atmosphereScore = Math.min(100, atmosphereScore + 15);
        }
      } catch (e) {
        // standings hesaplanamazsa varsayılan atmosfer skoru kullan
      }

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
          // P0#4 FIX: Taktik rollerini motora geçir — oyuncu attribute'larını boost eder
          homePlayerRoles: playerRoles,
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

    // P0#1 FIX: Event'lerden gol/asist/saves/kart sayılarını topla
    const matchStatsMap = new Map<string, {
      goals: number; assists: number; saves: number; shots: number; shotsOnTarget: number;
      passes: number; passesCompleted: number; tackles: number; interceptions: number;
      dribbles: number; dribblesCompleted: number; yellowCards: number; redCards: number;
      fouls: number; minutesPlayed: number;
      goalsRight: number; goalsLeft: number; goalsHead: number; goalsPenalty: number; goalsFreekick: number;
    }>();

    for (const ev of result.events) {
      const pid = (ev as any).playerId || (ev as any).player_id;
      const eType = (ev as any).type as string;
      if (!pid) continue;
      if (!matchStatsMap.has(pid)) {
        matchStatsMap.set(pid, {
          goals: 0, assists: 0, saves: 0, shots: 0, shotsOnTarget: 0,
          passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0,
          dribbles: 0, dribblesCompleted: 0, yellowCards: 0, redCards: 0,
          fouls: 0, minutesPlayed: 90,
          goalsRight: 0, goalsLeft: 0, goalsHead: 0, goalsPenalty: 0, goalsFreekick: 0,
        });
      }
      const s = matchStatsMap.get(pid)!;
      switch (eType) {
        case "goal": case "GOAL": case "PENALTY_GOAL":
          s.goals += 1; s.shotsOnTarget += 1; s.shots += 1;
          // Gol türünü topla
          const gt = (ev as any).goalType as string | undefined;
          if (gt === "header") s.goalsHead += 1;
          else if (gt === "penalty") s.goalsPenalty += 1;
          else if (gt === "freekick") s.goalsFreekick += 1;
          else if (gt === "long_shot" || gt === "sprint_finish" || gt === "postup_turn") s.goalsRight += 1;
          else s.goalsRight += 1; // varsayılan: sağ ayak
          const assistPid = (ev as any).assistPlayerId || (ev as any).assist_player_id;
          if (assistPid) {
            if (!matchStatsMap.has(assistPid)) {
              matchStatsMap.set(assistPid, { goals: 0, assists: 0, saves: 0, shots: 0, shotsOnTarget: 0, passes: 0, passesCompleted: 0, tackles: 0, interceptions: 0, dribbles: 0, dribblesCompleted: 0, yellowCards: 0, redCards: 0, fouls: 0, minutesPlayed: 90, goalsRight: 0, goalsLeft: 0, goalsHead: 0, goalsPenalty: 0, goalsFreekick: 0 });
            }
            matchStatsMap.get(assistPid)!.assists += 1;
          }
          break;
        case "shot_saved": case "shot_on_target": case "SAVE":
          s.shotsOnTarget += 1; s.shots += 1; break;
        case "shot_wide": case "shot_blocked": case "OWN_GOAL":
          s.shots += 1; break;
        case "save": s.saves += 1; break;
        case "yellow_card": case "yellow": case "YELLOW": case "SECOND_YELLOW":
          s.yellowCards += 1; s.fouls += 1; break;
        case "red_card": case "red": case "RED":
          s.redCards += 1; s.fouls += 1; break;
        case "foul": case "FOUL": s.fouls += 1; break;
        case "tackle": case "TACKLE": s.tackles += 1; break;
        case "interception": case "INTERCEPTION": s.interceptions += 1; break;
        case "dribble_attempt": case "DRIBBLE_ATTEMPT": s.dribbles += 1; break;
        case "dribble_success": case "DRIBBLE_SUCCESS": s.dribbles += 1; s.dribblesCompleted += 1; break;
        case "pass": case "PASS": s.passes += 1; break;
        case "pass_completed": case "PASS_COMPLETED": s.passes += 1; s.passesCompleted += 1; break;
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
      const injuryDuration = Math.floor(Math.random() * 14) + 3;
      const injurySeverity = Math.floor(Math.random() * 5) + 1;
      const injury = isInjured
        ? { type: "light" as const, remaining_days: injuryDuration, severity: injurySeverity }
        : p.injury;

      // P0#1 FIX: Sakatlık geçmişine kayıt ekle
      const updatedInjuryHistory = isInjured
        ? [...(p.injury_history ?? []), {
            date: new Date().toISOString().slice(0, 10),
            duration_days: injuryDuration,
            type: ["Hamstring", "Diz", "Bilek", "Kasık", "Sırt", "Omuz"][Math.floor(Math.random() * 6)],
          }]
        : p.injury_history;

      // P0#1 FIX: Maç stats'larını topla ve sezonluk accumulator'lara yaz
      const matchStats = matchStatsMap.get(p.id);
      const newMatchRatings = [...(p.match_ratings ?? []), matchRating].slice(-10);
      // formRating: son 5 maçın ortalaması
      const recentForm = newMatchRatings.slice(-5);
      const newFormRating = recentForm.length > 0
        ? Math.round((recentForm.reduce((s, r) => s + r, 0) / recentForm.length) * 10) / 10
        : p.formRating;

      // Form streak hesapla
      const hotCount = recentForm.filter(r => r >= 7).length;
      const coldCount = recentForm.filter(r => r < 5.5).length;
      let newFormStreak: "hot" | "cold" | "neutral" = "neutral";
      let newFormStreakCount = 0;
      if (hotCount >= 4) { newFormStreak = "hot"; newFormStreakCount = hotCount; }
      else if (coldCount >= 3) { newFormStreak = "cold"; newFormStreakCount = coldCount; }

      // Sezon stats'larını güncelle
      const oldStats = p.seasonStats;
      const updatedSeasonStats = oldStats && matchStats ? {
        ...oldStats,
        shots: (oldStats.shots ?? 0) + matchStats.shots,
        shotsOnTarget: (oldStats.shotsOnTarget ?? 0) + matchStats.shotsOnTarget,
        passes: (oldStats.passes ?? 0) + matchStats.passes,
        passesCompleted: (oldStats.passesCompleted ?? 0) + matchStats.passesCompleted,
        tackles: (oldStats.tackles ?? 0) + matchStats.tackles,
        interceptions: (oldStats.interceptions ?? 0) + matchStats.interceptions,
        dribblesAttempted: (oldStats.dribblesAttempted ?? 0) + matchStats.dribbles,
        dribblesCompleted: (oldStats.dribblesCompleted ?? 0) + matchStats.dribblesCompleted,
        fouls: (oldStats.fouls ?? 0) + matchStats.fouls,
        yellowCards: (oldStats.yellowCards ?? 0) + matchStats.yellowCards,
        redCards: (oldStats.redCards ?? 0) + matchStats.redCards,
        minutesPlayed: (oldStats.minutesPlayed ?? 0) + matchStats.minutesPlayed,
        // Gol türü dağılımı
        goalsRight: (oldStats.goalsRight ?? 0) + (matchStats.goalsRight ?? 0),
        goalsLeft: (oldStats.goalsLeft ?? 0) + (matchStats.goalsLeft ?? 0),
        goalsHead: (oldStats.goalsHead ?? 0) + (matchStats.goalsHead ?? 0),
        goalsPenalty: (oldStats.goalsPenalty ?? 0) + (matchStats.goalsPenalty ?? 0),
        goalsFreekick: (oldStats.goalsFreekick ?? 0) + (matchStats.goalsFreekick ?? 0),
      } : oldStats;

      return {
        ...p,
        cond: newCond,
        condition: newCond,
        form: newForm,
        morale: newMorale,
        confidence: Math.max(30, Math.min(100, p.confidence + (won ? 2 : lost ? -2 : 0))),
        last_match_rating: matchRating,
        match_ratings: newMatchRatings,
        formRating: newFormRating,
        form_streak: newFormStreak,
        form_streak_count: newFormStreakCount,
        is_injured: isInjured,
        injury,
        injury_history: updatedInjuryHistory,
        // P0#1 FIX: Sezonluk stats accumulator — gol/asist/saves/maç sayısı
        goals: (p.goals ?? 0) + (matchStats?.goals ?? 0),
        assists: (p.assists ?? 0) + (matchStats?.assists ?? 0),
        saves: (p.saves ?? 0) + (matchStats?.saves ?? 0),
        appearances: (p.appearances ?? 0) + 1,
        seasonStats: updatedSeasonStats,
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

    // P4 FIX: Sakatlık haberi ekle — injury_history'e işlenen sakatlık news'e de yazılsın
    const injuryNews: any[] = [];
    for (const ev of result.events) {
      if (ev.type === "injury" && ev.playerId) {
        const injuredPlayer = updatedTeam.players.find((p) => p.id === ev.playerId);
        if (injuredPlayer) {
          const injuryDur = injuredPlayer.injury?.remaining_days ?? Math.floor(Math.random() * 14) + 3;
          const injuryType = ["Hamstring", "Diz", "Bilek", "Kasık", "Sırt", "Omuz"][Math.floor(Math.random() * 6)];
          injuryNews.push({
            id: `news_injury_${ev.playerId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            category: "injury" as const,
            headline: `🤕 ${injuredPlayer.firstName} ${injuredPlayer.lastName} Sakatlandı`,
            body: `${injuredPlayer.firstName} ${injuredPlayer.lastName} maçta ${injuryType} sakatlığı geçirdi. Tahmini iyileşme süresi: ${injuryDur} gün.`,
            timestamp: Date.now(),
            importance: 4,
            read: false,
            relatedTeamId: teamId,
            playerId: ev.playerId,
          });
        }
      }
    }

    if (injuryNews.length > 0) {
      const prevNews = useAppStore.getState().news ?? [];
      useAppStore.setState({
        clubs: updatedClubs,
        news: [...injuryNews, ...prevNews],
      });
    } else {
      useAppStore.setState({ clubs: updatedClubs });
    }
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
        // P0#2 FIX: Sadece lig maçıysa fikstüre sonucu yaz — hazırlık maçı yazmasın
        if (!isFriendly) {
          useAppStore.getState().recordMatchResult(
            home.id,
            away.id,
            result.homeScore,
            result.awayScore
          );
          // TEST/SOLO MOD: Maç bitince otomatik haftayı ilerlet
          // (scheduler pencere beklemeden sonraki maça geç)
          useAppStore.getState().advanceMatchday();
        }
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
        // minute'i 46'ya set et ki devre arası tekrar tetiklenmesin
        return { ...s, status: "live", halftimeSecondsLeft: undefined, minute: Math.max(s.minute, 46) };
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
