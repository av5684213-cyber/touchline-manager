import type { Player, Team } from "@/lib/mock/data";

/**
 * Match engine — canlı maç simülasyonu.
 * 800ms = 1 oyun dakikası. Weighted event üretimi.
 * 90' + 1-5 dk uzatma.
 */

export type RefereePersonality = "strict" | "balanced" | "soft";
export type Weather = "sunny" | "rainy" | "windy";
export type MatchStatus = "idle" | "live" | "paused" | "finished";

export type EventType =
  | "goal"
  | "yellow"
  | "red"
  | "injury"
  | "sub"
  | "weather"
  | "tactic";

export type Side = "home" | "away" | "neutral";

export type MatchEvent = {
  id: string;
  minute: number;
  type: EventType;
  side: Side;
  text: { tr: string; en: string };
  playerId?: string;
  assistId?: string;
  playerName?: string;
  assistName?: string;
  reason?: "foul" | "dive" | "argue" | "tackle";
  severity?: "minor" | "moderate" | "severe";
  subOutId?: string;
  subInId?: string;
  subOutName?: string;
  subInName?: string;
};

export type MatchStats = {
  possession: [number, number];
  shotsOnTarget: [number, number];
  corners: [number, number];
  fouls: [number, number];
};

export type MatchTactics = {
  formation: string;
  pressing: number;
  defensiveLine: number;
  tempo: number;
  width: number;
};

export type MatchState = {
  status: MatchStatus;
  minute: number;
  stoppageMinutes: number;
  homeScore: number;
  awayScore: number;
  events: MatchEvent[];
  stats: MatchStats;
  referee: { name: string; personality: RefereePersonality };
  weather: Weather;
  ratings: Record<string, number>;
  playerMatchStats: Record<
    string,
    { goals: number; assists: number; yellow: number; red: number }
  >;
  subsUsed: { home: number; away: number };
  motmPlayerId?: string;
  startedAt?: number;
};

const REFEREE_NAMES_TR = [
  "Halil Umut Meler", "Cüneyt Çakır", "Fırat Aydınus",
  "Mete Kalkavan", "Mustafa Öğretmenoğlu", "Ali Palabıyık",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(n: number, lo = 0, hi = 100) {
  return Math.max(lo, Math.min(hi, n));
}

let _eid = 0;
function nextEventId() {
  _eid += 1;
  return `e_${_eid.toString(36)}`;
}

function teamQuality(team: Team): number {
  const sorted = [...team.players].sort((a, b) => b.ovr - a.ovr).slice(0, 11);
  return sorted.reduce((s, p) => s + p.ovr, 0) / 11;
}

function attackers(team: Team): Player[] {
  return team.players.filter(
    (p) => ["ST", "CF", "LW", "RW", "CAM"].includes(p.position)
  );
}

function midfielders(team: Team): Player[] {
  return team.players.filter((p) =>
    ["CM", "CDM", "CAM", "LW", "RW"].includes(p.position)
  );
}

function outfieldPlayers(team: Team): Player[] {
  return team.players.filter((p) => p.position !== "GK");
}

export function createMatchState(home: Team, away: Team): MatchState {
  const personalities: RefereePersonality[] = ["strict", "balanced", "balanced", "soft"];
  const weathers: Weather[] = ["sunny", "sunny", "rainy", "windy"];

  const ratings: Record<string, number> = {};
  for (const p of home.players) ratings[p.id] = 6.5;
  for (const p of away.players) ratings[p.id] = 6.5;

  const playerMatchStats: MatchState["playerMatchStats"] = {};
  for (const p of [...home.players, ...away.players]) {
    playerMatchStats[p.id] = { goals: 0, assists: 0, yellow: 0, red: 0 };
  }

  return {
    status: "idle",
    minute: 0,
    stoppageMinutes: 0,
    homeScore: 0,
    awayScore: 0,
    events: [],
    stats: {
      possession: [50, 50],
      shotsOnTarget: [0, 0],
      corners: [0, 0],
      fouls: [0, 0],
    },
    referee: {
      name: pick(REFEREE_NAMES_TR),
      personality: pick(personalities),
    },
    weather: pick(weathers),
    ratings,
    playerMatchStats,
    subsUsed: { home: 0, away: 0 },
  };
}

type Ctx = {
  state: MatchState;
  home: Team;
  away: Team;
  tactics: { home: MatchTactics; away: MatchTactics };
  locale: "tr" | "en";
};

function qualityGap(ctx: Ctx): number {
  return teamQuality(ctx.home) - teamQuality(ctx.away);
}

function pickScorer(ctx: Ctx, side: Side): { player: Player; assist?: Player } | null {
  const team = side === "home" ? ctx.home : ctx.away;
  const atk = attackers(team);
  if (atk.length === 0) return null;
  const weights = atk.map((p) => Math.pow(p.ovr, 2));
  const total = weights.reduce((s, w) => s + w, 0);
  let r = Math.random() * total;
  let scorer = atk[0];
  for (let i = 0; i < atk.length; i++) {
    r -= weights[i];
    if (r <= 0) { scorer = atk[i]; break; }
  }
  const mid = midfielders(team).filter((p) => p.id !== scorer.id);
  let assist: Player | undefined;
  if (mid.length > 0 && Math.random() < 0.5) {
    const w2 = mid.map((p) => Math.pow(p.ovr, 1.5));
    const t2 = w2.reduce((s, w) => s + w, 0);
    let r2 = Math.random() * t2;
    for (let i = 0; i < mid.length; i++) {
      r2 -= w2[i];
      if (r2 <= 0) { assist = mid[i]; break; }
    }
  }
  return { player: scorer, assist };
}

function maybeGoal(ctx: Ctx): MatchEvent | null {
  const gap = qualityGap(ctx);
  const pressingBoost = (ctx.tactics.home.pressing - 50) / 200;
  const homeBonus = gap / 200 + pressingBoost;
  const awayBonus = -gap / 200 + (ctx.tactics.away.pressing - 50) / 200;

  const homeChance = 0.03 + homeBonus;
  const awayChance = 0.03 + awayBonus;
  const r = Math.random();
  if (r < homeChance) {
    const s = pickScorer(ctx, "home");
    if (!s) return null;
    const minute = ctx.state.minute;
    ctx.state.homeScore += 1;
    ctx.state.stats.shotsOnTarget[0] += 1;
    if (s.assist) ctx.state.playerMatchStats[s.assist.id].assists += 1;
    ctx.state.playerMatchStats[s.player.id].goals += 1;
    ctx.state.ratings[s.player.id] = Math.min(9.5, (ctx.state.ratings[s.player.id] ?? 6.5) + 1.0);
    if (s.assist) ctx.state.ratings[s.assist.id] = Math.min(9.5, (ctx.state.ratings[s.assist.id] ?? 6.5) + 0.6);

    const scorerName = `${s.player.firstName} ${s.player.lastName}`;
    const assistName = s.assist ? `${s.assist.firstName} ${s.assist.lastName}` : null;
    return {
      id: nextEventId(),
      minute,
      type: "goal",
      side: "home",
      text: {
        tr: assistName ? `GOL! ${scorerName} (${assistName} asist)` : `GOL! ${scorerName}`,
        en: assistName ? `GOAL! ${scorerName} (${assistName} assist)` : `GOAL! ${scorerName}`,
      },
      playerId: s.player.id,
      playerName: scorerName,
      assistId: s.assist?.id,
      assistName: assistName ?? undefined,
    };
  }
  if (r < homeChance + awayChance) {
    const s = pickScorer(ctx, "away");
    if (!s) return null;
    ctx.state.awayScore += 1;
    ctx.state.stats.shotsOnTarget[1] += 1;
    if (s.assist) ctx.state.playerMatchStats[s.assist.id].assists += 1;
    ctx.state.playerMatchStats[s.player.id].goals += 1;
    ctx.state.ratings[s.player.id] = Math.min(9.5, (ctx.state.ratings[s.player.id] ?? 6.5) + 1.0);
    if (s.assist) ctx.state.ratings[s.assist.id] = Math.min(9.5, (ctx.state.ratings[s.assist.id] ?? 6.5) + 0.6);

    const scorerName = `${s.player.firstName} ${s.player.lastName}`;
    const assistName = s.assist ? `${s.assist.firstName} ${s.assist.lastName}` : null;
    return {
      id: nextEventId(),
      minute: ctx.state.minute,
      type: "goal",
      side: "away",
      text: {
        tr: assistName ? `GOL! ${scorerName} (${assistName} asist)` : `GOL! ${scorerName}`,
        en: assistName ? `GOAL! ${scorerName} (${assistName} assist)` : `GOAL! ${scorerName}`,
      },
      playerId: s.player.id,
      playerName: scorerName,
      assistId: s.assist?.id,
      assistName: assistName ?? undefined,
    };
  }
  return null;
}

function reasonTr(r: "foul" | "dive" | "argue" | "tackle") {
  return r === "foul" ? "faul" : r === "dive" ? "dalış" : r === "argue" ? "itiraz" : "sert müdahale";
}
function reasonEn(r: "foul" | "dive" | "argue" | "tackle") {
  return r;
}
function severityTr(s: "minor" | "moderate" | "severe") {
  return s === "minor" ? "hafif" : s === "moderate" ? "orta" : "ağır";
}

function maybeCard(ctx: Ctx): MatchEvent | null {
  const refMult = ctx.state.referee.personality === "strict" ? 2 :
    ctx.state.referee.personality === "soft" ? 0.5 : 1;
  const chance = 0.015 * refMult;
  if (Math.random() > chance) return null;

  const isHome = Math.random() < 0.5;
  const team = isHome ? ctx.home : ctx.away;
  const side: Side = isHome ? "home" : "away";
  const pl = pick(outfieldPlayers(team));
  if (!pl) return null;

  const reasons: ("foul" | "dive" | "argue" | "tackle")[] = ["foul", "tackle", "argue", "dive"];
  const reason = pick(reasons);

  const isRed = Math.random() < 0.05;
  const minute = ctx.state.minute;
  const name = `${pl.firstName} ${pl.lastName}`;
  if (isRed) {
    ctx.state.playerMatchStats[pl.id].red += 1;
    ctx.state.ratings[pl.id] = Math.max(3.0, (ctx.state.ratings[pl.id] ?? 6.5) - 2.0);
    ctx.state.stats.fouls[isHome ? 0 : 1] += 1;
    return {
      id: nextEventId(),
      minute,
      type: "red",
      side,
      text: {
        tr: `Kırmızı kart! ${name} — ${reasonTr(reason)}`,
        en: `Red card! ${name} — ${reasonEn(reason)}`,
      },
      playerId: pl.id,
      playerName: name,
      reason,
    };
  }
  ctx.state.playerMatchStats[pl.id].yellow += 1;
  ctx.state.ratings[pl.id] = Math.max(3.5, (ctx.state.ratings[pl.id] ?? 6.5) - 0.5);
  ctx.state.stats.fouls[isHome ? 0 : 1] += 1;
  return {
    id: nextEventId(),
    minute,
    type: "yellow",
    side,
    text: {
      tr: `Sarı kart — ${name} (${reasonTr(reason)})`,
      en: `Yellow card — ${name} (${reasonEn(reason)})`,
    },
    playerId: pl.id,
    playerName: name,
    reason,
  };
}

function maybeInjury(ctx: Ctx): MatchEvent | null {
  const tempoAvg = (ctx.tactics.home.tempo + ctx.tactics.away.tempo) / 2;
  const mult = tempoAvg > 80 ? 2 : 1;
  if (Math.random() > 0.003 * mult) return null;

  const isHome = Math.random() < 0.5;
  const team = isHome ? ctx.home : ctx.away;
  const side: Side = isHome ? "home" : "away";
  const pl = pick(outfieldPlayers(team));
  if (!pl) return null;
  const severities = ["minor", "minor", "moderate", "severe"] as const;
  const severity = pick(severities);
  const name = `${pl.firstName} ${pl.lastName}`;
  ctx.state.ratings[pl.id] = Math.max(4.0, (ctx.state.ratings[pl.id] ?? 6.5) - 0.8);
  return {
    id: nextEventId(),
    minute: ctx.state.minute,
    type: "injury",
    side,
    text: {
      tr: `Sakatlık — ${name} (${severityTr(severity)})`,
      en: `Injury — ${name} (${severity})`,
    },
    playerId: pl.id,
    playerName: name,
    severity,
  };
}

function maybeWeatherWarning(ctx: Ctx): MatchEvent | null {
  if (ctx.state.weather === "sunny") return null;
  if (![25, 50, 75].includes(ctx.state.minute)) return null;
  if (ctx.state.events.some((e) => e.type === "weather" && e.minute === ctx.state.minute)) return null;
  const msg = ctx.state.weather === "rainy"
    ? { tr: "Yağmur şiddetini artırdı — pas isabeti düşüyor", en: "Rain intensifying — passing accuracy dropping" }
    : { tr: "Rüzgar yön değiştirdi — uzun toplar riskli", en: "Wind shifting — long balls risky" };
  return {
    id: nextEventId(),
    minute: ctx.state.minute,
    type: "weather",
    side: "neutral",
    text: msg,
  };
}

function updateStats(ctx: Ctx) {
  const gap = qualityGap(ctx);
  const homePress = (ctx.tactics.home.pressing - 50) / 4;
  const awayPress = (ctx.tactics.away.pressing - 50) / 4;
  const homeScore = gap / 2 + homePress - awayPress + 50;
  const newHome = clamp(Math.round(homeScore), 30, 70);
  ctx.state.stats.possession = [newHome, 100 - newHome];

  if (Math.random() < 0.2) ctx.state.stats.corners[Math.random() < 0.5 ? 0 : 1] += 1;
  const foulChance = 0.15 + (ctx.tactics.home.tempo + ctx.tactics.away.tempo - 100) / 800;
  if (Math.random() < foulChance) {
    ctx.state.stats.fouls[Math.random() < 0.5 ? 0 : 1] += 1;
  }
}

export function tick(ctx: Ctx): MatchEvent[] {
  if (ctx.state.status !== "live") return [];
  const newEvents: MatchEvent[] = [];

  if (ctx.state.minute === 90 && ctx.state.stoppageMinutes === 0) {
    ctx.state.stoppageMinutes = rand(1, 5);
  }

  if (ctx.state.minute >= 90 + ctx.state.stoppageMinutes) {
    ctx.state.status = "finished";
    ctx.state.minute = 90 + ctx.state.stoppageMinutes;
    finalizeRatings(ctx);
    return [];
  }

  ctx.state.minute += 1;

  const goal = maybeGoal(ctx);
  if (goal) newEvents.push(goal);
  const card = maybeCard(ctx);
  if (card) newEvents.push(card);
  const injury = maybeInjury(ctx);
  if (injury) newEvents.push(injury);
  const weather = maybeWeatherWarning(ctx);
  if (weather) newEvents.push(weather);

  updateStats(ctx);

  return newEvents;
}

function finalizeRatings(ctx: Ctx) {
  const diff = ctx.state.homeScore - ctx.state.awayScore;
  if (diff > 0) {
    bumpTeam(ctx, ctx.home, 0.3);
    bumpTeam(ctx, ctx.away, -0.3);
  } else if (diff < 0) {
    bumpTeam(ctx, ctx.home, -0.3);
    bumpTeam(ctx, ctx.away, 0.3);
  }
  let best: { id: string; rating: number } | null = null;
  for (const [id, rating] of Object.entries(ctx.state.ratings)) {
    if (!best || rating > best.rating) best = { id, rating };
  }
  if (best) ctx.state.motmPlayerId = best.id;
}

function bumpTeam(ctx: Ctx, team: Team, delta: number) {
  for (const p of team.players) {
    ctx.state.ratings[p.id] = clamp(
      (ctx.state.ratings[p.id] ?? 6.5) + delta,
      3.0,
      9.5
    );
  }
}

export function applyTacticChange(
  ctx: Ctx,
  side: Side,
  newTactics: MatchTactics
): MatchEvent {
  ctx.tactics[side] = newTactics;
  return {
    id: nextEventId(),
    minute: ctx.state.minute,
    type: "tactic",
    side,
    text: {
      tr: `Taktik değişikliği — formasyon ${newTactics.formation}`,
      en: `Tactic change — formation ${newTactics.formation}`,
    },
  };
}

export function applySub(
  ctx: Ctx,
  side: Side,
  outPlayer: Player,
  inPlayer: Player
): MatchEvent | null {
  if (ctx.state.subsUsed[side] >= 5) return null;
  ctx.state.subsUsed[side] += 1;
  const outName = `${outPlayer.firstName} ${outPlayer.lastName}`;
  const inName = `${inPlayer.firstName} ${inPlayer.lastName}`;
  return {
    id: nextEventId(),
    minute: ctx.state.minute,
    type: "sub",
    side,
    text: {
      tr: `Değişiklik — ${outName} ➜ ${inName}`,
      en: `Substitution — ${outName} ➜ ${inName}`,
    },
    subOutId: outPlayer.id,
    subInId: inPlayer.id,
    subOutName: outName,
    subInName: inName,
  };
}

export type { Team, Player };
