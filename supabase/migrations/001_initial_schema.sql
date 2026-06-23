-- =============================================================================
-- Touchline Manager — Database Schema Migration
-- =============================================================================
-- ~80 tablo + RLS politikaları + RPC fonksiyonları
-- Supabase PostgreSQL için
-- =============================================================================

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─── ENUMS ──────────────────────────────────────────────────────────────────
DO $$ BEGIN
  CREATE TYPE league_tier AS ENUM ('super_lig', '1_lig', '2_lig', '3_lig');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE position_group AS ENUM ('GK', 'DEF', 'MID', 'FWD');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE referee_personality AS ENUM ('strict', 'balanced', 'lenient', 'home_bias', 'volatile', 'var_lover');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE weather_type AS ENUM ('sunny', 'rainy', 'snowy', 'windy');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE match_status AS ENUM ('scheduled', 'live', 'finished', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE transfer_status AS ENUM ('listed', 'offer_made', 'accepted', 'rejected', 'completed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE staff_type AS ENUM ('scout', 'coach', 'physio', 'analyst', 'youth_coordinator', 'sporting_director');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE facility_type AS ENUM ('stadium', 'pitch', 'academy', 'gym', 'medical', 'analysis');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE notification_kind AS ENUM ('injury', 'result', 'transfer', 'training', 'system');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- =============================================================================
-- PROFILES (users)
-- =============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,
  manager_name TEXT DEFAULT 'Menajer',
  team_id UUID,
  budget BIGINT DEFAULT 5000000,
  credits INTEGER DEFAULT 100,
  reputation INTEGER DEFAULT 50,
  league_tier league_tier DEFAULT '1_lig',
  season INTEGER DEFAULT 1,
  matchday INTEGER DEFAULT 1,
  academy_level INTEGER DEFAULT 0,
  ticket_price INTEGER DEFAULT 60,
  stadium_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- TEAMS
-- =============================================================================
CREATE TABLE IF NOT EXISTS teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  short_name TEXT NOT NULL,
  primary_color TEXT DEFAULT '#1a3a2a',
  secondary_color TEXT DEFAULT '#ffffff',
  league_tier league_tier DEFAULT '1_lig',
  budget BIGINT DEFAULT 5000000,
  stadium_capacity INTEGER DEFAULT 5000,
  stadium_name TEXT,
  is_bot BOOLEAN DEFAULT true,
  is_user_team BOOLEAN DEFAULT false,
  manager_profile_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD CONSTRAINT IF NOT EXISTS profiles_team_fk
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL;

-- =============================================================================
-- PLAYERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  name TEXT NOT NULL,
  position position_group NOT NULL,
  specific_position TEXT NOT NULL,
  secondary_positions TEXT[],
  age INTEGER NOT NULL,
  potential INTEGER DEFAULT 50,
  hidden_potential INTEGER DEFAULT 50,
  rating INTEGER DEFAULT 50,
  nationality TEXT DEFAULT 'TR',
  nation TEXT DEFAULT 'Türkiye',
  preferred_foot TEXT DEFAULT 'Right',
  height INTEGER,
  weight INTEGER,
  market_value BIGINT DEFAULT 0,
  salary BIGINT DEFAULT 0,

  -- 6 temel stat
  defending INTEGER DEFAULT 50,
  passing INTEGER DEFAULT 50,
  shooting INTEGER DEFAULT 50,
  speed INTEGER DEFAULT 50,
  power INTEGER DEFAULT 50,
  vision INTEGER DEFAULT 50,
  control INTEGER DEFAULT 50,
  stamina INTEGER DEFAULT 50,
  heading INTEGER DEFAULT 50,
  goalkeeping INTEGER DEFAULT 50,

  -- Teknik (9)
  finishing INTEGER DEFAULT 50,
  dribbling INTEGER DEFAULT 50,
  first_touch INTEGER DEFAULT 50,
  crossing INTEGER DEFAULT 50,
  marking INTEGER DEFAULT 50,
  tackling INTEGER DEFAULT 50,
  technique INTEGER DEFAULT 50,
  long_shots INTEGER DEFAULT 50,
  off_the_ball INTEGER DEFAULT 50,

  -- Zihinsel (12)
  aggression INTEGER DEFAULT 50,
  bravery INTEGER DEFAULT 50,
  work_rate INTEGER DEFAULT 50,
  decisions INTEGER DEFAULT 50,
  determination INTEGER DEFAULT 50,
  concentration INTEGER DEFAULT 50,
  leadership INTEGER DEFAULT 50,
  anticipation INTEGER DEFAULT 50,
  flair INTEGER DEFAULT 50,
  positioning INTEGER DEFAULT 50,
  composure INTEGER DEFAULT 50,
  teamwork INTEGER DEFAULT 50,

  -- Fiziksel (7)
  agility INTEGER DEFAULT 50,
  balance INTEGER DEFAULT 50,
  strength INTEGER DEFAULT 50,
  acceleration INTEGER DEFAULT 50,
  jumping INTEGER DEFAULT 50,
  left_foot INTEGER DEFAULT 50,
  right_foot INTEGER DEFAULT 50,

  -- Fitness
  cond INTEGER DEFAULT 100,
  form INTEGER DEFAULT 70,
  morale INTEGER DEFAULT 70,
  confidence INTEGER DEFAULT 70,
  chemistry INTEGER DEFAULT 70,

  -- Traits
  traits TEXT[] DEFAULT '{}',
  neg_traits TEXT[] DEFAULT '{}',
  personality_traits TEXT[] DEFAULT '{}',
  play_style TEXT,
  archetype TEXT,
  special_role TEXT,

  -- Stats
  goals INTEGER DEFAULT 0,
  assists INTEGER DEFAULT 0,
  saves INTEGER DEFAULT 0,
  appearances INTEGER DEFAULT 0,
  match_ratings JSONB DEFAULT '[]',
  last_match_rating REAL,

  -- Transfer/durum
  is_for_sale BOOLEAN DEFAULT false,
  sale_price BIGINT DEFAULT 0,
  is_restring BOOLEAN DEFAULT false,
  is_injured BOOLEAN DEFAULT false,
  injury JSONB,
  suspended_until DATE,
  contract_end_week INTEGER,
  is_free_agent BOOLEAN DEFAULT false,
  photo_url TEXT,
  is_retiring BOOLEAN DEFAULT false,
  is_legend BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team_id);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating DESC);

-- =============================================================================
-- SEASONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS seasons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number INTEGER NOT NULL,
  year TEXT NOT NULL,
  league_tier league_tier NOT NULL,
  current_matchday INTEGER DEFAULT 1,
  total_matchdays INTEGER DEFAULT 34,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- =============================================================================
-- FIXTURES
-- =============================================================================
CREATE TABLE IF NOT EXISTS fixtures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  matchday INTEGER NOT NULL,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  status match_status DEFAULT 'scheduled',
  weather weather_type,
  referee_name TEXT,
  referee_personality referee_personality,
  match_date TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fixtures_season ON fixtures(season_id);
CREATE INDEX IF NOT EXISTS idx_fixtures_matchday ON fixtures(matchday);
CREATE INDEX IF NOT EXISTS idx_fixtures_teams ON fixtures(home_team_id, away_team_id);

-- =============================================================================
-- MATCHES (canlı/tamamlanmış)
-- =============================================================================
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fixture_id UUID REFERENCES fixtures(id) ON DELETE CASCADE,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER DEFAULT 0,
  away_score INTEGER DEFAULT 0,
  status match_status DEFAULT 'scheduled',
  current_minute INTEGER DEFAULT 0,
  weather weather_type DEFAULT 'sunny',
  referee_name TEXT,
  referee_personality referee_personality DEFAULT 'balanced',
  events JSONB DEFAULT '[]',
  home_stats JSONB DEFAULT '{}',
  away_stats JSONB DEFAULT '{}',
  home_player_ratings JSONB DEFAULT '[]',
  away_player_ratings JSONB DEFAULT '[]',
  man_of_the_match UUID,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_matches_fixture ON matches(fixture_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);

-- =============================================================================
-- STANDINGS
-- =============================================================================
CREATE TABLE IF NOT EXISTS standings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES seasons(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id),
  league_tier league_tier NOT NULL,
  played INTEGER DEFAULT 0,
  won INTEGER DEFAULT 0,
  drawn INTEGER DEFAULT 0,
  lost INTEGER DEFAULT 0,
  goals_for INTEGER DEFAULT 0,
  goals_against INTEGER DEFAULT 0,
  goal_diff INTEGER DEFAULT 0,
  points INTEGER DEFAULT 0,
  form TEXT[],
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(season_id, team_id)
);

-- =============================================================================
-- ACTIVE TACTICS
-- =============================================================================
CREATE TABLE IF NOT EXISTS active_tactics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  formation TEXT DEFAULT '4-4-2',
  tactic_type TEXT DEFAULT '4-4-2',
  mentality INTEGER DEFAULT 3,
  pressing BOOLEAN DEFAULT false,
  passing_style TEXT DEFAULT 'Karışık',
  intensity TEXT DEFAULT 'normal',
  aggression INTEGER DEFAULT 50,
  width INTEGER DEFAULT 50,
  passing_intensity INTEGER DEFAULT 50,
  line_height INTEGER DEFAULT 50,
  screen_keeper BOOLEAN DEFAULT false,
  waste_time BOOLEAN DEFAULT false,
  park_the_bus BOOLEAN DEFAULT false,
  cross_game BOOLEAN DEFAULT false,
  lone_striker_counter BOOLEAN DEFAULT false,
  offside_trap BOOLEAN DEFAULT false,
  play_style TEXT DEFAULT 'dengeli',
  player_roles JSONB DEFAULT '{}',
  assigned_positions JSONB DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FACILITIES
-- =============================================================================
CREATE TABLE IF NOT EXISTS user_facilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  facility_type facility_type NOT NULL,
  level INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, facility_type)
);

CREATE TABLE IF NOT EXISTS active_upgrades (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  facility_type facility_type,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  finish_at TIMESTAMPTZ,
  cost BIGINT,
  speedup_used BOOLEAN DEFAULT false,
  UNIQUE(profile_id)
);

-- =============================================================================
-- STAFF
-- =============================================================================
CREATE TABLE IF NOT EXISTS staff_types (
  type staff_type PRIMARY KEY,
  name_tr TEXT NOT NULL,
  max_count INTEGER DEFAULT 3,
  base_fee_eur BIGINT DEFAULT 400000
);

INSERT INTO staff_types VALUES
  ('scout', 'Scout', 3, 400000),
  ('coach', 'Antrenör', 3, 650000),
  ('physio', 'Fizyoterapist', 3, 200000),
  ('analyst', 'Analist', 2, 150000),
  ('youth_coordinator', 'Altyapı Koordinatörü', 2, 450000),
  ('sporting_director', 'Sportif Direktör', 1, 350000)
ON CONFLICT (type) DO NOTHING;

CREATE TABLE IF NOT EXISTS staff (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type staff_type NOT NULL REFERENCES staff_types(type),
  name TEXT NOT NULL,
  stars INTEGER DEFAULT 1 CHECK (stars >= 1 AND stars <= 5),
  hire_fee BIGINT NOT NULL,
  weekly_wage BIGINT NOT NULL,
  contract_start_week INTEGER,
  contract_end_week INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_staff_profile ON staff(profile_id);

-- =============================================================================
-- TRANSFERS
-- =============================================================================
CREATE TABLE IF NOT EXISTS transfer_market (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  seller_team_id UUID REFERENCES teams(id),
  asking_price BIGINT NOT NULL,
  listed_at TIMESTAMPTZ DEFAULT NOW(),
  days_listed INTEGER DEFAULT 0,
  offers_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_transfer_market_player ON transfer_market(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_market_active ON transfer_market(is_active) WHERE is_active = true;

CREATE TABLE IF NOT EXISTS transfer_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  buyer_team_id UUID REFERENCES teams(id),
  seller_team_id UUID REFERENCES teams(id),
  transfer_fee BIGINT NOT NULL,
  weekly_wage BIGINT,
  contract_years INTEGER,
  status transfer_status DEFAULT 'offer_made',
  agent_fee BIGINT DEFAULT 0,
  signing_bonus BIGINT DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  responded_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_transfer_offers_player ON transfer_offers(player_id);
CREATE INDEX IF NOT EXISTS idx_transfer_offers_status ON transfer_offers(status);

-- Kiralık transfer
CREATE TABLE IF NOT EXISTS loan_listings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  lender_team_id UUID REFERENCES teams(id),
  daily_fee BIGINT NOT NULL,
  duration_weeks INTEGER NOT NULL,
  buy_option_amount BIGINT,
  listed_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

CREATE TABLE IF NOT EXISTS loan_offers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id UUID REFERENCES loan_listings(id) ON DELETE CASCADE,
  borrower_team_id UUID REFERENCES teams(id),
  status transfer_status DEFAULT 'offer_made',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- WATCHLIST
-- =============================================================================
CREATE TABLE IF NOT EXISTS watchlist (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, player_id)
);

CREATE INDEX IF NOT EXISTS idx_watchlist_profile ON watchlist(profile_id);

-- =============================================================================
-- TRAINING
-- =============================================================================
CREATE TABLE IF NOT EXISTS training_state (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE UNIQUE,
  assignments JSONB DEFAULT '[]',
  daily_count INTEGER DEFAULT 0,
  last_training_date TEXT,
  session_slot TEXT DEFAULT 'morning',
  mentor_assignments JSONB DEFAULT '[]',
  last_session_results JSONB DEFAULT '[]',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trainings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  team_name TEXT,
  session_type TEXT,
  training_date DATE NOT NULL,
  training_time TEXT,
  player_results JSONB,
  player_ids UUID[],
  avg_cond_change REAL,
  avg_morale_change REAL,
  total_players INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trainings_profile ON trainings(profile_id);

CREATE TABLE IF NOT EXISTS player_mentors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  mentor_id UUID REFERENCES players(id) ON DELETE CASCADE,
  mentee_id UUID REFERENCES players(id) ON DELETE CASCADE,
  bonus_rate REAL DEFAULT 0.25,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, mentee_id)
);

-- =============================================================================
-- YOUTH ACADEMY
-- =============================================================================
CREATE TABLE IF NOT EXISTS youth_players (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  position position_group NOT NULL,
  specific_position TEXT NOT NULL,
  age INTEGER CHECK (age >= 15 AND age <= 18),
  potential INTEGER,
  rating INTEGER DEFAULT 30,
  nationality TEXT DEFAULT 'TR',
  training_focus TEXT,
  weeks_in_academy INTEGER DEFAULT 0,
  promoted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_youth_players_profile ON youth_players(profile_id);

-- =============================================================================
-- SCOUTING
-- =============================================================================
CREATE TABLE IF NOT EXISTS scout_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  scout_staff_id UUID REFERENCES staff(id) ON DELETE CASCADE,
  search_tier INTEGER CHECK (search_tier >= 1 AND search_tier <= 3),
  filters JSONB,
  status TEXT DEFAULT 'searching',
  result_player_id UUID REFERENCES players(id),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  UNIQUE(profile_id, scout_staff_id)
);

CREATE TABLE IF NOT EXISTS saved_searches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  filters JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- FINANCE
-- =============================================================================
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  category TEXT NOT NULL,
  amount BIGINT NOT NULL,
  description TEXT,
  week INTEGER,
  season INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_profile ON financial_transactions(profile_id);
CREATE INDEX IF NOT EXISTS idx_finance_week ON financial_transactions(week, season);

CREATE TABLE IF NOT EXISTS sponsors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  weekly_amount BIGINT NOT NULL,
  duration_weeks INTEGER,
  start_week INTEGER,
  bonus_conditions JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- CUPS
-- =============================================================================
CREATE TABLE IF NOT EXISTS cups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_id UUID REFERENCES seasons(id),
  name TEXT NOT NULL,
  round INTEGER DEFAULT 1,
  total_rounds INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS cup_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  cup_id UUID REFERENCES cups(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  home_team_id UUID REFERENCES teams(id),
  away_team_id UUID REFERENCES teams(id),
  home_score INTEGER,
  away_score INTEGER,
  winner_team_id UUID REFERENCES teams(id),
  match_date TIMESTAMPTZ,
  played_at TIMESTAMPTZ,
  UNIQUE(cup_id, round, home_team_id, away_team_id)
);

-- =============================================================================
-- NOTIFICATIONS
-- =============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  kind notification_kind NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_profile ON notifications(profile_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(profile_id) WHERE is_read = false;

-- =============================================================================
-- DAILY TASKS
-- =============================================================================
CREATE TABLE IF NOT EXISTS daily_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  task_type TEXT NOT NULL,
  description TEXT,
  target INTEGER DEFAULT 1,
  progress INTEGER DEFAULT 0,
  reward_money BIGINT DEFAULT 0,
  reward_credits INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT false,
  is_claimed BOOLEAN DEFAULT false,
  assigned_date DATE DEFAULT CURRENT_DATE,
  completed_at TIMESTAMPTZ,
  UNIQUE(profile_id, task_type, assigned_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_tasks_profile ON daily_tasks(profile_id);

-- =============================================================================
-- INVENTORY
-- =============================================================================
CREATE TABLE IF NOT EXISTS inventory_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  rarity TEXT DEFAULT 'common',
  metadata JSONB,
  acquired_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_profile ON inventory_items(profile_id);

-- =============================================================================
-- AWARDS
-- =============================================================================
CREATE TABLE IF NOT EXISTS awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  season INTEGER NOT NULL,
  award_type TEXT NOT NULL,
  player_id UUID REFERENCES players(id),
  team_id UUID REFERENCES teams(id),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- LEGENDS HALL
-- =============================================================================
CREATE TABLE IF NOT EXISTS legends (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id),
  name TEXT NOT NULL,
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold')),
  career_stats JSONB,
  retired_season INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- REFEREES
-- =============================================================================
CREATE TABLE IF NOT EXISTS referees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  personality referee_personality DEFAULT 'balanced',
  experience INTEGER DEFAULT 0,
  league_tier league_tier DEFAULT '1_lig',
  matches_officiated INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =============================================================================
-- UPDATED_AT TRIGGER
-- =============================================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t TEXT;
BEGIN
  FOR t IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename IN ('profiles', 'teams', 'players', 'active_tactics', 'training_state')
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON %I', t);
    EXECUTE format('CREATE TRIGGER set_updated_at BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION update_updated_at()', t);
  END LOOP;
END $$;

-- =============================================================================
-- ROW LEVEL SECURITY
-- =============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE fixtures ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE standings ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_tactics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_upgrades ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_market ENABLE ROW LEVEL SECURITY;
ALTER TABLE transfer_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE loan_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_mentors ENABLE ROW LEVEL SECURITY;
ALTER TABLE youth_players ENABLE ROW LEVEL SECURITY;
ALTER TABLE scout_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_searches ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE awards ENABLE ROW LEVEL SECURITY;

-- Politikalar: kullanıcı kendi verisini okur/yazar
CREATE POLICY "profiles_self_select" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_self_update" ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "teams_select_all" ON teams FOR SELECT USING (true);
CREATE POLICY "teams_update_own" ON teams FOR UPDATE USING (manager_profile_id = auth.uid());

CREATE POLICY "players_select_all" ON players FOR SELECT USING (true);

CREATE POLICY "active_tactics_self" ON active_tactics FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "user_facilities_self" ON user_facilities FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "active_upgrades_self" ON active_upgrades FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "staff_self" ON staff FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "watchlist_self" ON watchlist FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "training_state_self" ON training_state FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "trainings_self" ON trainings FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "player_mentors_self" ON player_mentors FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "youth_players_self" ON youth_players FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "scout_assignments_self" ON scout_assignments FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "saved_searches_self" ON saved_searches FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "financial_transactions_self" ON financial_transactions FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "sponsors_self" ON sponsors FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "notifications_self" ON notifications FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "daily_tasks_self" ON daily_tasks FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "inventory_items_self" ON inventory_items FOR ALL USING (profile_id = auth.uid());
CREATE POLICY "awards_self" ON awards FOR ALL USING (profile_id = auth.uid());

-- =============================================================================
-- RPC: ATOMIC TRANSFER (race condition önlemeli)
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_transfer_buy(
  p_player_id UUID,
  p_buyer_team_id UUID,
  p_seller_team_id UUID,
  p_transfer_fee BIGINT,
  p_agent_fee BIGINT DEFAULT 0,
  p_signing_bonus BIGINT DEFAULT 0
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_player RECORD;
  v_buyer_budget BIGINT;
  v_seller_budget BIGINT;
  v_total_cost BIGINT;
  v_tax BIGINT;
  v_result JSONB;
BEGIN
  -- Kilitle (atomic işlem)
  SELECT * INTO v_player FROM players WHERE id = p_player_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'player_not_found');
  END IF;

  IF v_player.team_id != p_seller_team_id THEN
    RETURN jsonb_build_object('success', false, 'reason', 'player_not_at_seller');
  END IF;

  SELECT budget INTO v_buyer_budget FROM teams WHERE id = p_buyer_team_id FOR UPDATE;
  SELECT budget INTO v_seller_budget FROM teams WHERE id = p_seller_team_id FOR UPDATE;

  v_total_cost := p_transfer_fee + p_agent_fee + p_signing_bonus;
  IF v_buyer_budget < v_total_cost THEN
    RETURN jsonb_build_object('success', false, 'reason', 'insufficient_budget');
  END IF;

  -- Transfer vergisi: satıcıdan %2.5
  v_tax := ROUND(p_transfer_fee * 0.025);

  -- Atomik işlem başlat
  -- 1. Alıcı bütçesinden düş
  UPDATE teams SET budget = budget - v_total_cost WHERE id = p_buyer_team_id;
  -- 2. Satıcı bütçesine ekle (vergi düşülmüş)
  UPDATE teams SET budget = budget + (p_transfer_fee - v_tax) WHERE id = p_seller_team_id;
  -- 3. Oyuncuyu taşı
  UPDATE players SET team_id = p_buyer_team_id, is_for_sale = false, sale_price = 0, updated_at = NOW()
    WHERE id = p_player_id;
  -- 4. Transfer market'ten kaldır
  UPDATE transfer_market SET is_active = false WHERE player_id = p_player_id AND is_active = true;
  -- 5. Watchlist'ten kaldır
  DELETE FROM watchlist WHERE player_id = p_player_id;

  v_result := jsonb_build_object(
    'success', true,
    'transfer_fee', p_transfer_fee,
    'tax', v_tax,
    'agent_fee', p_agent_fee,
    'signing_bonus', p_signing_bonus,
    'total_cost', v_total_cost,
    'seller_net', p_transfer_fee - v_tax
  );

  RETURN v_result;
END;
$$;

-- =============================================================================
-- RPC: MAKE TRANSFER OFFER
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_make_transfer_offer(
  p_player_id UUID,
  p_buyer_team_id UUID,
  p_transfer_fee BIGINT,
  p_weekly_wage BIGINT,
  p_contract_years INTEGER
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_offer_id UUID;
BEGIN
  INSERT INTO transfer_offers (player_id, buyer_team_id, seller_team_id, transfer_fee, weekly_wage, contract_years, agent_fee, signing_bonus, status, expires_at)
  SELECT p_player_id, p_buyer_team_id, team_id, p_transfer_fee, p_weekly_wage, p_contract_years,
         ROUND(p_transfer_fee * 0.05), ROUND(p_transfer_fee * 0.03), 'offer_made',
         NOW() + INTERVAL '72 hours'
  FROM players WHERE id = p_player_id
  RETURNING id INTO v_offer_id;

  RETURN v_offer_id;
END;
$$;

-- =============================================================================
-- RPC: ACCEPT TRANSFER OFFER
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_accept_transfer_offer(
  p_offer_id UUID,
  p_seller_profile_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offer RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_offer FROM transfer_offers WHERE id = p_offer_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'offer_not_found');
  END IF;

  -- Yetki kontrolü
  PERFORM 1 FROM teams t WHERE t.id = v_offer.seller_team_id AND t.manager_profile_id = p_seller_profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'unauthorized');
  END IF;

  -- Transferi gerçekleştir
  SELECT * INTO v_result FROM rpc_transfer_buy(
    v_offer.player_id,
    v_offer.buyer_team_id,
    v_offer.seller_team_id,
    v_offer.transfer_fee,
    v_offer.agent_fee,
    v_offer.signing_bonus
  );

  IF (v_result->>'success')::boolean THEN
    UPDATE transfer_offers SET status = 'completed', responded_at = NOW() WHERE id = p_offer_id;
  END IF;

  RETURN v_result;
END;
$$;

-- =============================================================================
-- RPC: RUN MATCH SIMULATION (cron için)
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_simulate_match(p_match_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_match RECORD;
BEGIN
  SELECT * INTO v_match FROM matches WHERE id = p_match_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'match_not_found');
  END IF;

  -- Maç motoru Node.js tarafında çalışır, burada sadece durum güncelleme
  UPDATE matches SET status = 'finished', finished_at = NOW() WHERE id = p_match_id;
  UPDATE fixtures SET status = 'finished', played_at = NOW() WHERE id = v_match.fixture_id;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- =============================================================================
-- RPC: ASSIGN MENTOR
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_assign_mentor(
  p_profile_id UUID,
  p_mentor_id UUID,
  p_mentee_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Eski mentorluk kaydını sil (aynı mentee için)
  DELETE FROM player_mentors WHERE profile_id = p_profile_id AND mentee_id = p_mentee_id;
  -- Yeni kayıt ekle
  INSERT INTO player_mentors (profile_id, mentor_id, mentee_id, bonus_rate)
  VALUES (p_profile_id, p_mentor_id, p_mentee_id, 0.25);
  RETURN true;
END;
$$;

-- =============================================================================
-- RPC: UPGRADE FACILITY
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_upgrade_facility(
  p_profile_id UUID,
  p_facility_type facility_type,
  p_cost BIGINT,
  p_duration_days INTEGER
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_current_level INTEGER;
BEGIN
  -- Aktif inşaat var mı kontrol
  PERFORM 1 FROM active_upgrades WHERE profile_id = p_profile_id FOR UPDATE;
  IF FOUND THEN
    RETURN false;
  END IF;

  -- Bütçe kontrol
  IF (SELECT budget FROM profiles WHERE id = p_profile_id) < p_cost THEN
    RETURN false;
  END IF;

  -- Bütçe düş
  UPDATE profiles SET budget = budget - p_cost WHERE id = p_profile_id;
  -- İnşaat başlat
  INSERT INTO active_upgrades (profile_id, facility_type, finish_at, cost)
  VALUES (p_profile_id, p_facility_type, NOW() + (p_duration_days || ' days')::INTERVAL, p_cost);

  RETURN true;
END;
$$;

-- =============================================================================
-- RPC: COMPLETE UPGRADE (cron için)
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_complete_upgrade(p_profile_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE v_upgrade RECORD;
BEGIN
  SELECT * INTO v_upgrade FROM active_upgrades WHERE profile_id = p_profile_id FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  IF NOW() < v_upgrade.finish_at THEN RETURN false; END IF;

  -- Seviyeyi artır
  INSERT INTO user_facilities (profile_id, facility_type, level)
  VALUES (p_profile_id, v_upgrade.facility_type, 1)
  ON CONFLICT (profile_id, facility_type)
  DO UPDATE SET level = user_facilities.level + 1, updated_at = NOW();

  -- İnşaatı kaldır
  DELETE FROM active_upgrades WHERE id = v_upgrade.id;
  RETURN true;
END;
$$;

-- =============================================================================
-- COMMENTS
-- =============================================================================
COMMENT ON TABLE profiles IS 'Touchline Manager kullanıcı profilleri';
COMMENT ON TABLE teams IS 'Futbol takımları (bot + kullanıcı)';
COMMENT ON TABLE players IS 'Oyuncular (40+ attribute)';
COMMENT ON TABLE fixtures IS 'Sezon fikstürü';
COMMENT ON TABLE matches IS 'Canlı/tamamlanmış maçlar';
COMMENT ON TABLE standings IS 'Puan durumu';
COMMENT ON TABLE active_tactics IS 'Kullanıcı taktik ayarları';
COMMENT ON TABLE user_facilities IS 'Tesis seviyeleri';
COMMENT ON TABLE staff IS 'Personel (scout/coach/physio vb.)';
COMMENT ON TABLE transfer_market IS 'Satılık oyuncular';
COMMENT ON TABLE transfer_offers IS 'Transfer teklifleri';
COMMENT ON TABLE watchlist IS 'İzleme listesi';
COMMENT ON TABLE training_state IS 'Antrenman durumu';
COMMENT ON TABLE youth_players IS 'Altyapı oyuncuları';
COMMENT ON TABLE notifications IS 'Bildirimler';
COMMENT ON TABLE daily_tasks IS 'Günlük görevler';
COMMENT ON FUNCTION rpc_transfer_buy IS 'Atomik transfer (race condition önlemeli)';
