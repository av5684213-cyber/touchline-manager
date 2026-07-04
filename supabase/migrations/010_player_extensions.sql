-- 010_player_extensions.sql
-- Oyuncu tablosuna eksik kolonlar ekle

-- Maçın Adamı ödül sayısı
ALTER TABLE players ADD COLUMN IF NOT EXISTS motm_awards INTEGER DEFAULT 0;

-- Kariyer sezon geçmişi (JSON array)
ALTER TABLE players ADD COLUMN IF NOT EXISTS season_history JSONB DEFAULT '[]'::jsonb;

-- Mevcut sezon gol türü dağılımı
ALTER TABLE players ADD COLUMN IF NOT EXISTS goals_right INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS goals_left INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS goals_head INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS goals_penalty INTEGER DEFAULT 0;
ALTER TABLE players ADD COLUMN IF NOT EXISTS goals_freekick INTEGER DEFAULT 0;

-- Sakatlık bilgisi
ALTER TABLE players ADD COLUMN IF NOT EXISTS is_injured BOOLEAN DEFAULT FALSE;
ALTER TABLE players ADD COLUMN IF NOT EXISTS injury_type TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS injury_remaining_days INTEGER DEFAULT 0;

-- İkincil mevki
ALTER TABLE players ADD COLUMN IF NOT EXISTS secondary_positions TEXT[];

-- Oyun stili
ALTER TABLE players ADD COLUMN IF NOT EXISTS play_style TEXT;
ALTER TABLE players ADD COLUMN IF NOT EXISTS archetype TEXT;

-- Kişilik özellikleri
ALTER TABLE players ADD COLUMN IF NOT EXISTS personality_traits TEXT[];

-- Maç değerlendirmeleri (son 10 maç)
ALTER TABLE players ADD COLUMN IF NOT EXISTS match_ratings JSONB DEFAULT '[]'::jsonb;
ALTER TABLE players ADD COLUMN IF NOT EXISTS last_match_rating REAL;

-- Comment
COMMENT ON COLUMN players.motm_awards IS 'Maçın Adamı ödül sayısı (kariyer)';
COMMENT ON COLUMN players.season_history IS 'Sezon sezon kariyer istatistikleri (JSON array)';
COMMENT ON COLUMN players.goals_right IS 'Mevcut sezon sağ ayak golleri';
COMMENT ON COLUMN players.goals_left IS 'Mevcut sezon sol ayak golleri';
COMMENT ON COLUMN players.goals_head IS 'Mevcut sezon kafa golleri';
COMMENT ON COLUMN players.goals_penalty IS 'Mevcut sezon penaltı golleri';
COMMENT ON COLUMN players.goals_freekick IS 'Mevcut sezon serbest vuruş golleri';
