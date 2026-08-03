-- =============================================================================
-- Touchline Manager — 035: Multiplayer Transfer RPC (v2.9.73)
-- =============================================================================
-- Sorun: src/lib/multiplayer-transfer.ts'teki respondToMultiplayerOffer
-- 4 ayrı Supabase çağrısı yapıyordu:
--   1. UPDATE players SET team_id = buyer
--   2. UPDATE teams SET budget -= cost WHERE id = buyer
--   3. UPDATE teams SET budget += net WHERE id = seller
--   4. INSERT notification
--
-- 3 sorun:
--   1. RLS ihlali: seller JWT'si ile buyer'ın teams.budget alanını güncelleyemiyor
--      (RLS policy manager_user_id = auth.uid() gerektirir)
--   2. Race condition: 4 çağrıdan herhangi biri başarısız olursa yarı transfer kalır
--   3. Atomic değil: aynı teklif iki kez kabul edilebilir (status check ayrı)
--
-- Çözüm: Tek RPC fonksiyonu (rpc_respond_multiplayer_offer) — SECURITY DEFINER
-- + transaction içinde + auth.uid() kontrolü ile.
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_respond_multiplayer_offer(
  p_offer_id UUID,
  p_accept BOOLEAN
)
RETURNS JSON AS $$
DECLARE
  offer RECORD;
  seller_team RECORD;
  buyer_team RECORD;
  player_rec RECORD;
  buyer_cost BIGINT;
  seller_net BIGINT;
  auth_uid UUID := auth.uid();
BEGIN
  -- 1. Yetki kontrolü
  IF auth_uid IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not-authed');
  END IF;

  -- 2. Teklifi kilitle (FOR UPDATE — concurrent accept'i engeller)
  SELECT * INTO offer FROM transfer_offers_mp
  WHERE id = p_offer_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'not-found');
  END IF;

  -- 3. Status kontrolü
  IF offer.status != 'pending' THEN
    RETURN json_build_object('success', false, 'reason', 'already-responded');
  END IF;

  -- 4. Satıcı bu kullanıcı mı?
  SELECT * INTO seller_team FROM teams
  WHERE id = offer.seller_team_id AND manager_user_id = auth_uid;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'not-authorized');
  END IF;

  -- 5. Reddetme durumu — sadece status güncelle
  IF NOT p_accept THEN
    UPDATE transfer_offers_mp
    SET status = 'rejected', responded_at = NOW()
    WHERE id = p_offer_id;
    RETURN json_build_object('success', true, 'accepted', false);
  END IF;

  -- 6. Kabul durumu — transferi uygula (transaction içinde)
  SELECT * INTO buyer_team FROM teams WHERE id = offer.buyer_team_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'buyer-not-found');
  END IF;

  SELECT * INTO player_rec FROM players WHERE id = offer.player_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'player-not-found');
  END IF;

  -- 7. Buyer bütçe kontrolü (server-side, atomic)
  buyer_cost := offer.offer_amount + (offer.offer_amount * 0.05)::BIGINT + (offer.offer_amount * 0.03)::BIGINT;
  IF buyer_team.budget < buyer_cost THEN
    RETURN json_build_object('success', false, 'reason', 'buyer-budget');
  END IF;

  -- 8. Seller net (2.5% vergi)
  seller_net := (offer.offer_amount * 0.975)::BIGINT;

  -- 9. Tüm güncellemeler atomik (BEGIN/COMMIT fonksiyon içinde örtük)
  --    Bunlar RLS bypass eder (SECURITY DEFINER)
  UPDATE players
  SET team_id = offer.buyer_team_id
  WHERE id = offer.player_id;

  UPDATE teams
  SET budget = GREATEST(0, budget - buyer_cost)
  WHERE id = offer.buyer_team_id;

  UPDATE teams
  SET budget = budget + seller_net
  WHERE id = offer.seller_team_id;

  -- 10. Teklif durumunu güncelle (kilitli satır)
  UPDATE transfer_offers_mp
  SET status = 'accepted', responded_at = NOW()
  WHERE id = p_offer_id;

  -- 11. Buyer'a bildirim (fire-and-forget, transaction'ı etkilemesin)
  BEGIN
    INSERT INTO notifications (
      user_id, type, title, body, data, read
    ) VALUES (
      buyer_team.manager_user_id,
      'transfer_accepted',
      'Teklif Kabul Edildi',
      'Transfer teklifiniz kabul edildi! Oyuncu kadronuza eklendi.',
      json_build_object('player_id', offer.player_id, 'offer_amount', offer.offer_amount),
      false
    );
  EXCEPTION WHEN OTHERS THEN
    -- Bildirim hatası transferi geri almamalı
    RAISE NOTICE 'Notification insert failed: %', SQLERRM;
  END;

  RETURN json_build_object(
    'success', true,
    'accepted', true,
    'player_id', offer.player_id,
    'buyer_team_id', offer.buyer_team_id,
    'offer_amount', offer.offer_amount,
    'buyer_cost', buyer_cost,
    'seller_net', seller_net
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION rpc_respond_multiplayer_offer(UUID, BOOLEAN) IS 'v2.9.73: Atomic multiplayer offer accept/reject (RLS-safe)';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS rpc_respond_multiplayer_offer(UUID, BOOLEAN);
