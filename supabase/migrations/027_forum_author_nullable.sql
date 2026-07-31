-- =============================================================================
-- Touchline Manager — 027: Forum author_id NULL atanabilir (v2.9.53)
-- =============================================================================
-- Hesap silme sırasında forum gönderileri anonimleştirilecek.
-- author_id NULL olabilmeli ki "Silinmiş kullanıcı" olarak korunsun.
-- =============================================================================

-- forum_topics.author_id: NOT NULL → NULL atanabilir
ALTER TABLE forum_topics ALTER COLUMN author_id DROP NOT NULL;

-- forum_replies.author_id: NOT NULL → NULL atanabilir
ALTER TABLE forum_replies ALTER COLUMN author_id DROP NOT NULL;

-- redeemed_purchases.user_id: NOT NULL → NULL atanabilir (yasal kayıt korunsun)
ALTER TABLE redeemed_purchases ALTER COLUMN user_id DROP NOT NULL;

-- teams.manager_user_id zaten NULL atanabilir (bot takımlar NULL)

COMMENT ON COLUMN forum_topics.author_id IS 'v2.9.53: NULL olabilir (hesap silme sonrası anonimleştirme)';
COMMENT ON COLUMN forum_replies.author_id IS 'v2.9.53: NULL olabilir (hesap silme sonrası anonimleştirme)';
COMMENT ON COLUMN redeemed_purchases.user_id IS 'v2.9.53: NULL olabilir (yasal kayıt korunur, ilişki kopar)';

-- ─── Rollback ────────────────────────────────────────────────────────────────
-- Geri almak için:
-- ALTER TABLE forum_topics ALTER COLUMN author_id SET NOT NULL;
-- ALTER TABLE forum_replies ALTER COLUMN author_id SET NOT NULL;
-- ALTER TABLE redeemed_purchases ALTER COLUMN user_id SET NOT NULL;
