"use client";

import { useEffect, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { supabase } from "@/lib/supabase/client";

/**
 * Cloud sync hook — uygulama state'i değiştikçe 3sn debounce ile
 * Supabase'e kaydeder. userId parametre gerektirmez — session'dan alır.
 *
 * Kullanım: App shell'in içinde bir kez çağır.
 */
export function useCloudSync() {
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasSessionRef = useRef(false);

  useEffect(() => {
    let active = true;

    // Session kontrolü
    async function checkSession() {
      const { data } = await supabase().auth.getSession();
      if (!active) return;
      hasSessionRef.current = !!data.session?.user?.id;
    }

    checkSession();

    const { data: sub } = supabase().auth.onAuthStateChange(() => {
      checkSession();
    });

    // State değişikliğini izle — debounce ile save
    const unsubscribe = useAppStore.subscribe((state, prevState) => {
      if (!hasSessionRef.current) return;

      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          // Taktik değiştiyse active_tactics tablosuna kaydet
          if (state.tactics !== prevState?.tactics) {
            await useAppStore.getState().saveTacticsToCloud("");
          }
        } catch {
          /* no-op */
        }
      }, 2000); // Taktik için 2sn debounce
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
      unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Sayfayı kapatırken son kayıt
  useEffect(() => {
    const handler = async () => {
      if (!hasSessionRef.current) return;
      try {
        await useAppStore.getState().saveToCloud("");
      } catch {
        /* no-op */
      }
    };
    window.addEventListener("beforeunload", handler);
    window.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") handler();
    });
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, []);
}
