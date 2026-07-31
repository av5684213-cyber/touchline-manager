// supabase/functions/delete-account/index.ts
//
// v2.9.53: Hesap silme — Google Play Data Safety gereği.
//
// Kullanıcının TÜM verilerini siler/anonimleştirir:
//   - Forum gönderileri: ANONİMİLEŞTİR (author_id NULL, author_team_name "Silinmiş kullanıcı")
//   - Diğer tüm tablolar: auth.users CASCADE ile otomatik silinir
//   - redeemed_purchases: SAKLA (yasal — ödeme kayıtları)
//   - En son: auth.users kaydını sil (admin.deleteUser)
//
// Çağrı: supabase.functions.invoke('delete-account', {})
// Kullanıcı JWT'si ile doğrulanır — client'tan userId gönderilmez.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DeleteResponse {
  success: boolean;
  reason?: string;
}

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
    // ── 1. Kullanıcı kimliği (JWT'den) ────────────────────────────────────
    const authHeader = req.headers.get("Authorization") || "";
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // User client — JWT ile doğrula
    const userClient = createClient(supabaseUrl, token, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return jsonResponse<DeleteResponse>({
        success: false,
        reason: "Unauthorized — invalid session",
      }, 401);
    }
    const userId = userData.user.id;

    // Admin client — RLS bypass
    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    console.log(`[delete-account] Starting deletion for user: ${userId}`);

    // ── 2. Forum anonimleştirme (SİLME!) ─────────────────────────────────
    // author_id NULL yap, author_team_name "Silinmiş kullanıcı" yap
    // NOT: author_id sütunu NULL atanabilir olmalı (migration 027 ile)

    const { error: topicAnonErr } = await adminClient
      .from("forum_topics")
      .update({
        author_id: null,
        author_team_name: "Silinmiş kullanıcı",
        author_team_short: "???",
        author_team_color: "#666666",
      })
      .eq("author_id", userId);

    if (topicAnonErr) {
      console.error("[delete-account] forum_topics anonimize error:", topicAnonErr.message);
      // Devam et — forum anonimleştirme başarısız olsa bile hesap silme işlemine devam
    } else {
      console.log(`[delete-account] forum_topics anonymized for user: ${userId}`);
    }

    const { error: replyAnonErr } = await adminClient
      .from("forum_replies")
      .update({
        author_id: null,
        author_team_name: "Silinmiş kullanıcı",
        author_team_short: "???",
        author_team_color: "#666666",
      })
      .eq("author_id", userId);

    if (replyAnonErr) {
      console.error("[delete-account] forum_replies anonimize error:", replyAnonErr.message);
    } else {
      console.log(`[delete-account] forum_replies anonymized for user: ${userId}`);
    }

    // ── 3. redeemed_purchases: SAKLA (yasal — ödeme kayıtları) ───────────
    // Bu tablo auth.users ile CASCADE bağlı — auth silinince kayıtlar da silinir.
    // Yasal olarak saklanması gereken veri için: user_id'yi NULL yap (ilişki kopar)
    const { error: redeemErr } = await adminClient
      .from("redeemed_purchases")
      .update({ user_id: null })
      .eq("user_id", userId);

    if (redeemErr) {
      console.warn("[delete-account] redeemed_purchases update error:", redeemErr.message);
      // Devam et — bu kritik değil, CASCADE zaten silecek
    }

    // ── 4. teams: manager_user_id NULL yap (takım korunur, bot olur) ─────
    const { error: teamErr } = await adminClient
      .from("teams")
      .update({ manager_user_id: null })
      .eq("manager_user_id", userId);

    if (teamErr) {
      console.warn("[delete-account] teams update error:", teamErr.message);
    } else {
      console.log(`[delete-account] teams manager_user_id cleared for user: ${userId}`);
    }

    // ── 5. Diğer tablolar: auth.users CASCADE ile otomatik silinir ────────
    // Aşağıdaki tablolar auth.users(id) ON DELETE CASCADE ile bağlı:
    //   - profiles (id → auth.users.id)
    //   - app_state (user_id → auth.users.id)
    //   - active_tactics (profile_id → auth.users.id)
    //   - notifications (user_id → auth.users.id)
    //   - push_tokens (user_id → auth.users.id)
    //   - special_cups (creator_id → auth.users.id)
    //   - blocked_users (blocker_user_id / blocked_user_id → auth.users.id)
    //   - chat_moderation (reported_user_id → auth.users.id)
    //
    // Bunların hepsi auth.users silinince otomatik silinecek.

    // ── 6. Auth kaydını sil (en son) ──────────────────────────────────────
    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteErr) {
      console.error("[delete-account] auth delete error:", deleteErr.message);
      return jsonResponse<DeleteResponse>({
        success: false,
        reason: "Failed to delete auth account — please try again or contact support",
      }, 500);
    }

    console.log(`[delete-account] Successfully deleted user: ${userId}`);

    return jsonResponse<DeleteResponse>({
      success: true,
    });

  } catch (e) {
    console.error("[delete-account] exception:", e);
    return jsonResponse<DeleteResponse>({
      success: false,
      reason: "Internal server error",
    }, 500);
  }
});

function jsonResponse<T>(body: T, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
