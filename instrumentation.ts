// ════════════════════════════════════════════════════════════════════════════
// v2.9.147: Next.js Instrumentation Hook — Sentry başlatma
// ════════════════════════════════════════════════════════════════════════════
// Next.js 16 instrumentation.ts — hem server hem client tarafında çağrılır.
// Sentry.client.config.ts SENTRY_DSN varsa init eder, yoksa atlar.
//
// Production'da NEXT_PUBLIC_SENTRY_DSN env var'ı ile DSN set edilir.
// DSN örnek: https://xxx@yyy.ingest.sentry.io/123
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Server-side — Sentry Node SDK (lazy import)
    try {
      const Sentry = await import("@sentry/nextjs");
      const DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;
      if (DSN && DSN.startsWith("https://")) {
        Sentry.init({
          dsn: DSN,
          release: `touchline-manager@${process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}`,
          environment: process.env.NODE_ENV ?? "development",
          tracesSampleRate: 0.05,
        });
      }
    } catch (e) {
      console.warn("[Sentry] Server-side init failed:", e);
    }
  }
  // Client-side — sentry.client.config.ts otomatik import edilir Next.js tarafından
  // (sentry.client.config.ts dosyası kök dizinde varsa).
}

export async function onRequestError() {
  // Server Components ve Route Handlers'da yakalanan hataları Sentry'ye gönder
  try {
    const Sentry = await import("@sentry/nextjs");
    Sentry.captureException(new Error("Server Component error"));
  } catch {
    // Sentry yüklenmemiş olabilir — sessiz geç
  }
}
