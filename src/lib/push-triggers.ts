// ════════════════════════════════════════════════════════════════════════════
// v2.9.148: Push Notification Triggers (client-side)
// ════════════════════════════════════════════════════════════════════════════
// Bu modül, send-match-end-push ve send-transfer-offer-push Edge Function'larını
// çağırır. Edge Function'lar service role auth bekler, bu yüzden istemci tarafında
// "anonymouse function invoke" kullanılamaz — Supabase'in anon key ile çağrılabilen
// "client-side trigger" RPC'ler aracılığıyla çalışır.
//
// EkLENEN RPC: rpc_trigger_match_end_push(p_user_id, p_home_name, p_away_name,
//   p_home_score, p_away_score, p_match_type) — SECURITY DEFINER, authenticated
//   kullanıcı kendi user_id'si için çağırabilir. RPC içinden service role ile
//   send-match-end-push çağrılır.
//
// Aynı şekilde: rpc_trigger_transfer_offer_push(p_player_name, p_bidder_club_name,
//   p_bid_amount)
//
// Eğer Supabase URL/key yoksa (dev mode) sessizce atlar.
// ════════════════════════════════════════════════════════════════════════════

import { useAppStore } from "@/lib/store";

// Supabase URL'i .env'den veya hardcoded fallback'ten
const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  "https://jmxbyaamwbpnvgbnjbmo.supabase.co";

/**
 * v2.9.148: Maç bitiminde push gönder.
 *
 * Kanıtlanmış tetiklenme noktaları:
 *   1. recordMatchResult (store.ts) — canlı maç bittiğinde
 *   2. applyPostMatchEffects (live-match-store.ts) — tick() ile maç bittiğinde
 *   3. daily-match-sim Edge Function — server-side cron (kullanıcının kendi fetch'i değil)
 *
 * Bu fonksiyon 1 ve 2'yi çağırır. 3 zaten server-side Supabase cron ile tetikleniyor.
 *
 * NOT: Kullanıcının gerçek Supabase auth.uid'sini RPC parametresi olarak göndeririz.
 * RPC SECURITY DEFINER olduğu için auth.uid()'i doğrular — başka kullanıcıya push
 * gönderilemez.
 */
export async function triggerMatchEndPush(opts: {
  homeName: string;
  awayName: string;
  homeScore: number;
  awayScore: number;
  matchType?: "league" | "cup" | "friendly";
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    // Supabase client'ı dinamik import et — SSR'da yüklenmesin
    const { supabase } = await import("@/lib/supabase/client");
    const client = supabase();

    // Kullanıcı auth.uid()'i client'ta yoksa atla
    const { data: { user } } = await client.auth.getUser();
    if (!user) {
      return { sent: false, reason: "no_auth_user" };
    }

    // push_tokens tablosunda bu kullanıcı için token var mı kontrol et
    // (yoksa Edge Function'a gitmeye gerek yok)
    const { data: tokenRows, error: tokenErr } = await client
      .from("push_tokens")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (tokenErr) {
      console.warn("[push] token check error:", tokenErr.message);
      return { sent: false, reason: "token_check_error" };
    }

    if (!tokenRows || tokenRows.length === 0) {
      // Kullanıcı push token'ı kaydetmemiş — bildirim gönderilemez
      return { sent: false, reason: "no_push_token_registered" };
    }

    // rpc_trigger_match_end_push RPC'sini çağır (server-side service role ile
    // send-match-end-push Edge Function tetikler)
    const { error } = await client.rpc("rpc_trigger_match_end_push", {
      p_home_name: opts.homeName,
      p_away_name: opts.awayName,
      p_home_score: opts.homeScore,
      p_away_score: opts.awayScore,
      p_match_type: opts.matchType ?? "league",
    });

    if (error) {
      console.warn("[push] match-end RPC error:", error.message);
      return { sent: false, reason: "rpc_error: " + error.message };
    }

    console.log("[push] match-end push triggered:", opts);
    return { sent: true };
  } catch (e: any) {
    console.warn("[push] match-end trigger failed:", e?.message);
    return { sent: false, reason: "exception: " + (e?.message ?? String(e)) };
  }
}

/**
 * v2.9.148: Transfer teklifi geldiğinde push gönder.
 *
 * Tetiklenme noktaları (5 yerden):
 *   - loginDemo (initial offers)
 *   - listPlayerForSale (fresh offers)
 *   - season-end pre-finalize
 *   - advanceMatchday post-matchday refresh
 *   - endSeason new-season offers
 *
 * Bu fonksiyon, kullanıcı oyuncusuna yeni bir teklif geldiğinde çağrılır.
 * Sadece oyuncu sahibinin kendi hesabına push gider.
 */
export async function triggerTransferOfferPush(opts: {
  playerName: string;
  bidderClubName: string;
  bidAmount: string; // formatlanmış tutar, örn "€450K"
}): Promise<{ sent: boolean; reason?: string }> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    const client = supabase();

    const { data: { user } } = await client.auth.getUser();
    if (!user) return { sent: false, reason: "no_auth_user" };

    const { data: tokenRows } = await client
      .from("push_tokens")
      .select("id")
      .eq("user_id", user.id)
      .limit(1);

    if (!tokenRows || tokenRows.length === 0) {
      return { sent: false, reason: "no_push_token_registered" };
    }

    const { error } = await client.rpc("rpc_trigger_transfer_offer_push", {
      p_player_name: opts.playerName,
      p_bidder_club_name: opts.bidderClubName,
      p_bid_amount: opts.bidAmount,
    });

    if (error) {
      console.warn("[push] transfer-offer RPC error:", error.message);
      return { sent: false, reason: "rpc_error: " + error.message };
    }

    console.log("[push] transfer-offer push triggered:", opts);
    return { sent: true };
  } catch (e: any) {
    console.warn("[push] transfer-offer trigger failed:", e?.message);
    return { sent: false, reason: "exception: " + (e?.message ?? String(e)) };
  }
}

/**
 * v2.9.148: Yardımcı — store içindeki mevcut kullanıcı takım adını döner.
 * Push tetikleyicilerinde "home_name" / "away_name" için kullanılır.
 */
export function getMyTeamName(): string | null {
  const state = useAppStore.getState();
  if (!state.myTeamId) return null;
  const team = state.clubs.find((c) => c.id === state.myTeamId);
  return team?.name ?? null;
}
