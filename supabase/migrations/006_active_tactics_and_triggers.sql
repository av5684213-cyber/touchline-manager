-- =============================================================================
-- 006: active_tactics + training_state tabloları (multiplayer)
-- =============================================================================

-- active_tactics — her kullanıcının taktik + ilk 11'i
CREATE TABLE IF NOT EXISTS active_tactics (
  profile_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tactic_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  lineup_data JSONB DEFAULT '[]'::jsonb,
  slot_roles JSONB DEFAULT '{}'::jsonb,
  active_instructions JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE active_tactics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tactics_read_own" ON active_tactics;
CREATE POLICY "tactics_read_own" ON active_tactics
  FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "tactics_upsert_own" ON active_tactics;
CREATE POLICY "tactics_upsert_own" ON active_tactics
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "tactics_update_own" ON active_tactics;
CREATE POLICY "tactics_update_own" ON active_tactics
  FOR UPDATE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS "tactics_delete_own" ON active_tactics;
CREATE POLICY "tactics_delete_own" ON active_tactics
  FOR DELETE USING (auth.uid() = profile_id);

-- Service role her şeyi okuyabilsin (Edge Function için)
-- RLS bypass with service_role zaten var, ek policy gerekmez

-- updated_at trigger (manuel, updated_at kolonu var)
CREATE OR REPLACE FUNCTION update_active_tactics_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS active_tactics_update_trigger ON active_tactics;
CREATE TRIGGER active_tactics_update_trigger
  BEFORE UPDATE ON active_tactics
  FOR EACH ROW
  EXECUTE FUNCTION update_active_tactics_timestamp();

-- Standings'e goal_diff kolonu ekle (computed değil, manuel)
ALTER TABLE standings ADD COLUMN IF NOT EXISTS goal_diff INTEGER DEFAULT 0;

-- standings'i güncelleme için trigger — match_results insert edildiğinde
-- otomatik standings güncelle (backup, Edge Function da yapıyor)
CREATE OR REPLACE FUNCTION update_standings_on_match()
RETURNS TRIGGER AS $$
BEGIN
  -- Home team
  UPDATE standings SET
    played = played + 1,
    goals_for = goals_for + NEW.home_score,
    goals_against = goals_against + NEW.away_score,
    goal_diff = goal_diff + (NEW.home_score - NEW.away_score),
    won = won + CASE WHEN NEW.home_score > NEW.away_score THEN 1 ELSE 0 END,
    drawn = drawn + CASE WHEN NEW.home_score = NEW.away_score THEN 1 ELSE 0 END,
    lost = lost + CASE WHEN NEW.home_score < NEW.away_score THEN 1 ELSE 0 END,
    points = points + CASE 
      WHEN NEW.home_score > NEW.away_score THEN 3 
      WHEN NEW.home_score = NEW.away_score THEN 1 
      ELSE 0 END
  WHERE team_id = NEW.home_team_id;

  -- Away team
  UPDATE standings SET
    played = played + 1,
    goals_for = goals_for + NEW.away_score,
    goals_against = goals_against + NEW.home_score,
    goal_diff = goal_diff + (NEW.away_score - NEW.home_score),
    won = won + CASE WHEN NEW.away_score > NEW.home_score THEN 1 ELSE 0 END,
    drawn = drawn + CASE WHEN NEW.away_score = NEW.home_score THEN 1 ELSE 0 END,
    lost = lost + CASE WHEN NEW.away_score < NEW.home_score THEN 1 ELSE 0 END,
    points = points + CASE 
      WHEN NEW.away_score > NEW.home_score THEN 3 
      WHEN NEW.away_score = NEW.home_score THEN 1 
      ELSE 0 END
  WHERE team_id = NEW.away_team_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS match_results_standings_trigger ON match_results;
CREATE TRIGGER match_results_standings_trigger
  AFTER INSERT ON match_results
  FOR EACH ROW
  EXECUTE FUNCTION update_standings_on_match();

SELECT 'migration_006_complete' AS status;
