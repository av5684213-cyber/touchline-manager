-- ════════════════════════════════════════════════════════════════════════════
-- v2.9.149: SUPABASE AUDIT SCRIPT
-- ════════════════════════════════════════════════════════════════════════════
-- Bu script'ten herhangi bir şeyi ÇALIŞTIRMAYIN — sadece SELECT'ler var.
-- Supabase Dashboard → SQL Editor → New query → yapıştır → Run
-- Çıktı: her satırda bir objenin var/yok durumu. Eksikler '⚠️ EKSİK' olarak işaretlenir.
-- ════════════════════════════════════════════════════════════════════════════

-- ═══ EXTENSIONS ═══
SELECT
  'EXTENSION: http (pg_http)' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'http')
       THEN '✅ var' ELSE '⚠️ EKSİK — Dashboard → Extensions → http → Install'
  END AS status;
SELECT
  'EXTENSION: uuid-ossp' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp')
       THEN '✅ var' ELSE '⚠️ EKSİK — Dashboard → Extensions → uuid-ossp → Install'
  END AS status;

-- ═══ TABLOLAR (kritik olanlar) ═══
SELECT 'TABLE: profiles' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')
       THEN '✅ var' ELSE '❌ EKSİK — migration 001' END AS status;
SELECT 'TABLE: teams' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'teams')
       THEN '✅ var' ELSE '❌ EKSİK — migration 002' END AS status;
SELECT 'TABLE: players' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'players')
       THEN '✅ var' ELSE '❌ EKSİK — migration 002' END AS status;
SELECT 'TABLE: fixtures' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fixtures')
       THEN '✅ var' ELSE '❌ EKSİK — migration 002' END AS status;
SELECT 'TABLE: standings' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'standings')
       THEN '✅ var' ELSE '❌ EKSİK — migration 002' END AS status;
SELECT 'TABLE: seasons' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seasons')
       THEN '✅ var' ELSE '❌ EKSİK — migration 002' END AS status;
SELECT 'TABLE: match_results' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'match_results')
       THEN '✅ var' ELSE '❌ EKSİK — migration 002' END AS status;
SELECT 'TABLE: app_state' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'app_state')
       THEN '✅ var' ELSE '❌ EKSİK — migration 002_app_state' END AS status;
SELECT 'TABLE: push_tokens' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'push_tokens')
       THEN '✅ var' ELSE '❌ EKSİK — migration 018/040' END AS status;
SELECT 'TABLE: forum_topics' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_topics')
       THEN '✅ var' ELSE '❌ EKSİK — migration 020' END AS status;
SELECT 'TABLE: forum_posts' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'forum_posts')
       THEN '✅ var' ELSE '❌ EKSİK — migration 020' END AS status;
SELECT 'TABLE: chat_messages' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_messages')
       THEN '✅ var' ELSE '❌ EKSİK — migration 012' END AS status;
SELECT 'TABLE: transfer_listings' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'transfer_listings')
       THEN '✅ var' ELSE '❌ EKSİK — migration 019' END AS status;
SELECT 'TABLE: blocked_users' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blocked_users')
       THEN '✅ var' ELSE '❌ EKSİK — migration 012' END AS status;
SELECT 'TABLE: redeemed_purchases' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'redeemed_purchases')
       THEN '✅ var' ELSE '❌ EKSİK — migration 025' END AS status;
SELECT 'TABLE: cosmetics' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cosmetics')
       THEN '✅ var' ELSE '❌ EKSİK — migration 024' END AS status;

-- ═══ RPC'LER (kritik olanlar) ═══
SELECT 'RPC: rpc_register_push_token' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_register_push_token')
       THEN '✅ var' ELSE '❌ EKSİK — migration 018/040' END AS status;
SELECT 'RPC: rpc_unregister_push_token' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_unregister_push_token')
       THEN '✅ var' ELSE '❌ EKSİK — migration 018/040' END AS status;
SELECT 'RPC: rpc_trigger_match_end_push' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_trigger_match_end_push')
       THEN '✅ var' ELSE '❌ EKSİK — migration 040 (v2.9.148+)' END AS status;
SELECT 'RPC: rpc_trigger_transfer_offer_push' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_trigger_transfer_offer_push')
       THEN '✅ var' ELSE '❌ EKSİK — migration 040 (v2.9.148+)' END AS status;
SELECT 'RPC: rpc_send_push_notification' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_send_push_notification')
       THEN '✅ var' ELSE '❌ EKSİK — migration 018' END AS status;
SELECT 'RPC: rpc_assign_team' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_assign_team')
       THEN '✅ var' ELSE '❌ EKSİK — migration 005' END AS status;
SELECT 'RPC: rpc_save_app_state' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_save_app_state')
       THEN '✅ var' ELSE '❌ EKSİK — migration 003_cloud_save' END AS status;
SELECT 'RPC: rpc_load_app_state' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_load_app_state')
       THEN '✅ var' ELSE '❌ EKSİK — migration 003_cloud_save' END AS status;
SELECT 'RPC: rpc_save_tactics' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_save_tactics')
       THEN '✅ var' ELSE '❌ EKSİK — migration 006' END AS status;
SELECT 'RPC: rpc_load_tactics' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'rpc_load_tactics')
       THEN '✅ var' ELSE '❌ EKSİK — migration 006' END AS status;

-- ═══ SETTINGS ═══
SELECT 'SETTING: app.fcm_server_key' AS object,
  CASE WHEN current_setting('app.fcm_server_key', true) IS NOT NULL
            AND current_setting('app.fcm_server_key', true) != ''
       THEN '✅ set (' || length(current_setting('app.fcm_server_key', true)) || ' chars)'
       ELSE '⚠️ EKSİK — ALTER DATABASE ... SET app.fcm_server_key = ''...'''
  END AS status;

-- ═══ RLS (samples) ═══
SELECT 'RLS: push_tokens enabled' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'push_tokens' AND rowsecurity = true)
       THEN '✅ enabled' ELSE '⚠️ EKSİK' END AS status;
SELECT 'RLS: teams enabled' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'teams' AND rowsecurity = true)
       THEN '✅ enabled' ELSE '⚠️ EKSİK' END AS status;
SELECT 'RLS: chat_messages enabled' AS object,
  CASE WHEN EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'chat_messages' AND rowsecurity = true)
       THEN '✅ enabled' ELSE '⚠️ EKSİK' END AS status;

-- ═══ EDGE FUNCTIONS (Supabase dashboard'dan kontrol edilebilir) ═══
-- Bu RPC varsa edge function'lar deploy edilmiş gibi davranır
SELECT 'CHECK: Edge Function daily-match-sim' AS object,
  'Supabase Dashboard → Edge Functions → kontrol et (5 func olmalı)' AS status;
SELECT 'CHECK: Edge Function send-match-end-push' AS object,
  'Supabase Dashboard → Edge Functions → kontrol et (v2.9.148+ eklenenler)' AS status;

-- ═══ ═══ ═══ ═══ ═══
-- Eksikleri buradan alın:
-- Migration 001 → 001_initial_schema.sql
-- Migration 002 → 002_touchline_manager.sql
-- Migration 003 → 003_cloud_save.sql
-- ...
-- Migration 040 → 040_push_notification_triggers.sql
-- Tüm migration'ları sırayla SQL Editor'dan çalıştırın
-- ═══ ═══ ═══ ═══ ═══
