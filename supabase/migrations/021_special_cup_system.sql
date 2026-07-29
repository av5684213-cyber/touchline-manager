-- =============================================================================
-- Touchline Manager — 021: Özel Kupa Sistemi
-- =============================================================================
-- v2.9.39: Pazar günü özel kupalar — davetli, 4/8/12 takımlı, eleme sistemi
--
-- special_cups: Kupa metadata (oluşturan, boyut, şifre, durum, schedule)
-- special_cup_participants: Katılan takımlar (cup_id, team info, user_id)
-- special_cup_matches: Eşleşmeler (cup_id, round, home/away, skor, durum)
--
-- Kredi: Oluşturma 8, katılım 2
-- Açık/şifreli kupa seçeneği
-- Realtime ile canlı güncelleme
-- =============================================================================

CREATE TABLE IF NOT EXISTS special_cups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_team_name TEXT NOT NULL DEFAULT 'Anonim',
  creator_team_short TEXT NOT NULL DEFAULT '???',
  creator_team_color TEXT NOT NULL DEFAULT '#1a3a2a',
  cup_name TEXT NOT NULL DEFAULT 'Özel Kupa',
  size SMALLINT NOT NULL DEFAULT 8, -- 4, 8, 12
  is_password_protected BOOLEAN NOT NULL DEFAULT false,
  password TEXT,
  status TEXT NOT NULL DEFAULT 'waiting', -- waiting, in_progress, completed
  current_round SMALLINT DEFAULT 0,
  champion_team_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  scheduled_day TEXT DEFAULT 'sunday'
);

CREATE INDEX IF NOT EXISTS idx_special_cups_status ON special_cups(status, created_at DESC);

ALTER TABLE special_cups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "special_cups_read_all" ON special_cups;
CREATE POLICY "special_cups_read_all" ON special_cups FOR SELECT USING (true);

DROP POLICY IF EXISTS "special_cups_insert_auth" ON special_cups;
CREATE POLICY "special_cups_insert_auth" ON special_cups
  FOR INSERT WITH CHECK (creator_id = auth.uid());

DROP POLICY IF EXISTS "special_cups_update_own" ON special_cups;
CREATE POLICY "special_cups_update_own" ON special_cups
  FOR UPDATE USING (creator_id = auth.uid());

-- ─── PARTICIPANTS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS special_cup_participants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cup_id UUID NOT NULL REFERENCES special_cups(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  team_name TEXT NOT NULL,
  team_short TEXT NOT NULL DEFAULT '???',
  team_color TEXT NOT NULL DEFAULT '#1a3a2a',
  team_id TEXT,
  is_creator BOOLEAN DEFAULT false,
  is_bot BOOLEAN DEFAULT false,
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(cup_id, team_name)
);

CREATE INDEX IF NOT EXISTS idx_special_cup_participants_cup ON special_cup_participants(cup_id);

ALTER TABLE special_cup_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "special_cup_participants_read_all" ON special_cup_participants;
CREATE POLICY "special_cup_participants_read_all" ON special_cup_participants FOR SELECT USING (true);

DROP POLICY IF EXISTS "special_cup_participants_insert_auth" ON special_cup_participants;
CREATE POLICY "special_cup_participants_insert_auth" ON special_cup_participants
  FOR INSERT WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "special_cup_participants_delete_own" ON special_cup_participants;
CREATE POLICY "special_cup_participants_delete_own" ON special_cup_participants
  FOR DELETE USING (user_id = auth.uid() OR is_bot = true);

-- ─── MATCHES ────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS special_cup_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cup_id UUID NOT NULL REFERENCES special_cups(id) ON DELETE CASCADE,
  round SMALLINT NOT NULL,
  match_order INTEGER NOT NULL DEFAULT 0,
  home_participant_id UUID REFERENCES special_cup_participants(id) ON DELETE SET NULL,
  away_participant_id UUID REFERENCES special_cup_participants(id) ON DELETE SET NULL,
  home_team_name TEXT,
  away_team_name TEXT,
  home_team_short TEXT,
  away_team_short TEXT,
  home_team_color TEXT,
  away_team_color TEXT,
  home_score INTEGER,
  away_score INTEGER,
  winner_participant_id UUID REFERENCES special_cup_participants(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, completed
  played_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_special_cup_matches_cup ON special_cup_matches(cup_id, round);

ALTER TABLE special_cup_matches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "special_cup_matches_read_all" ON special_cup_matches;
CREATE POLICY "special_cup_matches_read_all" ON special_cup_matches FOR SELECT USING (true);

DROP POLICY IF EXISTS "special_cup_matches_insert_auth" ON special_cup_matches;
CREATE POLICY "special_cup_matches_insert_auth" ON special_cup_matches
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "special_cup_matches_update_auth" ON special_cup_matches;
CREATE POLICY "special_cup_matches_update_auth" ON special_cup_matches
  FOR UPDATE USING (true);

-- ─── RPC: Kupa oluştur ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_create_special_cup(
  p_creator_id UUID,
  p_cup_name TEXT,
  p_size SMALLINT,
  p_is_password_protected BOOLEAN DEFAULT false,
  p_password TEXT DEFAULT NULL,
  p_team_name TEXT,
  p_team_short TEXT DEFAULT '???',
  p_team_color TEXT DEFAULT '#1a3a2a'
) RETURNS JSONB AS $$
DECLARE
  v_cup_id UUID;
BEGIN
  INSERT INTO special_cups (
    creator_id, cup_name, size, is_password_protected, password,
    creator_team_name, creator_team_short, creator_team_color
  ) VALUES (
    p_creator_id, p_cup_name, p_size, p_is_password_protected, p_password,
    p_team_name, p_team_short, p_team_color
  ) RETURNING id INTO v_cup_id;

  -- Oluşturanı katılımcı olarak ekle
  INSERT INTO special_cup_participants (
    cup_id, user_id, team_name, team_short, team_color, is_creator, is_bot
  ) VALUES (
    v_cup_id, p_creator_id, p_team_name, p_team_short, p_team_color, true, false
  );

  RETURN jsonb_build_object('success', true, 'cup_id', v_cup_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION rpc_create_special_cup(UUID, TEXT, SMALLINT, BOOLEAN, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ─── RPC: Kupaya katıl ──────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION rpc_join_special_cup(
  p_cup_id UUID,
  p_user_id UUID,
  p_team_name TEXT,
  p_team_short TEXT DEFAULT '???',
  p_team_color TEXT DEFAULT '#1a3a2a',
  p_password TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_cup special_cups%ROWTYPE;
  v_count INTEGER;
BEGIN
  SELECT * INTO v_cup FROM special_cups WHERE id = p_cup_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cup_not_found');
  END IF;
  IF v_cup.status != 'waiting' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cup_already_started');
  END IF;
  IF v_cup.is_password_protected AND v_cup.password != p_password THEN
    RETURN jsonb_build_object('success', false, 'reason', 'wrong_password');
  END IF;

  SELECT COUNT(*) INTO v_count FROM special_cup_participants WHERE cup_id = p_cup_id;
  IF v_count >= v_cup.size THEN
    RETURN jsonb_build_object('success', false, 'reason', 'cup_full');
  END IF;

  -- Zaten katılmış mı?
  SELECT COUNT(*) INTO v_count FROM special_cup_participants
  WHERE cup_id = p_cup_id AND user_id = p_user_id;
  IF v_count > 0 THEN
    RETURN jsonb_build_object('success', false, 'reason', 'already_joined');
  END IF;

  INSERT INTO special_cup_participants (cup_id, user_id, team_name, team_short, team_color, is_creator, is_bot)
  VALUES (p_cup_id, p_user_id, p_team_name, p_team_short, p_team_color, false, false);

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
GRANT EXECUTE ON FUNCTION rpc_join_special_cup(UUID, UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;

-- ─── Realtime ───────────────────────────────────────────────────────────────
ALTER TABLE special_cups REPLICA IDENTITY FULL;
ALTER TABLE special_cup_participants REPLICA IDENTITY FULL;
ALTER TABLE special_cup_matches REPLICA IDENTITY FULL;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE special_cups;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE special_cup_participants;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE special_cup_matches;
EXCEPTION WHEN OTHERS THEN null; END $$;
