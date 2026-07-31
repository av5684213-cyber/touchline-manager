-- =============================================================================
-- Touchline Manager — 025: Satın Alma Doğrulama (v2.9.53)
-- =============================================================================
-- Server-side purchase verification için redeemed_purchases tablosu.
-- verify-purchase Edge Function her doğrulamada bu tabloya kayıt ekler.
-- Aynı purchaseToken ikinci kez gönderilirse reddedilir (replay attack önleme).
-- =============================================================================

CREATE TABLE IF NOT EXISTS redeemed_purchases (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  purchase_token TEXT NOT NULL UNIQUE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  credits_granted INTEGER NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- İndeks — token lookup için (UNIQUE constraint zaten indeksli ama ekstra)
CREATE INDEX IF NOT EXISTS idx_redeemed_purchases_token
  ON redeemed_purchases(purchase_token);

CREATE INDEX IF NOT EXISTS idx_redeemed_purchases_user
  ON redeemed_purchases(user_id, verified_at DESC);

-- RLS — kullanıcı sadece kendi redeemed kayıtlarını okuyabilir
-- Yazma sadece service role (Edge Function) tarafından yapılır
ALTER TABLE redeemed_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "redeemed_purchases_select_own" ON redeemed_purchases;
CREATE POLICY "redeemed_purchases_select_own"
  ON redeemed_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT/UPDATE/DELETE — sadece service role (client'tan yok)
DROP POLICY IF EXISTS "redeemed_purchases_insert_none" ON redeemed_purchases;
CREATE POLICY "redeemed_purchases_insert_none"
  ON redeemed_purchases FOR INSERT
  WITH CHECK (false);

DROP POLICY IF EXISTS "redeemed_purchases_update_none" ON redeemed_purchases;
CREATE POLICY "redeemed_purchases_update_none"
  ON redeemed_purchases FOR UPDATE
  USING (false);

DROP POLICY IF EXISTS "redeemed_purchases_delete_none" ON redeemed_purchases;
CREATE POLICY "redeemed_purchases_delete_none"
  ON redeemed_purchases FOR DELETE
  USING (false);

COMMENT ON TABLE redeemed_purchases IS
  'v2.9.53: Server-side purchase verification — redeemed purchase tokens (replay attack prevention)';
