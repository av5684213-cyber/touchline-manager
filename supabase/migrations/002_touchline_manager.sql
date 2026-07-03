-- =============================================================================
-- Touchline Manager — 002: Yeni Şema Güncellemeleri
-- =============================================================================
-- Bu migration mevcut 001_initial_schema.sql'e ek olarak:
-- 1. 10 tesisli facilities sistemi (capacity/lighting/scoreboards/heating/pitch/academy/medical/vip/store/media)
-- 2. outgoing_offers (kullanıcının gönderdiği teklifler)
-- 3. transfer_messages (takım sahiplerinden gelen mesajlar)
-- 4. training_assignments (odak stat dahil)
-- =============================================================================

-- ─── 1. FACILITIES — 10 tesisli sistem ──────────────────────────────────────
-- Eski facility_type enum'ına yeni değerler ekle
DO $$ BEGIN
  ALTER TYPE facility_type ADD VALUE IF NOT EXISTS 'capacity';
  ALTER TYPE facility_type ADD VALUE IF NOT EXISTS 'lighting';
  ALTER TYPE facility_type ADD VALUE IF NOT EXISTS 'scoreboards';
  ALTER TYPE facility_type ADD VALUE IF NOT EXISTS 'heating';
  ALTER TYPE facility_type ADD VALUE IF NOT EXISTS 'vip';
  ALTER TYPE facility_type ADD VALUE IF NOT EXISTS 'store';
  ALTER TYPE facility_type ADD VALUE IF NOT EXISTS 'media';
EXCEPTION WHEN OTHERS THEN null; END $$;

-- user_facilities tablosu (yoksa oluştur) — 10 tesis × level 0-10
CREATE TABLE IF NOT EXISTS user_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  facility_type TEXT NOT NULL, -- 'capacity', 'lighting', 'scoreboards', 'heating', 'pitch', 'academy', 'medical', 'vip', 'store', 'media'
  level INTEGER DEFAULT 0 CHECK (level >= 0 AND level <= 10),
  upgraded_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, facility_type)
);

CREATE INDEX IF NOT EXISTS idx_user_facilities_profile ON user_facilities(profile_id);

-- active_upgrades tablosu — devam eden inşaatlar
CREATE TABLE IF NOT EXISTS active_upgrades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  facility_type TEXT NOT NULL,
  target_level INTEGER NOT NULL,
  cost BIGINT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finish_at TIMESTAMPTZ NOT NULL,
  speed_up_used BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id) -- aynı anda sadece 1 inşaat
);

CREATE INDEX IF NOT EXISTS idx_active_upgrades_profile ON active_upgrades(profile_id);
CREATE INDEX IF NOT EXISTS idx_active_upgrades_finish ON active_upgrades(finish_at);

-- ─── 2. OUTGOING_OFFERS — kullanıcının gönderdiği teklifler ─────────────────
CREATE TABLE IF NOT EXISTS outgoing_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  player_name TEXT NOT NULL,
  player_position TEXT NOT NULL,
  to_team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  to_team_name TEXT NOT NULL,
  to_team_short TEXT NOT NULL,
  to_team_color TEXT NOT NULL,
  amount BIGINT NOT NULL,
  wage_offer BIGINT NOT NULL,
  contract_years INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'negotiated')),
  counter_offer BIGINT,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outgoing_offers_profile ON outgoing_offers(profile_id);
CREATE INDEX IF NOT EXISTS idx_outgoing_offers_status ON outgoing_offers(status);
CREATE INDEX IF NOT EXISTS idx_outgoing_offers_player ON outgoing_offers(player_id);

-- ─── 3. TRANSFER_MESSAGES — takım sahiplerinden gelen mesajlar ──────────────
DO $$ BEGIN
  CREATE TYPE message_kind AS ENUM (
    'transfer_offer_incoming',
    'transfer_offer_response',
    'transfer_accepted',
    'transfer_rejected',
    'transfer_negotiated',
    'loan_request',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS transfer_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  kind message_kind NOT NULL DEFAULT 'general',
  from_team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  from_team_name TEXT NOT NULL,
  from_team_short TEXT NOT NULL,
  from_team_color TEXT NOT NULL,
  to_team_id UUID,
  player_id UUID REFERENCES players(id) ON DELETE SET NULL,
  player_name TEXT,
  player_position TEXT,
  amount BIGINT,
  counter_offer BIGINT,
  wage_offer BIGINT,
  contract_years INTEGER,
  message TEXT NOT NULL,
  related_offer_id UUID REFERENCES outgoing_offers(id) ON DELETE SET NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transfer_messages_profile ON transfer_messages(profile_id);
CREATE INDEX IF NOT EXISTS idx_transfer_messages_read ON transfer_messages(profile_id, read);
CREATE INDEX IF NOT EXISTS idx_transfer_messages_kind ON transfer_messages(kind);
CREATE INDEX IF NOT EXISTS idx_transfer_messages_created ON transfer_messages(created_at DESC);

-- ─── 4. TRAINING_ASSIGNMENTS — odak stat dahil ─────────────────────────────
CREATE TABLE IF NOT EXISTS training_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  program_id TEXT NOT NULL,
  focused_stat TEXT, -- odak stat (NULL = otomatik)
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_training_assignments_profile ON training_assignments(profile_id);

-- ─── 5. MENTOR_ASSIGNMENTS ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS mentor_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  mentee_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  bonus_rate NUMERIC DEFAULT 0.25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, mentee_id) -- bir mentee'ye sadece 1 mentor
);

CREATE INDEX IF NOT EXISTS idx_mentor_assignments_profile ON mentor_assignments(profile_id);

-- ─── 6. STAFF — personel ────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE staff_role AS ENUM (
    'scout', 'coach', 'physio', 'analyst',
    'youth_coordinator', 'sporting_director'
  );
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type staff_role NOT NULL,
  name TEXT NOT NULL,
  stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
  hire_fee BIGINT NOT NULL,
  weekly_wage BIGINT NOT NULL,
  hired_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_profile ON staff(profile_id);
CREATE INDEX IF NOT EXISTS idx_staff_type ON staff(profile_id, type);

-- ─── 7. PROFILES — yeni kolonlar ────────────────────────────────────────────
-- Aktif inşaat referansı
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_upgrade_facility TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_upgrade_target_level INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_upgrade_started_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_upgrade_finish_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_upgrade_cost BIGINT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS active_upgrade_speed_up_used BOOLEAN DEFAULT false;

-- League departmanı (4 lig × 4 departman)
DO $$ BEGIN
  CREATE TYPE league_department AS ENUM ('1', '2', '3', '4');
EXCEPTION WHEN duplicate_object THEN null; END $$;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS league_department INTEGER DEFAULT 1 CHECK (league_department >= 1 AND league_department <= 4);
ALTER TABLE teams ADD COLUMN IF NOT EXISTS league_department INTEGER DEFAULT 1 CHECK (league_department >= 1 AND league_department <= 4);

-- =============================================================================
-- RLS POLİTİKALARI
-- =============================================================================
-- Tüm tablolarda RLS etkinleştir — kullanıcı sadece kendi verisini görsün
ALTER TABLE user_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE outgoing_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE mentor_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Policy: kullanıcı sadece kendi verisini oku/yaz
CREATE POLICY "user_facilities_own" ON user_facilities
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "active_upgrades_own" ON active_upgrades
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "outgoing_offers_own" ON outgoing_offers
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "transfer_messages_own" ON transfer_messages
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "training_assignments_own" ON training_assignments
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "mentor_assignments_own" ON mentor_assignments
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

CREATE POLICY "staff_own" ON staff
  FOR ALL USING (profile_id = auth.uid()) WITH CHECK (profile_id = auth.uid());

-- =============================================================================
-- RPC FONKSİYONLARI
-- =============================================================================

-- 1. Oyuncu değeri hesapla (server-side, tutarlılık için)
CREATE OR REPLACE FUNCTION rpc_calculate_player_value(p_player_id UUID)
RETURNS BIGINT AS $$
DECLARE
  p RECORD;
  base BIGINT;
  age_mult NUMERIC;
  potential_bonus BIGINT;
  arch_mult NUMERIC := 1.0;
  pos_mult NUMERIC := 1.0;
  cond_mult NUMERIC := 1.0;
  morale_mult NUMERIC := 1.0;
  value BIGINT;
BEGIN
  SELECT * INTO p FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  base := (p.rating * p.rating) * 8000;

  IF p.age <= 23 THEN age_mult := 1.30;
  ELSIF p.age <= 27 THEN age_mult := 1.15;
  ELSIF p.age <= 30 THEN age_mult := 1.00;
  ELSIF p.age <= 33 THEN age_mult := 0.75;
  ELSE age_mult := 0.50;
  END IF;

  potential_bonus := GREATEST(0, COALESCE(p.potential, p.rating) - p.rating) * 200000;

  -- Pozisyon çarpanı
  IF p.specific_position = 'ST' THEN pos_mult := 1.25;
  ELSIF p.specific_position IN ('GK', 'CAM', 'LW', 'RW') THEN pos_mult := 1.10;
  ELSIF p.specific_position IN ('CB', 'LWB', 'RWB') THEN pos_mult := 0.90;
  ELSIF p.specific_position IN ('CF') THEN pos_mult := 1.15;
  END IF;

  value := ((base + potential_bonus) * age_mult * arch_mult * pos_mult * cond_mult * morale_mult)::BIGINT;
  RETURN GREATEST(50000, LEAST(200000000, value));
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Bot teklif değerlendirme
CREATE OR REPLACE FUNCTION rpc_evaluate_bot_offer(p_player_id UUID, p_offer_amount BIGINT)
RETURNS JSON AS $$
DECLARE
  p RECORD;
  value BIGINT;
  min_accept BIGINT;
  decision TEXT;
  counter BIGINT;
BEGIN
  SELECT * INTO p FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN RETURN json_build_object('decision', 'reject'); END IF;

  value := rpc_calculate_player_value(p_player_id);
  min_accept := (value * (0.85 + random() * 0.10))::BIGINT;

  IF p_offer_amount >= (value * 0.95)::BIGINT THEN
    decision := 'accept';
  ELSIF p_offer_amount < min_accept THEN
    IF p_offer_amount < (value * 0.60)::BIGINT THEN
      decision := 'reject';
    ELSE
      decision := 'negotiate';
      counter := ((min_accept + value) / 2)::BIGINT;
    END IF;
  ELSE
    decision := 'accept';
  END IF;

  RETURN json_build_object(
    'decision', decision,
    'counter_offer', counter,
    'value', value,
    'min_accept', min_accept
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Outgoing offer oluştur (atomic)
CREATE OR REPLACE FUNCTION rpc_create_outgoing_offer(
  p_profile_id UUID,
  p_player_id UUID,
  p_to_team_id UUID,
  p_amount BIGINT,
  p_wage BIGINT,
  p_contract_years INTEGER
) RETURNS UUID AS $$
DECLARE
  offer_id UUID;
  p RECORD;
  to_team RECORD;
  evaluation JSON;
  msg_id UUID;
BEGIN
  SELECT * INTO p FROM players WHERE id = p_player_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Player not found'; END IF;

  SELECT * INTO to_team FROM teams WHERE id = p_to_team_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Team not found'; END IF;

  -- Zaten bekleyen teklif var mı?
  IF EXISTS (SELECT 1 FROM outgoing_offers
             WHERE profile_id = p_profile_id AND player_id = p_player_id
             AND status IN ('pending', 'negotiated')) THEN
    RAISE EXCEPTION 'already-pending';
  END IF;

  evaluation := rpc_evaluate_bot_offer(p_player_id, p_amount);

  INSERT INTO outgoing_offers (
    profile_id, player_id, player_name, player_position,
    to_team_id, to_team_name, to_team_short, to_team_color,
    amount, wage_offer, contract_years, status, counter_offer,
    expires_at
  ) VALUES (
    p_profile_id, p_player_id,
    p.first_name || ' ' || p.last_name, p.specific_position,
    p_to_team_id, to_team.name, to_team.short_name, to_team.primary_color,
    p_amount, p_wage, p_contract_years,
    (evaluation->>'decision')::TEXT,
    NULLIF(evaluation->>'counter_offer', '')::BIGINT,
    NOW() + INTERVAL '48 hours'
  ) RETURNING id INTO offer_id;

  -- Mesaj oluştur
  INSERT INTO transfer_messages (
    profile_id, kind, from_team_id, from_team_name, from_team_short, from_team_color,
    to_team_id, player_id, player_name, player_position,
    amount, counter_offer, wage_offer, contract_years, message, related_offer_id
  ) VALUES (
    p_profile_id,
    CASE (evaluation->>'decision')::TEXT
      WHEN 'accept' THEN 'transfer_accepted'::message_kind
      WHEN 'reject' THEN 'transfer_rejected'::message_kind
      ELSE 'transfer_negotiated'::message_kind
    END,
    p_to_team_id, to_team.name, to_team.short_name, to_team.primary_color,
    p_profile_id, p_player_id,
    p.first_name || ' ' || p.last_name, p.specific_position,
    p_amount, NULLIF(evaluation->>'counter_offer', '')::BIGINT,
    p_wage, p_contract_years,
    CASE (evaluation->>'decision')::TEXT
      WHEN 'accept' THEN to_team.name || ' teklifinizi kabul etti!'
      WHEN 'reject' THEN to_team.name || ' teklifinizi reddetti.'
      ELSE to_team.name || ' counter teklif gönderdi.'
    END,
    offer_id
  ) RETURNING id INTO msg_id;

  RETURN offer_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Counter offer kabul — transferi gerçekleştir
CREATE OR REPLACE FUNCTION rpc_accept_counter_offer(p_profile_id UUID, p_offer_id UUID)
RETURNS JSON AS $$
DECLARE
  offer RECORD;
  p RECORD;
  to_team RECORD;
  buyer_cost BIGINT;
  profile_budget BIGINT;
BEGIN
  SELECT * INTO offer FROM outgoing_offers
  WHERE id = p_offer_id AND profile_id = p_profile_id AND status = 'negotiated';
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'reason', 'invalid-offer'); END IF;

  SELECT budget INTO profile_budget FROM profiles WHERE id = p_profile_id;
  buyer_cost := offer.counter_offer + (offer.counter_offer * 0.05)::BIGINT + (offer.counter_offer * 0.03)::BIGINT;

  IF profile_budget < buyer_cost THEN
    RETURN json_build_object('success', false, 'reason', 'budget');
  END IF;

  SELECT * INTO p FROM players WHERE id = offer.player_id;
  SELECT * INTO to_team FROM teams WHERE id = offer.to_team_id;
  IF NOT FOUND OR NOT to_team%FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'player-not-found');
  END IF;

  -- Bütçe transferi
  UPDATE profiles SET budget = budget - buyer_cost WHERE id = p_profile_id;
  UPDATE teams SET budget = budget + offer.counter_offer WHERE id = offer.to_team_id;

  -- Oyuncuyu taşı (kullanıcının takımına)
  UPDATE players SET team_id = (
    SELECT id FROM teams WHERE manager_profile_id = p_profile_id LIMIT 1
  ), salary = offer.wage_offer WHERE id = offer.player_id;

  -- Offer'ı güncelle
  UPDATE outgoing_offers SET status = 'accepted', amount = counter_offer, responded_at = NOW()
  WHERE id = p_offer_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Aktif upgrade kontrolü (cron için)
CREATE OR REPLACE FUNCTION rpc_complete_upgrade_if_due(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  active_rec RECORD;
BEGIN
  SELECT * INTO active_rec FROM active_upgrades
  WHERE profile_id = p_profile_id AND finish_at <= NOW();

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'no-due-upgrade');
  END IF;

  -- Level'ı artır
  INSERT INTO user_facilities (profile_id, facility_type, level, upgraded_at)
  VALUES (p_profile_id, active_rec.facility_type, active_rec.target_level, NOW())
  ON CONFLICT (profile_id, facility_type)
  DO UPDATE SET level = EXCLUDED.level, upgraded_at = NOW();

  -- Active upgrade'i sil
  DELETE FROM active_upgrades WHERE id = active_rec.id;

  -- Profile'dan da temizle
  UPDATE profiles SET
    active_upgrade_facility = NULL,
    active_upgrade_target_level = NULL,
    active_upgrade_started_at = NULL,
    active_upgrade_finish_at = NULL,
    active_upgrade_cost = NULL,
    active_upgrade_speed_up_used = NULL
  WHERE id = p_profile_id;

  RETURN json_build_object('success', true, 'facility', active_rec.facility_type, 'level', active_rec.target_level);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Facility seviyelerini tek sorguda getir
CREATE OR REPLACE FUNCTION rpc_get_facility_levels(p_profile_id UUID)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT COALESCE(json_object_agg(facility_type, level), '{}'::json) INTO result
  FROM user_facilities WHERE profile_id = p_profile_id;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 7. Okunmamış mesaj sayısı
CREATE OR REPLACE FUNCTION rpc_get_unread_message_count(p_profile_id UUID)
RETURNS INTEGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM transfer_messages
  WHERE profile_id = p_profile_id AND read = false;
  RETURN cnt;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- TRIGGER: updated_at otomatik güncelleme
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_transfer_messages_updated ON transfer_messages;
CREATE TRIGGER trg_transfer_messages_updated
  BEFORE UPDATE ON transfer_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_outgoing_offers_updated ON outgoing_offers;
CREATE TRIGGER trg_outgoing_offers_updated
  BEFORE UPDATE ON outgoing_offers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS trg_training_assignments_updated ON training_assignments;
CREATE TRIGGER trg_training_assignments_updated
  BEFORE UPDATE ON training_assignments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- REALTIME — mesajlar ve teklifler için
-- =============================================================================
ALTER TABLE transfer_messages REPLICA IDENTITY FULL;
ALTER TABLE outgoing_offers REPLICA IDENTITY FULL;
ALTER TABLE active_upgrades REPLICA IDENTITY FULL;

-- Publication'a ekle (realtime için)
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE transfer_messages;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE outgoing_offers;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE active_upgrades;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- =============================================================================
-- INDEX'LER — performans için
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating DESC);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(specific_position);
CREATE INDEX IF NOT EXISTS idx_teams_league ON teams(league_tier, league_department);
CREATE INDEX IF NOT EXISTS idx_fixtures_matchday ON fixtures(matchday) WHERE played_at IS NULL;
