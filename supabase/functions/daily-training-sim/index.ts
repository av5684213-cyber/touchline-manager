// =============================================================================
// Edge Function: daily-training-sim (v2)
// =============================================================================
// v2.9.21 GÖREV 3: Sadece form_rating değil, GERÇEK stat büyümesi de yapar.
//
// Hafta içi TR 15:00 ve 21:00'de çağrılır.
// Tüm kullanıcıların app_state.state.training.assignments + bgpPlans okur.
//
// Her oyuncu için:
//   1. Program belirlenir (assignment.programId yoksa BGP planından)
//   2. program.targetStats'a göre stat kazancı:
//      - stat = min(99, current + gain)
//      - gain = random * 0.6 * facilityMult * ageMult * mentorBonus * ceilingFactor
//   3. cond -6 ila -12 arası düşer
//   4. rating = 6 stat'ın ortalaması
//   5. injury riski (intensity 80+ ise %3)
//   6. form_rating += 1.5 (max 15)
//   7. lastTrainingDate + lastTrainingHour güncelle
//
// SAAT FORMATI (v2.9.21 GÖREV 3):
//   Tüm yerlerde '15:00' ve '21:00' kullanılır (TR saatleri).
//   saveTrainingResults, /api/trainings POST, /api/cron/apply-training hepsi aynı.
// =============================================================================

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SB_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SB_SERVICE_KEY") ?? "";

function isWeekdayTR(now = new Date()): boolean {
  const trDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const day = trDate.getUTCDay();
  return day >= 1 && day <= 5;
}

function isTrainingHourTR(now = new Date()): boolean {
  const trDate = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const trHour = trDate.getUTCHours();
  return trHour === 15 || trHour === 21;
}

// Antrenman programları — targetStats + condCost + intensity
const TRAINING_PROGRAMS: Record<string, {
  targetStats: string[];
  condCost: number;
  intensity: number;
  moraleBonus?: number;
}> = {
  fiziksel_yukleme: { targetStats: ["stamina", "power", "speed"], condCost: -12, intensity: 80 },
  teknik_driller: { targetStats: ["passing", "control", "vision"], condCost: -6, intensity: 70 },
  hucum_antrenmani: { targetStats: ["shooting", "finishing", "dribbling"], condCost: -8, intensity: 75 },
  defansif_duzenleme: { targetStats: ["defending", "marking", "tackling"], condCost: -8, intensity: 70 },
  kaleci_antrenmani: { targetStats: ["goalkeeping", "reflexes", "handling"], condCost: -6, intensity: 65 },
  takim_kimyasi: { targetStats: ["teamwork", "vision", "decisions"], condCost: -4, intensity: 50, moraleBonus: 5 },
};

// Posizyon → stat mapping (BGP plans için)
const POSITION_STATS: Record<string, string[]> = {
  GK: ["goalkeeping", "reflexes", "handling"],
  CB: ["defending", "marking", "tackling", "heading"],
  LB: ["defending", "speed", "crossing", "stamina"],
  RB: ["defending", "speed", "crossing", "stamina"],
  LWB: ["defending", "speed", "crossing", "stamina"],
  RWB: ["defending", "speed", "crossing", "stamina"],
  CDM: ["defending", "passing", "stamina", "tackling"],
  CM: ["passing", "vision", "control", "stamina"],
  CAM: ["passing", "vision", "dribbling", "shooting"],
  LM: ["speed", "crossing", "dribbling", "passing"],
  RM: ["speed", "crossing", "dribbling", "passing"],
  LW: ["speed", "dribbling", "crossing", "shooting"],
  RW: ["speed", "dribbling", "crossing", "shooting"],
  ST: ["shooting", "finishing", "heading", "speed"],
  CF: ["shooting", "dribbling", "vision", "passing"],
};

// Oyuncu verisinden rating hesapla
function calculateRating(p: any): number {
  const pace = p.stats?.pace ?? p.speed ?? 50;
  const shooting = p.stats?.shooting ?? p.shooting ?? 50;
  const passing = p.stats?.passing ?? p.passing ?? 50;
  const defending = p.stats?.defending ?? p.defending ?? 50;
  const physical = p.stats?.physical ?? p.power ?? 50;
  const dribbling = p.stats?.dribbling ?? p.dribbling ?? 50;
  return Math.round((pace + shooting + passing + defending + physical + dribbling) / 6);
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

  if (!force && !isWeekdayTR()) {
    return new Response(JSON.stringify({ skipped: "weekend" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!force && !isTrainingHourTR()) {
    return new Response(JSON.stringify({ skipped: "not training hour" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // v2.9.21 GÖREV 3: app_state'ten tüm kullanıcıların state'ini oku
  const { data: states, error } = await supabase
    .from("app_state")
    .select("user_id, state");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let trainedUsers = 0;
  let trainedPlayers = 0;
  let statGainsTotal = 0;

  for (const row of states ?? []) {
    const state = row.state as any;
    if (!state?.training) continue;
    const training = state.training;

    // Kullanıcının oyuncuları clubs içinde (user_game_state.state.clubs)
    // Ama app_state.state'de clubs YOK — sadece facilities/training/news/cup var.
    // Oyuncular user_game_state tablosunda.
    // → user_game_state'ten clubs yükle, oyuncuları bul, stat büyüt, geri yaz.
    const { data: gameState } = await supabase
      .from("user_game_state")
      .select("state")
      .eq("profile_id", row.user_id)
      .maybeSingle();

    if (!gameState?.state) continue;
    const userState = gameState.state as any;
    if (!userState?.clubs) continue;

    // Kullanıcının takımı = myTeamId
    const myTeamId = userState.myTeamId;
    const myClub = userState.clubs.find((c: any) => c.id === myTeamId);
    if (!myClub?.players) continue;

    // Facility level — tesis seviyesi antrenman çarpanı
    const facilityLevel = state.facilities?.levels?.gym ?? 0;
    const facilityMult = 1.0 + facilityLevel * 0.1;

    // Mentor assignments
    const todayMentees = new Map<string, number>();
    for (const m of (training.mentorAssignments ?? [])) {
      todayMentees.set(m.menteeId, m.bonusRate);
    }

    let updated = false;
    const newPlayers = myClub.players.map((p: any) => {
      // Bu oyuncuya atanmış program var mı?
      const assignment = (training.assignments ?? []).find((a: any) => a.playerId === p.id);
      let programId = assignment?.programId;

      // BGP planı varsa onu kullan (fallback)
      const bgpPlan = training.bgpPlans?.[p.id];
      if (!programId && bgpPlan?.statKeys?.length > 0) {
        // BGP planından stat'lara göre bir program seç
        const stats = bgpPlan.statKeys;
        if (stats.includes("goalkeeping")) programId = "kaleci_antrenmani";
        else if (stats.includes("defending") || stats.includes("marking")) programId = "defansif_duzenleme";
        else if (stats.includes("shooting") || stats.includes("finishing")) programId = "hucum_antrenmani";
        else if (stats.includes("passing") || stats.includes("vision")) programId = "teknik_driller";
        else if (stats.includes("stamina") || stats.includes("power")) programId = "fiziksel_yukleme";
        else programId = "teknik_driller";
      }

      // Hala program yoksa pozisyona göre default
      if (!programId) {
        const pos = p.specificPosition ?? p.position ?? "CM";
        const stats = POSITION_STATS[pos] ?? POSITION_STATS.CM;
        if (pos === "GK") programId = "kaleci_antrenmani";
        else if (stats.includes("defending")) programId = "defansif_duzenleme";
        else if (stats.includes("shooting")) programId = "hucum_antrenmani";
        else programId = "teknik_driller";
      }

      const program = TRAINING_PROGRAMS[programId];
      if (!program) return p;

      // Age multiplier
      const ageMult = p.age <= 21 ? 1.15 : p.age >= 30 ? 0.75 : 1.0;
      // Mentor bonus
      const mentorBonus = todayMentees.get(p.id) ?? 0;
      const rawMult = 1.0 * ageMult * facilityMult * (1 + mentorBonus);
      const cappedMult = Math.min(3.0, rawMult);

      // Stat gains
      let totalGain = 0;
      const statGains: Record<string, number> = {};
      for (const stat of program.targetStats) {
        const current = (p as any)[stat] ?? (p.stats as any)?.[stat] ?? 50;
        const ceilingFactor = Math.max(0.05, (100 - current) / 100);
        const gain = Math.random() * 0.6 * cappedMult * ceilingFactor;
        const rounded = Math.round(gain * 10) / 10;
        statGains[stat] = rounded;
        totalGain += rounded;

        // Top-level attribute güncelle
        (p as any)[stat] = Math.min(99, ((p as any)[stat] ?? 50) + rounded);
        // stats alt nesnesi varsa orayı da güncelle
        if (p.stats) {
          (p.stats as any)[stat] = Math.min(99, ((p.stats as any)[stat] ?? 50) + rounded);
        }
      }

      // Cond drain
      const intensityMult = program.intensity >= 80 ? 1.25 : program.intensity < 60 ? 0.5 : 1.0;
      const condChange = Math.round(program.condCost * intensityMult);
      p.cond = Math.max(0, Math.min(100, (p.cond ?? 100) + condChange));
      p.condition = p.cond;

      // Morale
      if (program.moraleBonus) {
        p.morale = Math.max(0, Math.min(100, (p.morale ?? 70) + program.moraleBonus));
      }

      // Form rating +1.5 (max 15 eklenir, max 100 toplam)
      p.formRating = Math.min(100, (p.formRating ?? 50) + 1.5);

      // Rating yeniden hesapla (6 stat ortalaması)
      p.rating = calculateRating(p);

      // Injury risk — intensity 80+ ise %3 şans
      if (program.intensity >= 80 && Math.random() < 0.03) {
        p.is_injured = true;
        p.injury = { type: "strain", days: 5 + Math.floor(Math.random() * 10) };
      }

      updated = true;
      trainedPlayers++;
      statGainsTotal += totalGain;
      return p;
    });

    if (updated) {
      myClub.players = newPlayers;

      // training state'i güncelle
      training.dailyCount = (training.dailyCount ?? 0) + 1;
      // v2.9.21 GÖREV 3: Tek kanonik saat formatı — '15:00' / '21:00' (TR)
      const trDate = new Date(Date.now() + 3 * 60 * 60 * 1000);
      const trHour = trDate.getUTCHours();
      training.lastTrainingDate = new Date().toISOString().slice(0, 10);
      training.lastTrainingHour = trHour === 15 ? "15:00" : trHour === 21 ? "21:00" : "15:00";

      // app_state update (training + facilities)
      state.training = training;
      await supabase
        .from("app_state")
        .update({ state: state })
        .eq("user_id", row.user_id);

      // user_game_state update (clubs with new players)
      userState.clubs = userState.clubs.map((c: any) => c.id === myTeamId ? myClub : c);
      await supabase
        .from("user_game_state")
        .update({ state: userState })
        .eq("profile_id", row.user_id);

      trainedUsers++;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    trainedUsers,
    trainedPlayers,
    statGainsTotal: Math.round(statGainsTotal * 10) / 10,
    hour: new Date(Date.now() + 3 * 60 * 60 * 1000).getUTCHours(),
  }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
