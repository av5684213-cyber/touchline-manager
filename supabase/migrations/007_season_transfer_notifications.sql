-- 007: Sezon sonu + piramit + transfer multiplayer + bildirim

-- Sezon sonu RPC — 34 hafta bitince çağrılır
CREATE OR REPLACE FUNCTION end_season(dept_id INTEGER)
RETURNS JSONB AS $$
DECLARE
  season_id UUID;
  standings_rows RECORD[];
  promoted_ids UUID[];
  relegated_ids UUID[];
  result JSONB;
BEGIN
  -- Aktif sezon
  SELECT id INTO season_id FROM seasons WHERE status = 'active' LIMIT 1;
  IF season_id IS NULL THEN RETURN jsonb_build_object('error', 'no active season'); END IF;

  -- Bu departmandaki ilk 3 (yükselme) ve son 3 (düşme)
  SELECT array_agg(team_id ORDER BY points DESC, goal_diff DESC) INTO standings_rows
  FROM standings WHERE department_id = dept_id;

  -- İlk 3 yükselme
  SELECT array_agg(team_id) INTO promoted_ids
  FROM (
    SELECT team_id FROM standings WHERE department_id = dept_id
    ORDER BY points DESC, goal_diff DESC LIMIT 3
  ) sub;

  -- Son 3 düşme
  SELECT array_agg(team_id) INTO relegated_ids
  FROM (
    SELECT team_id FROM standings WHERE department_id = dept_id
    ORDER BY points ASC, goal_diff ASC LIMIT 3
  ) sub;

  -- Yükselen takımların league_tier'ını bir üst lige taşı
  -- (4. Lig → 3. Lig → 2. Lig → Süper Lig)
  UPDATE teams SET league_tier = 
    CASE league_tier
      WHEN '3_lig' THEN '2_lig'
      WHEN '2_lig' THEN '1_lig'
      WHEN '1_lig' THEN 'super_lig'
      ELSE league_tier
    END
  WHERE id = ANY(promoted_ids);

  -- Düşen takımlar bir alt lige
  UPDATE teams SET league_tier = 
    CASE league_tier
      WHEN 'super_lig' THEN '1_lig'
      WHEN '1_lig' THEN '2_lig'
      WHEN '2_lig' THEN '3_lig'
      ELSE league_tier
    END
  WHERE id = ANY(relegated_ids);

  -- Standings'i sıfırla
  UPDATE standings SET played = 0, won = 0, drawn = 0, lost = 0,
    goals_for = 0, goals_against = 0, goal_diff = 0, points = 0
  WHERE department_id = dept_id;

  result := jsonb_build_object(
    'promoted', promoted_ids,
    'relegated', relegated_ids
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Piramit büyüme — 4. Lig'de boş takım kalmadıysa yeni departman ekle
CREATE OR REPLACE FUNCTION check_pyramid_growth()
RETURNS JSONB AS $$
DECLARE
  free_count INTEGER;
  new_dept_id INTEGER;
  new_league_id INTEGER;
  result JSONB;
BEGIN
  -- 4. Lig'de boş takım sayısı (manager_user_id NULL)
  SELECT COUNT(*) INTO free_count
  FROM teams t
  JOIN departments d ON t.department_id = d.id
  JOIN leagues l ON d.league_id = l.id
  WHERE l.tier = 4 AND t.manager_user_id IS NULL;

  -- 10'dan az boş takım kaldıysa yeni departman ekle
  IF free_count < 10 THEN
    -- 4. Lig'in league_id'sini al
    SELECT id INTO new_league_id FROM leagues WHERE tier = 4 LIMIT 1;

    -- Yeni departman numarası
    SELECT COALESCE(MAX(department_number), 0) + 1 INTO new_dept_id
    FROM departments WHERE league_id = new_league_id;

    INSERT INTO departments (league_id, department_number, name_tr)
    VALUES (new_league_id, new_dept_id, '4. Lig - Grup ' || new_dept_id)
    RETURNING id INTO new_dept_id;

    result := jsonb_build_object('action', 'new_department', 'dept_id', new_dept_id);
  ELSE
    result := jsonb_build_object('action', 'no_growth', 'free_teams', free_count);
  END IF;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Transfer market tablosu (multiplayer)
CREATE TABLE IF NOT EXISTS transfer_market (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  asking_price BIGINT NOT NULL,
  listed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(player_id)
);

CREATE INDEX IF NOT EXISTS idx_transfer_market_active ON transfer_market(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_transfer_market_price ON transfer_market(asking_price);

ALTER TABLE transfer_market ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm_read_all" ON transfer_market;
CREATE POLICY "tm_read_all" ON transfer_market FOR SELECT USING (true);
DROP POLICY IF EXISTS "tm_insert_own" ON transfer_market;
CREATE POLICY "tm_insert_own" ON transfer_market FOR INSERT WITH CHECK (
  team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);
DROP POLICY IF EXISTS "tm_delete_own" ON transfer_market;
CREATE POLICY "tm_delete_own" ON transfer_market FOR DELETE USING (
  team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);

-- Transfer teklifleri
CREATE TABLE IF NOT EXISTS transfer_offers_mp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  buying_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  selling_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  offer_amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transfer_offers_mp ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "to_read_own" ON transfer_offers_mp;
CREATE POLICY "to_read_own" ON transfer_offers_mp FOR SELECT USING (
  buying_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  OR selling_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);

-- Bildirimler tablosu
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- match_result, transfer_offer, injury, season_end
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "notif_read_own" ON notifications;
CREATE POLICY "notif_read_own" ON notifications FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_update_own" ON notifications;
CREATE POLICY "notif_update_own" ON notifications FOR UPDATE USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "notif_insert_own" ON notifications;
CREATE POLICY "notif_insert_own" ON notifications FOR INSERT WITH CHECK (auth.uid() = user_id);

SELECT 'migration_007_complete' AS status;
