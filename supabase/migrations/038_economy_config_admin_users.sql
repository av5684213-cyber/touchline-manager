-- =============================================================================
-- Touchline Manager — 038: Economy Config + Admin Users + Bug Fixes
-- =============================================================================
-- Bu migration 4 şey yapar:
-- 1. economy_config tablosu oluşturur (merkezi ekonomi parametreleri)
-- 2. admin_users tablosu oluşturur (dev/admin modu için)
-- 3. Standings tiebreaker düzeltmesi (goals_for ekle)
-- 4. Transfer vergisi %2.5 → %10'a çıkarır (trigger günceller)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1) ECONOMY CONFIG — Merkezi ekonomi parametre tablosu
-- ═══════════════════════════════════════════════════════════════════════════
-- Tüm ekonomi değerleri tek tabloda — hardcode yok, runtime'da değiştirilebilir.

CREATE TABLE IF NOT EXISTS economy_config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE economy_config ENABLE ROW LEVEL SECURITY;
-- Sadece adminler yazabilir, herkes okuyabilir
CREATE POLICY economy_config_read ON economy_config FOR SELECT USING (true);
CREATE POLICY economy_config_write ON economy_config FOR ALL
  USING (EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid()));

-- Varsayılan değerler
INSERT INTO economy_config (key, value, description) VALUES
-- Enflasyon
('base_inflation_rate', '0.025'::jsonb, 'Sezonluk enflasyon oranı (eski: 0.08)'),
('max_inflation_multiplier', '3.0'::jsonb, 'Maksimum enflasyon çarpanı'),

-- Transfer vergisi
('transfer_tax_rate', '0.10'::jsonb, 'Transfer vergisi (eski: 0.025)'),
('agent_fee_rate', '0.05'::jsonb, 'Aracı komisyonu'),
('signing_bonus_rate', '0.03'::jsonb, 'İmza bonusu'),

-- Ödül → oyuncu değeri çarpanları
('award_value_league_champion', '0.10'::jsonb, 'Lig şampiyonluğu değer artışı'),
('award_value_cup_champion', '0.06'::jsonb, 'Kupa şampiyonluğu değer artışı'),
('award_value_cl_champion', '0.15'::jsonb, 'Şampiyonlar Ligi değer artışı'),
('award_value_golden_boot', '0.07'::jsonb, 'Gol kralı değer artışı'),
('award_value_mvp', '0.08'::jsonb, 'Sezon MVP değer artışı'),
('award_value_gold', '0.12'::jsonb, 'Gold sezon ödülü çarpanı'),
('award_value_silver', '0.06'::jsonb, 'Silver sezon ödülü çarpanı'),
('award_value_bronze', '0.03'::jsonb, 'Bronze sezon ödülü çarpanı'),
('award_diminishing_factor', '0.85'::jsonb, 'Üst üste ödülde azalan etki'),

-- Sponsor çarpanları
('sponsor_tier1_mult', '1.0'::jsonb, 'Süper Lig sponsor çarpanı'),
('sponsor_tier2_mult', '0.50'::jsonb, '1. Lig sponsor çarpanı'),
('sponsor_tier3_mult', '0.25'::jsonb, '2. Lig sponsor çarpanı'),
('sponsor_tier4_mult', '0.125'::jsonb, '3. Lig sponsor çarpanı'),
('sponsor_tier5_mult', '0.05'::jsonb, 'Amatör Lig sponsor çarpanı'),
('sponsor_max_season', '25000000'::jsonb, 'Maksimum sponsor geliri (sezon)'),
('sponsor_champion_bonus', '0.06'::jsonb, 'Şampiyonluk sponsor bonus çarpanı'),

-- Kredi bonusu
('credit_bonus_base', '20'::jsonb, 'Temel sezon sonu kredi bonusu'),
('credit_bonus_champion', '80'::jsonb, 'Şampiyon ekstra kredi'),
('credit_bonus_top3', '40'::jsonb, 'İlk 3 ekstra kredi')
ON CONFLICT (key) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2) ADMIN USERS — Dev/admin modu için
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  is_dev_admin BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;
-- Sadece kendi kaydını görebilir, yazamaz (service role ile yönetilir)
CREATE POLICY admin_users_self_read ON admin_users FOR SELECT
  USING (user_id = auth.uid());

-- Admin email'lerini ekle (037_forum_admin_rpc.sql'deki listeyle aynı)
INSERT INTO admin_users (user_id, email, is_dev_admin)
SELECT id, email, true
FROM auth.users
WHERE email IN (
  'av5684213-cyber@gmail.com',
  'admin@touchline-manager.com'
)
ON CONFLICT (user_id) DO NOTHING;

-- RPC: Admin kontrolü
CREATE OR REPLACE FUNCTION rpc_is_dev_admin()
RETURNS JSON AS $$
DECLARE
  auth_uid UUID := auth.uid();
  is_admin BOOLEAN := false;
BEGIN
  IF auth_uid IS NULL THEN
    RETURN json_build_object('success', false, 'is_dev_admin', false);
  END IF;

  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth_uid AND is_dev_admin = true)
  INTO is_admin;

  RETURN json_build_object('success', true, 'is_dev_admin', is_admin);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Maçı manuel tetikle (admin only)
CREATE OR REPLACE FUNCTION rpc_admin_trigger_match()
RETURNS JSON AS $$
DECLARE
  auth_uid UUID := auth.uid();
  is_admin BOOLEAN := false;
BEGIN
  IF auth_uid IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not-authed');
  END IF;

  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth_uid AND is_dev_admin = true)
  INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object('success', false, 'reason', 'not-admin');
  END IF;

  -- Match sim'i tetikle — Edge Function çağır
  -- Not: Bu RPC çağrıldığında client-side advanceMatchday yapılır
  RETURN json_build_object('success', true, 'message', 'Match triggered');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Ekonomi config değerini oku
CREATE OR REPLACE FUNCTION rpc_get_economy_config()
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_object_agg(key, value) INTO result FROM economy_config;
  RETURN COALESCE(result, '{}'::json);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Ekonomi config değerini güncelle (admin only)
CREATE OR REPLACE FUNCTION rpc_update_economy_config(
  p_key TEXT,
  p_value JSONB
)
RETURNS JSON AS $$
DECLARE
  auth_uid UUID := auth.uid();
  is_admin BOOLEAN := false;
BEGIN
  IF auth_uid IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not-authed');
  END IF;

  SELECT EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth_uid AND is_dev_admin = true)
  INTO is_admin;

  IF NOT is_admin THEN
    RETURN json_build_object('success', false, 'reason', 'not-admin');
  END IF;

  UPDATE economy_config
  SET value = p_value, updated_at = NOW()
  WHERE key = p_key;

  IF NOT FOUND THEN
    INSERT INTO economy_config (key, value) VALUES (p_key, p_value);
  END IF;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 3) STANDINGS TIEBREAKER FIX — goals_for tiebreaker ekle
-- ═══════════════════════════════════════════════════════════════════════════
-- Mevcut: ORDER BY points DESC, goal_diff DESC
-- Düzeltme: ORDER BY points DESC, goal_diff DESC, goals_for DESC, won DESC
-- Bu, averaj eşitse atılan gol çok olan takımın üstün olmasını sağlar.

-- 007_season_transfer_notifications.sql'deki fonksiyonları güncelle
CREATE OR REPLACE FUNCTION get_promoted_teams(p_league_id UUID)
RETURNS UUID[] AS $$
DECLARE
  standings_rows UUID[];
BEGIN
  SELECT array_agg(team_id ORDER BY points DESC, goal_diff DESC, goals_for DESC, won DESC) INTO standings_rows
  FROM standings
  WHERE league_id = p_league_id;

  RETURN standings_rows[1:3];  -- İlk 3
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION get_relegated_teams(p_league_id UUID)
RETURNS UUID[] AS $$
DECLARE
  standings_rows UUID[];
  total_teams INTEGER;
BEGIN
  SELECT count(*) INTO total_teams FROM standings WHERE league_id = p_league_id;

  SELECT array_agg(team_id ORDER BY points ASC, goal_diff ASC, goals_for ASC) INTO standings_rows
  FROM standings
  WHERE league_id = p_league_id;

  RETURN standings_rows[1:3];  -- Son 3
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4) TRANSFER VERGİSİ GÜNCELLEME — trigger'da %2.5 → %10
-- ═══════════════════════════════════════════════════════════════════════════
-- Mevcut trigger (001_initial_schema.sql) hardcoded 0.025 kullanıyor.
-- economy_config'ten okuyacak şekilde güncellenemez (trigger içinde SELECT yavaş).
-- Bunun yerine: trigger'ı yeni oranla yeniden tanımla.
-- İleride oran değişecekse trigger'ı DROP + CREATE ile güncelle.

CREATE OR REPLACE FUNCTION execute_transfer(
  p_player_id UUID,
  p_buyer_team_id UUID,
  p_seller_team_id UUID,
  p_transfer_fee BIGINT,
  p_agent_fee BIGINT DEFAULT 0,
  p_signing_bonus BIGINT DEFAULT 0
)
RETURNS JSON AS $$
DECLARE
  v_buyer_budget BIGINT;
  v_total_cost BIGINT;
  v_tax BIGINT;
  v_transfer_tax_rate NUMERIC := 0.10;  -- v2.9.96: %2.5 → %10
BEGIN
  v_total_cost := p_transfer_fee + p_agent_fee + p_signing_bonus;

  SELECT budget INTO v_buyer_budget FROM teams WHERE id = p_buyer_team_id;
  IF v_buyer_budget < v_total_cost THEN
    RETURN json_build_object('success', false, 'reason', 'insufficient-budget');
  END IF;

  -- v2.9.96: Transfer vergisi %10 (eski: %2.5) — para arzını azaltır
  v_tax := ROUND(p_transfer_fee * v_transfer_tax_rate);

  -- Alıcıdan düş
  UPDATE teams SET budget = budget - v_total_cost WHERE id = p_buyer_team_id;
  -- Satıcıya net (fee - tax) — tax "yanar" (para havuzundan çekilir)
  UPDATE teams SET budget = budget + (p_transfer_fee - v_tax) WHERE id = p_seller_team_id;

  -- Oyuncunun takımını güncelle
  UPDATE players SET team_id = p_buyer_team_id WHERE id = p_player_id;

  RETURN json_build_object(
    'success', true,
    'transfer_fee', p_transfer_fee,
    'tax', v_tax,
    'tax_rate', v_transfer_tax_rate,
    'agent_fee', p_agent_fee,
    'signing_bonus', p_signing_bonus,
    'total_cost', v_total_cost,
    'seller_net', p_transfer_fee - v_tax
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- BİLGİ: Cron job'lar zaten doğru (014_cron_all_sims.sql)
-- ═══════════════════════════════════════════════════════════════════════════
-- Mevcut cron schedule:
--   Lig: '0 9,15 * * 1-5' → UTC 09:00 + 15:00 (TR 12:00 + 18:00), Pzt-Cum
--   Kupa: '0 17 * * 3,6' → UTC 17:00 (TR 20:00), Çar + Cmt
--   Antrenman: '0 12,18 * * 1-5' → UTC 12:00 + 18:00 (TR 15:00 + 21:00), Pzt-Cum
--
-- Timezone: TR (UTC+3) kullanılıyor. pg_cron UTC'de çalışır,
-- Edge Function içinde TR saatine çevrilir (isWeekdayTR fonksiyonu).
-- Hafta sonu lig maçı YOK — sadece kupa (Çar+Cmt 20:00 TR).
-- ═══════════════════════════════════════════════════════════════════════════
