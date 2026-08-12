"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * SSR'de (static export) no-op stub döner.
 *
 * v2.9.149 FIX: env var yoksa hardcoded production URL'ye düşer.
 * Anon key env var'dan gelmeli (güvenlik nedeniyle hardcoded değil).
 * Eğer env var yoksa stub client döner ve isSupabaseConfigured=false olur.
 *
 * APP'i çalıştırırken (özellikle Android APK): .env dosyası oluşturun:
 *   NEXT_PUBLIC_SUPABASE_URL=https://jmxbyaamwbpnvgbnjbmo.supabase.co
 *   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (Supabase Dashboard → Settings → API → anon public)
 */

// Hardcoded fallback — proje URL'i migration'larda da hardcoded (014, 030)
const HARDCODED_SUPABASE_URL = "https://jmxbyaamwbpnvgbnjbmo.supabase.co";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || HARDCODED_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
// Anon KEY hardcoded DEĞİL — güvenlik açısından env var'dan gelmeli.
// Eğer anon key yoksa, "bağlı değil" moduna düşer (önceki davranış).
const isConfigured = Boolean(anon && !anon.includes("YOUR-") && !anon.includes("placeholder"));

// SSR'de stub — static export güvenliği
if (typeof window !== "undefined" && !isConfigured) {
  console.warn(
    "[supabase] NEXT_PUBLIC_SUPABASE_ANON_KEY tanımlı değil.\n" +
    "Çözüm: .env dosyası oluşturun:\n" +
    "  NEXT_PUBLIC_SUPABASE_URL=https://jmxbyaamwbpnvgbnjbmo.supabase.co\n" +
    "  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc... (Supabase Dashboard → Settings → API → anon public)\n" +
    "Sonra: npm run build && bash scripts/build-apk.sh"
  );
}

export const supabase = isConfigured
  ? createBrowserClient(url, anon!)
  : createBrowserClient("https://placeholder.supabase.co", "placeholder-anon-key");

export const isSupabaseConfigured = (): boolean => isConfigured;
export const getSupabaseUrl = (): string => url;

export type { SupabaseClient } from "@supabase/supabase-js";
