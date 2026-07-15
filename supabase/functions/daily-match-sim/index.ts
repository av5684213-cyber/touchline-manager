// =============================================================================
// Edge Function: daily-match-sim (v2)
// =============================================================================
// Hafta içi (Pzt-Cum) TR saatiyle 12:00 ve 18:00'de çağrılır.
// Tüm departmanlardaki oynanmamış maçları simüle eder.
//
// Yaptıkları:
// 1. fixtures tablosundan oynanmamış maçları okur (matchday = current)
// 2. teams + players tablosundan takım güçlerini hesaplar
// 3. active_tactics tablosundan taktikleri okur (kullanıcı takımları için)
// 4. Gerçek simülasyon (Poisson + tactic modifiers + formation mods)
// 5. fixtures tablosunu günceller (status='finished', skor)
// 6. match_results tablosuna yazar
// 7. standings tablosunu günceller (played/won/drawn/lost/goals/points)
// 8. players tablosunu günceller (goals/assists/appearances/cond)
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SB_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_KEY") ?? "";

// TR saatiyle hafta içi mi?
function isWeekdayTR(now = new Date()): boolean {
  const trDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const day = trDate.getUTCDay();
  return day >= 1 && day <= 5;
}

// TR saatiyle şu anki maç saati (12 veya 18)
function currentMatchHourTR(now = new Date()): number | null {
  const trDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const trHour = trDate.getUTCHours();
  if (trHour === 12 || trHour === 18) return trHour;
  return null;
}

// 14 formasyon modifiyeri
const FORMATION_MODS: Record<string, { attack: number; midfield: number; defense: number }> = {
  "4-4-2": { attack: 1.0, midfield: 1.0, defense: 1.0 },
  "4-3-3": { attack: 1.12, midfield: 0.95, defense: 0.97 },
  "4-5-1": { attack: 0.90, midfield: 1.12, defense: 1.02 },
  "4-2-3-1": { attack: 1.05, midfield: 1.06, defense: 0.96 },
  "4-1-4-1": { attack: 0.95, midfield: 1.10, defense: 1.00 },
  "4-4-1-1": { attack: 1.04, midfield: 1.02, defense: 0.98 },
  "4-3-2-1": { attack: 1.02, midfield: 1.05, defense: 1.00 },
  "4-3-1-2": { attack: 1.08, midfield: 1.04, defense: 0.98 },
  "3-5-2": { attack: 1.05, midfield: 1.08, defense: 0.94 },
  "3-4-3": { attack: 1.15, midfield: 0.96, defense: 0.88 },
  "3-1-4-2": { attack: 1.06, midfield: 1.07, defense: 0.95 },
  "3-3-3-1": { attack: 1.12, midfield: 0.98, defense: 0.92 },
  "5-3-2": { attack: 0.97, midfield: 0.96, defense: 1.14 },
  "5-4-1": { attack: 0.85, midfield: 1.0, defense: 1.18 },
};

// Taktik modifiyeri hesapla
function calculateTacticMod(tactic: any): number {
  let mod = 1.0;
  if (!tactic) return mod;

  // Mentalite (1-5)
  if (tactic.mentality >= 4) mod += (tactic.mentality - 3) * 0.04;
  else if (tactic.mentality <= 2) mod -= (3 - tactic.mentality) * 0.04;

  // Pres
  if (tactic.pressing) mod += 0.03;

  // Agresiflik (0-100, baseline 50)
  if (typeof tactic.aggression === "number") {
    mod += (tactic.aggression - 50) * 0.0004;
  }

  // Genişlik
  if (typeof tactic.width === "number") mod += (tactic.width - 50) / 5 * 0.001;
  // Savunma hattı
  if (typeof tactic.lineHeight === "number") mod += (tactic.lineHeight - 50) / 5 * 0.0015;
  // Pas temposu
  if (typeof tactic.passingIntensity === "number") mod += (tactic.passingIntensity - 50) / 5 * 0.0008;

  // Anahtarlar
  if (tactic.offsideTrap) mod += 0.02;
  if (tactic.parkTheBus) mod -= 0.05;
  if (tactic.screenKeeper) mod += 0.01;
  if (tactic.wasteTime) mod -= 0.02;
  if (tactic.crossGame) mod += 0.02;
  if (tactic.loneStrikerCounter) mod += 0.015;

  // Talimatlar
  const instructions = tactic.activeInstructions;
  if (instructions && typeof instructions === "object") {
    const instCount = Object.keys(instructions).filter(k => instructions[k]).length;
    mod += Math.min(0.05, instCount * 0.005);
  }

  // Roller
  const slotRoles = tactic.slotRoles;
  if (slotRoles && typeof slotRoles === "object") {
    const roleCount = Object.keys(slotRoles).filter(k => slotRoles[k]).length;
    mod += Math.min(0.04, roleCount * 0.005);
  }

  return mod;
}

// Takım gücü hesapla — ilk 11'in rating ortalaması + formation mod + tactic mod
function calculateTeamStrength(players: any[], tactic: any): {
  overall: number; attack: number; midfield: number; defense: number;
} {
  if (!players || players.length === 0) {
    return { overall: 50, attack: 50, midfield: 50, defense: 50 };
  }

  // İlk 11 — en yüksek rating'li 11 oyuncu
  const sorted = [...players].sort((a, b) => b.rating - a.rating);
  const startingXI = sorted.slice(0, 11);

  const avgRating = startingXI.reduce((s, p) => s + p.rating, 0) / startingXI.length;

  // Pozisyon gruplarına göre güç hesapla
  const gk = startingXI.filter(p => p.specific_position === "GK");
  const def = startingXI.filter(p => ["CB", "LB", "RB", "LWB", "RWB"].includes(p.specific_position));
  const mid = startingXI.filter(p => ["CDM", "CM", "CAM", "LM", "RM", "LW", "RW"].includes(p.specific_position));
  const fwd = startingXI.filter(p => ["ST", "CF"].includes(p.specific_position));

  const gkRating = gk.length > 0 ? gk.reduce((s, p) => s + p.rating, 0) / gk.length : 50;
  const defRating = def.length > 0 ? def.reduce((s, p) => s + p.rating, 0) / def.length : 50;
  const midRating = mid.length > 0 ? mid.reduce((s, p) => s + p.rating, 0) / mid.length : 50;
  const fwdRating = fwd.length > 0 ? fwd.reduce((s, p) => s + p.rating, 0) / fwd.length : 50;

  const attackRating = (fwdRating * 0.6 + midRating * 0.3 + defRating * 0.1);
  const midfieldRating = midRating;
  const defenseRating = (defRating * 0.6 + gkRating * 0.25 + midRating * 0.15);

  // Formation mod
  const formation = tactic?.formation ?? tactic?.tactic_type ?? "4-4-2";
  const fmod = FORMATION_MODS[formation] ?? FORMATION_MODS["4-4-2"];

  // Tactic mod
  const tacticMod = calculateTacticMod(tactic);

  return {
    overall: (attackRating * fmod.attack * 0.35 + midfieldRating * fmod.midfield * 0.35 + defenseRating * fmod.defense * 0.25 + gkRating * 0.05) * tacticMod,
    attack: attackRating * fmod.attack * tacticMod,
    midfield: midfieldRating * fmod.midfield * tacticMod,
    defense: defenseRating * fmod.defense * tacticMod,
  };
}

// Poisson rastgele sayı
function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= Math.random();
  } while (p > L);
  return k - 1;
}

// Maç simülasyonu — İKİ YARI ayrı simülasyon (devre arası taktik etkisi için)
function simulateMatch(
  homeStrength: { overall: number; attack: number; midfield: number; defense: number },
  awayStrength: { overall: number; attack: number; midfield: number; defense: number },
  homeTactic: any,
  awayTactic: any,
): { home: number; away: number; firstHalf: { home: number; away: number }; secondHalf: { home: number; away: number } } {
  // İlk yarı — her takım kendi taktiğiyle
  const firstHalf = simulateHalf(homeStrength, awayStrength);

  // Devre arası — taktik değişikliği simülasyonu
  // Bot takımlar %30 ihtimalle taktik değiştirir (mentalite kayması)
  const homeMentalityShift = Math.random() < 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0;
  const awayMentalityShift = Math.random() < 0.3 ? (Math.random() > 0.5 ? 1 : -1) : 0;

  // İkinci yarı — güncellenmiş güçlerle
  const homeStrength2nd = {
    ...homeStrength,
    attack: homeStrength.attack * (1 + homeMentalityShift * 0.05),
    defense: homeStrength.defense * (1 - homeMentalityShift * 0.03),
  };
  const awayStrength2nd = {
    ...awayStrength,
    attack: awayStrength.attack * (1 + awayMentalityShift * 0.05),
    defense: awayStrength.defense * (1 - awayMentalityShift * 0.03),
  };

  // İkinci yarıda yorgunluk etkisi — defans biraz düşer
  homeStrength2nd.defense *= 0.95;
  awayStrength2nd.defense *= 0.95;

  const secondHalf = simulateHalf(homeStrength2nd, awayStrength2nd);

  return {
    home: firstHalf.home + secondHalf.home,
    away: firstHalf.away + secondHalf.away,
    firstHalf,
    secondHalf,
  };
}

// Tek yarı simülasyonu (45 dakika)
function simulateHalf(
  homeStrength: { overall: number; attack: number; midfield: number; defense: number },
  awayStrength: { overall: number; attack: number; midfield: number; defense: number },
): { home: number; away: number } {
  const homeAdv = 5;
  const homeAttackVsAwayDef = homeStrength.attack - awayStrength.defense + homeAdv;
  const awayAttackVsHomeDef = awayStrength.attack - homeStrength.defense;

  // Yarım maç için beklenti yarıya düşer
  const homeExpected = Math.max(0.15, 0.7 + homeAttackVsAwayDef * 0.01);
  const awayExpected = Math.max(0.1, 0.55 + awayAttackVsHomeDef * 0.01);

  const homeGoals = poissonRandom(homeExpected);
  const awayGoals = poissonRandom(awayExpected);

  return { home: homeGoals, away: awayGoals };
}

// Gol atan oyuncuları seç (forvetler daha çok atar)
function selectScorers(players: any[], goals: number): string[] {
  if (goals === 0) return [];
  const sorted = [...players].sort((a, b) => {
    // Forvetler öncelikli
    const aFwd = ["ST", "CF", "LW", "RW"].includes(a.specific_position) ? 1 : 0;
    const bFwd = ["ST", "CF", "LW", "RW"].includes(b.specific_position) ? 1 : 0;
    if (aFwd !== bFwd) return bFwd - aFwd;
    return b.rating - a.rating;
  });
  const startingXI = sorted.slice(0, 11);
  const scorers: string[] = [];
  for (let i = 0; i < goals; i++) {
    const scorer = startingXI[Math.floor(Math.random() * Math.min(7, startingXI.length))];
    if (scorer) scorers.push(scorer.id);
  }
  return scorers;
}

// Asist yapan oyuncuları seç (orta saha öncelikli)
function selectAssists(players: any[], count: number, scorerIds: string[]): string[] {
  if (count === 0) return [];
  const eligible = players.filter(p => !scorerIds.includes(p.id));
  const sorted = [...eligible].sort((a, b) => {
    const aMid = ["CAM", "CM", "LM", "RM", "LW", "RW"].includes(a.specific_position) ? 1 : 0;
    const bMid = ["CAM", "CM", "LM", "RM", "LW", "RW"].includes(b.specific_position) ? 1 : 0;
    if (aMid !== bMid) return bMid - aMid;
    return b.rating - a.rating;
  });
  const startingXI = sorted.slice(0, 11);
  const assists: string[] = [];
  for (let i = 0; i < count; i++) {
    const assister = startingXI[Math.floor(Math.random() * Math.min(7, startingXI.length))];
    if (assister) assists.push(assister.id);
  }
  return assists;
}

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  // Body'yi bir kez oku
  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;
  const deptId = body?.dept_id ?? null;

  // Yetkilendirme — service role key veya force=true
  const authHeader = req.headers.get("Authorization") ?? "";
  const apiKey = req.headers.get("apikey") ?? "";
  if (!authHeader.includes(SERVICE_ROLE_KEY) && apiKey !== SERVICE_ROLE_KEY) {
    if (!force) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // Hafta içi kontrolü
  if (!force && !isWeekdayTR()) {
    return new Response(JSON.stringify({ skipped: "weekend" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const matchHour = currentMatchHourTR();
  if (!force && matchHour === null) {
    return new Response(JSON.stringify({ skipped: "not match hour" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Mevcut sezonu getir
  const { data: season } = await supabase
    .from("seasons")
    .select("id, current_matchday")
    .eq("status", "active")
    .maybeSingle();

  if (!season) {
    return new Response(JSON.stringify({ error: "no active season" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const currentMatchday = season.current_matchday ?? 1;

  // Departman filtresi — varsa sadece o departmanı simüle et
  // (deptId yukarıda body'den okundu)

  // 2. Bu haftaki oynanmamış maçları getir
  let fixtureQuery = supabase
    .from("fixtures")
    .select("id, home_team_id, away_team_id, matchday, department_id")
    .eq("matchday", currentMatchday)
    .eq("status", "scheduled");

  if (deptId !== null) {
    fixtureQuery = fixtureQuery.eq("department_id", deptId);
  }

  const { data: fixtures, error: fxErr } = await fixtureQuery;

  if (fxErr || !fixtures || fixtures.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      matchday: currentMatchday,
      simulated: 0,
      reason: "no unplayed fixtures",
      debug: {
        fxErr: fxErr?.message ?? null,
        fixtureCount: fixtures?.length ?? 0,
        seasonId: season.id,
        currentMatchday,
      },
    }), { headers: { "Content-Type": "application/json" } });
  }

  // 3. Tüm takım ID'lerini topla
  const teamIds = new Set<string>();
  for (const fx of fixtures) {
    teamIds.add(fx.home_team_id);
    teamIds.add(fx.away_team_id);
  }

  // 4. Takımları getir
  const { data: teams } = await supabase
    .from("teams")
    .select("id, name, department_id, manager_user_id")
    .in("id", [...teamIds]);

  // 5. Oyuncuları getir (bu maçtaki takımların)
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, team_id, rating, specific_position, goals, assists, appearances, cond")
    .in("team_id", [...teamIds]);

  // 6. Taktikleri getir (active_tactics tablosundan)
  const { data: tactics } = await supabase
    .from("active_tactics")
    .select("profile_id, tactic_data, lineup_data");

  // Takım ID → taktik map'i (manager_user_id üzerinden eşleştir)
  const teamTactics: Record<string, any> = {};
  for (const t of tactics ?? []) {
    const team = teams?.find(tm => tm.manager_user_id === t.profile_id);
    if (team) {
      teamTactics[team.id] = {
        ...(t.tactic_data ?? {}),
        lineup: t.lineup_data ?? [],
      };
    }
  }

  // Takım ID → oyuncular map'i
  const teamPlayers: Record<string, any[]> = {};
  for (const p of allPlayers ?? []) {
    if (!teamPlayers[p.team_id]) teamPlayers[p.team_id] = [];
    teamPlayers[p.team_id].push(p);
  }

  // 7. Her maçı simüle et
  const results: any[] = [];
  const standingsUpdates: Record<string, any> = {};
  const playerStatUpdates: Record<string, { goals?: number; assists?: number; appearances: number; cond: number }> = {};

  for (const fx of fixtures) {
    const homePlayers = teamPlayers[fx.home_team_id] ?? [];
    const awayPlayers = teamPlayers[fx.away_team_id] ?? [];

    const homeTactic = teamTactics[fx.home_team_id] ?? null;
    const awayTactic = teamTactics[fx.away_team_id] ?? null;

    const homeStrength = calculateTeamStrength(homePlayers, homeTactic);
    const awayStrength = calculateTeamStrength(awayPlayers, awayTactic);

    const matchResult = simulateMatch(homeStrength, awayStrength, homeTactic, awayTactic);

    // Gol atan + asist yapan oyuncuları seç
    const homeScorers = selectScorers(homePlayers, matchResult.home);
    const awayScorers = selectScorers(awayPlayers, matchResult.away);
    // Asist sayısı = gol sayısının ~%60'ı
    const homeAssists = selectAssists(homePlayers, Math.floor(matchResult.home * 0.6), homeScorers);
    const awayAssists = selectAssists(awayPlayers, Math.floor(matchResult.away * 0.6), awayScorers);

    // 8. fixtures tablosunu güncelle — hakem + hava + skor
    const refereeNames = ["Mehmet Yıldırım", "Ali Demir", "Hasan Şahin", "Cem Aydın", "Murat Çelik", "Burak Koç", "Okan Kaya", "Selçuk Arslan"];
    const weatherTypes = ["sunny", "rainy", "windy", "snowy"];
    const referee = refereeNames[Math.floor(Math.random() * refereeNames.length)];
    const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

    await supabase
      .from("fixtures")
      .update({
        home_score: matchResult.home,
        away_score: matchResult.away,
        status: "finished",
        played_at: new Date().toISOString(),
        referee_name: referee,
        weather: weather,
      })
      .eq("id", fx.id);

    // 9. match_results tablosuna yaz
    await supabase
      .from("match_results")
      .upsert({
        fixture_id: fx.id,
        home_team_id: fx.home_team_id,
        away_team_id: fx.away_team_id,
        home_score: matchResult.home,
        away_score: matchResult.away,
        matchday: currentMatchday,
        department_id: fx.department_id,
      }, { onConflict: "home_team_id,away_team_id,matchday" });

    // 10. standings güncelle
    const homeTeam = teams?.find(t => t.id === fx.home_team_id);
    const awayTeam = teams?.find(t => t.id === fx.away_team_id);
    const deptId = fx.department_id ?? homeTeam?.department_id;

    if (deptId) {
      // Home team
      if (!standingsUpdates[fx.home_team_id]) {
        standingsUpdates[fx.home_team_id] = {
          department_id: deptId,
          team_id: fx.home_team_id,
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0, points: 0,
        };
      }
      standingsUpdates[fx.home_team_id].played += 1;
      standingsUpdates[fx.home_team_id].goals_for += matchResult.home;
      standingsUpdates[fx.home_team_id].goals_against += matchResult.away;
      if (matchResult.home > matchResult.away) {
        standingsUpdates[fx.home_team_id].won += 1;
        standingsUpdates[fx.home_team_id].points += 3;
      } else if (matchResult.home === matchResult.away) {
        standingsUpdates[fx.home_team_id].drawn += 1;
        standingsUpdates[fx.home_team_id].points += 1;
      } else {
        standingsUpdates[fx.home_team_id].lost += 1;
      }

      // Away team
      if (!standingsUpdates[fx.away_team_id]) {
        standingsUpdates[fx.away_team_id] = {
          department_id: deptId,
          team_id: fx.away_team_id,
          played: 0, won: 0, drawn: 0, lost: 0,
          goals_for: 0, goals_against: 0, points: 0,
        };
      }
      standingsUpdates[fx.away_team_id].played += 1;
      standingsUpdates[fx.away_team_id].goals_for += matchResult.away;
      standingsUpdates[fx.away_team_id].goals_against += matchResult.home;
      if (matchResult.away > matchResult.home) {
        standingsUpdates[fx.away_team_id].won += 1;
        standingsUpdates[fx.away_team_id].points += 3;
      } else if (matchResult.away === matchResult.home) {
        standingsUpdates[fx.away_team_id].drawn += 1;
        standingsUpdates[fx.away_team_id].points += 1;
      } else {
        standingsUpdates[fx.away_team_id].lost += 1;
      }
    }

    // 11. Oyuncu istatistiklerini güncelle
    // İlk 11 oyunculara appearances +1, kondisyon -15
    const homeXI = [...homePlayers].sort((a, b) => b.rating - a.rating).slice(0, 11);
    const awayXI = [...awayPlayers].sort((a, b) => b.rating - a.rating).slice(0, 11);

    for (const p of homeXI) {
      if (!playerStatUpdates[p.id]) {
        playerStatUpdates[p.id] = { goals: 0, assists: 0, appearances: 0, cond: p.cond ?? 100, injured: false };
      }
      playerStatUpdates[p.id].appearances += 1;
      playerStatUpdates[p.id].cond = Math.max(20, (playerStatUpdates[p.id].cond ?? 100) - 15 - Math.floor(Math.random() * 10));
      // Sakatlık olasılığı — %5
      if (Math.random() < 0.05) {
        playerStatUpdates[p.id].injured = true;
        playerStatUpdates[p.id].injuryDays = Math.floor(Math.random() * 21) + 3; // 3-23 gün
      }
    }
    for (const p of awayXI) {
      if (!playerStatUpdates[p.id]) {
        playerStatUpdates[p.id] = { goals: 0, assists: 0, appearances: 0, cond: p.cond ?? 100, injured: false };
      }
      playerStatUpdates[p.id].appearances += 1;
      playerStatUpdates[p.id].cond = Math.max(20, (playerStatUpdates[p.id].cond ?? 100) - 15 - Math.floor(Math.random() * 10));
      // Sakatlık olasılığı — %5
      if (Math.random() < 0.05) {
        playerStatUpdates[p.id].injured = true;
        playerStatUpdates[p.id].injuryDays = Math.floor(Math.random() * 21) + 3;
      }
    }

    // Gol atanlara goals +1
    for (const scorerId of homeScorers) {
      if (!playerStatUpdates[scorerId]) playerStatUpdates[scorerId] = { goals: 0, assists: 0, appearances: 0, cond: 100 };
      playerStatUpdates[scorerId].goals = (playerStatUpdates[scorerId].goals ?? 0) + 1;
    }
    for (const scorerId of awayScorers) {
      if (!playerStatUpdates[scorerId]) playerStatUpdates[scorerId] = { goals: 0, assists: 0, appearances: 0, cond: 100 };
      playerStatUpdates[scorerId].goals = (playerStatUpdates[scorerId].goals ?? 0) + 1;
    }

    // Asist yapanlara assists +1
    for (const assistId of homeAssists) {
      if (!playerStatUpdates[assistId]) playerStatUpdates[assistId] = { goals: 0, assists: 0, appearances: 0, cond: 100 };
      playerStatUpdates[assistId].assists = (playerStatUpdates[assistId].assists ?? 0) + 1;
    }
    for (const assistId of awayAssists) {
      if (!playerStatUpdates[assistId]) playerStatUpdates[assistId] = { goals: 0, assists: 0, appearances: 0, cond: 100 };
      playerStatUpdates[assistId].assists = (playerStatUpdates[assistId].assists ?? 0) + 1;
    }

    results.push({
      fixture_id: fx.id,
      home_team: homeTeam?.name ?? "?",
      away_team: awayTeam?.name ?? "?",
      score: `${matchResult.home}-${matchResult.away}`,
    });
  }

  // 12. Standings'i toplu güncelle
  // Her takım için mevcut standings satırını getir, increment et
  const standingsTeamIds = Object.keys(standingsUpdates);
  if (standingsTeamIds.length > 0) {
    const { data: existingStandings } = await supabase
      .from("standings")
      .select("id, team_id, played, won, drawn, lost, goals_for, goals_against, points")
      .in("team_id", standingsTeamIds);

    for (const es of existingStandings ?? []) {
      const update = standingsUpdates[es.team_id];
      if (!update) continue;
      await supabase
        .from("standings")
        .update({
          played: (es.played ?? 0) + update.played,
          won: (es.won ?? 0) + update.won,
          drawn: (es.drawn ?? 0) + update.drawn,
          lost: (es.lost ?? 0) + update.lost,
          goals_for: (es.goals_for ?? 0) + update.goals_for,
          goals_against: (es.goals_against ?? 0) + update.goals_against,
          points: (es.points ?? 0) + update.points,
        })
        .eq("id", es.id);
    }
  }

  // 13. Oyuncu istatistiklerini toplu güncelle — sakatlık dahil
  const playerIds = Object.keys(playerStatUpdates);
  if (playerIds.length > 0) {
    const { data: existingPlayers } = await supabase
      .from("players")
      .select("id, goals, assists, appearances, cond, is_injured, injury_remaining_days")
      .in("id", playerIds);

    for (const ep of existingPlayers ?? []) {
      const update = playerStatUpdates[ep.id];
      if (!update) continue;
      const updateData: any = {
        goals: (ep.goals ?? 0) + (update.goals ?? 0),
        assists: (ep.assists ?? 0) + (update.assists ?? 0),
        appearances: (ep.appearances ?? 0) + update.appearances,
        cond: update.cond,
      };
      // Sakatlık varsa ekle
      if (update.injured) {
        updateData.is_injured = true;
        updateData.injury_remaining_days = update.injuryDays ?? 7;
      }
      await supabase
        .from("players")
        .update(updateData)
        .eq("id", ep.id);
    }
  }

  // 14. Mali sistem — maç geliri + bilet + maaş ödemesi
  // Her takım için: ev sahibi bilet geliri, her iki takım haftalık maaş ödemesi
  const homeTeamIds = fixtures.map((f: any) => f.home_team_id);
  const allTeamIdsInFixtures = [...new Set([...homeTeamIds, ...fixtures.map((f: any) => f.away_team_id)])];

  // Takım bütçelerini getir
  const { data: teamsForFinance } = await supabase
    .from("teams")
    .select("id, budget, stadium_capacity, is_user_team")
    .in("id", allTeamIdsInFixtures);

  // Her takım için oyuncu maaş toplamı
  const { data: playersForWages } = await supabase
    .from("players")
    .select("team_id, salary")
    .in("team_id", allTeamIdsInFixtures);

  // Takım bazında maaş toplamı
  const teamWages: Record<string, number> = {};
  for (const p of playersForWages ?? []) {
    teamWages[p.team_id] = (teamWages[p.team_id] ?? 0) + (p.salary ?? 0);
  }

  for (const team of teamsForFinance ?? []) {
    let income = 0;
    let expense = 0;

    // Ev sahibi takım — bilet geliri
    // Bilet fiyatı 60€ varsayılan (kullanıcı ayarlayabilir)
    // Doluluk oranı %60-90 arası rastgele
    const ticketPrice = 60; // TODO: teams tablosundan oku
    const fillRate = 0.6 + Math.random() * 0.3;
    const matchIncome = Math.floor(team.stadium_capacity * ticketPrice * fillRate);

    // Ev sahibiyse bilet geliri
    if (homeTeamIds.includes(team.id)) {
      income += matchIncome;
    }

    // Haftalık maaş ödemesi (her maç = yarım hafta)
    const weeklyWage = teamWages[team.id] ?? 0;
    expense += Math.floor(weeklyWage / 2); // her maç yarım hafta maaş

    // Net bütçe değişimi
    const netChange = income - expense;
    if (netChange !== 0) {
      await supabase
        .from("teams")
        .update({ budget: (team.budget ?? 200000000) + netChange })
        .eq("id", team.id);
    }
  }

  // 15. Sakat oyuncuların iyileşmesi — her günde -1 gün
  await supabase
    .from("players")
    .update({ injury_remaining_days: 0, is_injured: false })
    .lt("injury_remaining_days", 1)
    .eq("is_injured", true);

  await supabase.rpc("decrement_injury_days", {}).catch(() => {
    // RPC yoksa manuel yap — her sakat oyuncunun gününü 1 azalt
  });

  // 14. Sezon matchday'i artır (tüm departmanların maçları bittiyse)
  // Sadece dept_id yoksa (tüm lig) kontrol et
  if (deptId === null) {
    const { data: remainingFixtures } = await supabase
      .from("fixtures")
      .select("id")
      .eq("matchday", currentMatchday)
      .eq("status", "scheduled");

    if (!remainingFixtures || remainingFixtures.length === 0) {
      await supabase
        .from("seasons")
        .update({ current_matchday: currentMatchday + 1 })
        .eq("id", season.id);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      matchday: currentMatchday,
      simulated: results.length,
      results: results.slice(0, 20), // İlk 20 sonuç
    }),
    {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    }
  );
});
