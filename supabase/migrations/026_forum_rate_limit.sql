-- =============================================================================
-- Touchline Manager — 026: Forum Rate-Limit (v2.9.53)
-- =============================================================================
-- Aynı kullanıcı için ardışık gönderiler arasında minimum süre kısıtı:
--   - forum_topics: 30 saniye
--   - forum_replies: 10 saniye
--
-- Postgres trigger ile uygulanır — client'ta sadece hata mesajı gösterilir.
-- Gerçek kısıtlama sunucuda (RLS/trigger seviyesinde).
-- =============================================================================

-- ─── 1. forum_topics rate-limit trigger ─────────────────────────────────────

CREATE OR REPLACE FUNCTION check_topic_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  last_topic_time TIMESTAMPTZ;
  min_interval INTERVAL := INTERVAL '30 seconds';
BEGIN
  SELECT created_at INTO last_topic_time
  FROM forum_topics
  WHERE author_id = NEW.author_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_topic_time IS NOT NULL AND (NOW() - last_topic_time) < min_interval THEN
    RAISE EXCEPTION 'Rate limit exceeded: minimum 30 seconds between topics';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_topic_rate_limit ON forum_topics;
CREATE TRIGGER trg_topic_rate_limit
  BEFORE INSERT ON forum_topics
  FOR EACH ROW
  EXECUTE FUNCTION check_topic_rate_limit();

-- ─── 2. forum_replies rate-limit trigger ────────────────────────────────────

CREATE OR REPLACE FUNCTION check_reply_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  last_reply_time TIMESTAMPTZ;
  min_interval INTERVAL := INTERVAL '10 seconds';
BEGIN
  SELECT created_at INTO last_reply_time
  FROM forum_replies
  WHERE author_id = NEW.author_id
  ORDER BY created_at DESC
  LIMIT 1;

  IF last_reply_time IS NOT NULL AND (NOW() - last_reply_time) < min_interval THEN
    RAISE EXCEPTION 'Rate limit exceeded: minimum 10 seconds between replies';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_reply_rate_limit ON forum_replies;
CREATE TRIGGER trg_reply_rate_limit
  BEFORE INSERT ON forum_replies
  FOR EACH ROW
  EXECUTE FUNCTION check_reply_rate_limit();

COMMENT ON FUNCTION check_topic_rate_limit IS 'v2.9.53: Forum topic rate-limit (30s minimum)';
COMMENT ON FUNCTION check_reply_rate_limit IS 'v2.9.53: Forum reply rate-limit (10s minimum)';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- Geri almak için:
-- DROP TRIGGER IF EXISTS trg_topic_rate_limit ON forum_topics;
-- DROP TRIGGER IF EXISTS trg_reply_rate_limit ON forum_replies;
-- DROP FUNCTION IF EXISTS check_topic_rate_limit();
-- DROP FUNCTION IF EXISTS check_reply_rate_limit();
