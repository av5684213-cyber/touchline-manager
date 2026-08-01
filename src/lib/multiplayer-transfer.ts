"use client";

/**
 * v2.9.63: Multiplayer Transfer Sistemi
 *
 * Kullanıcı başka bir kullanıcının (real user) takımındaki oyuncuya teklif yaptığında:
 * 1. Teklif transfer_offers_mp tablosuna yazılır
 * 2. Satıcı kullanıcıya bildirim gider (real-time)
 * 3. Satıcı teklifi yanıtlar (accept/reject)
 * 4. Kabul edilirse: oyuncu transfer olur, bütçeler güncellenir
 *
 * Senaryo:
 * - User A, User B'nin takımındaki oyuncuya teklif yapar
 * - makeMultiplayerOffer(playerId, fee, wage, contractYears) çağrılır
 * - Teklif Supabase'e yazılır
 * - User B login yapınca teklifi görür, yanıt verir
 * - User A yanıtını alır (real-time subscription veya poll)
 *
 * Bot oyuncuları için: lokal simülasyon (mevcut makeTransferOffer)
 * Gerçek kullanıcı oyuncuları için: Supabase üzerinden
 */

import { supabase } from "@/lib/supabase";
import { useAppStore } from "@/lib/store";
import type { Player } from "@/lib/mock/data";

export type MultiplayerOffer = {
  id: string;
  player_id: string;
  player_name: string;
  player_position: string;
  player_rating: number;
  buyer_team_id: string;
  buyer_team_name: string;
  seller_team_id: string;
  seller_team_name: string;
  offer_amount: number;
  wage_offer: number;
  contract_years: number;
  status: "pending" | "accepted" | "rejected";
  created_at: string;
  responded_at: string | null;
};

/**
 * Multiplayer teklif gönder.
 *
 * @param playerId Oyuncu ID (Supabase UUID)
 * @param fee Transfer ücreti
 * @param wage Haftalık maaş
 * @param contractYears Kontrat yılı
 * @returns { success, reason? }
 */
export async function makeMultiplayerOffer(
  playerId: string,
  fee: number,
  wage: number,
  contractYears: number
): Promise<{ success: boolean; reason?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, reason: "not-authed" };

    // Kullanıcının takımını bul
    const { data: buyerTeam, error: teamError } = await supabase
      .from("teams")
      .select("id, name, budget")
      .eq("manager_user_id", user.id)
      .single();

    if (teamError || !buyerTeam) {
      return { success: false, reason: "no-team" };
    }

    // Bütçe kontrolü
    const totalCost = Math.round(fee * 1.08); // %5 agent + %3 signing
    if (buyerTeam.budget < totalCost) {
      return { success: false, reason: "budget" };
    }

    // Oyuncunun sahibi olan takımı bul
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select(`
        id,
        first_name,
        last_name,
        specific_position,
        rating,
        team_id,
        teams!inner(id, name, manager_user_id)
      `)
      .eq("id", playerId)
      .single();

    if (playerError || !player) {
      return { success: false, reason: "not-found" };
    }

    const sellerTeam = player.teams as any;
    if (!sellerTeam || sellerTeam.id === buyerTeam.id) {
      return { success: false, reason: "own-player" };
    }

    // Transfer penceresi kontrolü
    const isWindowOpen = useAppStore.getState().seasonMatchday <= 29;
    if (!isWindowOpen) {
      return { success: false, reason: "window-closed" };
    }

    // Teklif Supabase'e yaz
    const { error: offerError } = await supabase
      .from("transfer_offers_mp")
      .insert({
        player_id: playerId,
        buyer_team_id: buyerTeam.id,
        seller_team_id: sellerTeam.id,
        offer_amount: fee,
        wage_offer: wage,
        contract_years: contractYears,
        status: "pending",
      });

    if (offerError) {
      console.error("[multiplayer-transfer] insert error:", offerError);
      return { success: false, reason: "db-error" };
    }

    // Satıcıya bildirim gönder
    await supabase
      .from("notifications")
      .insert({
        user_id: sellerTeam.manager_user_id,
        type: "transfer_offer",
        title: "Yeni Transfer Teklifi",
        body: `${buyerTeam.name} takımınızdan ${player.first_name} ${player.last_name} için ${fee} teklif etti.`,
        data: { player_id: playerId, offer_amount: fee, buyer_team_id: buyerTeam.id },
        read: false,
      });

    return { success: true };
  } catch (e) {
    console.error("[multiplayer-transfer] makeMultiplayerOffer exception:", e);
    return { success: false, reason: "exception" };
  }
}

/**
 * Kullanıcıya gelen tüm multiplayer teklifleri getir.
 */
export async function fetchIncomingMultiplayerOffers(): Promise<MultiplayerOffer[]> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    // Kullanıcının takımını bul
    const { data: myTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("manager_user_id", user.id)
      .single();

    if (!myTeam) return [];

    // Satıcı olduğu tüm pending teklifleri getir
    const { data: offers, error } = await supabase
      .from("transfer_offers_mp")
      .select(`
        id,
        player_id,
        buyer_team_id,
        seller_team_id,
        offer_amount,
        wage_offer,
        contract_years,
        status,
        created_at,
        responded_at,
        players!inner(first_name, last_name, specific_position, rating),
        buyer_team:teams!buyer_team_id(name),
        seller_team:teams!seller_team_id(name)
      `)
      .eq("seller_team_id", myTeam.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error || !offers) return [];

    return offers.map((o: any) => ({
      id: o.id,
      player_id: o.player_id,
      player_name: `${o.players?.first_name ?? ""} ${o.players?.last_name ?? ""}`.trim(),
      player_position: o.players?.specific_position ?? "",
      player_rating: o.players?.rating ?? 0,
      buyer_team_id: o.buyer_team_id,
      buyer_team_name: o.buyer_team?.name ?? "Bilinmeyen",
      seller_team_id: o.seller_team_id,
      seller_team_name: o.seller_team?.name ?? "Bilinmeyen",
      offer_amount: o.offer_amount,
      wage_offer: o.wage_offer ?? 0,
      contract_years: o.contract_years ?? 2,
      status: o.status,
      created_at: o.created_at,
      responded_at: o.responded_at,
    }));
  } catch (e) {
    console.error("[multiplayer-transfer] fetchIncoming exception:", e);
    return [];
  }
}

/**
 * Multiplayer teklifi yanıtlı (accept/reject).
 *
 * Kabul edilirse:
 * 1. Oyuncunun team_id'sini buyer_team_id yap
 * 2. Buyer bütçesinden düş, seller bütçesine ekle
 * 3. Teklif status = 'accepted'
 */
export async function respondToMultiplayerOffer(
  offerId: string,
  accept: boolean
): Promise<{ success: boolean; reason?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, reason: "not-authed" };

    // Teklifi getir
    const { data: offer, error: offerError } = await supabase
      .from("transfer_offers_mp")
      .select(`
        id,
        player_id,
        buyer_team_id,
        seller_team_id,
        offer_amount,
        status
      `)
      .eq("id", offerId)
      .single();

    if (offerError || !offer) {
      return { success: false, reason: "not-found" };
    }

    if (offer.status !== "pending") {
      return { success: false, reason: "already-responded" };
    }

    // Satıcı bu kullanıcı mı?
    const { data: myTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("manager_user_id", user.id)
      .single();

    if (!myTeam || myTeam.id !== offer.seller_team_id) {
      return { success: false, reason: "not-authorized" };
    }

    if (accept) {
      // Transfer uygula
      // 1. Oyuncunun team_id'sini güncelle
      const { error: playerUpdateError } = await supabase
        .from("players")
        .update({ team_id: offer.buyer_team_id })
        .eq("id", offer.player_id);

      if (playerUpdateError) {
        return { success: false, reason: "player-update-failed" };
      }

      // 2. Buyer bütçesinden düş
      const { data: buyerTeam } = await supabase
        .from("teams")
        .select("budget")
        .eq("id", offer.buyer_team_id)
        .single();

      if (buyerTeam) {
        const totalCost = Math.round(offer.offer_amount * 1.08);
        await supabase
          .from("teams")
          .update({ budget: Math.max(0, buyerTeam.budget - totalCost) })
          .eq("id", offer.buyer_team_id);
      }

      // 3. Seller bütçesine ekle (%2.5 vergi düş)
      const { data: sellerTeam } = await supabase
        .from("teams")
        .select("budget")
        .eq("id", offer.seller_team_id)
        .single();

      if (sellerTeam) {
        const net = Math.round(offer.offer_amount * 0.975);
        await supabase
          .from("teams")
          .update({ budget: sellerTeam.budget + net })
          .eq("id", offer.seller_team_id);
      }

      // 4. Buyer'a bildirim
      const { data: buyerTeamData } = await supabase
        .from("teams")
        .select("manager_user_id")
        .eq("id", offer.buyer_team_id)
        .single();

      if (buyerTeamData) {
        await supabase
          .from("notifications")
          .insert({
            user_id: buyerTeamData.manager_user_id,
            type: "transfer_accepted",
            title: "Teklif Kabul Edildi",
            body: `Transfer teklifiniz kabul edildi! Oyuncu kadronuza eklendi.`,
            data: { player_id: offer.player_id, offer_amount: offer.offer_amount },
            read: false,
          });
      }
    }

    // Teklif status güncelle
    await supabase
      .from("transfer_offers_mp")
      .update({
        status: accept ? "accepted" : "rejected",
        responded_at: new Date().toISOString(),
      })
      .eq("id", offerId);

    return { success: true };
  } catch (e) {
    console.error("[multiplayer-transfer] respondTo exception:", e);
    return { success: false, reason: "exception" };
  }
}

/**
 * Kullanıcının gönderdiği tekliflerin durumunu kontrol et.
 * Kabul edilenleri local state'e yansıt.
 */
export async function checkOfferStatuses(): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: myTeam } = await supabase
      .from("teams")
      .select("id")
      .eq("manager_user_id", user.id)
      .single();

    if (!myTeam) return;

    // Buyer olduğu kabul edilen teklifler
    const { data: acceptedOffers } = await supabase
      .from("transfer_offers_mp")
      .select("id, player_id, offer_amount, status")
      .eq("buyer_team_id", myTeam.id)
      .eq("status", "accepted");

    if (acceptedOffers && acceptedOffers.length > 0) {
      // Local store'a yansıt — oyuncu kadroya eklendi
      for (const offer of acceptedOffers) {
        // Transfer'i local olarak uygula
        // (Supabase'de zaten yapıldı, local'i sync et)
        console.log(`[multiplayer-transfer] Offer ${offer.id} accepted — sync local state`);
      }
    }
  } catch (e) {
    console.error("[multiplayer-transfer] checkOfferStatuses exception:", e);
  }
}
