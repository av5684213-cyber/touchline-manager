-- =============================================================================
-- Touchline Manager — 016: Ülke bazlı lig sistemi (10 başlıca lig)
-- =============================================================================
-- v2.9.20 GÖREV 4: 10 ülke × 4 tier piramidi.
--
-- Ülkeler (ISO kod + Türkçe isim + bayrak + currency):
--   TR Türkiye, GB İngiltere, ES İspanya, IT İtalya, DE Almanya,
--   FR Fransa, PT Portekiz, NL Hollanda, BR Brezilya, AR Arjantin
--
-- Şemada `leagues` tablosuna `country_code` TEXT kolonu eklenir.
-- `teams` tablosuna `country_code` TEXT kolonu eklenir.
-- Yeni RPC `rpc_assign_team_to_user_v2` ülke parametresi ile çalışır.
--
-- 015 migration'ındaki `rpc_assign_team_to_user` geri uyumluluk için korunur
-- (default ülke = "TR" olarak çalışır).
-- =============================================================================

-- ─── COUNTRIES TABLOSU ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS countries (
  code TEXT PRIMARY KEY,                    -- ISO 3166-1 alpha-2 (TR, GB, ES, ...)
  name_tr TEXT NOT NULL,
  name_en TEXT NOT NULL,
  flag_emoji TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10 başlıca ülkeyi seed'le (idempotent — ON CONFLICT DO NOTHING)
INSERT INTO countries (code, name_tr, name_en, flag_emoji, currency) VALUES
  ('TR', 'Türkiye',     'Turkey',    '🇹🇷', '₺'),
  ('GB', 'İngiltere',   'England',   '🏴', '£'),
  ('ES', 'İspanya',     'Spain',     '🇪🇸', '€'),
  ('IT', 'İtalya',      'Italy',     '🇮🇹', '€'),
  ('DE', 'Almanya',     'Germany',   '🇩🇪', '€'),
  ('FR', 'Fransa',      'France',    '🇫🇷', '€'),
  ('PT', 'Portekiz',    'Portugal',  '🇵🇹', '€'),
  ('NL', 'Hollanda',    'Netherlands','🇳🇱', '€'),
  ('BR', 'Brezilya',    'Brazil',    '🇧🇷', 'R$'),
  ('AR', 'Arjantin',    'Argentina', '🇦🇷', '$')
ON CONFLICT (code) DO NOTHING;

-- RLS: Herkes okur
ALTER TABLE countries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "public_read_countries" ON countries;
CREATE POLICY "public_read_countries" ON countries FOR SELECT USING (true);

-- ─── LEAGUES TABLOSUNU GENİŞLET ───────────────────────────────────────────
-- Her ülkenin 4 tier'ı olur (tier 1-4), country_code ile ayrılır.
-- Eski veri (ülkesiz ligler) default 'TR' olarak işaretlenir.
ALTER TABLE leagues ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'TR' REFERENCES countries(code) ON DELETE SET NULL;

-- UNIQUE constraint: (country_code, tier) — her ülkede her tier'dan 1 tane
DROP INDEX IF EXISTS leagues_tier_unique;
CREATE UNIQUE INDEX IF NOT EXISTS leagues_country_tier_unique
  ON leagues(country_code, tier);

-- Mevcut 4 ligi (TR Süper Lig, TR 2. Lig, TR 3. Lig, TR 4. Lig) TR olarak işaretle
UPDATE leagues SET country_code = 'TR' WHERE country_code IS NULL;

-- ─── TEAMS TABLOSUNU GENİŞLET ─────────────────────────────────────────────
ALTER TABLE teams ADD COLUMN IF NOT EXISTS country_code TEXT DEFAULT 'TR' REFERENCES countries(code) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_teams_country ON teams(country_code);

-- Mevcut takımları TR olarak işaretle
UPDATE teams SET country_code = 'TR' WHERE country_code IS NULL;

-- ─── DIĞER ÜLKELER İÇİN LIGLERI SEED'LE ───────────────────────────────────
-- Her ülke için 4 tier lig kaydı oluştur (idempotent)
DO $$
DECLARE
  c RECORD;
  tier_num INTEGER;
  league_name TEXT;
BEGIN
  FOR c IN SELECT code, name_tr FROM countries WHERE code != 'TR' LOOP
    FOR tier_num IN 1..4 LOOP
      SELECT CASE tier_num
        WHEN 1 THEN 'Premier Lig'
        WHEN 2 THEN '2. Lig'
        WHEN 3 THEN '3. Lig'
        WHEN 4 THEN '4. Lig'
      END INTO league_name;

      INSERT INTO leagues (tier, name_tr, country_code)
      VALUES (tier_num, c.name_tr || ' - ' || league_name, c.code)
      ON CONFLICT DO NOTHING;
    END LOOP;
  END LOOP;
END $$;

-- Bilgi amaçlı
SELECT 'countries_seed' AS status, COUNT(*) AS count FROM countries;
SELECT 'leagues_by_country' AS status, country_code, tier, name_tr FROM leagues ORDER BY country_code, tier;

-- =============================================================================
-- v2.9.20 GÖREV 4: rpc_assign_team_to_user_v2 — ülke parametreli
-- =============================================================================
-- 015 migration'ındaki rpc_assign_team_to_user ile aynı mantık,
-- ama p_country_code parametresi ile belirli bir ülkenin tier'ında yer arar.
--
-- Ülke kontrolü:
--   * p_country_code NULL veya geçersizse → 'TR' default
--   * Ülke yoksa countries tablosuna INSERT olmaz, error döner
--
-- Tier fallback aynı: 4 → 3 → 2 → 1

CREATE OR REPLACE FUNCTION rpc_assign_team_to_user_v2(
  p_user_id UUID,
  p_team_name TEXT,
  p_country_code TEXT DEFAULT 'TR',
  p_preferred_tier SMALLINT DEFAULT 4
)
RETURNS JSONB AS $$
DECLARE
  v_country_code TEXT;
  v_target_tier SMALLINT;
  v_league_id INTEGER;
  v_dept_id INTEGER;
  v_dept_number INTEGER;
  v_team_id UUID;
  v_real_team_count INTEGER;
  v_clean_name TEXT;
  v_short_name TEXT;
  v_is_valid_country BOOLEAN;
BEGIN
  -- 0) Kullanıcı daha önce takım almış mı?
  SELECT id INTO v_team_id FROM teams WHERE manager_user_id = p_user_id LIMIT 1;
  IF v_team_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_assigned', true,
      'team_id', v_team_id
    );
  END IF;

  -- 1) Ülke kodunu normalize et + doğrula
  v_country_code := UPPER(TRIM(BOTH FROM COALESCE(p_country_code, 'TR')));
  IF v_country_code = '' THEN
    v_country_code := 'TR';
  END IF;

  SELECT EXISTS(SELECT 1 FROM countries WHERE code = v_country_code) INTO v_is_valid_country;
  IF NOT v_is_valid_country THEN
    RETURN jsonb_build_object('success', false, 'reason', 'invalid_country_code', 'country_code', v_country_code);
  END IF;

  -- 2) Takım adını temizle
  v_clean_name := TRIM(BOTH FROM p_team_name);
  IF LENGTH(v_clean_name) < 3 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'name_too_short');
  END IF;
  IF LENGTH(v_clean_name) > 60 THEN
    v_clean_name := LEFT(v_clean_name, 60);
  END IF;

  -- 3) Short name üret
  v_short_name := UPPER(LEFT(REGEXP_REPLACE(v_clean_name, '[^A-Za-z0-9 ]', '', 'g'), 3));
  IF LENGTH(v_short_name) < 3 THEN
    v_short_name := UPPER(LEFT(v_clean_name, 3));
  END IF;

  -- 4) Tier fallback: 4 → 3 → 2 → 1
  v_target_tier := LEAST(GREATEST(p_preferred_tier, 1), 4);

  FOR v_target_tier IN v_target_tier, v_target_tier - 1, v_target_tier - 2, v_target_tier - 3 LOOP
    IF v_target_tier < 1 THEN
      v_target_tier := 1;
    END IF;

    SELECT id INTO v_league_id
    FROM leagues
    WHERE tier = v_target_tier AND country_code = v_country_code
    LIMIT 1;

    IF v_league_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Bu ülkede bu tier'da boş slot'lu bir departman var mı?
    FOR v_dept_id IN
      SELECT d.id FROM departments d
      WHERE d.league_id = v_league_id
      ORDER BY d.department_number ASC
    LOOP
      SELECT COUNT(*) INTO v_real_team_count
      FROM teams
      WHERE department_id = v_dept_id
        AND manager_user_id IS NOT NULL;

      IF v_real_team_count < 18 THEN
        SELECT t.id INTO v_team_id
        FROM teams t
        WHERE t.department_id = v_dept_id
          AND t.manager_user_id IS NULL
          AND t.is_bot = true
        ORDER BY t.name ASC
        LIMIT 1;

        IF v_team_id IS NOT NULL THEN
          UPDATE teams
          SET
            manager_user_id = p_user_id,
            is_bot = false,
            is_user_team = true,
            name = v_clean_name,
            short_name = v_short_name,
            country_code = v_country_code,
            budget = GREATEST(budget, 200000000)
          WHERE id = v_team_id;

          RETURN jsonb_build_object(
            'success', true,
            'team_id', v_team_id,
            'department_id', v_dept_id,
            'league_tier', v_target_tier,
            'league_id', v_league_id,
            'country_code', v_country_code,
            'new_department', false
          );
        END IF;
      END IF;
    END LOOP;

    -- 5) Bu ülkede bu tier'da tüm departmanlar dolu — yeni departman aç
    SELECT COALESCE(MAX(department_number), 0) + 1 INTO v_dept_number
    FROM departments WHERE league_id = v_league_id;

    INSERT INTO departments (league_id, department_number, name_tr)
    VALUES (v_league_id, v_dept_number,
      (SELECT name_tr FROM leagues WHERE id = v_league_id) || ' - Grup ' || v_dept_number)
    RETURNING id INTO v_dept_id;

    INSERT INTO teams (
      name, short_name, primary_color, secondary_color,
      league_tier, department_id, budget,
      stadium_capacity, stadium_name,
      is_bot, is_user_team, manager_user_id, country_code
    ) VALUES (
      v_clean_name, v_short_name,
      '#1a3a2a', '#f5f5f5',
      CASE v_target_tier
        WHEN 1 THEN 'super_lig'::text
        WHEN 2 THEN '1_lig'::text
        WHEN 3 THEN '2_lig'::text
        ELSE '3_lig'::text
      END,
      v_dept_id, 200000000,
      10000, v_clean_name || ' Stadyumu',
      false, true, p_user_id, v_country_code
    )
    RETURNING id INTO v_team_id;

    RETURN jsonb_build_object(
      'success', true,
      'team_id', v_team_id,
      'department_id', v_dept_id,
      'league_tier', v_target_tier,
      'league_id', v_league_id,
      'country_code', v_country_code,
      'new_department', true,
      'department_number', v_dept_number
    );

    EXIT;
  END LOOP;

  RETURN jsonb_build_object('success', false, 'reason', 'no_capacity');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_assign_team_to_user_v2(UUID, TEXT, TEXT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_assign_team_to_user_v2(UUID, TEXT, TEXT, SMALLINT) TO anon;

-- =============================================================================
-- Yardımcı RPC: Bir ülkenin belirli tier'ındaki departmanları listele
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_list_country_departments(
  p_country_code TEXT DEFAULT 'TR',
  p_tier SMALLINT DEFAULT 4
)
RETURNS JSONB AS $$
DECLARE
  v_country_code TEXT;
  v_league_id INTEGER;
  v_result JSONB;
BEGIN
  v_country_code := UPPER(TRIM(BOTH FROM COALESCE(p_country_code, 'TR')));
  SELECT id INTO v_league_id FROM leagues WHERE country_code = v_country_code AND tier = p_tier LIMIT 1;

  IF v_league_id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'league_not_found');
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'department_id', d.id,
    'department_number', d.department_number,
    'name_tr', d.name_tr,
    'real_team_count', (SELECT COUNT(*) FROM teams t WHERE t.department_id = d.id AND t.manager_user_id IS NOT NULL),
    'total_team_count', (SELECT COUNT(*) FROM teams t WHERE t.department_id = d.id),
    'is_full', (SELECT COUNT(*) FROM teams t WHERE t.department_id = d.id AND t.manager_user_id IS NOT NULL) >= 18
  ) ORDER BY d.department_number), '[]'::jsonb) INTO v_result
  FROM departments d
  WHERE d.league_id = v_league_id;

  RETURN jsonb_build_object(
    'success', true,
    'country_code', v_country_code,
    'tier', p_tier,
    'league_id', v_league_id,
    'departments', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_list_country_departments(TEXT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_list_country_departments(TEXT, SMALLINT) TO anon;

-- =============================================================================
-- Bilgi amaçlı
-- =============================================================================
-- Test sorguları:
-- SELECT * FROM countries ORDER BY code;
-- SELECT * FROM leagues ORDER BY country_code, tier;
-- SELECT * FROM rpc_list_country_departments('TR', 4);
-- SELECT * FROM rpc_assign_team_to_user_v2('USER_UUID', 'Test FC', 'TR', 4);
