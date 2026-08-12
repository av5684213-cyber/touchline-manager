-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.152: SERVICE_ROLE_KEY + cron jobs (vault'SIZ — database setting kullanır)
-- ════════════════════════════════════════════════════════════════════════════
-- vault extension yeni Supabase projelerinde yok. service_role key'i database
-- setting olarak sakla, cron job'lar current_setting() ile okur.
--
-- ÇALIŞTIRMADAN ÖNCE:
-- 1. Supabase Dashboard → Settings → API → "service_role" key'i kopyala
-- 2. Aşağıdaki 'PASTE_SERVICE_ROLE_KEY_HERE' yerine yapıştır
-- 3. SQL'i çalıştır
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) service_role key'i database setting olarak sakla ═════════════════════
-- v2.9.152: vault.create_secret yerine ALTER DATABASE SET kullan.
-- current_setting('app.supabase_service_role_key', true) ile okunur.
--
-- service_role key'i AŞAĞIDAKİ SATIRDA KENDİ KEY'İNLE DEĞİŞTİR:
ALTER DATABASE postgres SET app.supabase_service_role_key = 'PASTE_SERVICE_ROLE_KEY_HERE';

-- Değişikliğin aktif olması için bağlantı yeniden kurulmalı (SQL Editor otomatik yapar).
-- Doğrula — boş dönerse yeni bir SQL Editor sekmesi aç:
SELECT
  CASE
    WHEN current_setting('app.supabase_service_role_key', true) IS NULL
      OR current_setting('app.supabase_service_role_key', true) = ''
      OR current_setting('app.supabase_service_role_key', true) = 'PASTE_SERVICE_ROLE_KEY_HERE'
    THEN '❌ SET EDİLMEDİ — yukarıdaki ALTER DATABASE satırını kontrol et'
    ELSE '✅ set (' || length(current_setting('app.supabase_service_role_key', true)) || ' chars)'
  END AS status;

-- ─── 2) Eski cron job'ları unschedule et (migration 014 + 030 çakışması) ════
DO $cron_cleanup$
DECLARE
  job_record RECORD;
BEGIN
  FOR job_record IN
    SELECT jobid FROM cron.job WHERE jobname IN (
      'daily-match-sim',
      'daily-cup-sim',
      'daily-training-sim',
      'touchline-daily-match-sim',
      'touchline-daily-cup-sim',
      'touchline-daily-training-sim'
    )
  LOOP
    PERFORM cron.unschedule(job_record.jobid);
  END LOOP;
END $cron_cleanup$;

-- ─── 3) Yeni cron job'lar — database setting'ten key okuyarak ═══════════════
DO $cron_schedule$
DECLARE
  v_key TEXT;
  v_url TEXT;
BEGIN
  -- Connection'da set edilen değeri oku
  v_key := current_setting('app.supabase_service_role_key', true);
  v_url := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co';

  IF v_key IS NULL OR v_key = '' OR v_key = 'PASTE_SERVICE_ROLE_KEY_HERE' THEN
    RAISE EXCEPTION 'service_role key set edilmemiş — önce ALTER DATABASE yap';
  END IF;

  -- daily-match-sim: hafta içi 12:00 ve 18:00 TR → UTC 09:00, 15:00
  PERFORM cron.schedule(
    'daily-match-sim',
    '0 9,15 * * 1-5',
    format(
      'SELECT extensions.http_post(url:=''%s/functions/v1/daily-match-sim'', headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s'', ''apikey'', ''%s''), body:=''{}''::jsonb)',
      v_url, v_key, v_key
    )
  );

  -- daily-cup-sim: cumartesi 12:00 ve 18:00 TR → UTC 09:00, 15:00
  PERFORM cron.schedule(
    'daily-cup-sim',
    '0 9,15 * * 6',
    format(
      'SELECT extensions.http_post(url:=''%s/functions/v1/daily-cup-sim'', headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s'', ''apikey'', ''%s''), body:=''{}''::jsonb)',
      v_url, v_key, v_key
    )
  );

  -- daily-training-sim: hafta içi 10:00 ve 16:00 TR → UTC 07:00, 13:00
  PERFORM cron.schedule(
    'daily-training-sim',
    '0 7,13 * * 1-5',
    format(
      'SELECT extensions.http_post(url:=''%s/functions/v1/daily-training-sim'', headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s'', ''apikey'', ''%s''), body:=''{}''::jsonb)',
      v_url, v_key, v_key
    )
  );

  RAISE NOTICE '✅ 3 cron job scheduled: daily-match-sim, daily-cup-sim, daily-training-sim';
END $cron_schedule$;

-- ─── 4) Doğrulama ══════════════════════════════════════════════════════════
SELECT 'CRON: daily-match-sim' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-match-sim')
       THEN '✅ scheduled' ELSE '❌ NOT SCHEDULED' END AS status;
SELECT 'CRON: daily-cup-sim' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-cup-sim')
       THEN '✅ scheduled' ELSE '❌ NOT SCHEDULED' END AS status;
SELECT 'CRON: daily-training-sim' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'daily-training-sim')
       THEN '✅ scheduled' ELSE '❌ NOT SCHEDULED' END AS status;

SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;
