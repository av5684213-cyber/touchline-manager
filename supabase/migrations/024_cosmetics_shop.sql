-- =============================================================================
-- Touchline Manager — 024: Kozmetik Market Sistemi (v2.9.46 Görev 1)
-- =============================================================================
-- v2.9.46 Görev 1: Shop/Market ekranı için kozmetik satın alma + giyme sistemi.
--
-- 3 tablo:
--   1. cosmetic_items: Katalog (forma, rozet, tema, stadyum, top, menajer)
--   2. user_cosmetic_ownership: Kullanıcı sahipliği (kim ne satın aldı)
--   3. user_cosmetic_equipped: Kullanıcı giyili seçimi (her tip için 1 tane)
--
-- Kredi sistemi kullanır (credits alanı — mevcut app_state'te zaten var)
-- İleride Google Play Billing entegrasyonu için "real_money_price" alanı da eklendi
-- =============================================================================

-- =============================================================================
-- 1. cosmetic_items — Katalog
-- =============================================================================

CREATE TABLE IF NOT EXISTS cosmetic_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- SKU (Stok Keeping Unit) — Google Play Billing ile eşleştirme için
  sku TEXT UNIQUE NOT NULL,
  -- Türkçe isim
  name_tr TEXT NOT NULL,
  -- İngilizce isim
  name_en TEXT NOT NULL,
  -- Açıklama (tr/en)
  desc_tr TEXT,
  desc_en TEXT,
  -- Kategori: forma, rozet, tema, stadyum, top, menajer
  category TEXT NOT NULL CHECK (
    category IN ('kit', 'badge', 'theme', 'stadium', 'ball', 'manager')
  ),
  -- Alt kategori (örn: kit/home, kit/away, theme/dark, theme/light)
  subcategory TEXT,
  -- Oyun-içi kredi fiyatı (0 = bedava/özel)
  credit_price INTEGER NOT NULL DEFAULT 0 CHECK (credit_price >= 0),
  -- Gerçek para fiyatı (Google Play Billing — sent cinsinden, örn 199 = $1.99)
  -- NULL ise sadece kredi ile satın alınabilir
  real_money_price_cents INTEGER CHECK (real_money_price_cents IS NULL OR real_money_price_cents > 0),
  -- Görsel URL (public/ içinde veya CDN)
  image_url TEXT,
  -- CSS değişkenleri (tema/renk için)
  css_vars JSONB,
  -- Nadirlik
  rarity TEXT NOT NULL DEFAULT 'common' CHECK (
    rarity IN ('common', 'rare', 'epic', 'legendary')
  ),
  -- Aktif/pasif (kampanya süresince satın alınabilir)
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- Sıralama
  sort_order INTEGER NOT NULL DEFAULT 0,
  -- Oluşturma tarihi
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cosmetic_items_category
  ON cosmetic_items(category, sort_order);

CREATE INDEX IF NOT EXISTS idx_cosmetic_items_active
  ON cosmetic_items(is_active, category)
  WHERE is_active = true;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cosmetic_items_sku
  ON cosmetic_items(sku);

-- =============================================================================
-- 2. user_cosmetic_ownership — Kullanıcı sahipliği
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_cosmetic_ownership (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cosmetic_id UUID NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  -- Satın alma tarihi
  purchased_at TIMESTAMPTZ DEFAULT NOW(),
  -- Ödeme yöntemi: credit (oyun-içi) veya real_money (Google Play)
  payment_method TEXT NOT NULL DEFAULT 'credit' CHECK (
    payment_method IN ('credit', 'real_money')
  ),
  -- Ödenen miktar (kredi veya sent)
  amount_paid INTEGER NOT NULL DEFAULT 0,
  -- Google Play purchase_token (real_money ise, receipt verification için)
  purchase_token TEXT,
  -- Unique: bir kullanıcı bir kozmetiği bir kez satın alır
  UNIQUE (user_id, cosmetic_id)
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetic_ownership_user
  ON user_cosmetic_ownership(user_id);

CREATE INDEX IF NOT EXISTS idx_user_cosmetic_ownership_cosmetic
  ON user_cosmetic_ownership(cosmetic_id);

-- =============================================================================
-- 3. user_cosmetic_equipped — Kullanıcı giyili seçimi
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_cosmetic_equipped (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Kategori (her kategori için sadece 1 tane giyilebilir)
  category TEXT NOT NULL CHECK (
    category IN ('kit', 'badge', 'theme', 'stadium', 'ball', 'manager')
  ),
  cosmetic_id UUID NOT NULL REFERENCES cosmetic_items(id) ON DELETE CASCADE,
  equipped_at TIMESTAMPTZ DEFAULT NOW(),
  -- Unique: kullanıcı + kategori başına 1 giyili öğe
  UNIQUE (user_id, category)
);

CREATE INDEX IF NOT EXISTS idx_user_cosmetic_equipped_user
  ON user_cosmetic_equipped(user_id);

-- =============================================================================
-- RLS — kullanıcılar kendi sahiplik/giyili verilerini yönetir
-- =============================================================================

ALTER TABLE cosmetic_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetic_ownership ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_cosmetic_equipped ENABLE ROW LEVEL SECURITY;

-- cosmetic_items: herkes okuyabilir (katalog herkese açık)
-- Yazma sadece service role (admin katalog yönetimi)
DROP POLICY IF EXISTS "cosmetic_items_select_all" ON cosmetic_items;
CREATE POLICY "cosmetic_items_select_all"
  ON cosmetic_items FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "cosmetic_items_insert_none" ON cosmetic_items;
CREATE POLICY "cosmetic_items_insert_none"
  ON cosmetic_items FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "cosmetic_items_update_none" ON cosmetic_items;
CREATE POLICY "cosmetic_items_update_none"
  ON cosmetic_items FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "cosmetic_items_delete_none" ON cosmetic_items;
CREATE POLICY "cosmetic_items_delete_none"
  ON cosmetic_items FOR DELETE
  USING (false);

-- user_cosmetic_ownership: kullanıcı kendi sahipliğini okur/yazar
DROP POLICY IF EXISTS "user_cosmetic_ownership_select_owner" ON user_cosmetic_ownership;
CREATE POLICY "user_cosmetic_ownership_select_owner"
  ON user_cosmetic_ownership FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_cosmetic_ownership_insert_owner" ON user_cosmetic_ownership;
CREATE POLICY "user_cosmetic_ownership_insert_owner"
  ON user_cosmetic_ownership FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_cosmetic_ownership_delete_owner" ON user_cosmetic_ownership;
CREATE POLICY "user_cosmetic_ownership_delete_owner"
  ON user_cosmetic_ownership FOR DELETE
  USING (auth.uid() = user_id);

-- user_cosmetic_equipped: kullanıcı kendi giyili seçimini yönetir
DROP POLICY IF EXISTS "user_cosmetic_equipped_select_owner" ON user_cosmetic_equipped;
CREATE POLICY "user_cosmetic_equipped_select_owner"
  ON user_cosmetic_equipped FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_cosmetic_equipped_insert_owner" ON user_cosmetic_equipped;
CREATE POLICY "user_cosmetic_equipped_insert_owner"
  ON user_cosmetic_equipped FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_cosmetic_equipped_update_owner" ON user_cosmetic_equipped;
CREATE POLICY "user_cosmetic_equipped_update_owner"
  ON user_cosmetic_equipped FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_cosmetic_equipped_delete_owner" ON user_cosmetic_equipped;
CREATE POLICY "user_cosmetic_equipped_delete_owner"
  ON user_cosmetic_equipped FOR DELETE
  USING (auth.uid() = user_id);

-- =============================================================================
-- RPC: satın alma işlemi — atomic (sahiplik + kredi düşürme)
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_purchase_cosmetic(
  p_user_id UUID,
  p_cosmetic_id UUID,
  p_payment_method TEXT DEFAULT 'credit'
) RETURNS JSONB AS $$
DECLARE
  v_cosmetic RECORD;
  v_already_owned BOOLEAN;
  v_current_credits INTEGER;
  v_purchase_id UUID;
BEGIN
  -- 1. Kozmetiği bul
  SELECT * INTO v_cosmetic FROM cosmetic_items WHERE id = p_cosmetic_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Cosmetic not found or inactive');
  END IF;

  -- 2. Zaten sahip mi kontrol et
  SELECT EXISTS(
    SELECT 1 FROM user_cosmetic_ownership
    WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id
  ) INTO v_already_owned;
  IF v_already_owned THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Already owned');
  END IF;

  -- 3. Kredi ile satın alma ise bakiye kontrolü
  IF p_payment_method = 'credit' THEN
    SELECT (state->>'credits')::INTEGER INTO v_current_credits
    FROM app_state WHERE user_id = p_user_id;
    IF v_current_credits IS NULL OR v_current_credits < v_cosmetic.credit_price THEN
      RETURN jsonb_build_object('success', false, 'reason', 'Insufficient credits');
    END IF;

    -- Kredi düşür (atomic)
    UPDATE app_state
    SET state = jsonb_set(state, '{credits}', to_jsonb(v_current_credits - v_cosmetic.credit_price))
    WHERE user_id = p_user_id;
  END IF;

  -- 4. Sahiplik kaydını oluştur
  INSERT INTO user_cosmetic_ownership (user_id, cosmetic_id, payment_method, amount_paid)
  VALUES (p_user_id, p_cosmetic_id, p_payment_method,
    CASE WHEN p_payment_method = 'credit' THEN v_cosmetic.credit_price
         ELSE v_cosmetic.real_money_price_cents END)
  RETURNING id INTO v_purchase_id;

  RETURN jsonb_build_object(
    'success', true,
    'ownership_id', v_purchase_id,
    'cosmetic_id', p_cosmetic_id,
    'credits_remaining',
      CASE WHEN p_payment_method = 'credit'
           THEN v_current_credits - v_cosmetic.credit_price
           ELSE NULL END
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- RPC: giyili seçimi güncelle (kategori başına 1 tane)
-- =============================================================================

CREATE OR REPLACE FUNCTION rpc_equip_cosmetic(
  p_user_id UUID,
  p_cosmetic_id UUID
) RETURNS JSONB AS $$
DECLARE
  v_cosmetic RECORD;
  v_owns BOOLEAN;
BEGIN
  -- 1. Kozmetiği bul
  SELECT * INTO v_cosmetic FROM cosmetic_items WHERE id = p_cosmetic_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Cosmetic not found');
  END IF;

  -- 2. Sahip mi kontrol et
  SELECT EXISTS(
    SELECT 1 FROM user_cosmetic_ownership
    WHERE user_id = p_user_id AND cosmetic_id = p_cosmetic_id
  ) INTO v_owns;
  IF NOT v_owns THEN
    RETURN jsonb_build_object('success', false, 'reason', 'Not owned');
  END IF;

  -- 3. Aynı kategorideki önceki giyiliyi sil
  DELETE FROM user_cosmetic_equipped
  WHERE user_id = p_user_id AND category = v_cosmetic.category;

  -- 4. Yeni giyiliyi ekle
  INSERT INTO user_cosmetic_equipped (user_id, category, cosmetic_id)
  VALUES (p_user_id, v_cosmetic.category, p_cosmetic_id);

  RETURN jsonb_build_object(
    'success', true,
    'category', v_cosmetic.category,
    'cosmetic_id', p_cosmetic_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================================================
-- Seed: başlangıç kozmetik kataloğu (12 öğe)
-- =============================================================================

INSERT INTO cosmetic_items (sku, name_tr, name_en, category, credit_price, rarity, sort_order, css_vars) VALUES
  -- Formlar (kit)
  ('kit_classic_home', 'Klasik Forma (Ev)', 'Classic Kit (Home)', 'kit', 25, 'common', 1,
   '{"primary": "#1a3a2a", "secondary": "#f5f5f0"}'),
  ('kit_emerald_away', 'Zümrüt Forma (Deplasman)', 'Emerald Kit (Away)', 'kit', 35, 'rare', 2,
   '{"primary": "#0e7490", "secondary": "#cffafe"}'),
  ('kit_gold_legend', 'Altın Forma (Efsane)', 'Gold Kit (Legend)', 'kit', 80, 'legendary', 3,
   '{"primary": "#fbbf24", "secondary": "#1f2937"}'),
  -- Rozetler (badge)
  ('badge_rookie', 'Çaylak Rozeti', 'Rookie Badge', 'badge', 15, 'common', 10, NULL),
  ('badge_veteran', 'Gazi Rozeti', 'Veteran Badge', 'badge', 40, 'rare', 11, NULL),
  ('badge_champion', 'Şampiyon Rozeti', 'Champion Badge', 'badge', 100, 'legendary', 12, NULL),
  -- Temalar (theme)
  ('theme_dark_pro', 'Koyu Pro Tema', 'Dark Pro Theme', 'theme', 30, 'rare', 20,
   '{"bg": "#0f172a", "card": "#1e293b", "border": "#334155"}'),
  ('theme_emerald_night', 'Zümrüt Gece Teması', 'Emerald Night Theme', 'theme', 50, 'epic', 21,
   '{"bg": "#022c22", "card": "#064e3b", "border": "#10b981"}'),
  -- Stadyum dekorları (stadium)
  ('stadium_classic', 'Klasik Stadyum', 'Classic Stadium', 'stadium', 40, 'common', 30, NULL),
  ('stadium_modern', 'Modern Arena', 'Modern Arena', 'stadium', 70, 'rare', 31, NULL),
  -- Toplar (ball)
  ('ball_classic', 'Klasik Top', 'Classic Ball', 'ball', 20, 'common', 40, NULL),
  ('ball_champions', 'Şampiyonlar Topu', 'Champions Ball', 'ball', 60, 'epic', 41, NULL)
ON CONFLICT (sku) DO NOTHING;

-- =============================================================================
-- Açıklamalar
-- =============================================================================

COMMENT ON TABLE cosmetic_items IS 'v2.9.46: Kozmetik katalog — forma, rozet, tema, stadyum, top, menajer';
COMMENT ON TABLE user_cosmetic_ownership IS 'v2.9.46: Kullanıcı sahipliği — kim hangi kozmetiği satın aldı';
COMMENT ON TABLE user_cosmetic_equipped IS 'v2.9.46: Kullanıcı giyili seçimi — her kategori için 1 tane';
COMMENT ON FUNCTION rpc_purchase_cosmetic IS 'v2.9.46: Atomic kozmetik satın alma (kredi düşür + sahiplik ekle)';
COMMENT ON FUNCTION rpc_equip_cosmetic IS 'v2.9.46: Kozmetik giy (kategori başına 1 tane)';
