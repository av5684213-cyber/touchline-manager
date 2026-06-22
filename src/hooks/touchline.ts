"use client";

import { useEffect } from "react";

/**
 * Capacitor'a hazır yardımcılar — Haptics, safe-area, body scroll lock, swipe.
 * Native bridge yoksa (şu an) web fallback: navigator.vibrate, CSS env(), overflow hidden.
 */

export function haptic(pattern: "light" | "medium" | "heavy" | "success" | "error" = "light") {
  try {
    // Capacitor @capacitor/haptics native call placeholder
    // (gerçek native paketi eklenince: Haptics.impactAsync / notificationAsync)
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      const patterns: Record<string, number | number[]> = {
        light: 8,
        medium: 15,
        heavy: 25,
        success: [10, 30, 10],
        error: [25, 50, 25],
      };
      navigator.vibrate(patterns[pattern]);
    }
  } catch {
    /* ignore */
  }
}

/** Modal açıldığında body scroll lock — Capacitor + iOS Safari. */
export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const prev = document.body.style.overflow;
    const prevTouch = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";
    return () => {
      document.body.style.overflow = prev;
      document.body.style.touchAction = prevTouch;
    };
  }, [active]);
}

/**
 * Swipe gesture hook — yatay swipe algılar, eşik aşılınca callback çağırır.
 * Tab değiştirme için kullanılacak.
 */
export function useSwipe(opts: {
  onLeft?: () => void;
  onRight?: () => void;
  threshold?: number;
}) {
  const { onLeft, onRight, threshold = 60 } = opts;

  useEffect(() => {
    if (!onLeft && !onRight) return;
    let startX = 0;
    let startY = 0;
    let active = false;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      startX = t.clientX;
      startY = t.clientY;
      active = true;
    };
    const onEnd = (e: TouchEvent) => {
      if (!active) return;
      active = false;
      const t = e.changedTouches[0];
      const dx = t.clientX - startX;
      const dy = t.clientY - startY;
      if (Math.abs(dx) > Math.abs(dy) * 1.5 && Math.abs(dx) > threshold) {
        if (dx < 0 && onLeft) onLeft();
        if (dx > 0 && onRight) onRight();
      }
    };

    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
    };
  }, [onLeft, onRight, threshold]);
}
