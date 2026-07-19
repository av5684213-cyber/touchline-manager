"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  simulateEnhancedMatch,
  type EnhancedMatchResult,
  type MatchEvent as EnhancedMatchEvent,
} from "@/lib/match/engine/enhancedMatchEngine";
import type { Player as MatchEnginePlayer } from "@/lib/match/engine/types";
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
    let savesHome = 0;
    let savesAway = 0;
    const playerStats: Record<string, { goals: number; assists: number; yellow: number; red: number }> = {};

    for (const ev of shownEvents) {
      if (ev.type === "goal") {
        if (ev.team === "home") homeScore++;
        else awayScore++;
        if (ev.team === "home") shotsHome++;
        else shotsAway++;
        if (ev.playerId) {
          if (!playerStats[ev.playerId]) playerStats[ev.playerId] = { goals: 0, assists: 0, yellow: 0, red: 0 };
          playerStats[ev.playerId].goals++;
        }
        if (ev.assistPlayerId) {
          if (!playerStats[ev.assistPlayerId]) playerStats[ev.assistPlayerId] = { goals: 0, assists: 0, yellow: 0, red: 0 };
          playerStats[ev.assistPlayerId].assists++;
        }
      } else if (ev.type === "shot_saved" || ev.type === "save") {
        // Şut kurtarıldı — şut atan takımın shots'ı artar, kurtaran takımın saves'i
        if (ev.team === "home") { shotsHome++; savesAway++; }
        else { shotsAway++; savesHome++; }
      } else if (ev.type === "shot_wide" || ev.type === "shot_post") {
        if (ev.team === "home") shotsHome++;
        else shotsAway++;
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

    // Canlı possession — SADECE topa sahip olma event'lerini say (faul/kart/sakatlık/sub sayma)
    const POSSESSION_TYPES = new Set([
      "pass", "PASS", "pass_completed", "PASS_COMPLETED",
      "shot_saved", "shot_on_target", "shot_wide", "shot_blocked", "shot_post",
      "SAVE", "OWN_GOAL", "goal", "GOAL", "PENALTY_GOAL",
      "corner", "CORNER", "cross", "CROSS",
      "dribble_attempt", "DRIBBLE_ATTEMPT", "dribble_success", "DRIBBLE_SUCCESS",
      "tackle", "TACKLE", "interception", "INTERCEPTION",
    ]);
    const homeEvents = shownEvents.filter(e => e.team === "home" && POSSESSION_TYPES.has(e.type as string)).length;
    const awayEvents = shownEvents.filter(e => e.team === "away" && POSSESSION_TYPES.has(e.type as string)).length;
    const totalEvents = homeEvents + awayEvents;
    const liveHomePoss = totalEvents > 0 ? Math.round((homeEvents / totalEvents) * 100) : 50;

    const lastMinute = shownEvents.length > 0 ? shownEvents[shownEvents.length - 1].minute : 0;

    // Status: cursor sona ulaşmışsa "finished", ama syncToCursor'u tetikleyen tick effect
    // aynı anda status'ü değiştirip clearInterval yapacağı için finalization bir sonraki render'da
    // ayrı bir useEffect tarafından yapılmalı. Burada sadece live/halftime set et.
    const isLastEvent = eventCursorRef.current >= allEvents.length;
    setSnapshot({
      status: isLastEvent ? "finished" : "live",
      minute: Math.max(lastMinute, cursor === 0 ? 0 : 1),
      homeScore,
      awayScore,
      events: [...shownEvents].reverse(), // en yeni üstte
      stats: {
        possession: [liveHomePoss, 100 - liveHomePoss],
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

      // P0 FIX: Kullanıcı ev sahibi mi deplasman mı?
      const myTeamId = storeState.myTeamId;
      const isHome = home.id === myTeamId;

      // ADDED: Taktikten ilk 11 kontrolü — lineup'da null slot varsa uyarı
      const lineupFromTactics = storeState.tactics.lineup;
      const filledSlots = lineupFromTactics.filter((p): p is Player => p !== null);
      const emptySlots = lineupFromTactics.length - filledSlots.length;

      // İlk 11'i seç:
      // 1. Öncelik: kullanıcının taktik ekranında seçtiği lineup (11 dolu slot)
      // 2. Fallback: pickStartingXIByFormation ile en iyi 11
      let userSquad: MatchEnginePlayer[];
      if (filledSlots.length === 11) {
        // Kullanıcının seçtiği ilk 11 — taktik ekranından
        userSquad = filledSlots as unknown as MatchEnginePlayer[];
      } else if (filledSlots.length >= 7) {
        // Yeterli oyuncu var ama 11 değil — eksikleri otomatik doldur
        const userPlayers = isHome ? home.players : away.players;
        const autoFilled = pickStartingXIByFormation(userPlayers, formation) as unknown as MatchEnginePlayer[];
        const usedIds = new Set(filledSlots.map((p) => p.id));
        const missing = autoFilled.filter((p) => !usedIds.has(p.id)).slice(0, 11 - filledSlots.length);
        userSquad = [...filledSlots, ...missing] as unknown as MatchEnginePlayer[];
      } else {
        // Çok az oyuncu seçilmiş — tamamen otomatik
        const userPlayers = isHome ? home.players : away.players;
        userSquad = pickStartingXIByFormation(userPlayers, formation) as unknown as MatchEnginePlayer[];
      }

      // P0 FIX: home ve away squad'larını isHome'a göre ata
      const homeSquad = isHome ? userSquad : pickStartingXIByFormation(home.players, "4-4-2") as unknown as MatchEnginePlayer[];
      const awaySquad = isHome ? pickStartingXIByFormation(away.players, "4-4-2") as unknown as MatchEnginePlayer[] : userSquad;

      // Kullanıcının taktiğini doğru tarafa uygula
      const slotRoles = storeState.tactics.slotRoles;
      // playerRoles map'i oluştur: playerId → roleId
      const playerRoles: Record<string, string> = {};
      storeState.tactics.lineup.forEach((p, i) => {
        if (p && slotRoles[i]) {
          playerRoles[p.id] = slotRoles[i];
        }
      });

      // P0 FIX: taktikleri isHome'a göre ata
      const userTacticWithRoles = { ...userTactic, tactic_type: userTactic.formation, playerRoles };
      const defaultTactic = {
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
      const homeTactic = isHome ? userTacticWithRoles : defaultTactic;
      const awayTactic = isHome ? defaultTactic : userTacticWithRoles;

      // Tactical instructions modifier'ları da doğru tarafa ver
      const homeTacticModifiers = isHome
        ? computeInstructionModifiers(storeState.tactics.activeInstructions ?? {})
        : computeInstructionModifiers({});
      const awayTacticModifiers = isHome
        ? computeInstructionModifiers({})
        : computeInstructionModifiers(storeState.tactics.activeInstructions ?? {});

      const homePlayerRoles = isHome ? playerRoles : {};
      const awayPlayerRoles = isHome ? {} : playerRoles;

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

      // P0 FIX: homeTacticModifiers ve homePlayerRoles yukarıda isHome'a göre set edildi

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
          // Tactical instructions (20 talimat → modifier) — doğru tarafa uygula
          homeTacticModifiers,
          awayTacticModifiers,
          // P0#4 FIX: Taktik rollerini motora geçir — oyuncu attribute'larını boost eder
          homePlayerRoles,
          awayPlayerRoles,
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
    postMatchAppliedRef.current = false;
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
    // P0 FIX: Kırmızı kart gören oyuncuları da topla — sonraki maçta cezalı
    const suspendedIds = new Set<string>();
    // P0 FIX: Sarı kart sayacı — 2 sarı = 1 maç ceza
    const yellowCount = new Map<string, number>();
    for (const ev of result.events) {
      if (ev.type === "injury" && ev.playerId) {
        injuredIds.add(ev.playerId);
      }
      if ((ev.type === "red_card" || (ev.type as string) === "red") && ev.playerId) {
        suspendedIds.add(ev.playerId);
      }
      if ((ev.type === "yellow_card" || (ev.type as string) === "yellow") && ev.playerId) {
        yellowCount.set(ev.playerId, (yellowCount.get(ev.playerId) ?? 0) + 1);
      }
    }
    // 2 sarı kart = 1 maç ceza
    for (const [pid, count] of yellowCount) {
      if (count >= 2) suspendedIds.add(pid);
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
      // P2.5 FIX: Hazırlık maçlarında her zaman pozitif form/moral
      const formChange = isFriendly
        ? 2  // Hazırlık maçı = her zaman +2 form
        : matchRating >= 6.5 ? 2 : matchRating < 5.5 ? -3 : 0;
      const isHome = result.homePlayerRatings.some((r) => r.playerId === p.id);
      const won = isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore;
      const lost = isHome ? result.homeScore < result.awayScore : result.awayScore < result.homeScore;
      const moraleChange = isFriendly
        ? 2  // Hazırlık maçı = her zaman +2 moral
        : won ? 3 + streakBonus : lost ? -3 + streakBonus : 0;

      const newCond = Math.max(20, Math.min(100, p.cond - condDrain));
      const newForm = Math.max(30, Math.min(100, p.form + formChange));
      const newMorale = Math.max(20, Math.min(100, p.morale + moraleChange));

      const isInjured = injuredIds.has(p.id);
      let injuryDuration = Math.floor(Math.random() * 14) + 3;
      // P0 FIX: require() → top-level import (staffBonus zaten import edildi)
      const storeState = useAppStore.getState();
      try {
        const { applyDoctorHealingBonus } = require("@/lib/staffBonus");
        injuryDuration = applyDoctorHealingBonus(injuryDuration, storeState.facilities.staff);
      } catch (e) { /* staffBonus yüklenemezse default süre */ }
      const injurySeverity = Math.floor(Math.random() * 5) + 1;
      // P0 FIX: Sakatlık tipi severity'ye göre belirlenir (artık "light" hardcode değil)
      const injuryType = injurySeverity <= 2 ? "light" as const
        : injurySeverity <= 4 ? "chronic" as const
        : "risky" as const;
      const injury = isInjured
        ? { type: injuryType, remaining_days: injuryDuration, severity: injurySeverity }
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
        // P0 FIX BUG #1: Hazırlık maçı sezon statlarını KİRLETMESİN
        // Friendly iken sadece cond/form/morale güncellenir, gol/asist/appearance/seasonStats/suspended_until ATLANIR
        goals: isFriendly ? p.goals : (p.goals ?? 0) + (matchStats?.goals ?? 0),
        assists: isFriendly ? p.assists : (p.assists ?? 0) + (matchStats?.assists ?? 0),
        saves: isFriendly ? p.saves : (p.saves ?? 0) + (matchStats?.saves ?? 0),
        appearances: isFriendly ? p.appearances : (p.appearances ?? 0) + 1,
        seasonStats: isFriendly ? p.seasonStats : updatedSeasonStats,
        // P0 FIX: Kırmızı kart / 2 sarı kart cezası — SADECE lig maçında
        // BULGU #1 DÜZELTME (v2.9.1): +1 yerine +2 — advanceMatchday matchday'i 1 artırır,
        // bu yüzden "matchday+1" ceza maçında "matchday+1 <= seasonMatchday" true olur (oyuncu oynar).
        // +2 yazarsak: ceza maçı = matchday+1, ondan sonraki maçta (matchday+2) = dönebilir.
        // Yani: bu hafta oynadı (matchday N) → ceza = N+1 maçı → N+1'de oynayamaz → N+2'de dönebilir.
        // Filter: suspended_until <= seasonMatchday → N+1 <= N+1 = true → YANLIŞ (oynar)!
        // Doğru: suspended_until > seasonMatchday → N+1 > N+1 = false → oynar (YANLIŞ!)
        // Aslında filter "suspended_until <= matchday" → "oynayabilir" demek.
        // Cezalı = "suspended_until > matchday". Yani +1 yazınca:
        //   - Ceza maçı (N+1): suspended_until(N+1) > seasonMatchday(N+1) = false → OYNAR (HATA!)
        // Çözüm: +2 yaz → N+2 > N+1 = true → ceza maçı oynanmaz. ✓
        suspended_until: isFriendly ? p.suspended_until : (suspendedIds.has(p.id)
          ? String(useAppStore.getState().seasonMatchday + 2)
          : p.suspended_until),
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

    // P0 FIX BUG #3: tactics.lineup stale referansları güncelle
    // applyPostMatchEffects yeni player objeleri yaratır, ama tactics.lineup eski referansları tutar
    // lineup'taki her oyuncuyu updatedPlayers'dan fresh referansla değiştir
    const storeState = useAppStore.getState();
    if (storeState.tactics.lineup) {
      const freshLineup = storeState.tactics.lineup.map(slotPlayer => {
        if (!slotPlayer) return null;
        const freshPlayer = updatedPlayers.find(np => np.id === slotPlayer.id);
        return freshPlayer ?? null; // Oyuncu bulunamazsa null (satılmış/transfer olmuş)
      });
      useAppStore.setState({
        tactics: { ...storeState.tactics, lineup: freshLineup },
      });
    }

    // P0 FIX BUG #6: Maç sonrası kredi ödülünü UI yerine burada ver
    // Celebration modal'ı kapanmazsa kredi kaybolmuyor
    if (!isFriendly) {
      const myScore = teamId === store.clubs.find(c => c.id === store.myTeamId)?.id
        ? result.homeScore : result.awayScore; // approximation — motor başlatırken isHome biliniyor
      // Daha güvenli: result'tan kimin kazandığını çıkar
      const isUserHome = store.clubs.find(c => c.id === store.myTeamId)?.id === team.id;
      const userScore = isUserHome ? result.homeScore : result.awayScore;
      const oppScore = isUserHome ? result.awayScore : result.homeScore;
      const earned = userScore > oppScore ? 3 : userScore === oppScore ? 1 : 0;
      if (earned > 0) {
        useAppStore.getState().addCredits(earned);
      }
    }

    // ADDED: Başarım tetikleyici — maç sonu
    try {
      if (typeof window !== "undefined") {
        const { checkAchievements } = require("@/components/touchline/achievements");
        // P0 FIX: isHome doğru hesapla — teamId takım ID'si, playerId ile karşılaştırma yanlış
        const isHome = home.id === teamId;
        const won = isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore;
        const goalScored = isHome ? result.homeScore > 0 : result.awayScore > 0;
        const cleanSheet = isHome ? result.awayScore === 0 : result.homeScore === 0;
        // Son 5 maçtan galibiyet serisi hesapla
        const fixtures = useAppStore.getState().fixtures
          .filter((f) => f.played && (f.homeId === teamId || f.awayId === teamId))
          .sort((a, b) => b.matchday - a.matchday)
          .slice(0, 5);
        let winStreak = 0;
        for (const f of fixtures) {
          const fHome = f.homeId === teamId;
          const us = fHome ? (f.homeScore ?? 0) : (f.awayScore ?? 0);
          const them = fHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
          if (us > them) winStreak++;
          else break;
        }
        // Gol kralı/asist kralı
        let topScorerGoals = 0, topAssists = 0;
        for (const p of team.players) {
          if ((p.goals ?? 0) > topScorerGoals) topScorerGoals = p.goals ?? 0;
          if ((p.assists ?? 0) > topAssists) topAssists = p.assists ?? 0;
        }
        // Clean sheet streak (son 5 maçta gol yememe)
        let cleanSheetStreak = 0;
        for (const f of fixtures) {
          const fHome = f.homeId === teamId;
          const them = fHome ? (f.awayScore ?? 0) : (f.homeScore ?? 0);
          if (them === 0) cleanSheetStreak++;
          else break;
        }
        const newlyUnlocked = checkAchievements({
          matchWon: won,
          goalScored,
          topScorerGoals,
          topAssists,
          cleanSheetStreak,
          winStreak,
        });
        // Yeni başarım varsa haber ekle
        if (newlyUnlocked.length > 0) {
          const achNews = newlyUnlocked.map((ach: any) => ({
            id: `news_ach_${ach.id}_${Date.now()}`,
            category: "milestone" as const,
            headline: `✅ Başarım Açıldı: ${ach.name}`,
            body: `${ach.icon} ${ach.name} — ${ach.description}`,
            timestamp: Date.now(),
            importance: 5,
            read: false,
          }));
          const prevNews2 = useAppStore.getState().news ?? [];
          useAppStore.setState({ news: [...achNews, ...prevNews2] });
        }
      }
    } catch (e) {
      console.warn("[achievements] maç sonu kontrol hatası:", e);
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
      // P0 FIX BUG #15: Halftime sadece en az 1 event gösterildikten sonra tetiklensin
      if (nextEvent && nextEvent.minute > 45 && snapshot.minute <= 45 && eventCursorRef.current > 0) {
        // Devre arası başlat — 30 saniye geri sayım
        setSnapshot((s) => ({ ...s, status: "halftime", halftimeSecondsLeft: 30 }));
        clearInterval(id);
        return;
      }

      if (eventCursorRef.current >= allEvents.length) {
        // Tüm event'ler gösterildi — bitir + kondisyon/form güncelle + fikstür güncelle
        setSnapshot((s) => ({ ...s, status: "finished" }));
        clearInterval(id);
        return;
      }
      eventCursorRef.current += 1;
      syncToCursor();
    }, TICK_MS);
    return () => clearInterval(id);
  }, [snapshot.status, snapshot.minute, sortedEvents, syncToCursor, applyPostMatchEffects]);

  // FINALIZATION EFFECT — status "finished" olduğunda post-match effect'leri UYGULA
  // Bu ayrı effect, tick effect'inden bağımsız olarak çalışır.
  // Ref ile çift-uygulamayı engelliyoruz.
  const postMatchAppliedRef = useRef(false);
  useEffect(() => {
    if (snapshot.status !== "finished") return;
    if (!fullResultRef.current) return;
    if (postMatchAppliedRef.current) return;
    postMatchAppliedRef.current = true;

    const result = fullResultRef.current;
    applyPostMatchEffects(result);
    // Sadece lig maçıysa fikstüre sonucu yaz — hazırlık maçı yazmasın
    if (!isFriendly) {
      try {
        useAppStore.getState().recordMatchResult(
          home.id,
          away.id,
          result.homeScore,
          result.awayScore
        );
        // TEST/SOLO MOD: Maç bitince otomatik haftayı ilerlet
        useAppStore.getState().advanceMatchday();
      } catch (e) {
        console.warn("[match-engine] recordMatchResult/advanceMatchday hatası:", e);
      }
    }
  }, [snapshot.status, applyPostMatchEffects, isFriendly, home.id, away.id]);

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

  // Taktik değişikliği — P0 FIX: Devre arası gerçek re-simülasyon
  // Sadece devre arası (status === "halftime") çağrıldığında 2. yarıyı yeni taktiklerle yeniden simüle eder
  const applyTactics = useCallback((_side: "home" | "away", _newTactics: unknown) => {
    const result = fullResultRef.current;
    if (!result) return;

    // Sadece devre arası çalışır — canlı maç sırasında taktik değişikliği yok
    if (snapshot.status !== "halftime") {
      // Canlı maç sırasında taktik değişikliği devre dışı — sadece event ekle (geri uyumluluk)
      const tacticEvent: EnhancedMatchEvent = {
        minute: snapshot.minute,
        type: "substitution" as any,
        team: _side,
        playerName: "Taktik Değişikliği",
        playerId: "",
        description: `Taktik değişikliği — devre arası uygulanacak`,
        x: 50,
        y: 50,
        ratingImpact: 0,
      };
      result.events.push(tacticEvent);
      syncToCursor();
      return;
    }

    // P0 FIX: DEVRE ARASI — 2. yarıyı yeni taktiklerle yeniden simüle et
    // 1. İlk yarı event'lerini koru (minute <= 45)
    // 2. 2. yarıyı yeni taktiklerle simüle et (minute 46-90)
    // 3. Skorları birleştir
    const firstHalfEvents = result.events.filter(e => e.minute <= 45);
    const firstHalfHomeScore = firstHalfEvents.filter(e => e.type === "goal" && e.team === "home").length;
    const firstHalfAwayScore = firstHalfEvents.filter(e => e.type === "goal" && e.team === "away").length;

    // Yeni taktikleri al
    const newTactics = _newTactics as any;
    const storeState = useAppStore.getState();
    const myTeamId = storeState.myTeamId;
    const isHome = home.id === myTeamId;

    // Yeni formasyon ve taktik
    const newFormation = newTactics?.formation ?? "4-4-2";
    const newTactic = { ...newTactics, tactic_type: newFormation };

    // Yeni ilk 11 — kullanıcı taktik ekranında değişiklik yapmış olabilir
    const lineupFromTactics = storeState.tactics.lineup;
    const filledSlots = lineupFromTactics.filter((p): p is Player => p !== null);
    let newUserSquad: MatchEnginePlayer[];
    if (filledSlots.length === 11) {
      newUserSquad = filledSlots as unknown as MatchEnginePlayer[];
    } else {
      const userPlayers = isHome ? home.players : away.players;
      newUserSquad = pickStartingXIByFormation(userPlayers, newFormation) as unknown as MatchEnginePlayer[];
    }

    const homeSquad = isHome ? newUserSquad : pickStartingXIByFormation(home.players, "4-4-2") as unknown as MatchEnginePlayer[];
    const awaySquad = isHome ? pickStartingXIByFormation(away.players, "4-4-2") as unknown as MatchEnginePlayer[] : newUserSquad;

    const homeTactic = isHome ? newTactic : { formation: "4-4-2", tactic_type: "4-4-2", mentality: 3, pressing: false, passingStyle: "Karışık", intensity: "normal", aggression: 50, width: 50, passingIntensity: 50, lineHeight: 50, screenKeeper: false, wasteTime: false, parkTheBus: false, crossGame: false, loneStrikerCounter: false, offsideTrap: false, playStyle: "balanced" };
    const awayTactic = isHome ? { formation: "4-4-2", tactic_type: "4-4-2", mentality: 3, pressing: false, passingStyle: "Karışık", intensity: "normal", aggression: 50, width: 50, passingIntensity: 50, lineHeight: 50, screenKeeper: false, wasteTime: false, parkTheBus: false, crossGame: false, loneStrikerCounter: false, offsideTrap: false, playStyle: "balanced" } : newTactic;

    // Slot rolleri
    const slotRoles = storeState.tactics.slotRoles;
    const playerRoles: Record<string, string> = {};
    storeState.tactics.lineup.forEach((p, i) => {
      if (p && slotRoles[i]) {
        playerRoles[p.id] = slotRoles[i];
      }
    });
    const homePlayerRoles = isHome ? playerRoles : {};
    const awayPlayerRoles = isHome ? {} : playerRoles;

    const homeTacticModifiers = isHome
      ? computeInstructionModifiers(storeState.tactics.activeInstructions ?? {})
      : computeInstructionModifiers({});
    const awayTacticModifiers = isHome
      ? computeInstructionModifiers({})
      : computeInstructionModifiers(storeState.tactics.activeInstructions ?? {});

    // 2. yarıyı simüle et — startMinute=46, initialHomeScore/AwayScore ile
    try {
      const secondHalfResult = simulateEnhancedMatch(
        homeSquad,
        awaySquad,
        homeTactic as any,
        awayTactic as any,
        {
          homeTeamName: home.name,
          awayTeamName: away.name,
          refereePersonality: result.refereePersonality as any,
          refereeName: result.refereeName,
          atmosphereScore: 50, // default — store'tan tekrar hesaplanmaz
          pitchPassBonus: undefined,
          homeTacticModifiers,
          awayTacticModifiers,
          homePlayerRoles,
          awayPlayerRoles,
          // P0 FIX: Incremental simulation — 2. yarı için başlangıç skoru
          startMinute: 46,
          initialHomeScore: firstHalfHomeScore,
          initialAwayScore: firstHalfAwayScore,
        } as any
      );

      // 2. yarı event'lerini al (minute > 45 olanlar)
      const secondHalfEvents = secondHalfResult.events.filter(e => e.minute > 45);

      // Birleştir: ilk yarı + 2. yarı
      result.events = [...firstHalfEvents, ...secondHalfEvents];
      result.homeScore = firstHalfHomeScore + secondHalfResult.events.filter(e => e.type === "goal" && e.team === "home" && e.minute > 45).length;
      result.awayScore = firstHalfAwayScore + secondHalfResult.events.filter(e => e.type === "goal" && e.team === "away" && e.minute > 45).length;

      // Taktik değişiklik event'i ekle
      const tacticEvent: EnhancedMatchEvent = {
        minute: 45,
        type: "substitution" as any,
        team: _side,
        playerName: "Taktik Değişikliği",
        playerId: "",
        description: `Devre arası taktik değişikliği — formasyon ${newFormation}`,
        x: 50,
        y: 50,
        ratingImpact: 0,
      };
      result.events.push(tacticEvent);

      // Event'leri yeniden sırala
      result.events.sort((a, b) => a.minute - b.minute);

      // Cursor'u ilk yarı sonuna set et
      eventCursorRef.current = firstHalfEvents.length;
      fullResultRef.current = result;
      syncToCursor();

      // Snapshot'ı güncelle
      setSnapshot(s => ({
        ...s,
        homeScore: result.homeScore,
        awayScore: result.awayScore,
        events: [...result.events].reverse(),
      }));
    } catch (e) {
      console.warn("[applyTactics] 2. yarı re-simülasyon hatası:", e);
    }
  }, [snapshot.status, snapshot.minute, syncToCursor, home, away]);

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
    // P1 FIX: tactics artık store'dan gerçek değerler geliyor (hardcoded değil)
    tactics: {
      home: (() => {
        const storeState = useAppStore.getState();
        const isUserHome = home.id === storeState.myTeamId;
        const active = isUserHome ? storeState.tactics.active : DEFAULT_TACTIC;
        return {
          formation: active.formation,
          pressing: active.pressing ? 70 : 50,
          defensiveLine: active.lineHeight,
          tempo: active.passingIntensity,
          width: active.width,
        };
      })(),
      away: (() => {
        const storeState = useAppStore.getState();
        const isUserAway = away.id === storeState.myTeamId;
        const active = isUserAway ? storeState.tactics.active : DEFAULT_TACTIC;
        return {
          formation: active.formation,
          pressing: active.pressing ? 70 : 50,
          defensiveLine: active.lineHeight,
          tempo: active.passingIntensity,
          width: active.width,
        };
      })(),
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
