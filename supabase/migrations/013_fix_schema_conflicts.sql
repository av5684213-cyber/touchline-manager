-- 013_fix_schema_conflicts.sql
-- v2.9.4 — Şema çakışmalarını çöz (001 vs sonraki migration'lar)
--
-- PROBLEM: 001_initial_schema.sql ile sonraki migration'lar (002, 004, 006, 007, 008)
-- arasında 7 tabloda şema çakışması var. CREATE TABLE IF NOT EXISTS deseni
-- ilk çalışan migration'ın şemasını kilitler, sonrakiler no-op olur.
--
-- Sonuç: 007 migration'ı transfer_market ve notifications tablolarında
-- migration-time error veriyor (team_id, user_id kolonları yok).
-- Ayrıca 008 cup_matches, 006 active_tactics, 004 standings runtime'da patlıyor.
--
-- ÇÖZÜM: Çakışan tabloları DROP + doğru şemayla yeniden CREATE et.
-- Bu migration idempotent — birden fazla çalıştırılabilir.
--
-- UYARI: Eğer mevcut veritabanında kullanıcı verisi varsa, bu migration o
-- tablolardaki veriyi SİLER. Cloud-save (user_game_state) korunur, ama
-- active_tactics, standings, cup_matches gibi multiplayer tablolar
-- sıfırlanır. Multiplayer modu aktif değilse sorun yok.
--
-- Sıra:
-- 1. active_tactics (006 şeması)
-- 2. user_facilities + active_upgrades (002 şeması)
-- 3. staff (002 şeması — staff_role ENUM)
-- 4. standings (004 şeması — department_id tabanlı)
-- 5. notifications (007 şeması — user_id tabanlı)
-- 6. cup_matches (008 şeması — bracket tabanlı)
-- 7. transfer_market (007 şeması — team_id tabanlı)
-- 8. update_standings_on_match trigger'ını düzelt (GENERATED kolon için)
-- 9. Tüm CREATE POLICY ifadelerini CREATE OR REPLACE POLICY'ye çevir

-- =====================================================================
-- 1. active_tactics — 006 şeması (JSONB tabanlı)
-- =====================================================================
DROP TABLE IF EXISTS active_tactics CASCADE;

CREATE TABLE active_tactics (
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

-- =====================================================================
-- 2. user_facilities + active_upgrades — 002 şeması (TEXT + target_level)
-- =====================================================================
DROP TABLE IF EXISTS active_upgrades CASCADE;
DROP TABLE IF EXISTS user_facilities CASCADE;

CREATE TABLE user_facilities (
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_type TEXT NOT NULL,
  level INTEGER DEFAULT 0 CHECK (level >= 0 AND level <= 10),
  upgraded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, facility_type)
);

CREATE TABLE active_upgrades (
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_type TEXT NOT NULL,
  target_level INTEGER NOT NULL,
  speed_up_used BOOLEAN DEFAULT false,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id)
);

ALTER TABLE user_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_upgrades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user_facilities_own" ON user_facilities;
CREATE POLICY "user_facilities_own" ON user_facilities
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS "active_upgrades_own" ON active_upgrades;
CREATE POLICY "active_upgrades_own" ON active_upgrades
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS idx_user_facilities_profile ON user_facilities(profile_id);

-- =====================================================================
-- 3. staff — 002 şeması (staff_role ENUM)
-- =====================================================================
DROP TABLE IF EXISTS staff CASCADE;

DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM (
    'scout', 'coach', 'physio', 'analyst',
    'youth_coordinator', 'sporting_director'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type staff_role NOT NULL,
  name TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  hire_fee BIGINT NOT NULL,
  weekly_wage BIGINT NOT NULL,
  hired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_own" ON staff;
CREATE POLICY "staff_own" ON staff
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

CREATE INDEX IF NOT EXISTS idx_staff_profile ON staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_type ON staff(profile_id, type);

-- =====================================================================
-- 4. standings — 004 şeması (department_id tabanlı)
-- =====================================================================
DROP TABLE IF EXISTS standings CASCADE;

CREATE TABLE standings (
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
  goal_diff INTEGER DEFAULT 0,  -- GENERATED değil, manuel — trigger günceller
  points INTEGER DEFAULT 0,
  is_user_team BOOLEAN DEFAULT false,
  manager_user_id UUID,
  UNIQUE(department_id, team_id)
);

ALTER TABLE standings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "standings_read_all" ON standings
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_standings_dept ON standings(department_id);
CREATE INDEX IF NOT EXISTS idx_standings_team ON standings(team_id);

-- =====================================================================
-- 5. notifications — 007 şeması (user_id tabanlı)
-- =====================================================================
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  data JSONB,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  player_id UUID,
  related_team_id UUID
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_self" ON notifications;
CREATE POLICY "notifications_self" ON notifications
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id) WHERE read = false;

-- =====================================================================
-- 6. cup_matches — 008 şeması (bracket tabanlı, next_match_id self-FK)
-- =====================================================================
-- cups tablosunu (001) bırakıyoruz — 008 cup_rounds kullanıyor
DROP TABLE IF EXISTS cup_matches CASCADE;
DROP TABLE IF EXISTS cups CASCADE;

CREATE TABLE cup_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'scheduled',
  played_at TIMESTAMPTZ,
  next_match_id UUID REFERENCES cup_matches(id),
  next_match_slot TEXT,
  referee_name TEXT,
  weather TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cup_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cup_matches_read_all" ON cup_matches
  FOR SELECT USING (true);

CREATE INDEX IF NOT EXISTS idx_cup_matches_round ON cup_matches(round_number);
CREATE INDEX IF NOT EXISTS idx_cup_matches_next ON cup_matches(next_match_id);

-- =====================================================================
-- 7. transfer_market — 007 şeması (team_id + UNIQUE(player_id))
-- =====================================================================
DROP TABLE IF EXISTS transfer_market CASCADE;

CREATE TABLE transfer_market (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  asking_price BIGINT NOT NULL,
  listed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  UNIQUE(player_id)
);

ALTER TABLE transfer_market ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tm_read_all" ON transfer_market;
CREATE POLICY "tm_read_all" ON transfer_market
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "tm_insert_own" ON transfer_market;
CREATE POLICY "tm_insert_own" ON transfer_market
  FOR INSERT WITH CHECK (team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid()));

DROP POLICY IF EXISTS "tm_update_own" ON transfer_market;
CREATE POLICY "tm_update_own" ON transfer_market
  FOR UPDATE USING (team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid()));

DROP POLICY IF EXISTS "tm_delete_own" ON transfer_market;
CREATE POLICY "tm_delete_own" ON transfer_market
  FOR DELETE USING (team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_transfer_market_player ON transfer_market(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_market_team ON transfer_market(team_id);

-- =====================================================================
-- 8. update_standings_on_match trigger'ını düzelt
-- =====================================================================
-- 006'daki orijinal trigger goal_diff = goal_diff + ... yapıyordu.
-- Yeni standings şemasında goal_diff GENERATED değil (yukarıda düzelttik),
-- bu yüzden orijinal trigger çalışır. Ama defensive olarak yeniden tanımla.

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

-- =====================================================================
-- 9. transfer_offers_mp tablosu (007'de tanımlı, drop oldu mu kontrol et)
-- =====================================================================
-- 007 migration-time error verirse transfer_offers_mp oluşturulmamış olabilir.
CREATE TABLE IF NOT EXISTS transfer_offers_mp (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  from_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  to_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  fee BIGINT NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transfer_offers_mp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfer_offers_mp_read_own" ON transfer_offers_mp;
CREATE POLICY "transfer_offers_mp_read_own" ON transfer_offers_mp
  FOR SELECT USING (
    from_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
    OR to_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

DROP POLICY IF EXISTS "transfer_offers_mp_insert_own" ON transfer_offers_mp;
CREATE POLICY "transfer_offers_mp_insert_own" ON transfer_offers_mp
  FOR INSERT WITH CHECK (from_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid()));

DROP POLICY IF EXISTS "transfer_offers_mp_update_own" ON transfer_offers_mp;
CREATE POLICY "transfer_offers_mp_update_own" ON transfer_offers_mp
  FOR UPDATE USING (
    from_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
    OR to_team_id IN (SELECT id FROM teams WHERE manager_user_id = auth.uid())
  );

-- =====================================================================
-- 10. transfer_messages tablosu (002'de tanımlı, drop olmadığı için korunur)
-- =====================================================================
CREATE TABLE IF NOT EXISTS transfer_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_team_id UUID REFERENCES teams(id),
  to_team_id UUID REFERENCES teams(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE transfer_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "transfer_messages_own" ON transfer_messages;
CREATE POLICY "transfer_messages_own" ON transfer_messages
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- =====================================================================
-- 11. training_assignments tablosu (002'de tanımlı)
-- =====================================================================
CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  assigned_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "training_assignments_own" ON training_assignments;
CREATE POLICY "training_assignments_own" ON training_assignments
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- =====================================================================
-- 12. mentor_assignments tablosu (002'de tanımlı)
-- =====================================================================
CREATE TABLE IF NOT EXISTS mentor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, mentee_id)
);

ALTER TABLE mentor_assignments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mentor_assignments_own" ON mentor_assignments;
CREATE POLICY "mentor_assignments_own" ON mentor_assignments
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- =====================================================================
-- 13. outgoing_offers tablosu (002'de tanımlı)
-- =====================================================================
CREATE TABLE IF NOT EXISTS outgoing_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  to_team_id UUID REFERENCES teams(id),
  fee BIGINT NOT NULL,
  wage BIGINT NOT NULL,
  contract_years INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE outgoing_offers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "outgoing_offers_own" ON outgoing_offers;
CREATE POLICY "outgoing_offers_own" ON outgoing_offers
  FOR ALL USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

-- =====================================================================
-- DOĞRULAMA — migration sonrası kontrol sorgusu
-- =====================================================================
-- Aşağıdaki sorguyu çalıştırarak migration'ın başarılı olduğunu doğrula:
-- 
-- SELECT 
--   (SELECT count(*) FROM information_schema.columns WHERE table_name='active_tactics' AND column_name='tactic_data') as active_tactics_ok,
--   (SELECT count(*) FROM information_schema.columns WHERE table_name='standings' AND column_name='department_id') as standings_ok,
--   (SELECT count(*) FROM information_schema.columns WHERE table_name='notifications' AND column_name='user_id') as notifications_ok,
--   (SELECT count(*) FROM information_schema.columns WHERE table_name='cup_matches' AND column_name='next_match_id') as cup_matches_ok,
--   (SELECT count(*) FROM information_schema.columns WHERE table_name='transfer_market' AND column_name='team_id') as transfer_market_ok,
--   (SELECT count(*) FROM information_schema.columns WHERE table_name='user_facilities' AND column_name='upgraded_at') as user_facilities_ok,
--   (SELECT count(*) FROM information_schema.columns WHERE table_name='staff' AND column_name='hired_at') as staff_ok;
--
-- Beklenen: tümü 1 olmalı
