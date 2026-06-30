"use client";

import { useEffect } from "react";

/**
 * iOS Klavye scroll lock hook'u.
 *
 * Input focus olduğunda body'yi fixed yapar (klavye açıldığında
 * fixed bottom nav'ın klavyenin üstüne binmesini önler).
 * Blur olduğunda eski haline getirir.
 *
 * Event delegation kullanır — document seviyesinde tek listener,
 * tüm mevcut ve gelecek inputları otomatik yakalar (tab değişse bile).
 */
export function useKeyboardScrollLock() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleFocusIn = () => {
      const target = document.activeElement;
      if (!target) return;
      const tag = (target.tagName || "").toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
      // Sadece iOS'ta veya küçük ekranlarda uygula (klavye açılan cihazlar)
      if (window.innerWidth > 768) return;
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    };
    const handleFocusOut = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      const tag = (target.tagName || "").toLowerCase();
      if (tag !== "input" && tag !== "textarea" && tag !== "select") return;
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    };

    // Event delegation: focus bubbles, document seviyesinde yakala
    document.addEventListener("focusin", handleFocusIn);
    document.addEventListener("focusout", handleFocusOut);
    return () => {
      document.removeEventListener("focusin", handleFocusIn);
      document.removeEventListener("focusout", handleFocusOut);
    };
  }, []);
}
