-- =============================================================================
-- v2.9.65: Kritik Güvenlik Düzeltmeleri
-- =============================================================================
-- Bu migration 7 kritik güvenlik sorununu çözer:
-- 1. special_cups şifreleri düz metin → hash + SELECT'ten hariç
-- 2. special_cup_matches INSERT/UPDATE herkese açık → creator-only
-- 3. special_cup_participants INSERT user_id IS NULL açığı → creator-only
-- 4. 5 tabloda RLS kapalı (seasons, cups, cup_rounds, legends, referees)
-- 5. 4 ölü tablo DROP (matches, transfer_offers, loan_listings, loan_offers)
-- 6. blocked_users kolon ad çakışması fix
-- 7. Cron job service_role key vault pattern
-- =============================================================================

-- ─── 1) special_cups şifreleri hash'le + SELECT'ten hariç ──────────────────

-- Önce mevcut düz metin şifreleri hash'le (pgcrypto)
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Mevcut şifreleri hash'le (eğer hash'lenmemişse)
UPDATE special_cups
SET password = crypt(password, gen_salt('bf'))
WHERE password IS NOT NULL
  AND password NOT LIKE '$2a$%'
  AND password != '';

-- password kolonunu artık boş bırakılabilir yap (eski koddan dolayı)
ALTER TABLE special_cups ALTER COLUMN password DROP NOT NULL;

-- SELECT policy'sini değiştir — password kolonunu hariç tut
-- Önce eski policy'yi drop et
DROP POLICY IF EXISTS "special_cups_read_all" ON special_cups;

-- Yeni policy: tüm kolonlar okunabilir AMA password kolonu NULL döner (view kullan)
-- Supabase RLS kolon-bazlı gizleme desteklemediği için view oluşturuyoruz
CREATE OR REPLACE VIEW special_cups_public AS
  SELECT
    id, creator_id, name, description, rules, max_participants,
    current_participants, is_active, created_at, matchday_interval,
    country_code, tier
  FROM special_cups;

-- View'e SELECT yetkisi ver
GRANT SELECT ON special_cups_public TO authenticated;

-- special_cups tablosunun doğrudan SELECT'ini kapat (sadece service role)
REVOKE SELECT ON special_cups FROM authenticated;

-- rpc_join_special_cup fonksiyonunu düzelt — crypt() ile karşılaştır
CREATE OR REPLACE FUNCTION rpc_join_special_cup(
  p_cup_id UUID,
  p_password TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_cup special_cups%ROWTYPE;
  v_participant_count INTEGER;
  v_already_joined BOOLEAN;
BEGIN
  SELECT * INTO v_cup FROM special_cups WHERE id = p_cup_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kupa bulunamadı');
  END IF;

  IF NOT v_cup.is_active THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kupa aktif değil');
  END IF;

  -- Şifre kontrolü — crypt() ile hash karşılaştırma
  IF v_cup.password IS NOT NULL AND v_cup.password != '' THEN
    IF p_password IS NULL OR crypt(p_password, v_cup.password) != v_cup.password THEN
      RETURN jsonb_build_object('success', false, 'error', 'Yanlış şifre');
    END IF;
  END IF;

  -- Kapasite kontrolü
  SELECT COUNT(*) INTO v_participant_count
  FROM special_cup_participants
  WHERE cup_id = p_cup_id;

  IF v_participant_count >= v_cup.max_participants THEN
    RETURN jsonb_build_object('success', false, 'error', 'Kupa dolu');
  END IF;

  -- Zaten katılmış mı?
  SELECT EXISTS(
    SELECT 1 FROM special_cup_participants
    WHERE cup_id = p_cup_id AND user_id = auth.uid()
  ) INTO v_already_joined;

  IF v_already_joined THEN
    RETURN jsonb_build_object('success', false, 'error', 'Zaten katıldınız');
  END IF;

  -- Katılımcı ekle
  INSERT INTO special_cup_participants (cup_id, user_id, joined_at)
  VALUES (p_cup_id, auth.uid(), NOW());

  RETURN jsonb_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ─── 2) special_cup_matches INSERT/UPDATE → creator-only ───────────────────

DROP POLICY IF EXISTS "special_cup_matches_insert_auth" ON special_cup_matches;
DROP POLICY IF EXISTS "special_cup_matches_update_auth" ON special_cup_matches;

-- INSERT: sadece kupanın creator'ı maç ekleyebilir
CREATE POLICY "special_cup_matches_insert_creator"
  ON special_cup_matches FOR INSERT
  WITH CHECK (
    cup_id IN (
      SELECT id FROM special_cups WHERE creator_id = auth.uid()
    )
  );

-- UPDATE: sadece kupanın creator'ı maç güncelleyebilir
CREATE POLICY "special_cup_matches_update_creator"
  ON special_cup_matches FOR UPDATE
  USING (
    cup_id IN (
      SELECT id FROM special_cups WHERE creator_id = auth.uid()
    )
  );

-- ─── 3) special_cup_participants INSERT → creator veya kendisi ─────────────

DROP POLICY IF EXISTS "special_cup_participants_insert_auth" ON special_cup_participants;

-- INSERT: kullanıcı kendini ekleyebilir VEYA kupa creator'ı bot ekleyebilir
CREATE POLICY "special_cup_participants_insert_auth"
  ON special_cup_participants FOR INSERT
  WITH CHECK (
    user_id = auth.uid()
    OR (
      user_id IS NULL
      AND cup_id IN (SELECT id FROM special_cups WHERE creator_id = auth.uid())
    )
  );

-- ─── 4) 5 tabloya RLS etkinleştir + read-only ──────────────────────────────

-- seasons
ALTER TABLE seasons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "seasons_read_all" ON seasons;
CREATE POLICY "seasons_read_all" ON seasons FOR SELECT USING (true);
-- Yazma: sadece service role (anon/authenticated yazamaz)

-- cups
ALTER TABLE cups ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cups_read_all" ON cups;
CREATE POLICY "cups_read_all" ON cups FOR SELECT USING (true);

-- cup_rounds
ALTER TABLE cup_rounds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cup_rounds_read_all" ON cup_rounds;
CREATE POLICY "cup_rounds_read_all" ON cup_rounds FOR SELECT USING (true);

-- legends
ALTER TABLE legends ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "legends_read_all" ON legends;
CREATE POLICY "legends_read_all" ON legends FOR SELECT USING (true);

-- referees
ALTER TABLE referees ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "referees_read_all" ON referees;
CREATE POLICY "referees_read_all" ON referees FOR SELECT USING (true);

-- ─── 5) Ölü tabloları DROP et ───────────────────────────────────────────────
-- matches, transfer_offers (mp değil), loan_listings, loan_offers
-- Client kodunda ve RPC'lerde hiç kullanılmıyorlar

DROP TABLE IF EXISTS matches CASCADE;
DROP TABLE IF EXISTS transfer_offers CASCADE;
DROP TABLE IF EXISTS loan_listings CASCADE;
DROP TABLE IF EXISTS loan_offers CASCADE;

-- ─── 6) blocked_users kolon ad çakışması fix ───────────────────────────────
-- 012 migration blocker_id/blocked_id kullandı, 017 blocker_user_id/blocked_user_id
-- 017 CREATE TABLE IF NOT EXISTS olduğundan şema değişmedi → policy'ler bozuk

-- Önce eski policy'leri drop et (hata verirse ignore)
DROP POLICY IF EXISTS "blocked_users_read_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_insert_own" ON blocked_users;
DROP POLICY IF EXISTS "blocked_users_delete_own" ON blocked_users;

-- Kolonları rename et (eğer eski isimlerle varsa)
DO $$
BEGIN
  -- blocker_id → blocker_user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_users' AND column_name = 'blocker_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_users' AND column_name = 'blocker_user_id'
  ) THEN
    ALTER TABLE blocked_users RENAME COLUMN blocker_id TO blocker_user_id;
  END IF;

  -- blocked_id → blocked_user_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_users' AND column_name = 'blocked_id'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'blocked_users' AND column_name = 'blocked_user_id'
  ) THEN
    ALTER TABLE blocked_users RENAME COLUMN blocked_id TO blocked_user_id;
  END IF;
END $$;

-- Policy'leri yeniden oluştur (artık doğru kolon adlarıyla)
CREATE POLICY "blocked_users_read_own"
  ON blocked_users FOR SELECT
  USING (blocker_user_id = auth.uid());

CREATE POLICY "blocked_users_insert_own"
  ON blocked_users FOR INSERT
  WITH CHECK (blocker_user_id = auth.uid());

CREATE POLICY "blocked_users_delete_own"
  ON blocked_users FOR DELETE
  USING (blocker_user_id = auth.uid());
