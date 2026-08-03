-- =============================================================================
-- v2.9.70: blocked_users kolon fix + RPC güncelle
-- =============================================================================
-- Migration 028 kolon adlarını değiştirdi (blocker_id → blocker_user_id)
-- ama rpc_get_blocked_users (migration 012) ve client kodu eski adlarla kaldı.
-- Bu migration RPC'yi düzeltir.
-- =============================================================================

-- Eski RPC'yi drop et
DROP FUNCTION IF EXISTS rpc_get_blocked_users(UUID);

-- Yeni RPC — doğru kolon adlarıyla
CREATE OR REPLACE FUNCTION rpc_get_blocked_users(p_user_id UUID)
RETURNS TABLE (
  blocked_user_id UUID,
  blocked_at TIMESTAMPTZ
) AS $$
BEGIN
  SELECT blocked_user_id, created_at
  INTO blocked_user_id, blocked_at
  FROM blocked_users
  WHERE blocker_user_id = p_user_id;
  RETURN QUERY
  SELECT blocked_user_id, created_at
  FROM blocked_users
  WHERE blocker_user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON rpc_get_blocked_users TO authenticated;
