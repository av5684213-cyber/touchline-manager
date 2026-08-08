-- =============================================================================
-- 039: pinned_bench kolonu — yedek kulübesine sabitlenmiş oyuncular
-- =============================================================================
-- v2.9.86: Kullanıcının yedek kulübesine pin'lediği oyuncu ID'leri.
-- Bu oyuncular rating'den bağımsız olarak maç kadrosu (ilk 7 yedek) içinde kalır.
-- JSONB array of player ID strings. Default '[]'.
-- =============================================================================

ALTER TABLE active_tactics
  ADD COLUMN IF NOT EXISTS pinned_bench JSONB DEFAULT '[]'::jsonb;

-- Mevcut satırlar için default değer ver
UPDATE active_tactics
SET pinned_bench = '[]'::jsonb
WHERE pinned_bench IS NULL;

SELECT 'migration_039_complete' AS status;
