-- =============================================================================
-- v2.9.65: Forum içerik bildirme sistemi
-- =============================================================================
-- Kullanıcılar uygunsuz forum başlık/cevaplarını bildirebilir
-- Admin/moderatör bildirilen içerikleri inceleyip silebilir
-- =============================================================================

CREATE TABLE IF NOT EXISTS forum_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  topic_id UUID REFERENCES forum_topics(id) ON DELETE CASCADE,
  reply_id UUID REFERENCES forum_replies(id) ON DELETE CASCADE,
  reason TEXT NOT NULL, -- 'spam', 'profanity', 'harassment', 'other'
  description TEXT,
  status TEXT DEFAULT 'pending', -- pending, reviewed, dismissed, actioned
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  -- Bir kullanıcı bir içeriği bir kez bildirebilir
  CONSTRAINT forum_reports_unique UNIQUE (reporter_id, topic_id, reply_id)
);

ALTER TABLE forum_reports ENABLE ROW LEVEL SECURITY;

-- Herkes kendi raporlarını okuyabilir
CREATE POLICY "forum_reports_read_own"
  ON forum_reports FOR SELECT
  USING (reporter_id = auth.uid());

-- Herkes rapor oluşturabilir
CREATE POLICY "forum_reports_insert_own"
  ON forum_reports FOR INSERT
  WITH CHECK (reporter_id = auth.uid());

-- Sadece kendi raporlarını silebilir (geri çekebilir)
CREATE POLICY "forum_reports_delete_own"
  ON forum_reports FOR DELETE
  USING (reporter_id = auth.uid());

-- UPDATE: sadece service role (admin inceleme için)
-- authenticated rolü UPDATE yapamaz

-- Index
CREATE INDEX IF NOT EXISTS idx_forum_reports_status ON forum_reports(status);
CREATE INDEX IF NOT EXISTS idx_forum_reports_topic ON forum_reports(topic_id);
CREATE INDEX IF NOT EXISTS idx_forum_reports_reply ON forum_reports(reply_id);
