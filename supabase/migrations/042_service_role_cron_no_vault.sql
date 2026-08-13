-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.152 FIX: SERVICE_ROLE_KEY + cron jobs (ALTER DATABASE olmadan)
-- ════════════════════════════════════════════════════════════════════════════
-- Hata: permission denied to set parameter "app.supabase_service_role_key"
-- Kök neden: ALTER DATABASE superuser yetkisi gerektirir, Supabase SQL Editor
--            postgres rolüyle çalışır (superuser DEĞİL).
--
-- ÇÖZÜM: service_role key'i cron job komutuna GÖM (hardcoded).
-- Güvenlik notu: Bu daha az güvenli — cron.job tablosunda plaintext key saklanır.
-- Supabase Dashboard → Database → Roles bölümünden "postgres" user'ın yetkisini
-- kontrol et; superuser ise ALTER DATABASE'i "psql" ile çalıştırabilirsin.
--
-- ALTERNATİF (önerilen): Supabase Dashboard → Settings → Database →
-- "Database settings" → Add setting:
--   Name: app.supabase_service_role_key
--   Value: eyJhbGc... (service_role key)
-- Bu UI superuser yetkisiyle ALTER DATABASE çalıştırır.
--
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) Eski cron job'ları unschedule et ════════════════════════════════════
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

-- ─── 2) Yeni cron job'lar — key hardcoded ═══════════════════════════════════
-- AŞAĞIDAKİ 'PASTE_SERVICE_ROLE_KEY_HERE' YERİNE service_role KEY'İNİ YAPIŞTIR
-- (Dashboard → Settings → API → service_role satırını kopyala, eyJhbGc... ile başlar)

DO $cron_schedule$
DECLARE
  v_key TEXT := 'PASTE_SERVICE_ROLE_KEY_HERE';
  v_url TEXT := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co';
BEGIN
  IF v_key = 'PASTE_SERVICE_ROLE_KEY_HERE' THEN
    RAISE EXCEPTION 'Lütfen PASTE_SERVICE_ROLE_KEY_HERE yerine service_role key yapıştır';
  END IF;

  -- daily-match-sim: hafta içi 12:00, 18:00 TR → UTC 09:00, 15:00
  PERFORM cron.schedule(
    'daily-match-sim',
    '0 9,15 * * 1-5',
    format(
      'SELECT extensions.http_post(url:=''%s/functions/v1/daily-match-sim'', headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s'', ''apikey'', ''%s''), body:=''{}''::jsonb)',
      v_url, v_key, v_key
    )
  );

  -- daily-cup-sim: cumartesi 12:00, 18:00 TR → UTC 09:00, 15:00
  PERFORM cron.schedule(
    'daily-cup-sim',
    '0 9,15 * * 6',
    format(
      'SELECT extensions.http_post(url:=''%s/functions/v1/daily-cup-sim'', headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s'', ''apikey'', ''%s''), body:=''{}''::jsonb)',
      v_url, v_key, v_key
    )
  );

  -- daily-training-sim: hafta içi 10:00, 16:00 TR → UTC 07:00, 13:00
  PERFORM cron.schedule(
    'daily-training-sim',
    '0 7,13 * * 1-5',
    format(
      'SELECT extensions.http_post(url:=''%s/functions/v1/daily-training-sim'', headers:=jsonb_build_object(''Content-Type'', ''application/json'', ''Authorization'', ''Bearer %s'', ''apikey'', ''%s''), body:=''{}''::jsonb)',
      v_url, v_key, v_key
    )
  );

  RAISE NOTICE '✅ 3 cron job scheduled';
END $cron_schedule$;

-- ─── 3) Doğrulama ══════════════════════════════════════════════════════════
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
