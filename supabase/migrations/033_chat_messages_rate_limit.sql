-- =============================================================================
-- Touchline Manager — 033: Chat Messages Rate-Limit (v2.9.72)
-- =============================================================================
-- Sorun: match-chat.tsx'te rate-limit sadece client-side (in-memory array).
--   - Sayfa yenilenince temizlenir
--   - Çoklu tab/modified client bypass eder
--   - Devtools ile direkt channel.send() çağrılabilir
--
-- Çözüm: chat_messages tablosu + BEFORE INSERT trigger ile sunucu tarafında
-- rate-limit (60 saniyede max 10 mesaj). Mesaj broadcast için Supabase
-- Realtime kullanılmaya devam eder, ama önce DB'ye yazılır — trigger
-- reddederse broadcast yapılmaz (client hatayı yakalar, UI'da gösterir).
--
-- Not: Mesajlar 24 saat sonra otomatik silinir (pg_cron job) — sadece
-- rate-limit ve report lookup için tutulur, uzun süreli saklama yok.
-- =============================================================================

-- ─── 1. chat_messages tablosu ────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Eski match_id'ler için index (rate-limit sorgusu)
CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
  ON chat_messages (user_id, created_at DESC);

-- Match bazlı mesaj listesi (replay/report lookup için)
CREATE INDEX IF NOT EXISTS idx_chat_messages_match_created
  ON chat_messages (match_id, created_at DESC);

-- ─── 2. RLS politikaları ─────────────────────────────────────────────────────
-- Sadece authenticated kullanıcılar yazabilir, kendi mesajlarını silebilir.
-- Okuma: authenticated kullanıcılar (report lookup için moderatör erişimi).

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select_authenticated" ON chat_messages;
CREATE POLICY "chat_messages_select_authenticated"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "chat_messages_insert_authenticated" ON chat_messages;
CREATE POLICY "chat_messages_insert_authenticated"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR user_id LIKE 'guest_%');

DROP POLICY IF EXISTS "chat_messages_delete_own" ON chat_messages;
CREATE POLICY "chat_messages_delete_own"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (user_id = auth.uid()::text);

-- ─── 3. Rate-limit trigger ──────────────────────────────────────────────────
-- 60 saniyede max 10 mesaj (match-chat.tsx'teki client-side limit ile aynı).
-- Trigger BEFORE INSERT — exception fırlatır, insert reddedilir.

CREATE OR REPLACE FUNCTION check_chat_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
  max_count    INTEGER := 10;
  window_sec   INTEGER := 60;
BEGIN
  -- Son 60 saniyede kaç mesaj göndermiş?
  SELECT COUNT(*) INTO recent_count
  FROM chat_messages
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - (window_sec || ' seconds')::INTERVAL;

  IF recent_count >= max_count THEN
    RAISE EXCEPTION 'Rate limit exceeded: max % messages per % seconds',
      max_count, window_sec
      USING ERRCODE = '42901'; -- custom error code (too_many_requests benzeri)
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_chat_rate_limit ON chat_messages;
CREATE TRIGGER trg_chat_rate_limit
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_chat_rate_limit();

COMMENT ON FUNCTION check_chat_rate_limit IS 'v2.9.72: Chat rate-limit (10 msg/60s)';

-- ─── 4. Mesaj uzunluk kontrolü (trigger yerine CHECK constraint) ────────────
-- 200 karakter limiti UI'da zaten var, ama DB seviyesinde de garanti edelim.

ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_message_length;
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_message_length
  CHECK (length(message) > 0 AND length(message) <= 200);

ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_user_name_length;
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_user_name_length
  CHECK (length(user_name) > 0 AND length(user_name) <= 50);

-- ─── 5. Otomatik temizlik (24 saat önceki mesajları sil) ────────────────────
-- pg_cron gerekir (Supabase Dashboard → Database → Extensions → pg_cron).
-- Her saat başı çalışır, 24 saatten eski mesajları siler.

-- NOT: pg_cron extension zaten kurulu mu kontrol et
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-chat-messages-hourly',
      '0 * * * *',
      $$DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '24 hours'$$
    );
    RAISE NOTICE 'pg_cron job scheduled: cleanup-chat-messages-hourly';
  ELSE
    RAISE NOTICE 'pg_cron not installed — manual cleanup needed (or install pg_cron extension)';
  END IF;
END $$;

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- Geri almak için:
-- DROP TRIGGER IF EXISTS trg_chat_rate_limit ON chat_messages;
-- DROP FUNCTION IF EXISTS check_chat_rate_limit();
-- DROP TABLE IF EXISTS chat_messages CASCADE;
-- (cron job'u kaldırmak için:)
-- SELECT cron.unschedule('cleanup-chat-messages-hourly');
