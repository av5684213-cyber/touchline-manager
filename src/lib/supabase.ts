"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 * SSR'de (static export) no-op stub döner.
 */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const isConfigured = Boolean(url && anon && !url.includes("YOUR-"));

// SSR'de stub — static export güvenliği
if (typeof window !== "undefined" && !isConfigured) {
  console.warn("[supabase] NEXT_PUBLIC_SUPABASE_URL veya ANON_KEY tanımlı değil");
}

export const supabase = isConfigured
  ? createBrowserClient(url!, anon!)
  : createBrowserClient("https://placeholder.supabase.co", "placeholder-anon-key");

export const isSupabaseConfigured = (): boolean => isConfigured;

export type { SupabaseClient } from "@supabase/supabase-js";
