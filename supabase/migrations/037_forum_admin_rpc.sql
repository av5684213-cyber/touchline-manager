-- =============================================================================
-- Touchline Manager — 037: Forum Admin RPC (v2.9.74)
-- =============================================================================
-- Sorun: forum_reports tablosuna SELECT/INSERT kullanıcı tarafından, UPDATE
-- yalnız service role. Hiçbir RPC veya admin UI yok — raporlar birikir,
-- kimse inceleyemez. Play Store UGC politikası "raporlanan içeriği makul
-- sürede inceleme" gerektirir.
--
-- Çözüm: rpc_list_forum_reports + rpc_resolve_forum_report RPC'leri.
-- Şimdilik sadece admin e-postaları tarafından çağrılabilir (ADMIN_EMAILS).
-- İleride basit admin panel UI'sı eklenebilir.
-- =============================================================================

-- Admin e-postaları (auth-context.tsx'teki ADMIN_EMAILS ile aynı)
-- NOT: Bu hardcoded listeyi ileride bir admin_users tablosuna taşıyabiliriz.
CREATE OR REPLACE FUNCTION rpc_list_forum_reports(
  p_admin_email TEXT
)
RETURNS JSON AS $$
DECLARE
  auth_uid UUID := auth.uid();
  admin_user RECORD;
  result JSON;
BEGIN
  IF auth_uid IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not-authed');
  END IF;

  -- Admin kontrolü — auth.users'dan e-postayı al, ADMIN listesinde mi?
  SELECT email INTO admin_user.email FROM auth.users WHERE id = auth_uid;
  IF admin_user.email IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'user-not-found');
  END IF;

  -- Admin e-posta listesi (touchline-manager@gmail.com gibi)
  IF admin_user.email NOT IN (
    'av5684213-cyber@gmail.com',
    'admin@touchline-manager.com'
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'not-admin');
  END IF;

  -- Raporları getir (son 100)
  SELECT COALESCE(json_agg(row_to_json(r)), '[]'::json) INTO result
  FROM (
    SELECT
      fr.id,
      fr.reporter_id,
      fr.topic_id,
      fr.reply_id,
      fr.reason,
      fr.status,
      fr.created_at,
      ft.title AS topic_title,
      ft.body AS topic_body,
      ft.author_id AS topic_author_id,
      fr2.body AS reply_body,
      fr2.author_id AS reply_author_id
    FROM forum_reports fr
    LEFT JOIN forum_topics ft ON fr.topic_id = ft.id
    LEFT JOIN forum_replies fr2 ON fr.reply_id = fr2.id
    WHERE fr.status = 'pending'
    ORDER BY fr.created_at DESC
    LIMIT 100
  ) r;

  RETURN json_build_object('success', true, 'reports', result);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Raporu çözümle (status: pending → reviewed/actioned)
CREATE OR REPLACE FUNCTION rpc_resolve_forum_report(
  p_admin_email TEXT,
  p_report_id UUID,
  p_action TEXT  -- 'dismiss' | 'delete_content' | 'ban_user'
)
RETURNS JSON AS $$
DECLARE
  auth_uid UUID := auth.uid();
  admin_user RECORD;
  report RECORD;
BEGIN
  IF auth_uid IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'not-authed');
  END IF;

  SELECT email INTO admin_user.email FROM auth.users WHERE id = auth_uid;
  IF admin_user.email IS NULL THEN
    RETURN json_build_object('success', false, 'reason', 'user-not-found');
  END IF;

  IF admin_user.email NOT IN (
    'av5684213-cyber@gmail.com',
    'admin@touchline-manager.com'
  ) THEN
    RETURN json_build_object('success', false, 'reason', 'not-admin');
  END IF;

  -- Raporu getir
  SELECT * INTO report FROM forum_reports WHERE id = p_report_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'reason', 'report-not-found');
  END IF;

  -- Aksiyon uygula
  IF p_action = 'delete_content' THEN
    -- Topic veya reply sil
    IF report.topic_id IS NOT NULL THEN
      DELETE FROM forum_topics WHERE id = report.topic_id;
    END IF;
    IF report.reply_id IS NOT NULL THEN
      DELETE FROM forum_replies WHERE id = report.reply_id;
    END IF;
  END IF;
  -- 'dismiss' ve 'ban_user' şimdilik sadece status güncelle
  -- (ban_user ileride rpc_ban_user RPC'si ile yapılabilir)

  -- Rapor status güncelle
  UPDATE forum_reports
  SET status = CASE p_action
    WHEN 'dismiss' THEN 'dismissed'
    WHEN 'delete_content' THEN 'actioned'
    WHEN 'ban_user' THEN 'actioned'
    ELSE 'reviewed'
  END
  WHERE id = p_report_id;

  RETURN json_build_object('success', true, 'action', p_action);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

COMMENT ON FUNCTION rpc_list_forum_reports(TEXT) IS 'v2.9.74: Admin-only forum reports list';
COMMENT ON FUNCTION rpc_resolve_forum_report(TEXT, UUID, TEXT) IS 'v2.9.74: Admin-only report resolution';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- DROP FUNCTION IF EXISTS rpc_list_forum_reports(TEXT);
-- DROP FUNCTION IF EXISTS rpc_resolve_forum_report(TEXT, UUID, TEXT);
