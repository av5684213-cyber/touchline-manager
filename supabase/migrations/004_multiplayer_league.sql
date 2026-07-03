-- =============================================================================
-- Touchline Manager — Multiplayer League Schema (004)
-- =============================================================================
-- 4 Lig × 3 Departman × 18 Takım = 216 takım
-- ~5000 oyuncu (23/takım)
-- Round-robin fikstür (34 hafta)
-- RLS: Herkes okur, sadece kendi takımını yönetir
-- =============================================================================

-- ─── LEAGUES ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leagues (
  id SERIAL PRIMARY KEY,
  tier SMALLINT NOT NULL UNIQUE,  -- 1=Süper Lig, 2=2.Lig, 3=3.Lig, 4=4.Lig
  name_tr TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO leagues (tier, name_tr) VALUES
  (1, 'Süper Lig'),
  (2, '2. Lig'),
  (3, '3. Lig'),
  (4, '4. Lig')
ON CONFLICT (tier) DO NOTHING;

-- ─── DEPARTMENTS ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS departments (
  id SERIAL PRIMARY KEY,
  league_id INTEGER NOT NULL REFERENCES leagues(id) ON DELETE CASCADE,
  department_number INTEGER NOT NULL,  -- 1, 2, 3, ...
  name_tr TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (league_id, department_number)
);

-- ─── TEAMS (multiplayer) ─────────────────────────────────────────────────────
-- Mevcut teams tablosunu genişletelim — department_id ekle
ALTER TABLE teams ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE SET NULL;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS budget BIGINT DEFAULT 200000000;  -- 200M €
ALTER TABLE teams ADD COLUMN IF NOT EXISTS manager_user_id UUID;  -- auth.users.id (kullanıcı varsa)

-- ─── FIXTURES (multiplayer) ──────────────────────────────────────────────────
-- Mevcut fixtures tablosunu kullanıyoruz ama multi-department için department_id ekle
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE;
ALTER TABLE fixtures ADD COLUMN IF NOT EXISTS away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE;

-- ─── MATCH RESULTS ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_results (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE,
  home_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  home_score INTEGER NOT NULL DEFAULT 0,
  away_score INTEGER NOT NULL DEFAULT 0,
  matchday INTEGER NOT NULL,
  department_id INTEGER REFERENCES departments(id) ON DELETE CASCADE,
  played_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (home_team_id, away_team_id, matchday)
);

CREATE INDEX IF NOT EXISTS idx_match_results_department ON match_results(department_id);
CREATE INDEX IF NOT EXISTS idx_match_results_matchday ON match_results(matchday);
CREATE INDEX IF NOT EXISTS idx_match_results_teams ON match_results(home_team_id, away_team_id);

-- ─── STANDINGS (computed) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  department_id INTEGER NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  primary_color TEXT DEFAULT '#1a3a2a',
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_diff INTEGER GENERATED ALWAYS AS (goals_for - goals_against) STORED,
  points INTEGER DEFAULT 0,
  is_user_team BOOLEAN DEFAULT false,
  manager_user_id UUID,
  UNIQUE (department_id, team_id)
);

CREATE INDEX IF NOT EXISTS idx_standings_department ON standings(department_id);
CREATE INDEX IF NOT EXISTS idx_standings_points ON standings(department_id, points DESC);

-- ─── RLS ─────────────────────────────────────────────────────────────────────
-- Herkes okur
ALTER TABLE leagues ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_leagues" ON leagues;
CREATE POLICY "public_read_leagues" ON leagues FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_departments" ON departments;
CREATE POLICY "public_read_departments" ON departments FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_teams" ON teams;
CREATE POLICY "public_read_teams" ON teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_players" ON players;
CREATE POLICY "public_read_players" ON players FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_fixtures" ON fixtures;
CREATE POLICY "public_read_fixtures" ON fixtures FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_match_results" ON match_results;
CREATE POLICY "public_read_match_results" ON match_results FOR SELECT USING (true);

DROP POLICY IF EXISTS "public_read_standings" ON standings;
CREATE POLICY "public_read_standings" ON standings FOR SELECT USING (true);

-- Sadece kendi takımını güncelle (manager_user_id = auth.uid())
DROP POLICY IF EXISTS "manager_update_team" ON teams;
CREATE POLICY "manager_update_team" ON teams
  FOR UPDATE USING (manager_user_id = auth.uid());

DROP POLICY IF EXISTS "manager_update_players" ON players;
CREATE POLICY "manager_update_players" ON players
  FOR UPDATE USING (
    team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

-- ─── START INITIAL DATA ──────────────────────────────────────────────────────
-- Departmanlar: 4 lig × 3 departman = 12
DO $$
DECLARE
  league_rec RECORD;
  dept_num INTEGER;
  dept_id INTEGER;
BEGIN
  FOR league_rec IN SELECT id, tier FROM leagues LOOP
    FOR dept_num IN 1..3 LOOP
      INSERT INTO departments (league_id, department_number, name_tr)
      VALUES (league_rec.id, dept_num, 
        CASE league_rec.tier 
          WHEN 1 THEN 'Süper Lig - Grup ' || dept_num
          WHEN 2 THEN '2. Lig - Grup ' || dept_num
          WHEN 3 THEN '3. Lig - Grup ' || dept_num
          WHEN 4 THEN '4. Lig - Grup ' || dept_num
        END)
      ON CONFLICT (league_id, department_number) DO NOTHING
      RETURNING id INTO dept_id;
    END LOOP;
  END LOOP;
END $$;

-- Bilgi amaçlı
SELECT 'departments_created' AS status, COUNT(*) AS count FROM departments;
