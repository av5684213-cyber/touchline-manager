// ════════════════════════════════════════════════════════════════════════════
// v2.9.157: send-match-end-push — FCM v1 API (Service Account ile)
// ════════════════════════════════════════════════════════════════════════════
// Legacy Server Key yerine Firebase Admin SDK kullanır.
// Service Account JSON'ı environment variable'dan okur.
//
// Deploy:
//   supabase functions deploy send-match-end-push
//   supabase secrets set FIREBASE_SERVICE_ACCOUNT='{ ...json... }'
// ════════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FIREBASE_SA = Deno.env.get("FIREBASE_SERVICE_ACCOUNT") ?? "";

// JWT oluştur (RS256 ile, service account private key kullanarak)
async function createFirebaseJWT(sa: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: sa.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsigned = `${enc(header)}.${enc(payload)}`;

  // Import private key
  const pemContents = sa.private_key
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\n/g, "");
  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsigned)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  return `${unsigned}.${sig}`;
}

// OAuth2 access token al
async function getAccessToken(sa: any): Promise<string> {
  const jwt = await createFirebaseJWT(sa);
  const resp = await fetch(sa.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`);
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, content-type",
      },
    });
  }

  const authHeader = req.headers.get("Authorization") ?? "";
  if (authHeader !== `Bearer ${SERVICE_ROLE_KEY}`) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!FIREBASE_SA) {
    return new Response(
      JSON.stringify({ error: "FIREBASE_SERVICE_ACCOUNT env var not set. Run: supabase secrets set FIREBASE_SERVICE_ACCOUNT='{...}'" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let sa: any;
  try {
    sa = JSON.parse(FIREBASE_SA);
  } catch {
    return new Response(JSON.stringify({ error: "Invalid FIREBASE_SERVICE_ACCOUNT JSON" }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  let body: any;
  try { body = await req.json(); } catch {
    return new Response(JSON.stringify({ error: "invalid json" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const { user_id, home_name, away_name, home_score, away_score, match_type } = body;
  if (!user_id) {
    return new Response(JSON.stringify({ error: "missing user_id" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const { data: tokens, error } = await supabase.from("push_tokens").select("token").eq("user_id", user_id);
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
  if (!tokens || tokens.length === 0) {
    return new Response(JSON.stringify({ sent: 0, total: 0, reason: "no_tokens" }), { status: 200, headers: { "Content-Type": "application/json" } });
  }

  const isWin = home_score > away_score;
  const isDraw = home_score === away_score;
  const scoreStr = `${home_score}-${away_score}`;
  const title = isWin ? "Maçı Kazandın! 🎉" : isDraw ? "Berabere Kaldı" : "Maçı Kaybettin";
  const body_text = `${home_name} ${scoreStr} ${away_name} — sonucu gör`;

  // Access token al
  let accessToken: string;
  try {
    accessToken = await getAccessToken(sa);
  } catch (e) {
    return new Response(JSON.stringify({ error: "FCM auth failed", details: e.message }), {
      status: 500, headers: { "Content-Type": "application/json" },
    });
  }

  const projectId = sa.project_id;
  const fcmUrl = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;

  let sent = 0, failed = 0;
  for (const { token } of tokens) {
    const message = {
      message: {
        token,
        notification: { title, body: body_text },
        data: {
          deep_link: "touchline://match-result",
          match_type: match_type ?? "league",
          home_score: String(home_score),
          away_score: String(away_score),
        },
        android: { priority: "high", notification: { sound: "default", channel_id: "touchline_notifications" } },
      },
    };

    try {
      const fcmResp = await fetch(fcmUrl, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(message),
      });

      if (fcmResp.ok) {
        sent++;
      } else {
        failed++;
        const errData = await fcmResp.json().catch(() => ({}));
        // Geçersiz token'ı sil
        if (errData?.error?.details?.errorCode === "UNREGISTERED" || fcmResp.status === 404) {
          await supabase.from("push_tokens").delete().eq("token", token);
        }
      }
    } catch { failed++; }
  }

  return new Response(JSON.stringify({ sent, failed, total: tokens.length, title, body: body_text }), {
    status: 200, headers: { "Content-Type": "application/json" },
  });
});
