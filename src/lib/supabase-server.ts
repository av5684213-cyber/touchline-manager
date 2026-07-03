import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client.
 *
 * - `createServerClient`: Next.js App Router için, user'ın session'ını cookie'den okur
 *   (Server Components, Route Handlers, Server Actions)
 * - `createAdminClient`: service_role key ile, RLS bypass eder
 *   (sadece güvenli server-side işlemler için — cron jobs, admin işlemleri)
 */

export async function createServerSupabase(): Promise<SupabaseClient> {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component içinde çağrılırsa set yapamaz — sorun değil
          }
        },
      },
    }
  );
}

/**
 * Admin client — service_role key ile, RLS bypass eder.
 * SADECE server-side'da kullan (API routes, cron jobs, admin işlemleri).
 * ASLA client'a expose etme.
 */
export function createAdminClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
