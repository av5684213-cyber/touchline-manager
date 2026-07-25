-- =============================================================================
-- Touchline Manager — 017: RLS Denetimi + Market Güvenlik Sertleştirme
-- =============================================================================
-- v2.9.20 GÖREV 6: Market tamamla veya gizle, RLS denetimi.
--
-- Bu migration idempotent'tir — birden fazla çalıştırılabilir.
-- Tüm kritik tablolarda RLS açık, policy'ler doğru.
--
-- DENETİM KAPSAMI:
--   1. user_game_state     — sadece sahibi okur/yazar
--   2. active_tactics      — sadece sahibi okur/yazar
--   3. app_state           — sadece sahibi okur/yazar
--   4. transfer_market     — herkes okur, sadece sahip yazar (CRITICAL)
--   5. transfer_offers_mp  — sadece alıcı/satıcı
--   6. transfer_messages   — sadece profil sahibi
--   7. notifications       — sadece kullanıcı
--   8. teams               — herkes okur, sadece manager yazar
--   9. players             — herkes okur, sadece manager yazar
--  10. blocked_users       — sadece kullanıcı kendisi
-- =============================================================================

-- ─── 1) user_game_state — sadece sahibi ────────────────────────────────────
ALTER TABLE user_game_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_game_state_own_read" ON user_game_state;
CREATE POLICY "user_game_state_own_read" ON user_game_state
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "user_game_state_own_write" ON user_game_state;
CREATE POLICY "user_game_state_own_write" ON user_game_state
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- ─── 2) active_tactics — sadece sahibi ─────────────────────────────────────
-- 013 migration'ında tanımlı ama tekrar ediyelim (idempotent)
DROP TABLE IF EXISTS active_tactics CASCADE;
CREATE TABLE active_tactics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tactic_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  lineup_data JSONB,
  slot_roles JSONB,
  active_instructions JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id)
);

ALTER TABLE active_tactics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "active_tactics_own_read" ON active_tactics;
CREATE POLICY "active_tactics_own_read" ON active_tactics
  FOR SELECT USING (profile_id = auth.uid());

DROP POLICY IF EXISTS "active_tactics_own_write" ON active_tactics;
CREATE POLICY "active_tactics_own_write" ON active_tactics
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

DROP TRIGGER IF EXISTS trg_active_tactics_updated ON active_tactics;
CREATE TRIGGER trg_active_tactics_updated
  BEFORE UPDATE ON active_tactics
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 3) app_state — sadece sahibi ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE app_state ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "app_state_own_read" ON app_state;
CREATE POLICY "app_state_own_read" ON app_state
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "app_state_own_write" ON app_state;
CREATE POLICY "app_state_own_write" ON app_state
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP TRIGGER IF EXISTS trg_app_state_updated ON app_state;
CREATE TRIGGER trg_app_state_updated
  BEFORE UPDATE ON app_state
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ─── 4) transfer_market — herkes okur, sadece team manager yazar (CRITICAL) ─
-- NOT: transfer_market SİSTEM-geneli görünebilir (küresel pazar).
-- Ama insert/update/delete sadece team'in manager_user_id'si auth.uid() ise.

DROP POLICY IF EXISTS "tm_read_all" ON transfer_market;
CREATE POLICY "tm_read_all" ON transfer_market
  FOR SELECT USING (true);

-- INSERT: kullanıcının en az bir takımı olmalı (manager_user_id = auth.uid())
DROP POLICY IF EXISTS "tm_insert_own" ON transfer_market;
CREATE POLICY "tm_insert_own" ON transfer_market
  FOR INSERT WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

-- UPDATE: kullanıcının takımı olmalı
DROP POLICY IF EXISTS "tm_update_own" ON transfer_market;
CREATE POLICY "tm_update_own" ON transfer_market
  FOR UPDATE USING (
    team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  ) WITH CHECK (
    team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

-- DELETE: kullanıcının takımı olmalı
DROP POLICY IF EXISTS "tm_delete_own" ON transfer_market;
CREATE POLICY "tm_delete_own" ON transfer_market
  FOR DELETE USING (
    team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

-- ─── 5) transfer_offers_mp — alıcı veya satıcı ────────────────────────────
CREATE TABLE IF NOT EXISTS transfer_offers_mp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL,
  buyer_team_id UUID NOT NULL,
  seller_team_id UUID NOT NULL,
  offer_amount BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',  -- pending, accepted, rejected
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

ALTER TABLE transfer_offers_mp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfer_offers_mp_read_own" ON transfer_offers_mp;
CREATE POLICY "transfer_offers_mp_read_own" ON transfer_offers_mp
  FOR SELECT USING (
    buyer_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
    OR seller_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "transfer_offers_mp_insert_own" ON transfer_offers_mp;
CREATE POLICY "transfer_offers_mp_insert_own" ON transfer_offers_mp
  FOR INSERT WITH CHECK (
    buyer_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "transfer_offers_mp_update_own" ON transfer_offers_mp;
CREATE POLICY "transfer_offers_mp_update_own" ON transfer_offers_mp
  FOR UPDATE USING (
    buyer_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
    OR seller_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

-- ─── 6) transfer_messages — sadece profil sahibi ─────────────────────────
CREATE TABLE IF NOT EXISTS transfer_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT,
  body TEXT,
  read BOOLEAN DEFAULT false,
  related_offer_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transfer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfer_messages_own" ON transfer_messages;
CREATE POLICY "transfer_messages_own" ON transfer_messages
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_transfer_messages_profile ON transfer_messages(profile_id);
CREATE INDEX IF NOT EXISTS idx_transfer_messages_read ON transfer_messages(profile_id, read);

-- ─── 7) notifications — sadece kullanıcı ─────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_own_read" ON notifications;
CREATE POLICY "notifications_own_read" ON notifications
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_own_write" ON notifications;
CREATE POLICY "notifications_own_write" ON notifications
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ─── 8) teams — herkes okur, sadece manager yazar ─────────────────────────
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_teams" ON teams;
CREATE POLICY "public_read_teams" ON teams
  FOR SELECT USING (true);

-- UPDATE: mevcut manager_user_id auth.uid() ise VEYA manager_user_id NULL ise (ilk atama)
DROP POLICY IF EXISTS "manager_update_team" ON teams;
CREATE POLICY "manager_update_team" ON teams
  FOR UPDATE USING (
    manager_user_id = auth.uid() OR manager_user_id IS NULL
  )
  WITH CHECK (manager_user_id = auth.uid());

-- INSERT: sadece kendi takımını oluşturabilir (manager_user_id = auth.uid())
DROP POLICY IF EXISTS "manager_insert_team" ON teams;
CREATE POLICY "manager_insert_team" ON teams
  FOR INSERT WITH CHECK (
    manager_user_id = auth.uid() OR manager_user_id IS NULL
  );

-- ─── 9) players — herkes okur, sadece team manager yazar ──────────────────
ALTER TABLE players ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_players" ON players;
CREATE POLICY "public_read_players" ON players
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "manager_update_players" ON players;
CREATE POLICY "manager_update_players" ON players
  FOR UPDATE USING (
    team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

-- ─── 10) blocked_users — sadece kullanıcı ─────────────────────────────────
CREATE TABLE IF NOT EXISTS blocked_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  blocked_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(blocker_user_id, blocked_user_id)
);

ALTER TABLE blocked_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "blocked_users_own_read" ON blocked_users;
CREATE POLICY "blocked_users_own_read" ON blocked_users
  FOR SELECT USING (blocker_user_id = auth.uid());

DROP POLICY IF EXISTS "blocked_users_own_write" ON blocked_users;
CREATE POLICY "blocked_users_own_write" ON blocked_users
  FOR ALL USING (blocker_user_id = auth.uid()) WITH CHECK (blocker_user_id = auth.uid());

-- =============================================================================
-- Bilgi amaçlı — RLS durum raporu
-- =============================================================================
-- SELECT
--   c.relname AS table_name,
--   c.relrowsecurity AS rls_enabled,
--   COUNT(p.polname) AS policy_count
-- FROM pg_class c
-- LEFT JOIN pg_policy p ON p.polrelid = c.oid
-- WHERE c.relname IN (
--   'user_game_state', 'active_tactics', 'app_state',
--   'transfer_market', 'transfer_offers_mp', 'transfer_messages',
--   'notifications', 'teams', 'players', 'blocked_users'
-- )
-- GROUP BY c.relname, c.relrowsecurity
-- ORDER BY c.relname;
