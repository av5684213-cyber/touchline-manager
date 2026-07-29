-- =============================================================================
-- Touchline Manager — 020: Forum Sistemi
-- =============================================================================
-- v2.9.32: Kulüpler arası forum — başlık açma + cevap yazma
--
-- forum_topics: başlıklar (title, body, category, author bilgileri)
-- forum_replies: cevaplar (topic_id, body, author bilgileri)
--
-- RLS: Herkes okur, sadece giriş yapmış kullanıcılar yazar.
-- Silme: Sadece kendi başlığını/cevabını silebilir.
-- =============================================================================

-- ─── FORUM_TOPICS ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_topics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_team_name TEXT NOT NULL DEFAULT 'Anonim',
  author_team_short TEXT NOT NULL DEFAULT '???',
  author_team_color TEXT NOT NULL DEFAULT '#1a3a2a',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  reply_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_topics_created ON forum_topics(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_forum_topics_category ON forum_topics(category);

ALTER TABLE forum_topics ENABLE ROW LEVEL SECURITY;

-- Herkes okur
DROP POLICY IF EXISTS "forum_topics_read_all" ON forum_topics;
CREATE POLICY "forum_topics_read_all" ON forum_topics FOR SELECT USING (true);

-- Sadece giriş yapmış kullanıcılar yazar
DROP POLICY IF EXISTS "forum_topics_insert_auth" ON forum_topics;
CREATE POLICY "forum_topics_insert_auth" ON forum_topics
  FOR INSERT WITH CHECK (author_id = auth.uid());

-- Sadece kendi başlığını günceller/siler
DROP POLICY IF EXISTS "forum_topics_update_own" ON forum_topics;
CREATE POLICY "forum_topics_update_own" ON forum_topics
  FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "forum_topics_delete_own" ON forum_topics;
CREATE POLICY "forum_topics_delete_own" ON forum_topics
  FOR DELETE USING (author_id = auth.uid());

-- ─── FORUM_REPLIES ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS forum_replies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  topic_id UUID NOT NULL REFERENCES forum_topics(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author_team_name TEXT NOT NULL DEFAULT 'Anonim',
  author_team_short TEXT NOT NULL DEFAULT '???',
  author_team_color TEXT NOT NULL DEFAULT '#1a3a2a',
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_topic ON forum_replies(topic_id, created_at);

ALTER TABLE forum_replies ENABLE ROW LEVEL SECURITY;

-- Herkes okur
DROP POLICY IF EXISTS "forum_replies_read_all" ON forum_replies;
CREATE POLICY "forum_replies_read_all" ON forum_replies FOR SELECT USING (true);

-- Sadece giriş yapmış kullanıcılar yazar
DROP POLICY IF EXISTS "forum_replies_insert_auth" ON forum_replies;
CREATE POLICY "forum_replies_insert_auth" ON forum_replies
  FOR INSERT WITH CHECK (author_id = auth.uid());

-- Sadece kendi cevabını günceller/siler
DROP POLICY IF EXISTS "forum_replies_update_own" ON forum_replies;
CREATE POLICY "forum_replies_update_own" ON forum_replies
  FOR UPDATE USING (author_id = auth.uid());

DROP POLICY IF EXISTS "forum_replies_delete_own" ON forum_replies;
CREATE POLICY "forum_replies_delete_own" ON forum_replies
  FOR DELETE USING (author_id = auth.uid());

-- ─── TRIGGER: reply_count otomatik güncelle ────────────────────────────────
CREATE OR REPLACE FUNCTION update_forum_topic_reply_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE forum_topics SET reply_count = reply_count + 1, updated_at = NOW() WHERE id = NEW.topic_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE forum_topics SET reply_count = GREATEST(0, reply_count - 1) WHERE id = OLD.topic_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_forum_replies_count ON forum_replies;
CREATE TRIGGER trg_forum_replies_count
  AFTER INSERT OR DELETE ON forum_replies
  FOR EACH ROW EXECUTE FUNCTION update_forum_topic_reply_count();

-- ─── Realtime ───────────────────────────────────────────────────────────────
ALTER TABLE forum_topics REPLICA IDENTITY FULL;
ALTER TABLE forum_replies REPLICA IDENTITY FULL;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE forum_topics;
EXCEPTION WHEN OTHERS THEN null; END $$;

DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE forum_replies;
EXCEPTION WHEN OTHERS THEN null; END $$;

-- ─── Bilgi amaçlı ───────────────────────────────────────────────────────────
-- Test:
--   SELECT * FROM forum_topics ORDER BY created_at DESC LIMIT 10;
--   SELECT * FROM forum_replies WHERE topic_id = 'TOPIC_UUID' ORDER BY created_at;
