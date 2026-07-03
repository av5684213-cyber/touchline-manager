-- 008: Kupa Sistemi — Cumartesi eliminasyon turnuvası
-- 
-- Her cumartesi oynanır. Tek maç eleme usulü.
-- 216 takım → 128 → 64 → 32 → 16 → 8 → 4 → 2 → final
-- (128'lik bracket, 88 takım bye alır)

CREATE TABLE IF NOT EXISTS cup_rounds (
  id SERIAL PRIMARY KEY,
  round_number INTEGER NOT NULL,  -- 1=128, 2=64, 3=32, 4=16, 5=8, 6=4, 7=final
  name_tr TEXT NOT NULL,          -- "1. Tur", "2. Tur", "Son 16", "Çeyrek Final", "Yarı Final", "Final"
  match_count INTEGER NOT NULL,   -- 64, 32, 16, 8, 4, 2, 1
  created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO cup_rounds (round_number, name_tr, match_count) VALUES
  (1, '1. Tur', 64),
  (2, '2. Tur', 32),
  (3, 'Son 32', 16),
  (4, 'Son 16', 8),
  (5, 'Çeyrek Final', 4),
  (6, 'Yarı Final', 2),
  (7, 'Final', 1)
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS cup_matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  round_number INTEGER NOT NULL,
  match_number INTEGER NOT NULL,  -- round içinde sıra
  home_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  away_team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  home_score INTEGER,
  away_score INTEGER,
  status TEXT DEFAULT 'scheduled', -- scheduled, finished
  played_at TIMESTAMPTZ,
  -- Sonraki tur bilgisi
  next_match_id UUID REFERENCES cup_matches(id),
  next_match_slot TEXT, -- 'home' veya 'away'
  -- Hakem + hava
  referee_name TEXT,
  weather TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cup_matches_round ON cup_matches(round_number);
CREATE INDEX IF NOT EXISTS idx_cup_matches_status ON cup_matches(status);
CREATE INDEX IF NOT EXISTS idx_cup_matches_teams ON cup_matches(home_team_id, away_team_id);

ALTER TABLE cup_matches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cup_read_all" ON cup_matches;
CREATE POLICY "cup_read_all" ON cup_matches FOR SELECT USING (true);

-- Kupa kazananları tablosu (geçmiş sezonlar)
CREATE TABLE IF NOT EXISTS cup_winners (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  season_number INTEGER NOT NULL,
  team_id UUID REFERENCES teams(id) ON DELETE SET NULL,
  team_name TEXT NOT NULL,
  won_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE cup_winners ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cupwinners_read_all" ON cup_winners;
CREATE POLICY "cupwinners_read_all" ON cup_winners FOR SELECT USING (true);

-- Kupa bracket oluşturma fonksiyonu
CREATE OR REPLACE FUNCTION generate_cup_bracket()
RETURNS JSONB AS $$
DECLARE
  all_team_ids UUID[];
  bracket_teams UUID[];
  match_count INTEGER;
  match_id UUID;
  i INTEGER;
  j INTEGER;
  round_num INTEGER;
  total_rounds INTEGER := 7;
  bye_count INTEGER;
BEGIN
  -- Tüm takımları rastgele sırala
  SELECT array_agg(id ORDER BY random()) INTO all_team_ids FROM teams;
  
  -- 128 takımlık bracket — ilk 128 takım al, gerisi elenir (bye yok, direkt 128)
  -- Aslında 216 takım var, 128'lik bracket için rastgele 128 seç
  bracket_teams := all_team_ids[1:128];
  
  -- Temizlik — eski kupa maçlarını sil
  DELETE FROM cup_matches;
  
  -- Round 1: 64 maç (128 takım)
  FOR i IN 0..63 LOOP
    INSERT INTO cup_matches (round_number, match_number, home_team_id, away_team_id, status)
    VALUES (1, i + 1, bracket_teams[i * 2 + 1], bracket_teams[i * 2 + 2], 'scheduled')
    RETURNING id INTO match_id;
  END LOOP;
  
  -- Round 2-7: boş maçlar oluştur (kazananlar dolduracak)
  FOR round_num IN 2..total_rounds LOOP
    match_count := 64 / power(2, round_num - 1);
    FOR i IN 1..match_count LOOP
      INSERT INTO cup_matches (round_number, match_number, status)
      VALUES (round_num, i, 'scheduled')
      RETURNING id INTO match_id;
      
      -- Next match bağlantısı — bu maçın kazananı hangi maça gider?
      IF round_num < total_rounds THEN
        -- Sonraki round'daki match_number = ceil(this_match_number / 2)
        j := ceil(i / 2.0);
        UPDATE cup_matches 
        SET next_match_id = (
          SELECT id FROM cup_matches WHERE round_number = round_num + 1 AND match_number = j LIMIT 1
        ),
        next_match_slot = CASE WHEN i % 2 = 1 THEN 'home' ELSE 'away' END
        WHERE id = match_id;
      END IF;
    END LOOP;
  END LOOP;
  
  RETURN jsonb_build_object('success', true, 'teams', 128, 'rounds', total_rounds);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Kupa maç sonucu kaydet + sonraki tura taşı
CREATE OR REPLACE FUNCTION record_cup_result(p_match_id UUID, p_home_score INTEGER, p_away_score INTEGER)
RETURNS JSONB AS $$
DECLARE
  match_record RECORD;
  winner_id UUID;
  next_match UUID;
  next_slot TEXT;
BEGIN
  SELECT * INTO match_record FROM cup_matches WHERE id = p_match_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('error', 'match not found'); END IF;
  
  -- Penaltı atışları — beraberlikte rastgele kazanan
  IF p_home_score = p_away_score THEN
    IF random() < 0.5 THEN
      winner_id := match_record.home_team_id;
    ELSE
      winner_id := match_record.away_team_id;
    END IF;
  ELSEIF p_home_score > p_away_score THEN
    winner_id := match_record.home_team_id;
  ELSE
    winner_id := match_record.away_team_id;
  END IF;
  
  -- Maç sonucunu kaydet
  UPDATE cup_matches 
  SET home_score = p_home_score, away_score = p_away_score, 
      status = 'finished', played_at = NOW()
  WHERE id = p_match_id;
  
  -- Sonraki tura taşı
  IF match_record.next_match_id IS NOT NULL THEN
    IF match_record.next_match_slot = 'home' THEN
      UPDATE cup_matches SET home_team_id = winner_id WHERE id = match_record.next_match_id;
    ELSE
      UPDATE cup_matches SET away_team_id = winner_id WHERE id = match_record.next_match_id;
    END IF;
  ELSE
    -- Final — kazananı cup_winners'a ekle
    INSERT INTO cup_winners (season_number, team_id, team_name)
    VALUES (1, winner_id, (SELECT name FROM teams WHERE id = winner_id));
  END IF;
  
  RETURN jsonb_build_object('success', true, 'winner', winner_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT 'migration_008_complete' AS status;
