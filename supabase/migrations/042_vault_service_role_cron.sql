-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.151: SERVICE_ROLE_KEY'i vault'a yaz + cron job'ları schedule et
-- ════════════════════════════════════════════════════════════════════════════
-- Bu SQL'İ ÇALIŞTIRMADAN ÖNCE:
-- 1. Supabase Dashboard → Settings → API → "service_role" secret'ı kopyala
-- 2. Aşağıdaki 'PASTE_SERVICE_ROLE_KEY_HERE' yerines yapıştır
-- 3. SQL'i çalıştır
--
-- Bu SQL migration 030 ile aynı işi yapar ama service_role key hardcoded değil.
-- ════════════════════════════════════════════════════════════════════════════

-- ─── 1) vault extension'ı (041_master_fix'te zaten aktif etti, idempotent) ═══
CREATE EXTENSION IF NOT EXISTS vault;

-- ─── 2) service_role key'i vault'a yaz ══════════════════════════════════════
-- Önce eski secret varsa sil
DELETE FROM vault.secrets WHERE name = 'supabase_service_role_key';

-- Yeni secret ekle — AŞAĞIDAKİ KEY'İ KENDİ SERVICE_ROLE_KEY'İNLE DEĞİŞTİR:
SELECT vault.create_secret(
  'PASTE_SERVICE_ROLE_KEY_HERE',  -- ← BURAYI DEĞİŞTİR! eyJhbGci... ile başlar
  'supabase_service_role_key'
);

-- Doğrula:
SELECT name, created_at FROM vault.secrets WHERE name = 'supabase_service_role_key';

-- ─── 3) Eski cron job'ları unschedule et (migration 014 + 030 çakışması) ════
DO $$
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
END $$;

-- ─── 4) Yeni cron job'lar — vault'tan key okuyarak ══════════════════════════
-- daily-match-sim: hafta içi 12:00 ve 18:00 TR → UTC 09:00, 15:00
SELECT cron.schedule(
  'daily-match-sim',
  '0 9,15 * * 1-5',
  $$
    SELECT extensions.http_post(
      url := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co/functions/v1/daily-match-sim',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- daily-cup-sim: cumartesi 12:00 ve 18:00 TR → UTC 09:00, 15:00
SELECT cron.schedule(
  'daily-cup-sim',
  '0 9,15 * * 6',
  $$
    SELECT extensions.http_post(
      url := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co/functions/v1/daily-cup-sim',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- daily-training-sim: hafta içi 10:00 ve 16:00 TR → UTC 07:00, 13:00
SELECT cron.schedule(
  'daily-training-sim',
  '0 7,13 * * 1-5',
  $$
    SELECT extensions.http_post(
      url := 'https://jmxbyaamwbpnvgbnjbmo.supabase.co/functions/v1/daily-training-sim',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key'),
        'apikey', (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'supabase_service_role_key')
      ),
      body := '{}'::jsonb
    );
  $$
);

-- ─── 5) Doğrulama ══════════════════════════════════════════════════════════
-- Aktif cron job'lar:
SELECT jobname, schedule, active FROM cron.job ORDER BY jobname;

-- Vault'ta secret var mı?
SELECT name, created_at FROM vault.secrets WHERE name = 'supabase_service_role_key';
