-- =============================================================================
-- Touchline Manager — 019: Global Transfer Pazarı
-- =============================================================================
-- v2.9.20 GÖREV 9: Ülkeler arası transfer pazarı.
--
-- Kullanıcı kendi ülkesinin dışındaki liglerden de oyuncu arayabilir.
-- Filtre toolbox'ı: ülke + tier + departman seçimi.
--
-- RPC rpc_search_global_market:
--   - p_country_code (TR, GB, ES, ...) — boşsa tüm ülkeler
--   - p_tier (1-4) — boşsa tüm tier'lar
--   - p_department_id — boşsa tüm departmanlar
--   - p_position_group (GK/DEF/MID/FWD) — boşsa tüm pozisyonlar
--   - p_max_price — boşsa tüm fiyatlar
--   - p_min_rating — boşsa tüm rating'ler
--   - p_limit (default 50, max 200)
--
-- Return: JSONB — oyuncu + takım + ülke bilgisi
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_search_global_market(
  p_country_code TEXT DEFAULT NULL,
  p_tier SMALLINT DEFAULT NULL,
  p_department_id INTEGER DEFAULT NULL,
  p_position_group TEXT DEFAULT NULL,  -- GK, DEF, MID, FWD
  p_max_price BIGINT DEFAULT NULL,
  p_min_rating INTEGER DEFAULT NULL,
  p_limit INTEGER DEFAULT 50,
  p_offset INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  v_limit INTEGER;
  v_offset INTEGER;
  v_result JSONB;
BEGIN
  v_limit := LEAST(GREATEST(p_limit, 1), 200);  -- 1-200 arası
  v_offset := GREATEST(p_offset, 0);

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'player_id', p.id,
    'first_name', p.first_name,
    'last_name', p.last_name,
    'name', p.name,
    'position', p.specific_position,
    'position_group', CASE
      WHEN p.specific_position = 'GK' THEN 'GK'
      WHEN p.specific_position IN ('CB', 'LB', 'RB', 'LWB', 'RWB') THEN 'DEF'
      WHEN p.specific_position IN ('CDM', 'CM', 'CAM', 'LM', 'RM') THEN 'MID'
      WHEN p.specific_position IN ('LW', 'RW', 'ST', 'CF') THEN 'FWD'
      ELSE 'MID'
    END,
    'age', p.age,
    'rating', p.rating,
    'potential', p.potential,
    'nationality', p.nationality,
    'nation', p.nation,
    'preferred_foot', p.preferred_foot,
    'market_value', p.market_value,
    'is_for_sale', p.is_for_sale,
    'sale_price', p.sale_price,
    'is_free_agent', p.is_free_agent,
    'team_id', t.id,
    'team_name', t.name,
    'team_short_name', t.short_name,
    'team_country_code', t.country_code,
    'team_league_tier', t.league_tier,
    'team_department_id', t.department_id,
    'is_user_team', t.manager_user_id IS NOT NULL,
    'is_bot', t.is_bot
  ) ORDER BY p.rating DESC NULLS LAST, p.market_value DESC NULLS LAST), '[]'::jsonb) INTO v_result
  FROM players p
  INNER JOIN teams t ON t.id = p.team_id
  WHERE
    -- Ülke filtresi
    (p_country_code IS NULL OR UPPER(p_country_code) = '' OR t.country_code = UPPER(p_country_code))
    -- Tier filtresi
    AND (p_tier IS NULL OR t.league_tier = p_tier)
    -- Departman filtresi
    AND (p_department_id IS NULL OR t.department_id = p_department_id)
    -- Pozisyon grubu filtresi
    AND (
      p_position_group IS NULL OR
      p_position_group = 'GK' AND p.specific_position = 'GK' OR
      p_position_group = 'DEF' AND p.specific_position IN ('CB', 'LB', 'RB', 'LWB', 'RWB') OR
      p_position_group = 'MID' AND p.specific_position IN ('CDM', 'CM', 'CAM', 'LM', 'RM') OR
      p_position_group = 'FWD' AND p.specific_position IN ('LW', 'RW', 'ST', 'CF')
    )
    -- Fiyat filtresi (market_value veya sale_price)
    AND (p_max_price IS NULL OR COALESCE(p.sale_price, p.market_value) <= p_max_price)
    -- Rating filtresi
    AND (p_min_rating IS NULL OR p.rating >= p_min_rating)
    -- v2.9.33: is_for_sale/is_free_agent filtresi KALDIRILDI — tüm oyuncular listelenir
    -- Bot takımların oyuncuları hiçbir zaman is_for_sale=true yapılmıyordu, bu yüzden liste boş dönüyordu
    -- Kullanıcı her oyuncuya teklif gönderebilir (satıcı kabul/reddeder)
  LIMIT v_limit
  OFFSET v_offset;

  RETURN jsonb_build_object(
    'success', true,
    'count', jsonb_array_length(v_result),
    'filters', jsonb_build_object(
      'country_code', p_country_code,
      'tier', p_tier,
      'department_id', p_department_id,
      'position_group', p_position_group,
      'max_price', p_max_price,
      'min_rating', p_min_rating,
      'limit', v_limit,
      'offset', v_offset
    ),
    'players', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_search_global_market(
  TEXT, SMALLINT, INTEGER, TEXT, BIGINT, INTEGER, INTEGER, INTEGER
) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_search_global_market(
  TEXT, SMALLINT, INTEGER, TEXT, BIGINT, INTEGER, INTEGER, INTEGER
) TO anon;

-- =============================================================================
-- RPC: Ülke + tier'a göre departman listesi (toolbox için)
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_list_departments_for_filter(
  p_country_code TEXT DEFAULT NULL,
  p_tier SMALLINT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'department_id', d.id,
    'department_number', d.department_number,
    'name_tr', d.name_tr,
    'league_id', d.league_id,
    'league_tier', l.tier,
    'league_name', l.name_tr,
    'country_code', l.country_code,
    'team_count', (SELECT COUNT(*) FROM teams t WHERE t.department_id = d.id),
    'user_team_count', (SELECT COUNT(*) FROM teams t WHERE t.department_id = d.id AND t.manager_user_id IS NOT NULL)
  ) ORDER BY l.country_code, l.tier, d.department_number), '[]'::jsonb) INTO v_result
  FROM departments d
  INNER JOIN leagues l ON l.id = d.league_id
  WHERE
    (p_country_code IS NULL OR UPPER(p_country_code) = '' OR l.country_code = UPPER(p_country_code))
    AND (p_tier IS NULL OR l.tier = p_tier);

  RETURN jsonb_build_object(
    'success', true,
    'count', jsonb_array_length(v_result),
    'departments', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_list_departments_for_filter(TEXT, SMALLINT) TO authenticated;
GRANT EXECUTE ON FUNCTION rpc_list_departments_for_filter(TEXT, SMALLINT) TO anon;

-- =============================================================================
-- Bilgi amaçlı
-- =============================================================================
-- Test:
--   SELECT * FROM rpc_search_global_market(NULL, NULL, NULL, 'FWD', 50000000, 75, 20, 0);
--   SELECT * FROM rpc_search_global_market('TR', 1, NULL, NULL, NULL, NULL, 50, 0);
--   SELECT * FROM rpc_list_departments_for_filter('TR', 1);
