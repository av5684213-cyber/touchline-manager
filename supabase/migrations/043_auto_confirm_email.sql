-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.156: Email onayını KAPAT + mevcut kullanıcıları otomatik onayla
-- ════════════════════════════════════════════════════════════════════════════
-- Bu SQL email onayını kapatmaz (o Dashboard ayarı), ama:
-- 1. Yeni kayıt olan kullanıcıları otomatik onaylar (email_confirmed_at = NOW())
-- 2. Mevcut onaylanmamış kullanıcıları da onaylar
--
-- Dashboard'da da kapatmak için:
-- Supabase Dashboard → Authentication → Providers → Email
-- → "Confirm email" toggle'ını KAPAT
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Mevcut onaylanmamış kullanıcıları onayla
UPDATE auth.users
SET email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
    confirmed_at = COALESCE(confirmed_at, NOW())
WHERE email_confirmed_at IS NULL OR confirmed_at IS NULL;

-- 2. Yeni kayıtlar için trigger — email_confirmed_at otomatik NOW() olsun
CREATE OR REPLACE FUNCTION auto_confirm_email()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email_confirmed_at IS NULL THEN
    NEW.email_confirmed_at := NOW();
  END IF;
  IF NEW.confirmed_at IS NULL THEN
    NEW.confirmed_at := NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_confirm_email ON auth.users;
CREATE TRIGGER trg_auto_confirm_email
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION auto_confirm_email();

-- 3. Doğrulama
SELECT
  COUNT(*) FILTER (WHERE email_confirmed_at IS NOT NULL) AS confirmed,
  COUNT(*) FILTER (WHERE email_confirmed_at IS NULL) AS unconfirmed,
  COUNT(*) AS total
FROM auth.users;
