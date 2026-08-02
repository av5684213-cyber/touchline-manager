-- =============================================================================
-- v2.9.70: forum_reports UNIQUE constraint fix + partial indexes
-- =============================================================================
-- Mevcut UNIQUE constraint NULL'larla çalışmıyor (SQL'de NULL'lar distinct sayılır)
-- Aynı kullanıcı aynı başlığı sınırsız raporlayabilir.
-- Çözüm: Partial unique indexes
-- =============================================================================

-- Eski constraint'i kaldır
ALTER TABLE forum_reports DROP CONSTRAINT IF EXISTS forum_reports_unique;

-- Partial unique index — topic raporları için (reply_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS forum_reports_unique_topic
  ON forum_reports(reporter_id, topic_id)
  WHERE reply_id IS NULL AND topic_id IS NOT NULL;

-- Partial unique index — reply raporları için (topic_id NULL)
CREATE UNIQUE INDEX IF NOT EXISTS forum_reports_unique_reply
  ON forum_reports(reporter_id, reply_id)
  WHERE topic_id IS NULL AND reply_id IS NOT NULL;
