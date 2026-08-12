-- =============================================================================
-- v2.9.67: Cron job service_role key fix + special_cups düzeltmeleri
-- =============================================================================

-- ─── 1) Cron job'ları placeholder key ile vault pattern'e taşı ──────────────
-- v2.9.65: Edge Function'lara auth kontrolü eklendi, placeholder key artık 401 döner
-- Bu migration cron job'ları vault'tan key okuyacak şekilde günceller

-- Önce vault'a service_role key'i ekle (manuel: Supabase Dashboard → Vault)
-- NOT: vault secret manuel olarak eklenmeli:
-- SELECT vault.create_secret('YOUR_ACTUAL_SERVICE_ROLE_KEY', 'supabase_service_role_key');

-- Eski cron job'ları kaldır
DO $$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT jobid FROM cron.job WHERE jobname IN ('daily-match-sim', 'daily-cup-sim', 'daily-training-sim')
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
END $$;

-- Yeni cron job'lar — vault'tan key okuyarak
-- daily-match-sim: hafta içi 12:00 ve 18:00
SELECT cron.schedule(
  'daily-match-sim',
  '0 9,15 * * 1-5',  -- UTC 09:00, 15:00 = TR 12:00, 18:00
  $$
    SELECT net.http_post(
      url := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co/functions/v1/daily-match-sim',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- daily-cup-sim: cumartesi 12:00 ve 18:00
SELECT cron.schedule(
  'daily-cup-sim',
  '0 9,15 * * 6',  -- UTC 09:00, 15:00 = TR 12:00, 18:00 cumartesi
  $$
    SELECT net.http_post(
      url := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co/functions/v1/daily-cup-sim',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- daily-training-sim: hafta içi 10:00 ve 16:00
SELECT cron.schedule(
  'daily-training-sim',
  '0 7,13 * * 1-5',  -- UTC 07:00, 13:00 = TR 10:00, 16:00
  $$
    SELECT net.http_post(
      url := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co/functions/v1/daily-training-sim',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ─── 2) special_cups view düzeltme ──────────────────────────────────────────
-- Migration 028 nonexistent kolonlara referans veren view oluşturmuştu

DROP VIEW IF EXISTS special_cups_public;

-- Gerçek kolonlarla view oluştur (migration 021 şemasına göre)
CREATE OR REPLACE VIEW special_cups_public AS
  SELECT
    id,
    creator_id,
    creator_team_name,
    creator_team_short,
    creator_team_color,
    cup_name,
    size,
    is_password_protected,
    status,
    current_round,
    champion_team_name,
    created_at,
    scheduled_day
  FROM special_cups;

GRANT SELECT ON special_cups_public TO authenticated;

-- ─── 3) rpc_join_special_cup — eski 6-parametreliyi DROP, yeni güvenli RPC ──
DROP FUNCTION IF EXISTS rpc_join_special_cup(UUID, UUID, TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS rpc_join_special_cup(UUID, TEXT);

CREATE OR REPLACE FUNCTION rpc_join_special_cup(
  p_cup_id UUID,
  p_team_name TEXT DEFAULT NULL,
  p_team_short TEXT DEFAULT NULL,
  p_team_color TEXT DEFAULT NULL,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_cup special_cups%ROWTYPE;
  v_participant_count INTEGER;
  v_already_joined BOOLEAN;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  SELECT * INTO v_cup FROM special_cups WHERE id = p_cup_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kupa bulunamadı');
  END IF;

  IF NOT v_cup.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kupa aktif değil');
  END IF;

  -- Şifre kontrolü — crypt() ile hash karşılaştırma
  IF v_cup.is_password_protected AND v_cup.password IS NOT NULL AND v_cup.password != '' THEN
    IF p_password IS NULL OR crypt(p_password, v_cup.password) != v_cup.password THEN
      RETURN jsonb_build_object('success', false, 'error', 'Yanlış şifre');
    END IF;
  END IF;

  -- Kapasite kontrolü
  SELECT COUNT(*) INTO v_participant_count
  FROM special_cup_participants
  WHERE cup_id = p_cup_id;

  IF v_participant_count >= v_cup.size THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kupa dolu');
  END IF;

  -- Zaten katılmış mı?
  SELECT EXISTS(
    SELECT 1 FROM special_cup_participants
    WHERE cup_id = p_cup_id AND user_id = v_user_id
  ) INTO v_already_joined;

  IF v_already_joined THEN
    RETURN jsonb_build_object('success', false, 'error', 'Zaten katıldınız');
  END IF;

  -- Katılımcı ekle
  INSERT INTO special_cup_participants (cup_id, user_id, team_name, team_short, team_color, joined_at)
  VALUES (p_cup_id, v_user_id, p_team_name, p_team_short, p_team_color, NOW());

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON rpc_join_special_cup TO authenticated;

-- ─── 4) rpc_create_special_cup — şifreyi hash'le ────────────────────────────
CREATE OR REPLACE FUNCTION rpc_create_special_cup(
  p_creator_team_name TEXT,
  p_creator_team_short TEXT,
  p_creator_team_color TEXT,
  p_cup_name TEXT,
  p_size INTEGER DEFAULT 8,
  p_password TEXT DEFAULT NULL,
  p_scheduled_day TEXT DEFAULT 'saturday'
)
RETURNS JSONB AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_cup_id UUID;
  v_hashed_password TEXT := NULL;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Not authenticated');
  END IF;

  IF p_password IS NOT NULL AND p_password != '' THEN
    v_hashed_password := crypt(p_password, gen_salt('bf'));
  END IF;

  INSERT INTO special_cups (
    creator_id, creator_team_name, creator_team_short, creator_team_color,
    cup_name, size, is_password_protected, password, status, current_round,
    created_at, scheduled_day
  ) VALUES (
    v_user_id, p_creator_team_name, p_creator_team_short, p_creator_team_color,
    p_cup_name, p_size, (v_hashed_password IS NOT NULL), v_hashed_password,
    'waiting', 0, NOW(), p_scheduled_day
  ) RETURNING id INTO v_cup_id;

  -- Creator'ı katılımcı olarak ekle
  INSERT INTO special_cup_participants (cup_id, user_id, team_name, team_short, team_color, joined_at)
  VALUES (v_cup_id, v_user_id, p_creator_team_name, p_creator_team_short, p_creator_team_color, NOW());

  RETURN jsonb_build_object('success', true, 'cup_id', v_cup_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON rpc_create_special_cup TO authenticated;
