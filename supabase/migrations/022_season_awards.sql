-- =============================================================================
-- Touchline Manager — 022: Sezon Ödülleri Sistemi (v2.9.46 GÖREV 3)
-- =============================================================================
-- v2.9.46 Görev 3: Oyuncu bazlı sezon ödüllerinin kalıcı (kariyerlik) kaydı.
--
-- Frontend'de Player.seasonAwards: SeasonAward[] alanı zaten var (TypeScript tipi).
-- Bu migration, Supabase tarafında aynı veriyi saklayacak tabloyu oluşturur.
--
-- Tablo: player_season_awards
--   - Her oyuncunun her sezon için aldığı ödüller (top_scorer, mvp, league_champion vb.)
--   - playerId + seasonNumber + awardType unique (aynı sezon+tip için tek kayıt)
--   - rank: 1 (birinci), 2 (ikinci), 3 (üçüncü)
--   - country + leagueTier: ödülün verildiği ülke/lig (kariyer geçmişinde filtreleme için)
--   - clubName: ödül kazanıldığı kulüp (transfer geçmişi için)
--
-- Kullanım:
--   - endSeason (store.ts) her sezon sonunda bu tabloya INSERT yapar
--   - player-profile-modal AchievementsTab bu tablodan SELECT yapar
--   - top-scorers ekranı geçmiş sezonların gol krallarını buradan gösterebilir
-- =============================================================================

CREATE TABLE IF NOT EXISTS player_season_awards (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  -- v2.9.46: seasonNumber basit sayı (1, 2, 3, ...) — seasonId karmaşık değil
  season_number INTEGER NOT NULL,
  season_label TEXT NOT NULL, -- "2024/25" gibi okunabilir etiket
  award_type TEXT NOT NULL CHECK (
    award_type IN (
      'top_scorer',
      'top_assist',
      'mvp',
      'best_goalkeeper',
      'most_motm',
      'most_appearances',
      'league_champion',
      'cup_champion',
      'champions_league_winner'
    )
  ),
  rank SMALLINT NOT NULL CHECK (rank >= 1 AND rank <= 3),
  stat_value NUMERIC(10,2) NOT NULL DEFAULT 0,
  -- Ödülün verildiği ülke/lig (kariyer geçmişinde filtreleme için)
  country TEXT NOT NULL DEFAULT 'TR',
  league_tier SMALLINT NOT NULL DEFAULT 2 CHECK (league_tier >= 1 AND league_tier <= 4),
  club_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  -- Aynı oyuncu + sezon + ödül tipi için tek kayıt (unique)
  UNIQUE (player_id, season_number, award_type)
);

-- İndeksler
CREATE INDEX IF NOT EXISTS idx_player_season_awards_player
  ON player_season_awards(player_id);

CREATE INDEX IF NOT EXISTS idx_player_season_awards_season
  ON player_season_awards(season_number DESC);

CREATE INDEX IF NOT EXISTS idx_player_season_awards_type
  ON player_season_awards(award_type, season_number DESC);

CREATE INDEX IF NOT EXISTS idx_player_season_awards_country
  ON player_season_awards(country, league_tier, season_number DESC);

-- =============================================================================
-- RLS — oyuncular kendi ödüllerini okuyabilir; yazma sadece server-side (service role)
-- =============================================================================

ALTER TABLE player_season_awards ENABLE ROW LEVEL SECURITY;

-- Okuma: herkes (ödüller herkese açık — kariyer geçmişi görüntülenebilmeli)
DROP POLICY IF EXISTS "player_season_awards_select_all" ON player_season_awards;
CREATE POLICY "player_season_awards_select_all"
  ON player_season_awards FOR SELECT
  USING (true);

-- Yazma: sadece service role (endSeason server-side çalışır)
-- auth.uid() ile yazma izni yok — tüm yazma backend'den gelir
DROP POLICY IF EXISTS "player_season_awards_insert_service_only" ON player_season_awards;
CREATE POLICY "player_season_awards_insert_service_only"
  ON player_season_awards FOR INSERT
  WITH CHECK (false); -- client-side INSERT engellendi

-- Güncelleme: yalnızca service role
DROP POLICY IF EXISTS "player_season_awards_update_none" ON player_season_awards;
CREATE POLICY "player_season_awards_update_none"
  ON player_season_awards FOR UPDATE
  USING (false);

-- Silme: yalnızca service role
DROP POLICY IF EXISTS "player_season_awards_delete_none" ON player_season_awards;
CREATE POLICY "player_season_awards_delete_none"
  ON player_season_awards FOR DELETE
  USING (false);

-- =============================================================================
-- Açıklama
-- =============================================================================
COMMENT ON TABLE player_season_awards IS
  'v2.9.46: Oyuncu bazlı sezon ödüllerinin kalıcı (kariyerlik) kaydı. Her sezon sonunda endSeason tarafından yazılır.';

COMMENT ON COLUMN player_season_awards.award_type IS
  'Ödül kategorisi: top_scorer, top_assist, mvp, best_goalkeeper, most_motm, most_appearances, league_champion, cup_champion, champions_league_winner';

COMMENT ON COLUMN player_season_awards.stat_value IS
  'Ödülün temel aldığı istatistik (gol sayısı, asist sayısı, form rating, saves vb.)';

COMMENT ON COLUMN player_season_awards.country IS
  'Ödülün verildiği ülke (TR, DE, FR vb.) veya INT (uluslararası — Şampiyonlar Ligi)';
