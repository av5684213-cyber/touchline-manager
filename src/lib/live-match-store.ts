"use client";

/**
 * Global live-match store — component'ten bağımsız maç simülasyonu.
 *
 * Sorun: useMatchEngine hook'u component-level state + setInterval kullanıyordu.
 * Kullanıcı sekme değiştirince MatchScreen unmount oluyordu, useEffect cleanup
 * interval'i temizliyordu, maç donuyordu.
 *
 * Çözüm: Maç state'ini ve interval'i bu module-level Zustand store'a taşıdık.
 * Component unmount olsa bile maç arka planda devam eder. MatchScreen sadece
 * store'dan okur.
 *
 * Devre arası: 45. dakikada status otomatik "halftime" olur, interval durur.
 * Kullanıcı "İkinci Yarıyı Başlat" demeden devam etmez.
 */

import { create } from "zustand";
import {
  simulateEnhancedMatch,
  applyRoleBonuses,
  type EnhancedMatchResult,
  type MatchEvent as EnhancedMatchEvent,
} from "@/lib/match/engine/enhancedMatchEngine";
import type { Player as MatchEnginePlayer } from "@/lib/match/engine/types";
import type { Player, Team } from "@/lib/mock/data";
import { useAppStore } from "@/lib/store";
import {
  FORMATION_SLOTS,
  DEFAULT_TACTIC,
  TACTICAL_INSTRUCTIONS,
} from "@/lib/tactics/types";

const TICK_MS = 800; // 1 oyun dakikası = 800ms
const HALF_TIME_MINUTE = 45;

// ---------- Helpers (useMatchEngine'den kopyalandı) ----------

export function pickStartingXIByFormation(players: Player[], formation: string): Player[] {
  const slots = FORMATION_SLOTS[formation] ?? FORMATION_SLOTS["4-4-2"];
  const used = new Set<string>();
  const lineup: Player[] = [];

  for (const slotPos of slots) {
    let candidate = players
      .filter((p) => !used.has(p.id) && p.specificPosition === slotPos)
      .sort((a, b) => b.rating - a.rating)[0];

    if (!candidate) {
      const group = getGroup(slotPos);
      candidate = players
        .filter((p) => !used.has(p.id) && getGroup(p.specificPosition) === group)
        .sort((a, b) => b.rating - a.rating)[0];
    }

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

const REFEREE_PERSONALITIES = ["strict", "balanced", "balanced", "lenient", "home_bias", "volatile", "var_lover"] as const;
const REFEREE_NAMES = [
  "Halil Umut Meler", "Cüneyt Çakır", "Fırat Aydınus", "Mete Kalkavan",
  "Mustafa Öğretmenoğlu", "Ali Palabıyık",
];
function pickRandomReferee() {
  return REFEREE_PERSONALITIES[Math.floor(Math.random() * REFEREE_PERSONALITIES.length)];
}
function pickRandomRefereeName() {
  return REFEREE_NAMES[Math.floor(Math.random() * REFEREE_NAMES.length)];
}

function computeInstructionModifiers(activeInstructions: Record<string, string>) {
  let goalMod = 0;
  let conceedMod = 0;
  let counterMod = 0;

  for (const [instName, selectedOption] of Object.entries(activeInstructions)) {
    const inst = TACTICAL_INSTRUCTIONS.find((i) => i.name === instName);
    if (!inst) continue;
    // Her opsiyon için etki — ilk opsiyon yüksek, ikinci nötr, üçüncü düşük
    const optionIdx = inst.options.indexOf(selectedOption);
    if (optionIdx < 0) continue;
    const optionMult = optionIdx === 0 ? 1.0 : optionIdx === inst.options.length - 1 ? -0.6 : 0.0;

    for (const [effectKey, effectVal] of Object.entries(inst.effects)) {
      const adjusted = effectVal * optionMult;

      // Hücum efektleri — gol şansını artırır
      if (["crossing_chance", "wide_attack", "central_attack", "dribbling_success",
           "long_shot_chance", "shot_volume", "clear_cut_chance", "early_cross_chance",
           "fast_break", "first_time_shot", "cutback_chance", "crossing_accuracy",
           "crossing_speed", "heading_opportunity", "goal_from_corner", "near_post_goal",
           "quick_goal_chance", "counter_attack", "patient_buildup", "pass_completion",
           "creative_freedom", "goal_from_freekick", "wing_back_stamina",
           "fullback_shooting", "defender_confusion"].includes(effectKey)) {
        goalMod += adjusted * 0.003;
      }
      // Savunma efektleri — gol yeme riskini azaltır
      else if (["defensive_depth", "defensive_shape", "compact_defense", "formation_integrity",
                "possession_regain", "ball_recovery", "tackle_intensity", "set_piece_defense",
                "zonal_coverage", "man_marking_tightness", "offside_success",
                "pressing_efficiency", "possession_retention", "time_control",
                "concentration_demand"].includes(effectKey)) {
        conceedMod -= adjusted * 0.003;
      }
      // Risk / savunma zaafı — gol yeme riskini artırır
      else if (["defensive_risk", "through_ball_vuln", "interception_risk", "turnover_risk",
                "foul_risk", "counter_vuln", "defensive_vuln", "crowd_frustration",
                "passing_risk", "central_density", "stamina_drain", "tempo_modifier",
                "passing_risk"].includes(effectKey)) {
        conceedMod += Math.abs(adjusted) * 0.003;
      }
      // Kontra
      else if (["counter_attack", "fast_break", "counter_vuln"].includes(effectKey)) {
        counterMod += adjusted * 0.003;
      }
      // Faul kazanma
      else if (["foul_won", "ariel_duel", "short_freekick"].includes(effectKey)) {
        goalMod += adjusted * 0.002;
      }
      // Offside trap — çift yönlu
      else if (["offside_trap"].includes(effectKey)) {
        goalMod += adjusted * 0.001;
        conceedMod -= adjusted * 0.002;
      }
    }
  }

  return {
    goalMod: Math.max(-0.15, Math.min(0.15, goalMod)),
    conceedMod: Math.max(-0.15, Math.min(0.15, conceedMod)),
    counterMod: Math.max(-0.10, Math.min(0.10, counterMod)),
  };
}

// ---------- Types ----------

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
};

type Session = {
  homeId: string;
  awayId: string;
  fullResult: EnhancedMatchResult;
  eventCursor: number;
  snapshot: LiveMatchState;
  replay?: {
    active: boolean;
    events: EnhancedMatchEvent[];
    idx: number;
  };
};

type LiveMatchStore = {
  session: Session | null;

  // actions
  start: (home: Team, away: Team) => void;
  pause: () => void;
  resume: () => void; // paused -> live
  resumeSecondHalf: () => void; // halftime -> live
  reset: () => void;
  applyTactics: (side: "home" | "away", newTactics: unknown) => void;
  makeSub: (side: "home" | "away", outPlayer: Player, inPlayer: Player) => boolean;
  startReplay: () => void;
  stopReplay: () => void;
  tickReplay: () => void;
};

// ---------- Module-level interval (component'ten bağımsız) ----------
let intervalId: ReturnType<typeof setInterval> | null = null;
let replayIntervalId: ReturnType<typeof setInterval> | null = null;

function clearMatchInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}
function clearReplayInterval() {
  if (replayIntervalId) {
    clearInterval(replayIntervalId);
    replayIntervalId = null;
  }
}

// ---------- Snapshot builder ----------
function buildSnapshot(result: EnhancedMatchResult, cursor: number, prevSubs: { home: number; away: number }): LiveMatchState {
  const allEvents = [...result.events].sort((a, b) => a.minute - b.minute);
  const shownEvents = allEvents.slice(0, cursor);

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
  const allEventsCount = allEvents.length;
  const status: MatchStatus = cursor >= allEventsCount ? "finished" : "live";

  return {
    status,
    minute: Math.max(lastMinute, cursor === 0 ? 0 : 1),
    homeScore,
    awayScore,
    events: [...shownEvents].reverse(),
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
    subsUsed: prevSubs,
  };
}

// ---------- Post-match effects ----------
function applyPostMatchEffects(result: EnhancedMatchResult) {
  const store = useAppStore.getState();
  const liveSession = useLiveMatchStore.getState().session;
  const homeId = liveSession?.homeId;
  const awayId = liveSession?.awayId;
  const clubs = [...store.clubs];
  if (!homeId || !awayId) return;

  const homeTeam = clubs.find((c) => c.id === homeId);
  const awayTeam = clubs.find((c) => c.id === awayId);
  if (!homeTeam || !awayTeam) return;

  const ratingMap = new Map<string, number>();
  [...result.homePlayerRatings, ...result.awayPlayerRatings].forEach((r) => {
    ratingMap.set(r.playerId, r.rating);
  });

  const injuredIds = new Set<string>();
  for (const ev of result.events) {
    if (ev.type === "injury" && ev.playerId) {
      injuredIds.add(ev.playerId);
    }
  }

  // Bir takımın oyuncularını güncelle (hem home hem away)
  const updateTeamPlayers = (team: typeof homeTeam, isHome: boolean) => {
    const won = isHome ? result.homeScore > result.awayScore : result.awayScore > result.homeScore;
    const lost = isHome ? result.homeScore < result.awayScore : result.awayScore < result.homeScore;

    return team.players.map((p) => {
      const matchRating = ratingMap.get(p.id);
      if (matchRating === undefined) return p;

      // Maç sonrası kondisyon düşüşü: 6-12 arası (haftada 10 maç için dengeli)
      const condDrain = Math.floor(6 + Math.random() * 6 + (matchRating < 6 ? 3 : 0));
      const formChange = matchRating >= 6.5 ? 2 : matchRating < 5.5 ? -3 : 0;
      const moraleChange = won ? 3 : lost ? -3 : 0;

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
  };

  const updatedHomePlayers = updateTeamPlayers(homeTeam, true);
  const updatedAwayPlayers = updateTeamPlayers(awayTeam, false);

  const updatedClubs = clubs.map((c) => {
    if (c.id === homeId) return { ...homeTeam, players: updatedHomePlayers };
    if (c.id === awayId) return { ...awayTeam, players: updatedAwayPlayers };
    return c;
  });
  useAppStore.setState({ clubs: updatedClubs });
}

// ---------- Tick (her 800ms) ----------
function tick() {
  const store = useLiveMatchStore.getState();
  const session = store.session;
  if (!session) return;

  const allEvents = [...session.fullResult.events].sort((a, b) => a.minute - b.minute);

  if (session.eventCursor >= allEvents.length) {
    // Maç bitti
    const finishedSnapshot: LiveMatchState = {
      ...session.snapshot,
      status: "finished",
    };
    useLiveMatchStore.setState({
      session: { ...session, snapshot: finishedSnapshot },
    });
    clearMatchInterval();
    applyPostMatchEffects(session.fullResult);
    useAppStore.getState().recordMatchResult(
      session.homeId,
      session.awayId,
      session.fullResult.homeScore,
      session.fullResult.awayScore
    );
    return;
  }

  // Bir sonraki event
  const nextEvent = allEvents[session.eventCursor];
  const newCursor = session.eventCursor + 1;

  // Devre arası kontrolü: eğer şu anki cursor'ın dakikası 45'i geçecekse
  // ve daha halftime'a girmediysek, halftime'a geç
  const currentMinute = nextEvent.minute;
  const wasFirstHalf = session.snapshot.minute < HALF_TIME_MINUTE || session.snapshot.status === "live";

  if (
    wasFirstHalf &&
    currentMinute > HALF_TIME_MINUTE &&
    session.snapshot.status !== "halftime" &&
    session.snapshot.status !== "finished"
  ) {
    // Devre arası — interval durur, status halftime
    const halftimeSnapshot: LiveMatchState = {
      ...session.snapshot,
      status: "halftime",
      minute: HALF_TIME_MINUTE,
    };
    useLiveMatchStore.setState({
      session: { ...session, snapshot: halftimeSnapshot },
    });
    clearMatchInterval();
    return;
  }

  // Normal tick — cursor'u ilerlet, snapshot'ı güncelle
  const newSnapshot = buildSnapshot(session.fullResult, newCursor, session.snapshot.subsUsed);
  useLiveMatchStore.setState({
    session: { ...session, eventCursor: newCursor, snapshot: newSnapshot },
  });
}

// ---------- Replay tick (TICK_MS / 3 hız) ----------
function replayTick() {
  const store = useLiveMatchStore.getState();
  const session = store.session;
  if (!session || !session.replay || !session.replay.active) return;

  if (session.replay.idx >= session.replay.events.length) {
    setTimeout(() => {
      useLiveMatchStore.setState({
        session: session ? {
          ...session,
          replay: { ...session.replay!, active: false, idx: 0 },
        } : null,
      });
    }, TICK_MS / 3);
    clearReplayInterval();
    return;
  }

  useLiveMatchStore.setState({
    session: {
      ...session,
      replay: { ...session.replay, idx: session.replay.idx + 1 },
    },
  });
}

// ---------- Store ----------
export const useLiveMatchStore = create<LiveMatchStore>((set, get) => ({
  session: null,

  start: (home, away) => {
    const existing = get().session;
    if (existing && existing.snapshot.status === "finished") return;

    // Eğer aynı maç zaten varsa, tekrar simüle etme
    if (existing && existing.homeId === home.id && existing.awayId === away.id && existing.snapshot.status !== "idle") {
      // Pause'tan devam
      set({
        session: { ...existing, snapshot: { ...existing.snapshot, status: "live" } },
      });
      clearMatchInterval();
      intervalId = setInterval(tick, TICK_MS);
      return;
    }

    // Yeni maç — simüle et
    const storeState = useAppStore.getState();
    const userTactic = storeState.tactics.active ?? DEFAULT_TACTIC;
    const formation = userTactic.formation || "4-4-2";

    let homeSquad = pickStartingXIByFormation(home.players, formation) as unknown as MatchEnginePlayer[];
    const awaySquad = pickStartingXIByFormation(away.players, "4-4-2") as unknown as MatchEnginePlayer[];

    const slotRoles = storeState.tactics.slotRoles;
    const playerRoles: Record<string, string> = {};
    storeState.tactics.lineup.forEach((p, i) => {
      if (p && slotRoles[i]) {
        playerRoles[p.id] = slotRoles[i];
      }
    });
    // Rol bonuslarını homeSquad'a uygula (simulateEnhancedMatch otomatik uygulamaz)
    if (Object.keys(playerRoles).length > 0) {
      homeSquad = applyRoleBonuses(homeSquad as any, playerRoles) as unknown as MatchEnginePlayer[];
    }
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
      playerRoles: {} as Record<string, string>,
    };

    // Tüm 10 tesis seviyesini motor'a iletk
    const facilities = storeState.facilities;
    const levels = facilities.levels;
    const stadiumLevel = levels.stadium;
    const pitchLevel = levels.pitch;
    const lightingLevel = 0; // lighting ayrı facility değil
    const heatingLevel = 0;  // heating ayrı facility değil
    const medicalLevel = levels.medical;
    const scoreboardsLevel = 0; // scoreboards ayrı facility değil

    const atmosphereScore = Math.min(100, 40 + stadiumLevel * 6);
    const pitchPassBonus = pitchLevel > 0 ? pitchLevel * 0.02 : undefined;
    const lightingNightBonus = lightingLevel > 0 ? 1 + lightingLevel * 0.03 : undefined;
    const heatingProtection = heatingLevel > 0 ? Math.min(0.5, heatingLevel * 0.05) : undefined;
    const homeInjuryModifier = medicalLevel > 0 ? Math.max(0.5, 1 - medicalLevel * 0.05) : undefined;
    const fanMoraleBoost = scoreboardsLevel > 0 ? scoreboardsLevel * 0.02 : undefined;

    const homeTacticModifiers = computeInstructionModifiers(
      storeState.tactics.activeInstructions ?? {}
    );

    // Away takım için nötr modifier
    const awayTacticModifiers = { goalMod: 0, conceedMod: 0, counterMod: 0 };

    const result = simulateEnhancedMatch(
      homeSquad,
      awaySquad,
      homeTactic as any,
      awayTactic as any,
      {
        homeTeamName: home.name,
        awayTeamName: away.name,
        refereePersonality: pickRandomReferee() as any,
        refereeName: pickRandomRefereeName(),
        atmosphereScore,
        pitchPassBonus,
        lightingNightBonus,
        heatingProtection,
        homeInjuryModifier,
        fanMoraleBoost,
        homeTacticModifiers,
        awayTacticModifiers,
      } as any
    );

    const initialSnapshot: LiveMatchState = {
      status: "live",
      minute: 0,
      homeScore: 0,
      awayScore: 0,
      events: [],
      stats: { possession: [50, 50], shotsOnTarget: [0, 0], corners: [0, 0], fouls: [0, 0] },
      referee: {
        name: result.refereeName ?? "",
        personality: result.refereePersonality ?? "balanced",
      },
      weather: result.weather,
      playerRatings: {},
      playerMatchStats: {},
      subsUsed: { home: 0, away: 0 },
    };

    set({
      session: {
        homeId: home.id,
        awayId: away.id,
        fullResult: result,
        eventCursor: 0,
        snapshot: initialSnapshot,
      },
    });

    clearMatchInterval();
    intervalId = setInterval(tick, TICK_MS);
  },

  pause: () => {
    const session = get().session;
    if (!session || session.snapshot.status !== "live") return;
    set({
      session: { ...session, snapshot: { ...session.snapshot, status: "paused" } },
    });
    clearMatchInterval();
  },

  resume: () => {
    const session = get().session;
    if (!session || session.snapshot.status !== "paused") return;
    set({
      session: { ...session, snapshot: { ...session.snapshot, status: "live" } },
    });
    clearMatchInterval();
    intervalId = setInterval(tick, TICK_MS);
  },

  resumeSecondHalf: () => {
    const session = get().session;
    if (!session || session.snapshot.status !== "halftime") return;
    set({
      session: { ...session, snapshot: { ...session.snapshot, status: "live" } },
    });
    clearMatchInterval();
    intervalId = setInterval(tick, TICK_MS);
  },

  reset: () => {
    clearMatchInterval();
    clearReplayInterval();
    set({ session: null });
  },

  applyTactics: (side, newTactics) => {
    const session = get().session;
    if (!session) return;
    const tacticEvent: EnhancedMatchEvent = {
      minute: session.snapshot.minute,
      type: "foul",
      team: side,
      playerName: "Taktik Değişikliği",
      playerId: "",
      description: `Taktik değişikliği — formasyon ${(newTactics as any)?.formation ?? "4-4-2"}`,
      x: 50,
      y: 50,
      ratingImpact: 0,
    };
    session.fullResult.events.push(tacticEvent);
    // Snapshot'ı yeniden hesapla (cursor sabit, sadece events değişti)
    const newSnapshot = buildSnapshot(session.fullResult, session.eventCursor, session.snapshot.subsUsed);
    set({ session: { ...session, snapshot: newSnapshot } });
  },

  makeSub: (side, outPlayer, inPlayer) => {
    const session = get().session;
    if (!session) return false;
    if ((session.snapshot.subsUsed[side] ?? 0) >= 5) return false;

    const subEvent: EnhancedMatchEvent = {
      minute: session.snapshot.minute,
      type: "substitution",
      team: side,
      playerName: `${outPlayer.firstName} ${outPlayer.lastName} ➜ ${inPlayer.firstName} ${inPlayer.lastName}`,
      playerId: inPlayer.id,
      description: `Oyuncu değişikliği: ${outPlayer.firstName} ${outPlayer.lastName} ➜ ${inPlayer.firstName} ${inPlayer.lastName}`,
      x: 50,
      y: 50,
      ratingImpact: 0,
    };
    session.fullResult.events.push(subEvent);

    const newSubs = {
      ...session.snapshot.subsUsed,
      [side]: (session.snapshot.subsUsed[side] ?? 0) + 1,
    };
    const newSnapshot = buildSnapshot(session.fullResult, session.eventCursor, newSubs);
    set({
      session: {
        ...session,
        snapshot: { ...newSnapshot, subsUsed: newSubs },
      },
    });
    return true;
  },

  startReplay: () => {
    const session = get().session;
    if (!session) return;
    const events = [...session.fullResult.events].sort((a, b) => a.minute - b.minute);
    set({
      session: {
        ...session,
        replay: { active: true, events, idx: 0 },
      },
    });
    clearReplayInterval();
    replayIntervalId = setInterval(replayTick, TICK_MS / 3);
  },

  stopReplay: () => {
    clearReplayInterval();
    const session = get().session;
    if (!session || !session.replay) return;
    set({
      session: { ...session, replay: { ...session.replay, active: false, idx: 0 } },
    });
  },

  tickReplay: () => replayTick(),
}));

// ---------- Selectors ----------

export function useLiveMatch(): LiveMatchState | null {
  return useLiveMatchStore((s) => s.session?.snapshot ?? null);
}

export function useLiveMatchSession() {
  return useLiveMatchStore();
}
