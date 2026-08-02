// supabase/functions/verify-purchase/index.ts
//
// v2.9.53: Server-side purchase verification.
//
// Google Play Developer API ile purchase token'ı doğrular.
// Token daha önce kullanılmışsa reddeder (replay attack önleme).
// Doğrulama başarılıysa krediyi sunucu tarafında ekler.
//
// Environment secrets (Supabase Dashboard → Edge Functions → Secrets):
//   - GOOGLE_PLAY_SERVICE_ACCOUNT_JSON: Google Play service account JSON (string)
//   - SUPABASE_URL: Supabase project URL
//   - SUPABASE_SERVICE_ROLE_KEY: Service role key (RLS bypass için)
//
// İstemci tarafı çağrı:
//   supabase.functions.invoke('verify-purchase', {
//     body: { purchaseToken, sku, packageName }
//   })

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_PLAY_API_BASE = "https://androidpublisher.googleapis.com/androidpublisher/v3/applications";

interface VerifyRequest {
  purchaseToken: string;
  sku: string;
  packageName?: string; // varsayılan: com.touchline.manager
}

interface VerifyResponse {
  success: boolean;
  creditsGranted?: number;
  reason?: string;
  alreadyRedeemed?: boolean;
}

// SKU → kredi miktarı eşlemesi (sunucu tarafında sabit — client'taki ile aynı)
const SKU_CREDITS: Record<string, number> = {
  credits_small: 100,
  credits_medium: 330,   // 300 + 30 bonus
  credits_large: 800,    // 700 + 100 bonus
  credits_mega: 2400,    // 2000 + 400 bonus
};

// Edge Function secrets üzerinden alınır, fallback sadece geliştirme içindir.
// Üretimde Supabase Dashboard → Edge Functions → Secrets altında
// GOOGLE_PLAY_PACKAGE_NAME = "com.touchline.manager" olarak ayarlanmalı.
const DEFAULT_PACKAGE = Deno.env.get("GOOGLE_PLAY_PACKAGE_NAME") ?? "com.touchline.manager";

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { purchaseToken, sku, packageName }: VerifyRequest = await req.json();

    if (!purchaseToken || !sku) {
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: "Missing purchaseToken or sku",
      }, 400);
    }

    const pkg = packageName || DEFAULT_PACKAGE;
    const expectedCredits = SKU_CREDITS[sku];
    if (expectedCredits === undefined) {
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: `Unknown SKU: ${sku}`,
      }, 400);
    }

    // ── 1. Kullanıcı kimliği ──────────────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Auth client — kullanıcının JWT'si ile
    const userClient = createClient(supabaseUrl, token, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: "Unauthorized — invalid session",
      }, 401);
    }
    const userId = userData.user.id;

    // Admin client — RLS bypass
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── 1b. Rate limit (per-user) ────────────────────────────────────────
    // v2.9.73: Google Play Developer API kotasını korumak için.
    // Aynı kullanıcı 10 dakikada max 5 verify çağrısı yapabilir.
    // Kötü niyetli kullanıcı saniyede 100 istek atıp API kotasını tüketemez.
    // Aynı zamanda redeemed_purchases tablosunu checkpoint olarak kullanıyoruz
    // (yeni tablo oluşturmaya gerek yok — son 5 kayıt yeterli).
    const { data: recentVerifications, error: rlErr } = await adminClient
      .from("redeemed_purchases")
      .select("verified_at")
      .eq("user_id", userId)
      .order("verified_at", { ascending: false })
      .limit(5);

    if (rlErr) {
      // v2.9.74 FIX Y7: fail-open → fail-closed. Eski kod hatada rate-limit'i
      // atlayıp Google API çağrısı yapıyordu → kota tüketilebilir.
      // Yeni: rate-limit check hatasında 503 dön (meşru kullanıcı retry yapar).
      console.error("[verify-purchase] rate-limit check error:", rlErr.message);
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: "Rate limit check temporarily unavailable. Please retry.",
      }, 503);
    } else if (recentVerifications && recentVerifications.length >= 5) {
      const oldest = new Date(recentVerifications[4].verified_at).getTime();
      const tenMin = 10 * 60 * 1000;
      if (Date.now() - oldest < tenMin) {
        return jsonResponse<VerifyResponse>({
          success: false,
          reason: "Rate limit: too many purchase verifications. Wait 10 minutes.",
        }, 429);
      }
    }

    // ── 2. Google Play Developer API ile doğrula ─────────────────────────
    // (NOT: Replay kontrolü aşağıda atomik INSERT ... ON CONFLICT ile yapılıyor.
    //  Eski sürümdeki SELECT-then-INSERT pattern'i TOCTOU race'a açıktı:
    //  iki paralel istek aynı purchaseToken için ikisi de "existing=null" görüp
    //  iki kez kredi yükleyebiliyordu. Artık önce Google doğrulaması yapılıp
    //  sonra atomik insert ile kazanılan tek istek krediyi veriyor.)
    const serviceAccountJson = Deno.env.get("GOOGLE_PLAY_SERVICE_ACCOUNT_JSON");
    if (!serviceAccountJson) {
      console.error("[verify-purchase] GOOGLE_PLAY_SERVICE_ACCOUNT_JSON not set");
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: "Server configuration error — service account missing",
      }, 500);
    }

    const serviceAccount = JSON.parse(serviceAccountJson);

    // JWT oluştur (Google OAuth2 service account)
    const jwt = await createGoogleJWT(serviceAccount);
    const accessToken = await getAccessToken(jwt);

    // purchases.products.get çağrısı
    const verifyUrl = `${GOOGLE_PLAY_API_BASE}/${pkg}/purchases/products/${sku}/tokens/${purchaseToken}`;
    const verifyResp = await fetch(verifyUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!verifyResp.ok) {
      const errBody = await verifyResp.text();
      console.error("[verify-purchase] Google API error:", verifyResp.status, errBody);
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: `Google Play verification failed: ${verifyResp.status}`,
      }, 502);
    }

    const purchaseData = await verifyResp.json();

    // purchaseState: 0 = Purchased, 1 = Canceled, 2 = Pending
    if (purchaseData.purchaseState !== 0) {
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: `Purchase not completed (state: ${purchaseData.purchaseState})`,
      }, 400);
    }

    // ── 3. Atomik redeem (TOCTOU-safe) ────────────────────────────────────
    // redeemed_purchases tablosundaki UNIQUE(purchase_token) constraint'i
    // sayesinde, aynı token için paralel iki istekten yalnızca biri insert'i
    // başarır. .select().single() ile dönen satırı alırız; ikinci istek
    // 23505 (unique_violation) hatası alır ve credits vermeden 409 döner.
    const { data: redeemedRow, error: redeemErr } = await adminClient
      .from("redeemed_purchases")
      .insert({
        purchase_token: purchaseToken,
        user_id: userId,
        sku: sku,
        credits_granted: expectedCredits,
        verified_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (redeemErr) {
      // 23505 = unique_violation → zaten redeem edilmiş
      if (redeemErr.code === "23505") {
        return jsonResponse<VerifyResponse>({
          success: false,
          alreadyRedeemed: true,
          reason: "This purchase token has already been redeemed",
        }, 409);
      }
      console.error("[verify-purchase] insert error:", redeemErr);
      return jsonResponse<VerifyResponse>({
        success: false,
        reason: "Failed to record redemption",
      }, 500);
    }
    if (!redeemedRow) {
      // Defensive: insert başarılı oldu ama satır dönmedi (beklenmeyen durum)
      return jsonResponse<VerifyResponse>({
        success: false,
        alreadyRedeemed: true,
        reason: "This purchase token has already been redeemed",
      }, 409);
    }

    // ── 4. Krediyi ekle ───────────────────────────────────────────────────
    // v2.9.74 FIX K3: Çift kaynak race'i çöz — hem app_state HEM de
    // user_game_state tablolarındaki credits alanını güncelle.
    // Eski kod: sadece app_state güncelliyordu → client 3 sn debounce ile
    // user_game_state.state.credits'i eski değerle overwrite ediyordu →
    // sonraki login'de X kayboluyordu.
    // Yeni: iki tabloyu da güncelle, böylece client ne zaman save yaparsa yapsın
    // credits değeri korunur.

    // 4a. user_game_state (client'ın okuduğu tek kaynak)
    const { data: gameState } = await adminClient
      .from("user_game_state")
      .select("state")
      .eq("profile_id", userId)
      .maybeSingle();

    if (gameState?.state) {
      const state = gameState.state as any;
      const currentCredits = state.credits ?? 0;
      state.credits = currentCredits + expectedCredits;

      await adminClient
        .from("user_game_state")
        .update({ state, updated_at: new Date().toISOString() })
        .eq("profile_id", userId);
    }

    // 4b. app_state (geri uyumluluk için — bazı eski kodlar hâlâ burayı okuyor)
    const { data: appState } = await adminClient
      .from("app_state")
      .select("state")
      .eq("user_id", userId)
      .maybeSingle();

    if (appState?.state) {
      const state = appState.state as any;
      const currentCredits = state.credits ?? 0;
      state.credits = currentCredits + expectedCredits;

      await adminClient
        .from("app_state")
        .update({ state })
        .eq("user_id", userId);
    }

    return jsonResponse<VerifyResponse>({
      success: true,
      creditsGranted: expectedCredits,
    });

  } catch (e) {
    console.error("[verify-purchase] exception:", e);
    return jsonResponse<VerifyResponse>({
      success: false,
      reason: "Internal server error",
    }, 500);
  }
});

// ── Helper: JSON response ───────────────────────────────────────────────────
function jsonResponse<T>(body: T, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

// ── Helper: Google JWT oluştur (service account) ────────────────────────────
async function createGoogleJWT(sa: any): Promise<string> {
  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/androidpublisher",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const encodedPayload = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const signInput = `${encodedHeader}.${encodedPayload}`;

  // RSA imza (Web Crypto API)
  const keyData = pemToKeyData(sa.private_key);
  const key = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(signInput)
  );
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  return `${signInput}.${encodedSignature}`;
}

function pemToKeyData(pem: string): ArrayBuffer {
  const pemContent = pem
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binaryStr = atob(pemContent);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
  return bytes.buffer;
}

// ── Helper: Access token al ─────────────────────────────────────────────────
async function getAccessToken(jwt: string): Promise<string> {
  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });
  const data = await resp.json();
  if (!data.access_token) throw new Error("Failed to get Google access token");
  return data.access_token;
}
