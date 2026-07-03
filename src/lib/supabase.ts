"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 *
 * Kullanım:
 *   import { supabase } from "@/lib/supabase";
 *   const { data } = await supabase.from("profiles").select("*");
 *
 * Bu client anon key kullanır — RLS (Row Level Security) ile korunur.
 * Service role key ASLA burada kullanılmaz.
 */

if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL tanımlı değil");
}
if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn("[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil");
}

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
};

export type { SupabaseClient } from "@supabase/supabase-js";
