-- =============================================================================
-- Touchline Manager — 014: Tüm sunucu taraflı zamanlama (pg_cron)
-- =============================================================================
-- v2.9.20 GÖREV 2: Lig + Kupa + Antrenman simülasyonu tam otomatik.
--
-- 3 Edge Function çağıran 3 cron job:
--   1. touchline-daily-match-sim    — TR 12:00 ve 18:00 (UTC 09:00, 15:00) Pzt-Cum
--   2. touchline-daily-cup-sim      — TR 20:00 (UTC 17:00) Çar-Cmt
--   3. touchline-daily-training-sim — TR 15:00 ve 21:00 (UTC 12:00, 18:00) Pzt-Cum
--
-- GEREKSİNİMLER:
--   1. pg_cron extension kurulu olmalı (Supabase default açık)
--   2. http extension kurulu olmalı (Supabase default açık)
--   3. SUPABASE_SERVICE_ROLE_KEY environment variable'ı vault secret olarak eklenmeli
--      veya aşağıdaki placeholder'ı dashboard'dan aldığın service_role_key ile değiştirmelisin.
--
-- GÜVENLİK NOTU:
--   service_role_key client-side exposure'a karşı hassastır. Bu migration'ı
--   production'a deploy etmeden önce service_role_key'i vault'ta sakla:
--     SELECT vault.create_secret('YOUR_KEY', 'supabase_service_role_key');
--   Sonra aşağıdaki placeholder'ı şu şekilde değiştir:
--     (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name='supabase_service_role_key')
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- =============================================================================
-- 1) Lig maçı simülasyonu — TR 12:00 + 18:00 (UTC 09:00 + 15:00), Pzt-Cum
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'touchline-daily-match-sim') THEN
    PERFORM cron.unschedule('touchline-daily-match-sim');
  END IF;
END $$;

SELECT cron.schedule(
  'touchline-daily-match-sim',
  '0 9,15 * * 1-5',  -- UTC 09:00, 15:00 (TR 12:00, 18:00), Pzt-Cum
  $$
    SELECT content
    FROM http_post(
      url := 'https://bhnhmdlyabuachyjwxwe.supabase.co/functions/v1/daily-match-sim'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'apikey', 'YOUR_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object('trigger', 'cron')
    );
  $$
);

-- =============================================================================
-- 2) Kupa simülasyonu — TR 20:00 (UTC 17:00), Çar + Cmt
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'touchline-daily-cup-sim') THEN
    PERFORM cron.unschedule('touchline-daily-cup-sim');
  END IF;
END $$;

SELECT cron.schedule(
  'touchline-daily-cup-sim',
  '0 17 * * 3,6',  -- UTC 17:00 (TR 20:00), Çar + Cmt
  $$
    SELECT content
    FROM http_post(
      url := 'https://bhnhmdlyabuachyjwxwe.supabase.co/functions/v1/daily-cup-sim'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'apikey', 'YOUR_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object('trigger', 'cron')
    );
  $$
);

-- =============================================================================
-- 3) Antrenman simülasyonu — TR 15:00 + 21:00 (UTC 12:00 + 18:00), Pzt-Cum
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'touchline-daily-training-sim') THEN
    PERFORM cron.unschedule('touchline-daily-training-sim');
  END IF;
END $$;

SELECT cron.schedule(
  'touchline-daily-training-sim',
  '0 12,18 * * 1-5',  -- UTC 12:00, 18:00 (TR 15:00, 21:00), Pzt-Cum
  $$
    SELECT content
    FROM http_post(
      url := 'https://bhnhmdlyabuachyjwxwe.supabase.co/functions/v1/daily-training-sim'::text,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer YOUR_SERVICE_ROLE_KEY',
        'apikey', 'YOUR_SERVICE_ROLE_KEY'
      ),
      body := jsonb_build_object('trigger', 'cron')
    );
  $$
);

-- =============================================================================
-- Bilgi amaçlı — aktif cron job listesi
-- =============================================================================
SELECT jobid, jobname, schedule, active FROM cron.job
WHERE jobname IN (
  'touchline-daily-match-sim',
  'touchline-daily-cup-sim',
  'touchline-daily-training-sim'
)
ORDER BY jobname;

-- =============================================================================
-- Talimatlar (deploy sonrası)
-- =============================================================================
-- 1. Supabase Dashboard → Project Settings → API → service_role key'i kopyala
-- 2. Bu migration'ı Supabase SQL editor'da çalıştır (veya supabase db push)
-- 3. Tekrar SQL editor'da şunu çalıştır (YOUR_SERVICE_ROLE_KEY yerine gerçek key):
--      SELECT cron.alter_job(
--        job_id := (SELECT jobid FROM cron.job WHERE jobname='touchline-daily-match-sim'),
--        schedule_text := '0 9,15 * * 1-5'
--      );
--    VEYA her job için SQL'i manuel olarak yeniden schedule et (vault ile).
-- 4. Test: SELECT cron.schedule('test-one-shot', '* * * * *', $$ SELECT 1 $$);
--    Job listesi: SELECT * FROM cron.job;
--    Job çalıştırma: SELECT cron.run(jobid) FROM cron.job WHERE jobname='...';
-- =============================================================================
