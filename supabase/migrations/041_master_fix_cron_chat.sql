-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.151: MASTER FIX — pg_cron + vault + chat_messages cron job
-- ════════════════════════════════════════════════════════════════════════════
-- Bu SQL'i Supabase Dashboard → SQL Editor → New query → yapıştır → Run yap.
--
-- 3 şey yapar:
--   1. pg_cron + vault + http + uuid-ossp extension'larını aktif eder
--   2. chat_messages tablosu yoksa oluşturur (migration 033 içerik)
--   3. chat mesajlarını 24 saatte bir silen cron job'u schedule eder
--
-- Service_role key cron job'ları (migration 030) AYRI olarak çalıştırılmalı —
-- çünkü vault.create_secret manuel olarak service_role key ister. O SQL en sonda.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) EXTENSIONS ═════════════════════════════════════════════════════════
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS vault;
-- Supabase vault (vault.decrypted_secrets view'ı) — service_role key saklamak için

-- ─── 2) chat_messages tablosu (yoksa oluştur) ══════════════════════════════
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

-- RLS
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

-- ─── 3) Rate-limit trigger (10 mesaj / 60 saniye) ══════════════════════════
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

-- Uzunluk kısıtları (200 char max message, 50 char max user_name)
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_message_length;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_message_length
  CHECK (length(message) > 0 AND length(message) <= 200);

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_name_length;
ALTER TABLE chat_messages ADD CONSTRAINT chat_messages_user_name_length
  CHECK (length(user_name) > 0 AND length(user_name) <= 50);

-- ─── 4) Cron job: saatlik chat temizliği (24 saat önceki mesajları sil) ════
DO $$
BEGIN
  -- Eski job varsa unschedule et (idempotent)
  BEGIN
    PERFORM cron.unschedule('cleanup-chat-messages-hourly');
  EXCEPTION WHEN OTHERS THEN
    NULL; -- job yoksa hata atar, görmezden gel
  END;

  -- Yeni job schedule et — her saat başı
  PERFORM cron.schedule(
    'cleanup-chat-messages-hourly',
    '0 * * * *',
    $$DELETE FROM chat_messages WHERE created_at < NOW() - INTERVAL '24 hours'$$
  );
  RAISE NOTICE '✅ cron job scheduled: cleanup-chat-messages-hourly';
END $$;

-- ════════════════════════════════════════════════════════════════════════════
-- DOĞRULAMA — aşağıdaki SELECT'leri çalıştırıp durumu kontrol et
-- ════════════════════════════════════════════════════════════════════════════

-- Extension'lar kurulu mu?
SELECT 'EXTENSION: pg_cron' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'EXTENSION: vault' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vault')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'EXTENSION: http' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'EXTENSION: pg_net' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_net')
       THEN '✅ var' ELSE '⚠️ opsiyonel (vault olmadan)' END AS status;

-- chat_messages tablosu + RLS?
SELECT 'TABLE: chat_messages' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;
SELECT 'RLS: chat_messages enabled' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chat_messages' AND rowsecurity = true)
       THEN '✅ enabled' ELSE '❌ EKSİK' END AS status;

-- Trigger var mı?
SELECT 'TRIGGER: trg_chat_rate_limit' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_chat_rate_limit')
       THEN '✅ var' ELSE '❌ EKSİK' END AS status;

-- Cron job'lar schedule edildi mi?
SELECT 'CRON: cleanup-chat-messages-hourly' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-chat-messages-hourly')
       THEN '✅ scheduled' ELSE '❌ NOT SCHEDULED' END AS status;

-- Aktif cron job'ları listele (görsel doğrulama)
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
