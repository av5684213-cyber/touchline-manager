/**
 * Supabase bağlantı testi
 * .env'deki değerlerle Supabase'e bağlanıp tabloları kontrol eder
 */
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

async function testConnection() {
  console.log("=== SUPABASE BAĞLANTI TESTİ ===\n");
  console.log("URL:", SUPABASE_URL);
  console.log("Anon Key:", SUPABASE_ANON_KEY?.substring(0, 30) + "...");

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
  });

  // 1. Auth kontrol
  console.log("\n1. Auth durumu...");
  const { data: authData, error: authError } = await supabase.auth.getSession();
  console.log("   Session:", authData.session ? "Var" : "Yok (anonim)");
  if (authError) console.log("   Hata:", authError.message);

  // 2. user_game_state tablosu kontrol
  console.log("\n2. user_game_state tablosu...");
  const { data: gameState, error: gameStateError } = await supabase
    .from("user_game_state")
    .select("*")
    .limit(1);
  if (gameStateError) {
    console.log("   Hata:", gameStateError.message);
    console.log("   → Tablo yok veya RLS engelliyor (migration gerekli)");
  } else {
    console.log("   ✅ Tablo erişilebilir, kayıt sayısı:", gameState?.length ?? 0);
  }

  // 3. profiles tablosu kontrol
  console.log("\n3. profiles tablosu...");
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("*")
    .limit(1);
  if (profilesError) {
    console.log("   Hata:", profilesError.message);
  } else {
    console.log("   ✅ Tablo erişilebilir");
  }

  // 4. teams tablosu kontrol
  console.log("\n4. teams tablosu...");
  const { data: teams, error: teamsError } = await supabase
    .from("teams")
    .select("*")
    .limit(1);
  if (teamsError) {
    console.log("   Hata:", teamsError.message);
  } else {
    console.log("   ✅ Tablo erişilebilir, takım sayısı:", teams?.length ?? 0);
  }

  // 5. RPC test — rpc_load_game_state
  console.log("\n5. RPC: rpc_load_game_state...");
  const { data: rpcData, error: rpcError } = await supabase.rpc("rpc_load_game_state", {
    p_profile_id: "00000000-0000-0000-0000-000000000000",
  });
  if (rpcError) {
    console.log("   Hata:", rpcError.message);
    console.log("   → RPC yok (migration gerekli)");
  } else {
    console.log("   ✅ RPC erişilebilir, sonuç:", JSON.stringify(rpcData)?.substring(0, 100));
  }

  // 6. Auth signup test (test kullanıcısı)
  console.log("\n6. Auth: Test kaydı...");
  const testEmail = `test_${Date.now()}@touchline.test`;
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: "TestPassword123!",
  });
  if (signUpError) {
    console.log("   Hata:", signUpError.message);
  } else {
    console.log("   ✅ Kayıt başarılı! User ID:", signUpData.user?.id);
    console.log("   Email:", testEmail);

    // 7. State kaydetme testi
    if (signUpData.user?.id) {
      console.log("\n7. RPC: rpc_save_game_state...");
      const testState = { test: true, timestamp: Date.now() };
      const { error: saveError } = await supabase.rpc("rpc_save_game_state", {
        p_profile_id: signUpData.user.id,
        p_state: testState,
        p_version: 1,
      });
      if (saveError) {
        console.log("   Hata:", saveError.message);
      } else {
        console.log("   ✅ State kaydedildi!");

        // 8. State yükleme testi
        console.log("\n8. RPC: rpc_load_game_state (tekrar)...");
        const { data: loadData, error: loadError } = await supabase.rpc("rpc_load_game_state", {
          p_profile_id: signUpData.user.id,
        });
        if (loadError) {
          console.log("   Hata:", loadError.message);
        } else {
          console.log("   ✅ State yüklendi:", JSON.stringify(loadData));
        }
      }
    }
  }

  console.log("\n=== TEST TAMAMLANDI ===");
}

testConnection().catch(console.error);
