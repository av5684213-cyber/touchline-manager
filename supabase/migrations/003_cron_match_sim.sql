-- =============================================================================
-- pg_cron job: Hafta içi TR 12:00 ve 18:00'de maç simülasyonu
-- =============================================================================
-- TR saatiyle 12:00 ve 18:00 = UTC 09:00 ve 15:00
-- Cron: '0 9,15 * * 1-5' → hafta içi (Pzt-Cum) her gün 09:00 ve 15:00 UTC
-- =============================================================================

-- pg_cron extension'ı kur (Supabase'de extensions şemasında)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS http WITH SCHEMA extensions;

-- Eski job varsa temizle
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'touchline-daily-match-sim') THEN
    PERFORM cron.unschedule('touchline-daily-match-sim');
  END IF;
END $$;

-- Yeni job — Edge Function'ı çağırır.
-- URL ve service role key doğrudan string olarak gömülü (ALTER DATABASE yetkimiz yok)
-- ÖNEMLİ: 'Bearer YOUR_SERVICE_ROLE_KEY' ve 'apikey YOUR_SERVICE_ROLE_KEY'
-- değerlerini Supabase dashboard'dan aldığın service_role key ile değiştir.
-- Güvenlik nedeniyle key burada hardcoded değil — deploy öncesi manuel doldur.
SELECT cron.schedule(
  'touchline-daily-match-sim',
  '0 9,15 * * 1-5',  -- UTC 09:00 ve 15:00 (TR 12:00 ve 18:00), Pzt-Cum
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

-- Bilgi amaçlı — job listesi
SELECT jobid, jobname, schedule, active FROM cron.job WHERE jobname = 'touchline-daily-match-sim';
