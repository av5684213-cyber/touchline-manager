"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { useSupabaseAuth } from "@/lib/auth/auth-context";

/**
 * v2.9.20 GÖREV 8 — FCM Push Notification Hook.
 *
 * v2.9.52: PUSH_NOTIFICATIONS_ENABLED = false
 * Seçenek B uygulandı — sahte ANDROID_ID token gönderimi devre dışı.
 * Gerçek Firebase entegrasyonu yapılana kadar push'lar kapalı.
 *
 * İleride Seçenek A'ya geçiş:
 *   1. google-services.json ekle
 *   2. firebase-messaging SDK bağımlılığa ekle
 *   3. FirebaseMessagingService oluştur
 *   4. PUSH_NOTIFICATIONS_ENABLED = true yap
 *   5. getFCMToken() içinde gerçek FCM token al
 */

// v2.9.52: Feature flag — false iken backend'e hiç token gönderilmez
const PUSH_NOTIFICATIONS_ENABLED = false;

const FCM_TOKEN_STORAGE_KEY = "tm_fcm_token";

/**
 * FCM token'ı al.
 *
 * Web tarafında: Firebase Messaging initialize edilmişse token alır, yoksa null döner.
 * Android WebView'de: AndroidNative.getFCMToken() JS bridge'i kullanılır.
 */
async function getFCMToken(): Promise<string | null> {
  try {
    // Android WebView — JS bridge
    if (typeof window !== "undefined" && (window as any).AndroidNative?.getFCMToken) {
      const token = (window as any).AndroidNative.getFCMToken();
      if (typeof token === "string" && token.length > 0) {
        return token;
      }
    }

    // Web — Firebase Messaging (yüklü ve initialize edilmişse)
    // Şu an için Firebase config olmadığından no-op
    // İleride: const messaging = getMessaging(); return await getToken(messaging);

    // LocalStorage cache (geliştirme amaçlı)
    if (typeof window !== "undefined") {
      const cached = localStorage.getItem(FCM_TOKEN_STORAGE_KEY);
      if (cached) return cached;
    }
  } catch (e) {
    console.warn("[fcm] getFCMToken exception:", e);
  }
  return null;
}

/**
 * Platform tespiti.
 */
function getPlatform(): "android" | "ios" | "web" {
  if (typeof window === "undefined") return "web";
  if ((window as any).AndroidNative?.getFCMToken) return "android";
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
  return "web";
}

/**
 * Ana hook — uygulama açılınca çağrılır.
 * Kullanıcı giriş yapmışsa FCM token'ı alır, Supabase'e kaydeder.
 */
export function usePushNotifications() {
  const { user } = useSupabaseAuth();
  const registeredRef = useRef<string | null>(null);

  useEffect(() => {
    // v2.9.52: Push notifications devre dışı — sahte token gönderme
    if (!PUSH_NOTIFICATIONS_ENABLED) return;
    if (!user) return;

    let active = true;
    let pollInterval: ReturnType<typeof setInterval> | null = null;

    async function register() {
      try {
        const token = await getFCMToken();
        if (!active || !token) return;
        if (registeredRef.current === token) return; // zaten kayıtlı

        const { supabase } = await import("@/lib/supabase/client");
        const { error } = await supabase().rpc("rpc_register_push_token", {
          p_token: token,
          p_platform: getPlatform(),
        });

        if (error) {
          console.warn("[fcm] register error:", error.message);
          return;
        }

        registeredRef.current = token;
        console.log("[fcm] Push token registered for user:", user?.id);

        // LocalStorage cache
        if (typeof window !== "undefined") {
          localStorage.setItem(FCM_TOKEN_STORAGE_KEY, token);
        }
      } catch (e: any) {
        console.warn("[fcm] register exception:", e?.message ?? e);
      }
    }

    // İlk deneme — 1 saniye sonra (auth state settle olsun)
    const initialTimeout = setTimeout(register, 1000);

    // Android'de token hemen hazır olmayabilir — 30 saniyede bir dene (max 5 dk)
    pollInterval = setInterval(register, 30000);

    return () => {
      active = false;
      if (initialTimeout) clearTimeout(initialTimeout);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [user]);

  // Çıkış yapınca token sil
  useEffect(() => {
    return () => {
      if (registeredRef.current) {
        // Token cleanup — async olarak çalıştır
        (async () => {
          try {
            const { supabase } = await import("@/lib/supabase/client");
            await supabase().rpc("rpc_unregister_push_token", {
              p_token: registeredRef.current,
            });
            console.log("[fcm] Push token unregistered");
          } catch {
            // no-op
          }
        })();
        registeredRef.current = null;
      }
    };
  }, [user]);
}

/**
 * Helper: Belirli bir kullanıcıya bildirim gönder (admin/test amaçlı).
 * Production'da Edge Function tarafından çağrılır.
 */
export async function sendTestPushNotification(
  userId: string,
  title: string,
  body: string
): Promise<{ success: boolean; reason?: string }> {
  try {
    const { supabase } = await import("@/lib/supabase/client");
    // Bu RPC service-role çağrılmalı, normal client yetkisiz
    // Test amaçlı RPC'yi de çağırabilir (RLS permite etmez ama)
    const { data, error } = await supabase().rpc("rpc_send_push_notification", {
      p_user_id: userId,
      p_title: title,
      p_body: body,
      p_data: { type: "test" },
    });
    if (error) {
      return { success: false, reason: error.message };
    }
    return { success: data?.success ?? false };
  } catch (e: any) {
    return { success: false, reason: e?.message ?? "unknown" };
  }
}

/**
 * Helper: Cihazdan FCM token al (Android JS bridge ile).
 * MainActivity.java'da AndroidNative.getFCMToken() metodu tanımlı olmalı.
 */
export async function fetchFCMToken(): Promise<string | null> {
  return getFCMToken();
}
