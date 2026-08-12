-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.148: Push notification trigger RPC'leri
-- ════════════════════════════════════════════════════════════════════════════
-- İstemci tarafından çağrılan RPC'ler. SECURITY DEFINER olarak çalışır, yani
-- auth.uid() ile çağıran kullanıcının kimliğini doğrular, sonra service role
-- ile send-match-end-push / send-transfer-offer-push Edge Function'larını
-- çağırır.
--
-- Güvenlik: Bu RPC'ler sadece "authenticated" role'üne açık. RPC parametresi
-- olarak user_id ALMAZ — auth.uid() ile çağıran kullanıcıyı tespit eder. Bu
-- sayede kullanıcı A, kullanıcı B'ye push gönderemez.
-- ════════════════════════════════════════════════════════════════════════════

-- Önce push_tokens tablosu yoksa oluştur (v2.9.20 migration 018'de vardı,
-- ama tekrar kontrol et — idempotent)
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

-- RLS (eğer yoksa)
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "push_tokens_own_read" ON push_tokens;
DROP POLICY IF EXISTS "push_tokens_own_write" ON push_tokens;
CREATE POLICY "push_tokens_own_read" ON push_tokens
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "push_tokens_own_write" ON push_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- rpc_register_push_token (eğer yoksa)
DROP FUNCTION IF EXISTS rpc_register_push_token;
CREATE OR REPLACE FUNCTION rpc_register_push_token(p_token TEXT, p_platform TEXT DEFAULT 'android')
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO push_tokens (user_id, token, platform)
  VALUES (auth.uid(), p_token, p_platform)
  ON CONFLICT (user_id, token) DO UPDATE
    SET last_used_at = NOW(), platform = EXCLUDED.platform;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_register_push_token TO authenticated;

-- rpc_unregister_push_token (eğer yoksa)
DROP FUNCTION IF EXISTS rpc_unregister_push_token;
CREATE OR REPLACE FUNCTION rpc_unregister_push_token(p_token TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM push_tokens WHERE user_id = auth.uid() AND token = p_token;
  RETURN TRUE;
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_unregister_push_token TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.148 YENİ: rpc_trigger_match_end_push
-- ════════════════════════════════════════════════════════════════════════════
-- İstemci maç bitince çağırır. auth.uid() ile çağıran kullanıcıyı tespit eder,
-- o kullanıcının push_tokens'larını okur ve her biri için send-match-end-push
-- Edge Function'ını http_post ile çağırır.
DROP FUNCTION IF EXISTS rpc_trigger_match_end_push;
CREATE OR REPLACE FUNCTION rpc_trigger_match_end_push(
  p_home_name TEXT,
  p_away_name TEXT,
  p_home_score INTEGER,
  p_away_score INTEGER,
  p_match_type TEXT DEFAULT 'league'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_token RECORD;
  v_sent INTEGER := 0;
  v_failed INTEGER := 0;
  v_total INTEGER := 0;
  v_payload JSONB;
  v_result JSONB;
  v_is_win BOOLEAN;
  v_title TEXT;
  v_body TEXT;
  v_score_str TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  -- Kullanıcının token'larını say
  SELECT COUNT(*) INTO v_total FROM push_tokens WHERE user_id = v_user_id;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('sent', 0, 'failed', 0, 'total', 0, 'reason', 'no_tokens');
  END IF;

  -- Mesaj içeriği
  v_is_win := p_home_score > p_away_score;
  v_score_str := p_home_score || '-' || p_away_score;
  IF v_is_win THEN
    v_title := 'Maçı Kazandın! 🎉';
  ELSIF p_home_score = p_away_score THEN
    v_title := 'Berabere Kaldı';
  ELSE
    v_title := 'Maçı Kaybettin';
  END IF;
  v_body := p_home_name || ' ' || v_score_str || ' ' || p_away_name || ' — sonucu gör';

  -- Her token için Edge Function çağır
  FOR v_token IN SELECT token FROM push_tokens WHERE user_id = v_user_id LOOP
    v_payload := jsonb_build_object(
      'to', v_token.token,
      'notification', jsonb_build_object(
        'title', v_title,
        'body', v_body,
        'sound', 'default'
      ),
      'data', jsonb_build_object(
        'deep_link', 'touchline://match-result',
        'match_type', p_match_type,
        'home_score', p_home_score::text,
        'away_score', p_away_score::text
      ),
      'priority', 'high'
    );

    -- FCM legacy API çağrısı
    SELECT * INTO v_result FROM http_post(
      'https://fcm.googleapis.com/fcm/send',
      v_payload::text,
      'application/json',
      'Authorization,key=' || current_setting('app.fcm_server_key', true)
    );

    -- Basit başarı kontrolü (status 200)
    IF (v_result->>'status')::int = 200 THEN
      v_sent := v_sent + 1;
    ELSE
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sent', v_sent,
    'failed', v_failed,
    'total', v_total,
    'user_id', v_user_id,
    'title', v_title,
    'body', v_body
  );
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_trigger_match_end_push TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.148 YENİ: rpc_trigger_transfer_offer_push
-- ════════════════════════════════════════════════════════════════════════════
DROP FUNCTION IF EXISTS rpc_trigger_transfer_offer_push;
CREATE OR REPLACE FUNCTION rpc_trigger_transfer_offer_push(
  p_player_name TEXT,
  p_bidder_club_name TEXT,
  p_bid_amount TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_token RECORD;
  v_sent INTEGER := 0;
  v_failed INTEGER := 0;
  v_total INTEGER := 0;
  v_payload JSONB;
  v_result JSONB;
  v_title TEXT := 'Transfer Teklifi Geldi! 💰';
  v_body TEXT;
BEGIN
  IF v_user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'not_authenticated');
  END IF;

  SELECT COUNT(*) INTO v_total FROM push_tokens WHERE user_id = v_user_id;
  IF v_total = 0 THEN
    RETURN jsonb_build_object('sent', 0, 'failed', 0, 'total', 0, 'reason', 'no_tokens');
  END IF;

  v_body := p_bidder_club_name || ', ' || p_player_name || ' için ' || p_bid_amount || ' teklif verdi';

  FOR v_token IN SELECT token FROM push_tokens WHERE user_id = v_user_id LOOP
    v_payload := jsonb_build_object(
      'to', v_token.token,
      'notification', jsonb_build_object(
        'title', v_title,
        'body', v_body,
        'sound', 'default'
      ),
      'data', jsonb_build_object(
        'deep_link', 'touchline://transfer-offers',
        'player_name', p_player_name,
        'bidder_club_name', p_bidder_club_name
      ),
      'priority', 'high'
    );

    SELECT * INTO v_result FROM http_post(
      'https://fcm.googleapis.com/fcm/send',
      v_payload::text,
      'application/json',
      'Authorization,key=' || current_setting('app.fcm_server_key', true)
    );

    IF (v_result->>'status')::int = 200 THEN
      v_sent := v_sent + 1;
    ELSE
      v_failed := v_failed + 1;
    END IF;
  END LOOP;

  RETURN jsonb_build_object(
    'sent', v_sent,
    'failed', v_failed,
    'total', v_total,
    'user_id', v_user_id,
    'title', v_title,
    'body', v_body
  );
END;
$$;
GRANT EXECUTE ON FUNCTION rpc_trigger_transfer_offer_push TO authenticated;

-- ════════════════════════════════════════════════════════════════════════════
-- Not: `http_post` pg_http extension'undan gelir. Supabase dashboard'ında
-- Extensions → pg_http → Install edilmiş olmalı. Ayrıca app.fcm_server_key
-- setting set edilmeli:
--   ALTER DATABASE <db_name> SET app.fcm_server_key = 'YOUR_FCM_SERVER_KEY';
-- ════════════════════════════════════════════════════════════════════════════
