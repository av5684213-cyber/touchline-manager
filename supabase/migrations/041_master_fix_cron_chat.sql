-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.152: MASTER FIX — pg_cron + chat_messages cron (vault'SIZ)
-- ════════════════════════════════════════════════════════════════════════════
-- DİKKAT: vault extension yeni Supabase projelerinde YOK.
-- service_role key artık database setting olarak saklanır:
--   ALTER DATABASE postgres SET app.supabase_service_role_key = 'eyJ...';
-- Cron job'lar current_setting('app.supabase_service_role_key') ile okur.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) EXTENSIONS (vault HARİÇ — dashboard'dan kurulmalı ya da atlanabilir) ═
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
-- vault: Eğer Dashboard → Extensions'da görünüyorsa kur, yoksa atla — gerek yok

-- ─── 2) chat_messages tablosu ════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    TEXT NOT NULL,
  user_id     TEXT NOT NULL,
  user_name   TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user_created
  ON chat_messages (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_match_created
  ON chat_messages (match_id, created_at DESC);

ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select_authenticated" ON chat_messages;
CREATE POLICY "chat_messages_select_authenticated"
  ON chat_messages FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "chat_messages_insert_authenticated" ON chat_messages;
CREATE POLICY "chat_messages_insert_authenticated"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid()::text OR user_id LIKE 'guest_%');

DROP POLICY IF EXISTS "chat_messages_delete_own" ON chat_messages;
CREATE POLICY "chat_messages_delete_own"
  ON chat_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid()::text);

-- ─── 3) Rate-limit trigger (10 mesaj / 60 saniye) ════════════════════════════
CREATE OR REPLACE FUNCTION check_chat_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INTEGER;
  max_count    INTEGER := 10;
  window_sec   INTEGER := 60;
BEGIN
  SELECT COUNT(*) INTO recent_count
  FROM chat_messages
  WHERE user_id = NEW.user_id
    AND created_at > NOW() - (window_sec || ' seconds')::INTERVAL;

  IF recent_count >= max_count THEN
    RAISE EXCEPTION 'Rate limit exceeded: max % messages per % seconds',
      max_count, window_sec;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_chat_rate_limit ON chat_messages;
CREATE TRIGGER trg_chat_rate_limit
  BEFORE INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION check_chat_rate_limit();

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_length;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_length
  CHECK (length(message) > 0 AND length(message) <= 200);

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_name_length;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_name_length
  CHECK (length(user_name) > 0 AND length(user_name) <= 50);

-- ─── 4) Cron job: saatlik chat temizliği (24 saat önceki mesajları sil) ════
DO $cron_block$
DECLARE
  v_cmd TEXT;
BEGIN
  BEGIN
    PERFORM cron.unschedule('cleanup-chat-messages-hourly');
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  v_cmd := 'DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL ''24 hours''';

  PERFORM cron.schedule(
    'cleanup-chat-messages-hourly',
    '0 * * * *',
    v_cmd
  );
  RAISE NOTICE 'cron job scheduled: cleanup-chat-messages-hourly';
END $cron_block$;

-- ════════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA
-- ════════════════════════════════════════════════════════════════════════════

SELECT 'EXTENSION: pg_cron' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'EXTENSION: http' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http')
       THEN '✅ var' ELSE '❌ EKSİK — Dashboard → Extensions → http → Install' END AS status;
SELECT 'EXTENSION: uuid-ossp' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'EXTENSION: vault' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vault')
       THEN '✅ var' ELSE '⚠️ YOK — gerek yok, current_setting() kullanıyoruz' END AS status;

SELECT 'TABLE: chat_messages' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'RLS: chat_messages enabled' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chat_messages' AND rowsecurity = true)
       THEN '✅ enabled' ELSE '❌ EKSİK' END AS status;
SELECT 'TRIGGER: trg_chat_rate_limit' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chat_rate_limit')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'CRON: cleanup-chat-messages-hourly' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-chat-messages-hourly')
       THEN '✅ scheduled' ELSE '❌ NOT SCHEDULED' END AS status;

SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
