-- 009: Hazırlık maçı — teklifler + sıra sistemi

-- Hazırlık maçı teklifleri
CREATE TABLE IF NOT EXISTS friendly_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  from_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  to_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending', -- pending, accepted, rejected
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friendly_offers_to ON friendly_offers(to_team_id, status);

ALTER TABLE friendly_offers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fo_read_own" ON friendly_offers;
CREATE POLICY "fo_read_own" ON friendly_offers FOR SELECT USING (
  from_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  OR to_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);
DROP POLICY IF EXISTS "fo_insert_own" ON friendly_offers;
CREATE POLICY "fo_insert_own" ON friendly_offers FOR INSERT WITH CHECK (
  from_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);
DROP POLICY IF EXISTS "fo_update_own" ON friendly_offers;
CREATE POLICY "fo_update_own" ON friendly_offers FOR UPDATE USING (
  from_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  OR to_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);
DROP POLICY IF EXISTS "fo_delete_own" ON friendly_offers;
CREATE POLICY "fo_delete_own" ON friendly_offers FOR DELETE USING (
  from_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  OR to_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);

-- Hazırlık maçı sırası
CREATE TABLE IF NOT EXISTS friendly_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
  team_name TEXT NOT NULL,
  is_priority BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_friendly_queue_priority ON friendly_queue(is_priority, joined_at);

ALTER TABLE friendly_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fq_read_all" ON friendly_queue;
CREATE POLICY "fq_read_all" ON friendly_queue FOR SELECT USING (true);
DROP POLICY IF EXISTS "fq_insert_own" ON friendly_queue;
CREATE POLICY "fq_insert_own" ON friendly_queue FOR INSERT WITH CHECK (
  team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);
DROP POLICY IF EXISTS "fq_delete_own" ON friendly_queue;
CREATE POLICY "fq_delete_own" ON friendly_queue FOR DELETE USING (
  team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
);

SELECT 'migration_009_complete' AS status;
