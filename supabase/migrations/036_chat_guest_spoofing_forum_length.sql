-- =============================================================================
-- Touchline Manager — 036: Chat Guest Spoofing Fix + Forum Length Constraints (v2.9.73)
-- =============================================================================
-- 2 sorun:
--
-- 1. Chat guest spoofing (MEDIUM — RLS bypass)
--    Migration 033 policy: WITH CHECK (user_id = auth.uid()::text OR user_id LIKE 'guest_%')
--    Sorun: Authenticated kullanıcı user_id = 'guest_kurban' set edip kurbanın
--    rate limit kotasını tüketebilir veya guest olarak maskelebilir.
--    Çözüm: guest_% koşulu sadece anonim (auth.uid() IS NULL) isteklere özgü.
--    Ama Supabase RLS'de "anon" rolü farklıdır, authenticated kullanıcı anon
--    olarak gelmez. Bu yüzden guest_% koşulunu tamamen kaldırıyoruz —
--    authenticated kullanıcılar HER ZAMAN kendi auth.uid() kullanmalı.
--    Guest kullanıcılar chat'i kullanamaz (zaten match-chat.tsx'te isSupabaseConfigured
--    kontrolü var, dev modunda DB'ye yazılmıyor).
--
-- 2. Forum length constraints (MEDIUM — DB DoS)
--    Migration 020 forum_topics.title TEXT, body TEXT — CHECK yok.
--    UI maxLength=120 (title), 500 (body) ama modifiye client ile bypass.
--    1MB body POST'lanabilir.
--    Çözüm: CHECK constraint ekle (chat_messages migration 033 ile aynı pattern).
-- =============================================================================

-- ─── 1. Chat RLS policy güncelle ────────────────────────────────────────────

DROP POLICY IF EXISTS "chat_messages_insert_authenticated" ON chat_messages;
CREATE POLICY "chat_messages_insert_authenticated"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid()::text);

-- ─── 2. Forum length constraints ────────────────────────────────────────────

-- forum_topics: title max 120, body max 2000
ALTER TABLE forum_topics
  DROP CONSTRAINT IF EXISTS forum_topics_title_length;
ALTER TABLE forum_topics
  ADD CONSTRAINT forum_topics_title_length
  CHECK (length(title) > 0 AND length(title) <= 120);

ALTER TABLE forum_topics
  DROP CONSTRAINT IF EXISTS forum_topics_body_length;
ALTER TABLE forum_topics
  ADD CONSTRAINT forum_topics_body_length
  CHECK (length(body) > 0 AND length(body) <= 2000);

-- forum_replies: body max 1000
ALTER TABLE forum_replies
  DROP CONSTRAINT IF EXISTS forum_replies_body_length;
ALTER TABLE forum_replies
  ADD CONSTRAINT forum_replies_body_length
  CHECK (length(body) > 0 AND length(body) <= 1000);

-- ─── 3. Mevcut veriyi kontrol et (constraint eklemeden önce truncate gerekirse) ─
-- Eğer tabloda çok uzun kayıtlar varsa, constraint eklenirken hata fırlar.
-- Supabase SQL editor'da çalıştırınca hata görürseniz, aşağıdaki sorguyla
-- uzun kayıtları tespit edip temizleyin:
-- SELECT id, length(title), length(body) FROM forum_topics WHERE length(title) > 120 OR length(body) > 2000;
-- SELECT id, length(body) FROM forum_replies WHERE length(body) > 1000;

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "chat_messages_insert_authenticated" ON chat_messages;
-- CREATE POLICY "chat_messages_insert_authenticated"
--   ON chat_messages FOR INSERT TO authenticated
--   WITH CHECK (user_id = auth.uid()::text OR user_id LIKE 'guest_%');
-- ALTER TABLE forum_topics DROP CONSTRAINT IF EXISTS forum_topics_title_length;
-- ALTER TABLE forum_topics DROP CONSTRAINT IF EXISTS forum_topics_body_length;
-- ALTER TABLE forum_replies DROP CONSTRAINT IF EXISTS forum_replies_body_length;
