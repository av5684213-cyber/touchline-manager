-- =============================================================================
-- 011_v2_features.sql
-- =============================================================================
-- v2.0.0 özellikleri için veritabanı şema güncellemesi
--
-- İçerik:
-- 1. Badge + UserBadge tabloları (başarım sistemi)
-- 2. Sponsors tablosu güncelleme (tier, is_active, end_date)
-- 3. Transfer offers tablosuna pazarlık kolonları
-- 4. Loan offers tablosuna min_appearances
-- 5. Player season_stats (detaylı maç istatistikleri JSONB)
-- 6. Player season_start_stats (gelişim rozeti için baseline)
-- 7. Injury history ayrı tablo
-- 8. Notifications tablosuna player_id
-- 9. Player achievements (cloud sync için)
-- =============================================================================

-- ═══════════════════════════════════════════════════════════════════════════
-- 1. BADGE + USER_BADGE — Başarım sistemi
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  condition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  category TEXT DEFAULT 'general',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_badges (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON user_badges(user_id);
CREATE INDEX IF NOT EXISTS idx_badges_name ON badges(name);

-- RLS
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "badges_read_all" ON badges FOR SELECT USING (true);
CREATE POLICY "user_badges_self" ON user_badges FOR ALL USING (user_id = auth.uid());

-- Önceden tanımlı başarım seed'leri
INSERT INTO badges (name, display_name, icon, description, condition_json, category) VALUES
  ('first_login', 'Hoş Geldin', '👋', 'Oyuna ilk kez giriş yap', '{"firstLogin": true}'::jsonb, 'general'),
  ('first_win', 'İlk Galibiyet', '🏆', 'İlk maçını kazan', '{"matchWon": true}'::jsonb, 'match'),
  ('first_goal', 'İlk Gol', '⚽', 'İlk gol atan oyuncun', '{"goalScored": true}'::jsonb, 'match'),
  ('first_transfer', 'İlk Transfer', '💰', 'İlk transferini tamamla', '{"transferDone": true}'::jsonb, 'transfer'),
  ('goal_machine', 'Gol Makinesi', '🔥', 'Bir oyuncu sezonda 20+ gol at', '{"topScorerGoals": 20}'::jsonb, 'match'),
  ('assist_king', 'Asist Kralı', '🎯', 'Bir oyuncu sezonda 15+ asist yap', '{"topAssists": 15}'::jsonb, 'match'),
  ('wall', 'Kale Duvarı', '🧱', '5 maçta 0 gol yeme', '{"cleanSheetStreak": 5}'::jsonb, 'match'),
  ('win_streak_5', 'Galibiyet Serisi', '🔥', '5 maç üst üste galibiyet', '{"winStreak": 5}'::jsonb, 'match'),
  ('promotion', 'Yükselme', '📈', 'Bir üst lige çık', '{"promoted": true}'::jsonb, 'season'),
  ('cup_champion', 'Kupa Şampiyonu', '🥇', 'Kupayı kazan', '{"cupWon": true}'::jsonb, 'cup'),
  ('genius', 'Deha', '🧠', 'Taktik puanı 90+', '{"tacticScore": 90}'::jsonb, 'tactics'),
  ('youth_star', 'Altyapı Yıldızı', '⭐', 'Altyapıdan oyuncu terfi et', '{"youthPromoted": true}'::jsonb, 'youth'),
  ('transfer_mogul', 'Transfer Cüzdanı', '💼', '10 transfer yap', '{"transferCount": 10}'::jsonb, 'transfer'),
  ('budget_master', 'Bütçe Ustası', '💎', '50M+ bütçe biriktir', '{"budget": 50000000}'::jsonb, 'finance'),
  ('champion', 'Sezon Şampiyonu', '👑', 'Ligi 1. bitir', '{"leaguePosition": 1}'::jsonb, 'season'),
  ('legend', 'Efsane', '🌟', '5 sezon oyna', '{"seasonsPlayed": 5}'::jsonb, 'season'),
  ('tactical_master', 'Taktik Ustası', '📋', 'Tüm taktik talimatlarını aktif et', '{"tacticalMaster": true}'::jsonb, 'tactics'),
  ('youth_promoted', 'Altyapı Fatihi', '🎓', '3 altyapı oyuncusu terfi et', '{"youthPromotedCount": 3}'::jsonb, 'youth')
ON CONFLICT (name) DO NOTHING;

-- ═══════════════════════════════════════════════════════════════════════════
-- 2. SPONSORS tablosu güncelleme — tier, is_active, end_date
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'BRONZE';
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE sponsors ADD COLUMN IF NOT EXISTS season_number INTEGER;

COMMENT ON COLUMN sponsors.tier IS 'Sponsor tier: BRONZE, SILVER, GOLD, PLATINUM';
COMMENT ON COLUMN sponsors.is_active IS 'Aktif sponsor mu (sadece 1 aktif olabilir)';
COMMENT ON COLUMN sponsors.season_number IS 'Hangi sezonda imzalandı';

-- ═══════════════════════════════════════════════════════════════════════════
-- 3. TRANSFER OFFERS — pazarlık kolonları
-- ═══════════════════════════════════════════════════════════════════════════

-- Önce transfer_offers tablosu var mı kontrol et
DO $$ BEGIN
  -- sell-on clause: gelecekte satarsan %'si rakibe gider
  ALTER TABLE transfer_offers ADD COLUMN IF NOT EXISTS sell_on_fee_percent INTEGER DEFAULT 0;

  -- Performans bonusu: belirli gol/maç eşiğinde ek ödeme
  ALTER TABLE transfer_offers ADD COLUMN IF NOT EXISTS performance_bonus JSONB DEFAULT '{}'::jsonb;

  -- Geri alma opsiyonu: bu fiyattan geri alabilir
  ALTER TABLE transfer_offers ADD COLUMN IF NOT EXISTS buy_back_amount BIGINT DEFAULT 0;

  -- Takas oyuncusu: kendi takımından takas edilecek oyuncu ID
  ALTER TABLE transfer_offers ADD COLUMN IF NOT EXISTS exchange_player_id UUID;

  -- Taksitlendirme: 0=peşin, 12/24/36 ay
  ALTER TABLE transfer_offers ADD COLUMN IF NOT EXISTS installment_months INTEGER DEFAULT 0;

EXCEPTION WHEN undefined_table THEN
  -- transfer_offers tablosu yoksa atla
  RAISE NOTICE 'transfer_offers tablosu bulunamadı, pazarlık kolonları atlandı';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 4. LOAN OFFERS — min_appearances
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  -- Zorunlu oynatma şartı: kiralık süresi sonunda ilk 11'de oynama sayısı
  ALTER TABLE loan_offers ADD COLUMN IF NOT EXISTS min_appearances INTEGER DEFAULT 0;

  -- Eğer şart karşılanmazsa ceza
  ALTER TABLE loan_offers ADD COLUMN IF NOT EXISTS penalty_fee BIGINT DEFAULT 0;

EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'loan_offers tablosu bulunamadı, min_appearances atlandı';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 5. PLAYER SEASON STATS — detaylı maç istatistikleri (JSONB)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE players ADD COLUMN IF NOT EXISTS season_stats JSONB DEFAULT '{
  "shots": 0,
  "shotsOnTarget": 0,
  "shotsOffTarget": 0,
  "shotsBlocked": 0,
  "passes": 0,
  "passesCompleted": 0,
  "keyPasses": 0,
  "crosses": 0,
  "crossesCompleted": 0,
  "longBalls": 0,
  "longBallsCompleted": 0,
  "tackles": 0,
  "interceptions": 0,
  "clearances": 0,
  "fouls": 0,
  "fouled": 0,
  "yellowCards": 0,
  "redCards": 0,
  "offsides": 0,
  "dribblesAttempted": 0,
  "dribblesCompleted": 0,
  "duels": 0,
  "duelsWon": 0,
  "errors": 0,
  "minutesPlayed": 0,
  "goalsRight": 0,
  "goalsLeft": 0,
  "goalsHead": 0,
  "goalsPenalty": 0,
  "goalsFreekick": 0
}'::jsonb;

COMMENT ON COLUMN players.season_stats IS 'Mevcut sezon detaylı istatistikleri (JSONB)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 6. SEASON START STATS — gelişim rozeti için baseline
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE players ADD COLUMN IF NOT EXISTS season_start_stats JSONB DEFAULT '{}'::jsonb;
ALTER TABLE players ADD COLUMN IF NOT EXISTS season_start_rating INTEGER;

COMMENT ON COLUMN players.season_start_stats IS 'Sezon başı stat değerleri (gelişim rozeti için)';
COMMENT ON COLUMN players.season_start_rating IS 'Sezon başı OVR rating (gelişim hesabı için)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 7. INJURY HISTORY — ayrı tablo (sorgulanabilir)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS injury_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID REFERENCES players(id) ON DELETE CASCADE,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  injury_date DATE NOT NULL DEFAULT CURRENT_DATE,
  injury_type TEXT NOT NULL,
  duration_days INTEGER NOT NULL,
  severity INTEGER DEFAULT 1,
  match_id UUID,
  recovered BOOLEAN DEFAULT FALSE,
  recovered_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_injury_history_player ON injury_history(player_id);
CREATE INDEX IF NOT EXISTS idx_injury_history_team ON injury_history(team_id);
CREATE INDEX IF NOT EXISTS idx_injury_history_date ON injury_history(injury_date);

ALTER TABLE injury_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "injury_history_read_self" ON injury_history FOR SELECT
  USING (team_id IN (SELECT id FROM teams WHERE manager_profile_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════
-- 8. NOTIFICATIONS — player_id kolonu
-- ═══════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS player_id UUID;
  ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_team_id UUID;

EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'notifications tablosu bulunamadı, player_id atlandı';
END $$;

-- ═══════════════════════════════════════════════════════════════════════════
-- 9. PLAYER LEFT/RIGHT FOOT — ayak güçleri
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE players ADD COLUMN IF NOT EXISTS left_foot INTEGER DEFAULT 50;
ALTER TABLE players ADD COLUMN IF NOT EXISTS right_foot INTEGER DEFAULT 50;

COMMENT ON COLUMN players.left_foot IS 'Sol ayak gücü (0-100)';
COMMENT ON COLUMN players.right_foot IS 'Sağ ayak gücü (0-100)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 10. PROFILES — sponsor_income (cache için)
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sponsor_weekly_income BIGINT DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS transfer_count INTEGER DEFAULT 0;

COMMENT ON COLUMN profiles.sponsor_weekly_income IS 'Aktif sponsor haftalık geliri (cache)';
COMMENT ON COLUMN profiles.transfer_count IS 'Toplam transfer sayısı (başarım için)';

-- ═══════════════════════════════════════════════════════════════════════════
-- 11. INDEX'ler — performans
-- ═══════════════════════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_sponsors_active ON sponsors(profile_id, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_players_season_stats ON players(season_stats) WHERE season_stats != '{}'::jsonb;
CREATE INDEX IF NOT EXISTS idx_notifications_player ON notifications(player_id) WHERE player_id IS NOT NULL;

-- ═══════════════════════════════════════════════════════════════════════════
-- 12. TRIGGER — sezon başında season_start_stats güncelle
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_season_start_stats()
RETURNS TRIGGER AS $$
BEGIN
  -- Sezon değiştiğinde season_start_stats'ı güncelle
  IF NEW.season IS DISTINCT FROM OLD.season THEN
    UPDATE players SET
      season_start_rating = rating,
      season_start_stats = jsonb_build_object(
        'rating', rating,
        'finishing', COALESCE(finishing, 50),
        'dribbling', COALESCE(dribbling, 50),
        'passing', COALESCE(passing, 50),
        'shooting', COALESCE(shooting, 50),
        'tackling', COALESCE(tackling, 50),
        'marking', COALESCE(marking, 50),
        'heading', COALESCE(heading, 50),
        'speed', COALESCE(speed, 50),
        'stamina', COALESCE(stamina, 50),
        'strength', COALESCE(strength, 50),
        'vision', COALESCE(vision, 50),
        'technique', COALESCE(technique, 50),
        'crossing', COALESCE(crossing, 50),
        'longShots', COALESCE(long_shots, 50),
        'firstTouch', COALESCE(first_touch, 50),
        'offTheBall', COALESCE(off_the_ball, 50)
      )
    WHERE team_id IN (
      SELECT id FROM teams WHERE manager_profile_id = NEW.id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_season_start_stats ON profiles;
CREATE TRIGGER trigger_update_season_start_stats
  AFTER UPDATE OF season ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_season_start_stats();

-- ═══════════════════════════════════════════════════════════════════════════
-- 13. RPC — check_and_award_badges
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID, p_context JSONB)
RETURNS TABLE(badge_name TEXT, badge_icon TEXT, badge_display_name TEXT) AS $$
DECLARE
  badge RECORD;
  condition_json JSONB;
  is_earned BOOLEAN;
BEGIN
  FOR badge IN SELECT * FROM badges LOOP
    condition_json := badge.condition_json;

    -- Basit koşul kontrolü
    is_earned := false;

    -- firstLogin
    IF condition_json ? 'firstLogin' AND (p_context ->> 'firstLogin') = 'true' THEN
      is_earned := true;
    END IF;

    -- matchWon
    IF condition_json ? 'matchWon' AND (p_context ->> 'matchWon') = 'true' THEN
      is_earned := true;
    END IF;

    -- goalScored
    IF condition_json ? 'goalScored' AND (p_context ->> 'goalScored') = 'true' THEN
      is_earned := true;
    END IF;

    -- transferDone
    IF condition_json ? 'transferDone' AND (p_context ->> 'transferDone') = 'true' THEN
      is_earned := true;
    END IF;

    -- winStreak
    IF condition_json ? 'winStreak' THEN
      IF COALESCE((p_context ->> 'winStreak')::INTEGER, 0) >= (condition_json ->> 'winStreak')::INTEGER THEN
        is_earned := true;
      END IF;
    END IF;

    -- leaguePosition
    IF condition_json ? 'leaguePosition' THEN
      IF COALESCE((p_context ->> 'leaguePosition')::INTEGER, 99) = (condition_json ->> 'leaguePosition')::INTEGER THEN
        is_earned := true;
      END IF;
    END IF;

    -- budget
    IF condition_json ? 'budget' THEN
      IF COALESCE((p_context ->> 'budget')::BIGINT, 0) >= (condition_json ->> 'budget')::BIGINT THEN
        is_earned := true;
      END IF;
    END IF;

    -- transferCount
    IF condition_json ? 'transferCount' THEN
      IF COALESCE((p_context ->> 'transferCount')::INTEGER, 0) >= (condition_json ->> 'transferCount')::INTEGER THEN
        is_earned := true;
      END IF;
    END IF;

    -- seasonsPlayed
    IF condition_json ? 'seasonsPlayed' THEN
      IF COALESCE((p_context ->> 'seasonsPlayed')::INTEGER, 0) >= (condition_json ->> 'seasonsPlayed')::INTEGER THEN
        is_earned := true;
      END IF;
    END IF;

    -- Eğer kazanıldıysa ve daha önce yoksa ekle
    IF is_earned THEN
      INSERT INTO user_badges (user_id, badge_id)
      VALUES (p_user_id, badge.id)
      ON CONFLICT (user_id, badge_id) DO NOTHING;

      IF FOUND THEN
        RETURN QUERY SELECT badge.name, badge.icon, badge.display_name;
      END IF;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 14. RPC — get_player_growth (gelişim rozeti için)
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION get_player_growth(p_player_id UUID)
RETURNS TABLE(
  current_rating INTEGER,
  season_start_rating INTEGER,
  rating_diff INTEGER,
  current_stats JSONB,
  season_start_stats JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.rating,
    p.season_start_rating,
    COALESCE(p.rating, 0) - COALESCE(p.season_start_rating, 0),
    p.season_stats,
    p.season_start_stats
  FROM players p
  WHERE p.id = p_player_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════════════
-- 15. RPC — generate_sponsor_offers
-- ═══════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION generate_sponsor_offers(p_user_id UUID)
RETURNS TABLE(
  name TEXT,
  amount BIGINT,
  tier TEXT,
  duration_weeks INTEGER
) AS $$
DECLARE
  v_team_id UUID;
  v_league_tier league_tier;
  v_avg_ovr NUMERIC;
  v_sponsor_tier TEXT;
  v_amount BIGINT;
  v_name TEXT;
BEGIN
  -- Kullanıcının takımını bul
  SELECT t.id, t.league_tier INTO v_team_id, v_league_tier
  FROM teams t WHERE t.manager_profile_id = p_user_id LIMIT 1;

  IF v_team_id IS NULL THEN RETURN; END IF;

  -- Takım ortalama OVR
  SELECT AVG(rating) INTO v_avg_ovr FROM players WHERE team_id = v_team_id;

  -- Tier belirle
  IF v_league_tier = 'super_lig' THEN
    IF v_avg_ovr >= 75 THEN v_sponsor_tier := 'PLATINUM';
    ELSIF v_avg_ovr >= 65 THEN v_sponsor_tier := 'GOLD';
    ELSE v_sponsor_tier := 'SILVER';
    END IF;
  ELSIF v_league_tier = '1_lig' THEN
    IF v_avg_ovr >= 70 THEN v_sponsor_tier := 'GOLD';
    ELSIF v_avg_ovr >= 60 THEN v_sponsor_tier := 'SILVER';
    ELSE v_sponsor_tier := 'BRONZE';
    END IF;
  ELSE
    IF v_avg_ovr >= 65 THEN v_sponsor_tier := 'SILVER';
    ELSE v_sponsor_tier := 'BRONZE';
    END IF;
  END IF;

  -- Amount belirle
  v_amount := CASE v_sponsor_tier
    WHEN 'PLATINUM' THEN 500000
    WHEN 'GOLD' THEN 250000
    WHEN 'SILVER' THEN 100000
    ELSE 40000
  END;

  -- 3 teklif üret
  v_name := CASE v_sponsor_tier
    WHEN 'PLATINUM' THEN 'Vodafone Anadolu'
    WHEN 'GOLD' THEN 'İstanbul Havayolları'
    WHEN 'SILVER' THEN 'Boğaz Enerji'
    ELSE 'Anadolu Teknoloji'
  END;

  RETURN QUERY SELECT v_name, v_amount, v_sponsor_tier, 34;
  RETURN QUERY SELECT v_name || ' Plus', v_amount * 2, v_sponsor_tier, 34;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
