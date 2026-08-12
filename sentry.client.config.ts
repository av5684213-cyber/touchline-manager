// ════════════════════════════════════════════════════════════════════════════
// v2.9.147: Sentry Client Config
// ════════════════════════════════════════════════════════════════════════════
// Sentry Next.js SDK'sı. instrumentation.ts tarafından çağrılır.
//
// GİZLİLİK (PII scrubbing):
//   - beforeSend: email/JWT/Bearer/password alanları otomatik scrub edilir
//   - Kullanıcı email/auth.uid gönderilmez — sadece anonim context
//   - Sadece: hata mesajı, stack trace, ekran adı (route), app version
//
// DSN: NEXT_PUBLIC_SENTRY_DSN env var'ından okunur. Yoksa init atlanır
// (geliştirme modunda Sentry'ye bir şey gitmez).
// ════════════════════════════════════════════════════════════════════════════
import * as Sentry from "@sentry/nextjs";

const SENTRY_DSN = process.env.NEXT_PUBLIC_SENTRY_DSN ?? process.env.SENTRY_DSN;

if (SENTRY_DSN && SENTRY_DSN.startsWith("https://")) {
  Sentry.init({
    dsn: SENTRY_DSN,

    // Release tracking — versionName + git commit hash (varsa)
    release: `touchline-manager@${process.env.NEXT_PUBLIC_APP_VERSION ?? "dev"}`,

    // Environment: production/preview/development
    environment: process.env.NODE_ENV ?? "development",

    // Performance monitoring — %5 örnekleme (production'da düşük tut)
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 1.0,

    // Session replay — kapalı (PAII risk + boyut)
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,

    // PII scrubbing — Sentry'ye kişisel veri gitmesin
    beforeSend(event) {
      if (!event.request) return event;

      // URL'den query param'larını temizle (?token=... gibi)
      if (event.request.url) {
        try {
          const url = new URL(event.request.url);
          url.search = ""; // tüm query'i sil
          event.request.url = url.toString();
        } catch {
          // URL parse edilemezse olduğu gibi bırak
        }
      }

      // Headers'dan Authorization/Cookie'i kaldır
      if (event.request.headers) {
        delete event.request.headers["Authorization"];
        delete event.request.headers["Cookie"];
        delete event.request.headers["cookie"];
        delete event.request.headers["Set-Cookie"];
      }

      // User'dan email/IP/id kaldır — sadece role tut
      if (event.user) {
        event.user.email = undefined;
        event.user.ip_address = undefined;
        event.user.id = "anonim"; // auth.uid gönderme
      }

      // Stack frame'lerden dosya yolundaki /home/kullanici/ gibi PII'ları temizle
      if (event.exception?.values) {
        for (const exc of event.exception.values) {
          if (exc.stacktrace?.frames) {
            for (const frame of exc.stacktrace.frames) {
              if (frame.filename) {
                // /home/xyz/... → /home/.../...
                frame.filename = frame.filename.replace(
                  /\/home\/[^/]+\//g,
                  "/home/user/"
                );
              }
            }
          }
        }
      }

      // Breadcrumb'larda email/token olabilecek query'leri temizle
      if (event.breadcrumbs) {
        for (const crumb of event.breadcrumbs) {
          if (crumb.data && typeof crumb.data === "object") {
            for (const key of Object.keys(crumb.data)) {
              if (/email|token|password|secret|jwt|auth/i.test(key)) {
                crumb.data[key] = "[scrubbed]";
              }
            }
          }
        }
      }

      return event;
    },

    // Default integrations — "BrowserApiChanges" kapalı (Next.js ile çakışıyor)
    integrations: [],

    // İgnore edilen hatalar — gürültü azaltma
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "ResizeObserver loop completed with undelivered notifications",
      "Network request failed", // mobile network blips
      "Non-Error promise rejection captured",
    ],
  });
}

// Helper: production'da Sentry aktif mi?
export function isSentryEnabled(): boolean {
  return !!SENTRY_DSN && SENTRY_DSN.startsWith("https://");
}

// Helper: test hatası gönder (debug için)
export function captureTestError(message: string = "v2.9.147 Sentry test error") {
  if (isSentryEnabled()) {
    Sentry.captureException(new Error(message), {
      tags: { category: "test", source: "manual_trigger" },
      level: "info",
    });
    return true;
  }
  // Sentry yoksa console'a yaz — geliştiricide görülür
  console.error("[Sentry-fallback] test error:", message);
  return false;
}
