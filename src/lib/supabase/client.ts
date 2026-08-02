// v2.9.72 — Duplicates eliminated.
//
// Bu modül ESKİDEN ayrı bir Supabase browser client oluşturuyordu
// (kendi storageKey: "tm.supabase.auth" ile). Bu, primary client
// (@/lib/supabase) ile oturum çakışmasına ve RLS hatalarına yol açıyordu:
//   - Kullanıcı giriş yapınca primary client oturum açar (default storageKey)
//   - rpc_assign_team_to_user_v2 secondary client'tan çağrılıyordu
//   - Secondary client'ın oturumu boş → RLS reddeder, takım atanmıyordu
//
// Geriye dönük uyumluluk için aynı export isimlerini koruyoruz, ama artık
// hepsi primary client'a işaret ediyor. Eski `supabase()` fonksiyon çağrısı
// pattern'i destekleniyor — primary singleton'ı döndürür.

import { supabase as _primarySupabase } from "@/lib/supabase";

export { _primarySupabase as _primarySupabase };

/**
 * Eski API: `supabase()` şeklinde fonksiyon olarak çağrılırdı.
 * Artık primary client'ı döndürür.
 *
 * Yeni kodda doğrudan `import { supabase } from "@/lib/supabase"` kullanın.
 */
export function supabase() {
  return _primarySupabase;
}

/**
 * Primary client'a doğrudan erişim (named export).
 * Eski çağrıların `{ supabase }` destructure'ı bunu yakalar — ama eski
 * kodlar bunu fonksiyon olarak çağırıyordu. Şimdi hem nesne hem fonksiyon
 * olarak kullanılabilir (function olduğu için çağrılabilir, ama aynı zamanda
 * property erişimi yapılınca primary client'ın method'larını kullanır).
 *
 * Bu, Proxy kullanmadan iki pattern'i de destekleyen en basit yöntem.
 */
export const supabaseClient = _primarySupabase;

// Varsayılan export — primary client
export default _primarySupabase;
