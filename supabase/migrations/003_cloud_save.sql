-- =============================================================================
-- Touchline Manager — 003: Cloud Save (user_game_state)
-- =============================================================================
-- Kullanıcıların tüm oyun state'ini JSON olarak saklar.
-- Cihazlar arası senkronizasyon ve veri kaybı koruması.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_game_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INTEGER DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

CREATE INDEX IF NOT EXISTS idx_user_game_state_profile ON user_game_state(profile_id);

-- RLS — kullanıcı sadece kendi state'ini görsün/değiştirsin
ALTER TABLE user_game_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_game_state_own_read" ON user_game_state
  FOR SELECT USING (profile_id = auth.uid());

CREATE POLICY "user_game_state_own_write" ON user_game_state
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- RPC: State yükle
CREATE OR REPLACE FUNCTION rpc_load_game_state(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSONB;
BEGIN
  SELECT state INTO result FROM user_game_state WHERE profile_id = p_profile_id;
  RETURN COALESCE(result, '{}'::jsonb);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: State kaydet (upsert)
CREATE OR REPLACE FUNCTION rpc_save_game_state(
  p_profile_id UUID,
  p_state JSONB,
  p_version INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
BEGIN
  INSERT INTO user_game_state (profile_id, state, version, updated_at)
  VALUES (p_profile_id, p_state, p_version, NOW())
  ON CONFLICT (profile_id)
  DO UPDATE SET state = p_state, version = p_state.version, updated_at = NOW()
  WHERE user_game_state.profile_id = p_profile_id;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger: updated_at otomatik güncelleme
DROP TRIGGER IF EXISTS trg_user_game_state_updated ON user_game_state;
CREATE TRIGGER trg_user_game_state_updated
  BEFORE UPDATE ON user_game_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Realtime
ALTER TABLE user_game_state REPLICA IDENTITY FULL;
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE user_game_state;
EXCEPTION WHEN OTHERS THEN null; END $$;
