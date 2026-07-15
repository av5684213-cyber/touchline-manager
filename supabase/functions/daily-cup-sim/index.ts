// =============================================================================
// Edge Function: daily-cup-sim
// =============================================================================
// Her Cumartesi TR 12:00'de çağrılır.
// Kupa maçlarını (eleme) simüle eder.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SB_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_KEY") ?? "";

function isSaturdayTR(now = new Date()): boolean {
  const trDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return trDate.getUTCDay() === 6; // Cumartesi
}

// Takım gücü hesapla
function calculateTeamStrength(players: any[]): number {
  if (!players || players.length === 0) return 50;
  const sorted = [...players].sort((a, b) => b.rating - a.rating).slice(0, 11);
  return sorted.reduce((s, p) => s + p.rating, 0) / sorted.length;
}

function poissonRandom(lambda: number): number {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulateMatch(homeRating: number, awayRating: number): { home: number; away: number } {
  const homeAdv = 5;
  const diff = homeRating + homeAdv - awayRating;
  const homeExpected = Math.max(0.3, 1.4 + diff * 0.02);
  const awayExpected = Math.max(0.2, 1.1 - diff * 0.02);

  let homeGoals = poissonRandom(homeExpected);
  let awayGoals = poissonRandom(awayExpected);

  // Kupa = eleme — beraberlik olamaz, penaltılara git
  if (homeGoals === awayGoals) {
    // Uzatma — 1-2 gol ekle
    homeGoals += Math.floor(Math.random() * 2);
    awayGoals += Math.floor(Math.random() * 2);
    // Hâlâ beraberlik varsa penaltı — rastgele kazanan
    if (homeGoals === awayGoals) {
      if (Math.random() < 0.5) homeGoals++;
      else awayGoals++;
    }
  }

  return { home: homeGoals, away: awayGoals };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, apikey, content-type",
      },
    });
  }

  const body = await req.json().catch(() => ({}));
  const force = body?.force === true;

  if (!force && !isSaturdayTR()) {
    return new Response(JSON.stringify({ skipped: "not saturday" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Bracket var mı kontrol et
  const { data: existingMatches } = await supabase
    .from("cup_matches")
    .select("id")
    .limit(1);

  if (!existingMatches || existingMatches.length === 0) {
    // Bracket oluştur
    const { error: genErr } = await supabase.rpc("generate_cup_bracket");
    if (genErr) {
      return new Response(JSON.stringify({ error: genErr.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  // 2. Mevcut round'u bul — scheduled maç olan en küçük round
  const { data: currentRoundMatches } = await supabase
    .from("cup_matches")
    .select("id, round_number, match_number, home_team_id, away_team_id")
    .eq("status", "scheduled")
    .not("home_team_id", "is", null)
    .not("away_team_id", "is", null)
    .order("round_number", { ascending: true });

  if (!currentRoundMatches || currentRoundMatches.length === 0) {
    return new Response(JSON.stringify({
      success: true,
      simulated: 0,
      reason: "no cup matches to play",
    }), { headers: { "Content-Type": "application/json" } });
  }

  // 3. Tüm takım ID'lerini topla
  const teamIds = new Set<string>();
  for (const m of currentRoundMatches) {
    if (m.home_team_id) teamIds.add(m.home_team_id);
    if (m.away_team_id) teamIds.add(m.away_team_id);
  }

  // 4. Oyuncuları getir
  const { data: allPlayers } = await supabase
    .from("players")
    .select("id, team_id, rating")
    .in("team_id", [...teamIds]);

  const teamPlayers: Record<string, any[]> = {};
  for (const p of allPlayers ?? []) {
    if (!teamPlayers[p.team_id]) teamPlayers[p.team_id] = [];
    teamPlayers[p.team_id].push(p);
  }

  // 5. Her maçı simüle et
  const results: any[] = [];
  const refereeNames = ["Mehmet Yıldırım", "Ali Demir", "Hasan Şahin", "Cem Aydın", "Murat Çelik"];
  const weatherTypes = ["sunny", "rainy", "windy"];

  for (const match of currentRoundMatches) {
    const homePlayers = teamPlayers[match.home_team_id] ?? [];
    const awayPlayers = teamPlayers[match.away_team_id] ?? [];

    const homeRating = calculateTeamStrength(homePlayers);
    const awayRating = calculateTeamStrength(awayPlayers);

    const result = simulateMatch(homeRating, awayRating);
    const referee = refereeNames[Math.floor(Math.random() * refereeNames.length)];
    const weather = weatherTypes[Math.floor(Math.random() * weatherTypes.length)];

    // Maç sonucunu kaydet
    const { data: rpcResult, error: rpcErr } = await supabase.rpc("record_cup_result", {
      p_match_id: match.id,
      p_home_score: result.home,
      p_away_score: result.away,
    });

    // Hakem + hava güncelle
    await supabase
      .from("cup_matches")
      .update({ referee_name: referee, weather })
      .eq("id", match.id);

    // Takım isimlerini getir
    const { data: homeTeam } = await supabase
      .from("teams")
      .select("name")
      .eq("id", match.home_team_id)
      .maybeSingle();
    const { data: awayTeam } = await supabase
      .from("teams")
      .select("name")
      .eq("id", match.away_team_id)
      .maybeSingle();

    const isPenalty = result.home === result.away + 1 || result.away === result.home + 1;
    results.push({
      round: match.round_number,
      home: homeTeam?.name ?? "?",
      away: awayTeam?.name ?? "?",
      score: `${result.home}-${result.away}`,
      winner: result.home > result.away ? homeTeam?.name : awayTeam?.name,
    });
  }

  return new Response(JSON.stringify({
    success: true,
    round: currentRoundMatches[0]?.round_number,
    simulated: results.length,
    results: results.slice(0, 20),
  }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
