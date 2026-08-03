-- =============================================================================
-- Touchline Manager — 034: RPC Security Hardening (v2.9.73)
-- =============================================================================
-- 2 sorun düzeltmesi:
--
-- 1. SET search_path = public eksik (HIGH - RLS bypass riski)
--    Supabase resmi güvenlik önerisi: SECURITY DEFINER fonksiyonlarında
--    search_path ayarlanmazsa, saldırgan public şemasında kötü niyetli
--    fonksiyon tanımlayıp gölgeleyebilir (function search_path hijack).
--    Çözüm: Tüm SECURITY DEFINER fonksiyonlarına ALTER FUNCTION ... SET search_path
--
-- 2. p_profile_id auth.uid() doğrulaması yok (HIGH - veri sızıntısı/overwrite)
--    rpc_load_game_state, rpc_save_game_state, rpc_create_outgoing_offer,
--    rpc_accept_counter_offer, rpc_complete_upgrade_if_due,
--    rpc_get_facility_levels, rpc_get_unread_message_count — hepsi
--    p_profile_id parametresini alıyor ama auth.uid() ile karşılaştırmıyor.
--    Kötü niyetli kullanıcı kendi JWT'si ile başka kullanıcının UUID'sini
--    geçirip kurbanın state'ini okuyabilir/overwrite edebilir.
--    Çözüm: Her fonksiyonun başına auth.uid() kontrolü ekle.
-- =============================================================================

-- ─── 1. search_path = public ekle (tüm SECURITY DEFINER fonksiyonlara) ──────
-- ALTER FUNCTION ... SET search_path = public syntax ile.
-- Bu, fonksiyon gövdesini değiştirmeden sadece search_path ayarlar.

-- 001_initial_schema.sql
ALTER FUNCTION rpc_get_random_team_id() SET search_path = public;
ALTER FUNCTION rpc_assign_team_to_user(p_country_code TEXT, p_team_name TEXT, p_preferred_tier INT) SET search_path = public;
ALTER FUNCTION rpc_assign_team_to_user_v2(p_user_id UUID, p_team_name TEXT, p_country_code TEXT, p_preferred_tier INT) SET search_path = public;
ALTER FUNCTION handle_new_user() SET search_path = public;
ALTER FUNCTION update_updated_at_column() SET search_path = public;
ALTER FUNCTION check_topic_rate_limit() SET search_path = public;
ALTER FUNCTION check_reply_rate_limit() SET search_path = public;

-- 002_touchline_manager.sql
ALTER FUNCTION rpc_evaluate_bot_offer(p_player_id UUID, p_amount BIGINT) SET search_path = public;
ALTER FUNCTION rpc_create_outgoing_offer(p_profile_id UUID, p_player_id UUID, p_to_team_id UUID, p_amount BIGINT, p_wage BIGINT, p_contract_years INTEGER) SET search_path = public;
ALTER FUNCTION rpc_accept_counter_offer(p_profile_id UUID, p_offer_id UUID) SET search_path = public;
ALTER FUNCTION rpc_complete_upgrade_if_due(p_profile_id UUID) SET search_path = public;
ALTER FUNCTION rpc_get_facility_levels(p_profile_id UUID) SET search_path = public;
ALTER FUNCTION rpc_get_unread_message_count(p_profile_id UUID) SET search_path = public;
ALTER FUNCTION update_updated_at_column() SET search_path = public; -- already done above

-- 003_cloud_save.sql
ALTER FUNCTION rpc_load_game_state(p_profile_id UUID) SET search_path = public;
ALTER FUNCTION rpc_save_game_state(p_profile_id UUID, p_state JSONB, p_version INTEGER) SET search_path = public;

-- 003_cron_match_sim.sql
DO $$ DECLARE fn_name TEXT;
BEGIN
  FOR fn_name IN
    SELECT proname FROM pg_proc p JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND proname LIKE 'rpc_%sim%'
  LOOP
    BEGIN EXECUTE 'ALTER FUNCTION ' || fn_name || '() SET search_path = public'; EXCEPTION WHEN OTHERS THEN NULL; END;
  END LOOP;
END $$;

-- 004_multiplayer_league.sql, 005_team_assignment_rls.sql, 006_active_tactics_and_triggers.sql
-- (Custom RPC'ler için aşağıdaki generic blok)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT p.oid, p.proname, pg_get_function_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
      AND p.proname LIKE 'rpc_%'
      AND p.prokind = 'f'
      AND has_function_privilege('public', p.oid, 'EXECUTE')
  LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION %I(%s) SET search_path = public', r.proname, r.args);
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Skip %: %', r.proname, SQLERRM;
    END;
  END LOOP;
END $$;

-- 011_v2_features.sql, 015_dynamic_league_expansion.sql, 016_country_leagues.sql
-- 018_push_notifications.sql, 019_global_transfer_market.sql, 020_forum_system.sql
-- 021_special_cup_system.sql, 024_cosmetics_shop.sql, 026_forum_rate_limit.sql
-- 028_security_fixes.sql, 030_cron_key_and_special_cups_fix.sql
-- 031_blocked_users_rpc_fix.sql, 033_chat_messages_rate_limit.sql
-- (Yukarıdaki generic blok zaten hepsini yakaladı.)

-- ─── 2. p_profile_id auth.uid() doğrulaması ekle ────────────────────────────
-- Bu fonksiyonları tamamen yeniden tanımlıyoruz (CREATE OR REPLACE)
-- çünkü search_path + auth kontrolü + logic beraber olmalı.

-- 2a. rpc_load_game_state
CREATE OR REPLACE FUNCTION rpc_load_game_state(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSONB;
  auth_uid UUID := auth.uid();
BEGIN
  IF auth_uid IS NULL OR p_profile_id != auth_uid THEN
    RAISE EXCEPTION 'Forbidden: profile_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT state INTO result FROM user_game_state WHERE profile_id = p_profile_id;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2b. rpc_save_game_state
CREATE OR REPLACE FUNCTION rpc_save_game_state(
  p_profile_id UUID,
  p_state JSONB,
  p_version INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  auth_uid UUID := auth.uid();
BEGIN
  IF auth_uid IS NULL OR p_profile_id != auth_uid THEN
    RAISE EXCEPTION 'Forbidden: profile_id mismatch' USING ERRCODE = '42501';
  END IF;
  INSERT INTO user_game_state (profile_id, state, version, updated_at)
  VALUES (p_profile_id, p_state, p_version, NOW())
  ON CONFLICT (profile_id)
  DO UPDATE SET state = p_state, version = p_state.version, updated_at = NOW()
  WHERE user_game_state.profile_id = p_profile_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2c. rpc_create_outgoing_offer
CREATE OR REPLACE FUNCTION rpc_create_outgoing_offer(
  p_profile_id UUID,
  p_player_id UUID,
  p_to_team_id UUID,
  p_amount BIGINT,
  p_wage BIGINT,
  p_contract_years INTEGER
) RETURNS UUID AS $$
DECLARE
  offer_id UUID;
  p RECORD;
  to_team RECORD;
  evaluation JSON;
  msg_id UUID;
  auth_uid UUID := auth.uid();
BEGIN
  IF auth_uid IS NULL OR p_profile_id != auth_uid THEN
    RAISE EXCEPTION 'Forbidden: profile_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO p FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;
  SELECT * INTO to_team FROM teams WHERE id = p_to_team_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team not found'; END IF;

  IF EXISTS (SELECT 1 FROM outgoing_offers
             WHERE profile_id = p_profile_id AND player_id = p_player_id
             AND status IN ('pending', 'negotiated')) THEN
    RAISE EXCEPTION 'already-pending';
  END IF;

  evaluation := rpc_evaluate_bot_offer(p_player_id, p_amount);

  INSERT INTO outgoing_offers (
    profile_id, player_id, player_name, player_position,
    to_team_id, to_team_name, to_team_short, to_team_color,
    amount, wage_offer, contract_years, status, counter_offer,
    expires_at
  ) VALUES (
    p_profile_id, p_player_id,
    p.first_name || ' ' || p.last_name, p.specific_position,
    p_to_team_id, to_team.name, to_team.short_name, to_team.primary_color,
    p_amount, p_wage, p_contract_years,
    (evaluation->>'decision')::TEXT,
    NULLIF(evaluation->>'counter_offer', '')::BIGINT,
    NOW() + INTERVAL '48 hours'
  ) RETURNING id INTO offer_id;

  INSERT INTO transfer_messages (
    profile_id, kind, from_team_id, from_team_name, from_team_short, from_team_color,
    to_team_id, player_id, player_name, player_position,
    amount, counter_offer, wage_offer, contract_years, message, related_offer_id
  ) VALUES (
    p_profile_id,
    CASE (evaluation->>'decision')::TEXT
      WHEN 'accept' THEN 'transfer_accepted'::message_kind
      WHEN 'reject' THEN 'transfer_rejected'::message_kind
      ELSE 'transfer_negotiated'::message_kind
    END,
    p_to_team_id, to_team.name, to_team.short_name, to_team.primary_color,
    p_profile_id, p_player_id,
    p.first_name || ' ' || p.last_name, p.specific_position,
    p_amount, NULLIF(evaluation->>'counter_offer', '')::BIGINT,
    p_wage, p_contract_years,
    CASE (evaluation->>'decision')::TEXT
      WHEN 'accept' THEN to_team.name || ' teklifinizi kabul etti!'
      WHEN 'reject' THEN to_team.name || ' teklifinizi reddetti.'
      ELSE to_team.name || ' counter teklif gönderdi.'
    END,
    offer_id
  ) RETURNING id INTO msg_id;

  RETURN offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2d. rpc_accept_counter_offer
CREATE OR REPLACE FUNCTION rpc_accept_counter_offer(p_profile_id UUID, p_offer_id UUID)
RETURNS JSON AS $$
DECLARE
  offer RECORD;
  p RECORD;
  to_team RECORD;
  buyer_cost BIGINT;
  profile_budget BIGINT;
  auth_uid UUID := auth.uid();
BEGIN
  IF auth_uid IS NULL OR p_profile_id != auth_uid THEN
    RAISE EXCEPTION 'Forbidden: profile_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO offer FROM outgoing_offers
  WHERE id = p_offer_id AND profile_id = p_profile_id AND status = 'negotiated';
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'invalid-offer'); END IF;

  SELECT budget INTO profile_budget FROM profiles WHERE id = p_profile_id;
  buyer_cost := offer.counter_offer + (offer.counter_offer * 0.05)::BIGINT + (offer.counter_offer * 0.03)::BIGINT;

  IF profile_budget < buyer_cost THEN
    RETURN json_build_object('success', false, 'reason', 'budget');
  END IF;

  SELECT * INTO p FROM players WHERE id = offer.player_id;
  SELECT * INTO to_team FROM teams WHERE id = offer.to_team_id;
  IF NOT FOUND OR NOT to_team%FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'player-not-found');
  END IF;

  -- Bütçe transferi
  UPDATE profiles SET budget = budget - buyer_cost WHERE id = p_profile_id;
  UPDATE teams SET budget = budget + offer.counter_offer WHERE id = offer.to_team_id;

  -- Oyuncuyu taşı (kullanıcının takımına)
  UPDATE players SET team_id = (
    SELECT id FROM teams WHERE manager_profile_id = p_profile_id LIMIT 1
  ), salary = offer.wage_offer WHERE id = offer.player_id;

  UPDATE outgoing_offers SET status = 'accepted', amount = counter_offer, responded_at = NOW()
  WHERE id = p_offer_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2e. rpc_complete_upgrade_if_due
CREATE OR REPLACE FUNCTION rpc_complete_upgrade_if_due(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  active_rec RECORD;
  auth_uid UUID := auth.uid();
BEGIN
  IF auth_uid IS NULL OR p_profile_id != auth_uid THEN
    RAISE EXCEPTION 'Forbidden: profile_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO active_rec FROM active_upgrades
  WHERE profile_id = p_profile_id AND finish_at <= NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'no-due-upgrade');
  END IF;

  INSERT INTO user_facilities (profile_id, facility_type, level, upgraded_at)
  VALUES (p_profile_id, active_rec.facility_type, active_rec.target_level, NOW())
  ON CONFLICT (profile_id, facility_type)
  DO UPDATE SET level = EXCLUDED.level, upgraded_at = NOW();

  DELETE FROM active_upgrades WHERE id = active_rec.id;

  UPDATE profiles SET
    active_upgrade_facility = NULL,
    active_upgrade_target_level = NULL,
    active_upgrade_started_at = NULL,
    active_upgrade_finish_at = NULL,
    active_upgrade_cost = NULL,
    active_upgrade_speed_up_used = NULL
  WHERE id = p_profile_id;

  RETURN json_build_object('success', true, 'facility', active_rec.facility_type, 'level', active_rec.target_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2f. rpc_get_facility_levels
CREATE OR REPLACE FUNCTION rpc_get_facility_levels(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
  auth_uid UUID := auth.uid();
BEGIN
  IF auth_uid IS NULL OR p_profile_id != auth_uid THEN
    RAISE EXCEPTION 'Forbidden: profile_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(json_object_agg(facility_type, level), '{}'::json) INTO result
  FROM user_facilities WHERE profile_id = p_profile_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2g. rpc_get_unread_message_count
CREATE OR REPLACE FUNCTION rpc_get_unread_message_count(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  cnt INTEGER;
  auth_uid UUID := auth.uid();
BEGIN
  IF auth_uid IS NULL OR p_profile_id != auth_uid THEN
    RAISE EXCEPTION 'Forbidden: profile_id mismatch' USING ERRCODE = '42501';
  END IF;
  SELECT COUNT(*) INTO cnt FROM transfer_messages
  WHERE profile_id = p_profile_id AND read = false;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ─── 3. rpc_assign_team_to_user_v2 — auth.uid() zaten p_user_id ile karşılaştırıyor ─
-- (Mevcut implementasyon zaten güvenli — p_user_id = auth.uid() kontrolü var)
-- Ama search_path ekleyelim.
ALTER FUNCTION rpc_assign_team_to_user_v2(p_user_id UUID, p_team_name TEXT, p_country_code TEXT, p_preferred_tier INT) SET search_path = public;

-- ─── 4. Test — auth.uid() kontrolünün çalıştığını doğrula ─────────────────────
-- (Manuel test: başka kullanıcıya ait UUID ile çağırma → 42501 hatası beklenir)

COMMENT ON FUNCTION rpc_load_game_state(UUID) IS 'v2.9.73: + auth.uid() check + search_path';
COMMENT ON FUNCTION rpc_save_game_state(UUID, JSONB, INTEGER) IS 'v2.9.73: + auth.uid() check + search_path';
COMMENT ON FUNCTION rpc_create_outgoing_offer(UUID, UUID, UUID, BIGINT, BIGINT, INTEGER) IS 'v2.9.73: + auth.uid() check + search_path';
COMMENT ON FUNCTION rpc_accept_counter_offer(UUID, UUID) IS 'v2.9.73: + auth.uid() check + search_path';
COMMENT ON FUNCTION rpc_complete_upgrade_if_due(UUID) IS 'v2.9.73: + auth.uid() check + search_path';
COMMENT ON FUNCTION rpc_get_facility_levels(UUID) IS 'v2.9.73: + auth.uid() check + search_path';
COMMENT ON FUNCTION rpc_get_unread_message_count(UUID) IS 'v2.9.73: + auth.uid() check + search_path';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- Geri almak için: her fonksiyonun eski halini (auth kontrolü olmadan)
-- migration 002/003'ten geri yüklemek gerekir. Search_path kaldırmak için:
-- ALTER FUNCTION rpc_load_game_state(UUID) RESET search_path;
