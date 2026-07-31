-- =============================================================================
-- Touchline Manager — 023: Oyuncu Kart Limiti Sütunu (v2.9.46 GÖREV 6)
-- =============================================================================
-- v2.9.46 Görev 6: Oyuncu başına maksimum 2 kart limiti için sayaç sütunu.
--
-- Frontend'de Player.cardsAppliedCount?: number zaten var (TypeScript tipi).
-- Bu migration, players tablosuna karşılık gelen sütunu ekler.
--
-- Kural:
--   - Her oyuncuya toplam en fazla 2 kart basılabilir (pozitif trait + arketip +
--     negatif giderme toplamı)
--   - Sayaç sadece artar, azalmaz (kartlar kalıcı)
--   - 2'ye ulaşınca yeni kart uygulama engellenir
--
-- Varsayılan değer: 0 (yeni oyuncular)
-- Geriye dönük uyumluluk: mevcut oyuncular NULL yerine 0 görür (COALESCE)
-- =============================================================================

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS cards_applied_count INTEGER NOT NULL DEFAULT 0
  CHECK (cards_applied_count >= 0 AND cards_applied_count <= 2);

COMMENT ON COLUMN players.cards_applied_count IS
  'v2.9.46: Oyuncuya basılmış toplam kart sayısı (pozitif trait + arketip + negatif giderme). Maksimum 2. Sadece artar, azalmaz.';

-- =============================================================================
-- Geriye dönük uyumluluk: mevcut oyuncularda traits/archetype/negTraits varsa
-- cards_applied_count'u bunlardan hesapla (best-effort migration)
-- Bu, mevcut oyuncuların mevcut kart sayısını doğru yansıtır.
-- =============================================================================

-- Önce NULL veya eksik değerleri 0 yap
UPDATE players
SET cards_applied_count = 0
WHERE cards_applied_count IS NULL;

-- Mevcut oyuncularda traits array'inin uzunluğunu say
-- (her trait = 1 kart, archetype = 1 kart)
UPDATE players
SET cards_applied_count = LEAST(2,
  COALESCE(array_length(traits, 1), 0) +
  CASE WHEN archetype IS NOT NULL AND archetype != '' THEN 1 ELSE 0 END
)
WHERE cards_applied_count = 0
  AND (traits IS NOT NULL OR (archetype IS NOT NULL AND archetype != ''));

-- =============================================================================
-- İndeks — kart limiti kontrolü için
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_players_cards_applied_count
  ON players(cards_applied_count)
  WHERE cards_applied_count >= 2;
