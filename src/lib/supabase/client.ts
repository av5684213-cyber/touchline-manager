import { createClient as createSupabaseClient } from "@supabase/supabase-js";

let _client: any = null;

// SSR-safe stub — Supabase erişilemezse veya SSR'deyse no-op döner
function createStub() {
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      signInWithPassword: async () => ({ data: null, error: new Error("Supabase not configured") }),
      signUp: async () => ({ data: null, error: new Error("Supabase not configured") }),
      signInWithOAuth: async () => ({ data: null, error: new Error("Supabase not configured") }),
      signOut: async () => ({ error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: () => ({
      select: () => ({ data: null, error: new Error("Not configured"), eq: () => ({ data: null, error: null, maybeSingle: () => ({ data: null, error: null }), single: () => ({ data: null, error: null }), limit: () => ({ data: null, error: null }), order: () => ({ data: null, error: null }) }), in: () => ({ data: null, error: null, order: () => ({ data: null, error: null }) }), maybeSingle: () => ({ data: null, error: null }), limit: () => ({ data: null, error: null }), order: () => ({ data: null, error: null }) }),
      insert: () => ({ data: null, error: new Error("Not configured") }),
      update: () => ({ data: null, error: new Error("Not configured"), eq: () => ({ data: null, error: null }) }),
      upsert: () => ({ data: null, error: new Error("Not configured") }),
      delete: () => ({ data: null, error: new Error("Not configured"), eq: () => ({ data: null, error: null }) }),
    }),
    channel: () => ({ on: () => ({ subscribe: () => {} }) }),
    removeChannel: () => {},
    rpc: async () => ({ data: null, error: null }),
  } as any;
}

export function createClient() {
  // SSR'de (typeof window === undefined) stub döner — static export güvenliği
  if (typeof window === "undefined") return createStub();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon || url.includes("YOUR-")) {
    return createStub();
  }
  return createSupabaseClient(url, anon, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "tm.supabase.auth", storage: window.localStorage },
  });
}

export function supabase() {
  if (!_client) _client = createClient();
  return _client;
}
