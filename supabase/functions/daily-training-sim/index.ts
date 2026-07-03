// Edge Function: daily-training-sim
// Hafta içi TR 15:00 ve 21:00'de çağrılır.
// Tüm kullanıcıların BGP planına göre XP dağıtır.

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

  const { data: states, error } = await supabase
    .from("app_state")
    .select("user_id, state");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let trained = 0;
  for (const row of states ?? []) {
    const state = row.state as any;
    if (!state?.training?.bgpPlans) continue;

    let updated = false;
    const newPlans = { ...state.training.bgpPlans };

    for (const playerId of Object.keys(newPlans)) {
      const plan = newPlans[playerId];
      if (!plan || !plan.statKeys || plan.statKeys.length === 0) continue;

      const xpGained = 50;
      let newXp = (plan.xp ?? 0) + xpGained;

      if (newXp >= 100) {
        newXp -= 100;
        plan.levelUps = (plan.levelUps ?? 0) + 1;
      }

      plan.xp = newXp;
      updated = true;
    }

    if (updated) {
      state.training.bgpPlans = newPlans;
      state.training.dailyCount = (state.training.dailyCount ?? 0) + 1;
      state.training.lastTrainingDate = new Date().toISOString().slice(0, 10);

      await supabase
        .from("app_state")
        .update({ state: state })
        .eq("user_id", row.user_id);
      trained++;
    }
  }

  return new Response(JSON.stringify({
    success: true,
    trained,
  }), {
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
  });
});
