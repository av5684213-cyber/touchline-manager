// ════════════════════════════════════════════════════════════════════════════
// v2.9.147: send-match-end-push Edge Function
// ════════════════════════════════════════════════════════════════════════════
// Maç sonucu belli olduğunda kullanıcının push_tokens tablosundaki
// tüm cihazlarına FCM push gönderir.
//
// Tetiklenme: daily-match-sim Edge Function veya client-side match end
// bu function'ı service role key ile çağırır.
//
// İstek gövdesi:
//   { user_id, home_name, away_name, home_score, away_score, match_type }
// Dönüş: { sent, failed, total }
//
// Güvenlik: sadece service role ile çağrılabilir (Authorization header).
// ════════════════════════════════════════════════════════════════════════════
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FCM_SERVER_KEY = Deno.env.get("FCM_SERVER_KEY") ?? "";

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  // Yetkilendirme — sadece service role
  const authHeader = req.headers.get("Authorization") ?? "";
  const expectedKey = `Bearer ${SERVICE_ROLE_KEY}`;
  if (authHeader !== expectedKey) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!FCM_SERVER_KEY) {
    return new Response(
      JSON.stringify({ error: "FCM_SERVER_KEY env var not set" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { user_id, home_name, away_name, home_score, away_score, match_type } = body;
  if (!user_id || typeof home_score !== "number" || typeof away_score !== "number") {
    return new Response(
      JSON.stringify({ error: "missing required fields" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Kullanıcının tüm cihaz token'larını al
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: tokens, error } = await supabase
    .from("push_tokens")
    .select("token, platform")
    .eq("user_id", user_id);

  if (error) {
    return new Response(
      JSON.stringify({ error: "db_error", details: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  if (!tokens || tokens.length === 0) {
    return new Response(
      JSON.stringify({ sent: 0, failed: 0, total: 0, reason: "no_tokens" }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  // Push notification içeriği — kazanıldıysa daha cesur
  const isWin = home_score > away_score;
  const isDraw = home_score === away_score;
  const scoreStr = `${home_score}-${away_score}`;
  const title = isWin ? "Maçı Kazandın! 🎉" : isDraw ? "Berabere Kaldı" : "Maçı Kaybettin";
  const body_text = match_type === "friendly"
    ? `Hazırlık: ${home_name} ${scoreStr} ${away_name} — sonucu gör`
    : `${home_name} ${scoreStr} ${away_name} — sonucu gör`;

  const fcmPayload = {
    notification: { title, body: body_text, sound: "default" },
    data: {
      deep_link: "touchline://match-result",
      match_type: match_type ?? "league",
      home_score: String(home_score),
      away_score: String(away_score),
    },
    priority: "high",
  };

  let sent = 0;
  let failed = 0;

  for (const { token } of tokens) {
    try {
      const fcmResp = await fetch(`https://fcm.googleapis.com/fcm/send`, {
        method: "POST",
        headers: {
          "Authorization": `key=${FCM_SERVER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ...fcmPayload, to: token }),
      });

      if (fcmResp.ok) {
        const result = await fcmResp.json();
        if (result.success === 1) {
          sent++;
        } else {
          failed++;
          // Geçersiz token'ı sil
          if (result.results?.[0]?.error === "NotRegistered" || result.results?.[0]?.error === "InvalidRegistration") {
            await supabase.from("push_tokens").delete().eq("token", token);
          }
        }
      } else {
        failed++;
      }
    } catch {
      failed++;
    }
  }

  return new Response(
    JSON.stringify({
      sent,
      failed,
      total: tokens.length,
      user_id,
      title,
      body: body_text,
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json" },
    }
  );
});
