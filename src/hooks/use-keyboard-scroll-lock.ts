"use client";

import { useEffect } from "react";

/**
 * iOS Klavye scroll lock hook'u.
 *
 * Input focus olduğunda body'yi fixed yapar (klavye açıldığında
 * fixed bottom nav'ın klavyenin üstüne binmesini önler).
 * Blur olduğunda eski haline getirir.
 *
 * Kullanım:
 *   const { onInputFocus, onInputBlur } = useKeyboardScrollLock();
 *   <input onFocus={onInputFocus} onBlur={onInputBlur} ... />
 *
 * Veya hook'u otomatik uygulamak için:
 *   useKeyboardScrollLock(); // sayfa genelinde tüm inputlara uygular
 */
export function useKeyboardScrollLock() {
  useEffect(() => {
    // Tüm input/textarea/select'lere otomatik focus/blur handler ekle
    const handleFocus = () => {
      document.body.style.overflow = "hidden";
      document.body.style.position = "fixed";
      document.body.style.width = "100%";
      document.body.style.top = `-${window.scrollY}px`;
    };
    const handleBlur = () => {
      const scrollY = document.body.style.top;
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
      document.body.style.top = "";
      if (scrollY) {
        window.scrollTo(0, parseInt(scrollY || "0", 10) * -1);
      }
    };

    // iOS'ta klavye açıldığında focus event'ini yakala
    const inputs = document.querySelectorAll("input, textarea, select");
    inputs.forEach((el) => {
      el.addEventListener("focus", handleFocus);
      el.addEventListener("blur", handleBlur);
    });

    return () => {
      inputs.forEach((el) => {
        el.removeEventListener("focus", handleFocus);
        el.removeEventListener("blur", handleBlur);
      });
    };
  }, []);
}
