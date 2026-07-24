-- =============================================================================
-- Touchline Manager — 015: Dinamik lig genişletme
-- =============================================================================
-- v2.9.20 GÖREV 3: 18 takım kapasite, otomatik departman açma.
--
-- rpc_assign_team_to_user RPC'si:
--   1. Belirtilen tier'da (default: 4 = en alt) bir departman bul
--      - manager_user_id NULL olan en az 1 bot takım var mı?
--   2. Eğer tüm mevcut departmanlar doluysa yeni departman aç (department_number = N+1)
--   3. O departmanda bir bot takıma manager_user_id set et
--   4. Takım adını güncelle (kullanıcının verdiği isimle)
--   5. return: { team_id, department_id, league_tier, league_id }
--
-- Tier fallback: 4 → 3 → 2 → 1 (en alttan başla, yukarı çık)
--
-- Bu RPC SECURITY DEFINER — auth.users tablosunu okuyabilmek için.
-- Kullanıcı kendi auth.uid()'sini parametre olarak geçmeli.
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_assign_team_to_user(
  p_user_id UUID,
  p_team_name TEXT,
  p_preferred_tier SMALLINT DEFAULT 4
)
RETURNS JSONB AS $$
DECLARE
  v_target_tier SMALLINT;
  v_league_id INTEGER;
  v_dept_id INTEGER;
  v_dept_number INTEGER;
  v_team_id UUID;
  v_real_team_count INTEGER;
  v_clean_name TEXT;
  v_short_name TEXT;
BEGIN
  -- 1) Kullanıcı daha önce takım almış mı?
  SELECT id INTO v_team_id FROM teams WHERE manager_user_id = p_user_id LIMIT 1;
  IF v_team_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', true,
      'already_assigned', true,
      'team_id', v_team_id
    );
  END IF;

  -- 2) Takım adını temizle (trim + upper limit 60)
  v_clean_name := TRIM(BOTH FROM p_team_name);
  IF LENGTH(v_clean_name) < 3 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'name_too_short');
  END IF;
  IF LENGTH(v_clean_name) > 60 THEN
    v_clean_name := LEFT(v_clean_name, 60);
  END IF;

  -- 3) Short name üret (ilk 3 harf, upper)
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

    SELECT id INTO v_league_id FROM leagues WHERE tier = v_target_tier LIMIT 1;
    IF v_league_id IS NULL THEN
      CONTINUE;
    END IF;

    -- Bu tier'da boş slot'u (manager_user_id NULL) olan bir departman var mı?
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
        -- Bu departman boş slot'a sahip, takımı al
        SELECT t.id INTO v_team_id
        FROM teams t
        WHERE t.department_id = v_dept_id
          AND t.manager_user_id IS NULL
          AND t.is_bot = true
        ORDER BY t.name ASC
        LIMIT 1;

        IF v_team_id IS NOT NULL THEN
          -- Takımı güncelle: kullanıcıya ata, isim değiştir
          UPDATE teams
          SET
            manager_user_id = p_user_id,
            is_bot = false,
            is_user_team = true,
            name = v_clean_name,
            short_name = v_short_name,
            budget = GREATEST(budget, 200000000)  -- minimum 200M başlangıç bütçesi
          WHERE id = v_team_id;

          RETURN jsonb_build_object(
            'success', true,
            'team_id', v_team_id,
            'department_id', v_dept_id,
            'league_tier', v_target_tier,
            'league_id', v_league_id,
            'new_department', false
          );
        END IF;
      END IF;
    END LOOP;

    -- 5) Bu tier'da tüm departmanlar dolu — yeni departman aç
    SELECT COALESCE(MAX(department_number), 0) + 1 INTO v_dept_number
    FROM departments WHERE league_id = v_league_id;

    INSERT INTO departments (league_id, department_number, name_tr)
    VALUES (v_league_id, v_dept_number,
      (SELECT name_tr FROM leagues WHERE id = v_league_id) || ' - Grup ' || v_dept_number)
    RETURNING id INTO v_dept_id;

    -- Bu departmana 18 yeni bot takım + 23 oyuncu ekle
    -- (Bot takım oluşturma scripts/init-multiplayer-league.ts tarafından yapılır,
    --  burada sadece ilk kullanıcı takımını oluşturuyoruz.)
    INSERT INTO teams (
      name, short_name, primary_color, secondary_color,
      league_tier, department_id, budget,
      stadium_capacity, stadium_name,
      is_bot, is_user_team, manager_user_id
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
      false, true, p_user_id
    )
    RETURNING id INTO v_team_id;

    RETURN jsonb_build_object(
      'success', true,
      'team_id', v_team_id,
      'department_id', v_dept_id,
      'league_tier', v_target_tier,
      'league_id', v_league_id,
      'new_department', true,
      'department_number', v_dept_number
    );

    EXIT;  -- tier fallback'tan çık
  END LOOP;

  -- Hiçbir tier'da yer bulunamadı (çok düşük ihtimal)
  RETURN jsonb_build_object('success', false, 'reason', 'no_capacity');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS: Bu RPC herkes tarafından çağrılabilir (auth.uid() parametre olarak geçer)
-- SECURITY DEFINER olduğu için RLS bypass eder, ama p_user_id kontrolü için
-- aşağıdaki helper fonksiyon auth.uid() ile kontrol yapabilir.
GRANT EXECUTE ON FUNCTION rpc_assign_team_to_user(UUID, TEXT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_assign_team_to_user(UUID, TEXT, SMALLINT) TO anon;

-- =============================================================================
-- Yardımcı RPC: Bir departmandaki REAL (kullanıcı) takım sayısını getir
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_get_department_capacity(p_dept_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  v_real_count INTEGER;
  v_bot_count INTEGER;
  v_total INTEGER;
BEGIN
  SELECT
    COUNT(*) FILTER (WHERE manager_user_id IS NOT NULL),
    COUNT(*) FILTER (WHERE manager_user_id IS NULL AND is_bot = true),
    COUNT(*)
  INTO v_real_count, v_bot_count, v_total
  FROM teams
  WHERE department_id = p_dept_id;

  RETURN jsonb_build_object(
    'department_id', p_dept_id,
    'real_teams', v_real_count,
    'bot_teams', v_bot_count,
    'total', v_total,
    'capacity', 18,
    'is_full', v_real_count >= 18
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_get_department_capacity(INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_get_department_capacity(INTEGER) TO anon;

-- =============================================================================
-- Test sorgusu (deploy sonrası çalıştırılabilir)
-- =============================================================================
-- SELECT * FROM rpc_get_department_capacity(1);
-- SELECT * FROM rpc_assign_team_to_user('USER_UUID_HERE', 'Test FC', 4);
-- SELECT t.id, t.name, t.department_id, t.manager_user_id IS NOT NULL AS is_real
-- FROM teams t WHERE t.department_id = 1 ORDER BY t.name;
