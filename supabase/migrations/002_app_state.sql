-- =============================================================================
-- Touchline Manager — app_state migration (v2)
-- =============================================================================
-- Kullanıcıların tam uygulama state'ini JSON olarak saklar.
-- Tek tablo, basit yaklaşım — ileride normalize edilebilir.
-- =============================================================================

CREATE TABLE IF NOT EXISTS app_state (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- RLS — kullanıcı yalnızca kendi state'ini görsün/değiştirsin
ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_state_select_own" ON app_state;
CREATE POLICY "app_state_select_own" ON app_state
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "app_state_insert_own" ON app_state;
CREATE POLICY "app_state_insert_own" ON app_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "app_state_update_own" ON app_state;
CREATE POLICY "app_state_update_own" ON app_state
  FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "app_state_delete_own" ON app_state;
CREATE POLICY "app_state_delete_own" ON app_state
  FOR DELETE USING (auth.uid() = user_id);

-- Index
CREATE INDEX IF NOT EXISTS app_state_user_idx ON app_state(user_id);

-- updated_at otomatik güncelleme
CREATE OR REPLACE FUNCTION update_app_state_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_state_update_trigger ON app_state;
CREATE TRIGGER app_state_update_trigger
  BEFORE UPDATE ON app_state
  FOR EACH ROW
  EXECUTE FUNCTION update_app_state_timestamp();
