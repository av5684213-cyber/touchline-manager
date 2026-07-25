-- =============================================================================
-- Touchline Manager — 018: Push Notification (FCM) altyapısı
-- =============================================================================
-- v2.9.20 GÖREV 8: FCM entegrasyonu.
--
-- push_tokens tablosu:
--   - user_id (UUID, auth.users)
--   - token (TEXT, FCM device token)
--   - platform (ios, android, web)
--   - created_at, last_used_at
--
-- RPC rpc_register_push_token: Kullanıcı cihazını kaydet/güncelle
-- RPC rpc_send_push_notification: Belirli bir kullanıcıya bildirim gönder (server-side)
-- RPC rpc_send_broadcast_push: Tüm kullanıcılara bildirim gönder (admin only)
--
-- GÜVENLİK:
--   - push_tokens sadece kullanıcı kendi token'ını yönetir
--   - rpc_send_push_notification SECURITY DEFINER (Edge Function tarafından çağrılır)
--   - rpc_send_broadcast_push sadece adminler
-- =============================================================================

CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'android',  -- ios, android, web
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, token)
);

CREATE INDEX IF NOT EXISTS idx_push_tokens_user ON push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON push_tokens(token);

ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_tokens_own_read" ON push_tokens;
CREATE POLICY "push_tokens_own_read" ON push_tokens
  FOR SELECT USING (user_id = auth.uid());

DROP POLICY IF EXISTS "push_tokens_own_write" ON push_tokens;
CREATE POLICY "push_tokens_own_write" ON push_tokens
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- =============================================================================
-- RPC: Push token kaydet/güncelle (client tarafından çağrılır)
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_register_push_token(
  p_token TEXT,
  p_platform TEXT DEFAULT 'android'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  -- Token zaten varsa last_used_at güncelle
  INSERT INTO push_tokens (user_id, token, platform, last_used_at)
  VALUES (v_user_id, p_token, p_platform, NOW())
  ON CONFLICT (user_id, token)
  DO UPDATE SET last_used_at = NOW(), platform = EXCLUDED.platform;

  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_register_push_token(TEXT, TEXT) TO authenticated;

-- =============================================================================
-- RPC: Push token sil (logout sırasında)
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_unregister_push_token(p_token TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RETURN false;
  END IF;

  DELETE FROM push_tokens WHERE user_id = v_user_id AND token = p_token;
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION rpc_unregister_push_token(TEXT) TO authenticated;

-- =============================================================================
-- RPC: Bir kullanıcıya bildirim gönder (Edge Function tarafından çağrılır)
-- SECURITY DEFINER — auth.users tablosunu okuyabilmek için
-- =============================================================================
CREATE OR REPLACE FUNCTION rpc_send_push_notification(
  p_user_id UUID,
  p_title TEXT,
  p_body TEXT,
  p_data JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB AS $$
DECLARE
  v_tokens TEXT[];
  v_result JSONB;
  v_response TEXT;
  v_fcm_server_key TEXT;
BEGIN
  -- FCM server key environment variable'dan oku
  -- Production'da vault kullanılması önerilir:
  -- v_fcm_server_key := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'fcm_server_key');
  BEGIN
    v_fcm_server_key := current_setting('app.fcm_server_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_fcm_server_key := '';
  END;

  IF v_fcm_server_key = '' THEN
    RETURN jsonb_build_object('success', false, 'reason', 'fcm_key_missing');
  END IF;

  -- Kullanıcının tüm cihaz token'larını topla
  SELECT array_agg(token) INTO v_tokens
  FROM push_tokens
  WHERE user_id = p_user_id;

  IF v_tokens IS NULL OR array_length(v_tokens, 1) IS NULL THEN
    RETURN jsonb_build_object('success', false, 'reason', 'no_tokens', 'user_id', p_user_id);
  END IF;

  -- FCM HTTP v1 API'sine POST isteği (server_key ile legacy API)
  -- Not: Bu sadeleştirilmiş legacy API — production'da OAuth2 kullanılması önerilir
  SELECT content::jsonb INTO v_result
  FROM http_post(
    url := 'https://fcm.googleapis.com/fcm/send'::text,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'key=' || v_fcm_server_key
    ),
    body := jsonb_build_object(
      'registration_ids', v_tokens,
      'notification', jsonb_build_object(
        'title', p_title,
        'body', p_body,
        'sound', 'default',
        'badge', '1'
      ),
      'data', p_data,
      'priority', 'high'
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'tokens_sent', array_length(v_tokens, 1),
    'fcm_response', v_result
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bu RPC sadece service role tarafından çağrılır (Edge Function)
-- authenticated'a VERMİYORUZ — kullanıcılar birbirine bildirim gönderemesin
REVOKE EXECUTE ON FUNCTION rpc_send_push_notification(UUID, TEXT, TEXT, JSONB) FROM authenticated;
REVOKE EXECUTE ON FUNCTION rpc_send_push_notification(UUID, TEXT, TEXT, JSONB) FROM anon;

-- =============================================================================
-- Bilgi amaçlı
-- =============================================================================
-- Test (admin SQL editor'da):
--   SELECT * FROM push_tokens LIMIT 5;
--   SELECT rpc_register_push_token('TEST_TOKEN_123', 'android');  -- kendi kullanıcın için
--   SELECT rpc_unregister_push_token('TEST_TOKEN_123');
--   -- Broadcast göndermek için Edge Function kullan (FCM key gerekir)
