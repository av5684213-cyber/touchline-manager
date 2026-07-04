"use client";
import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      // Sadece http/https protokolünde kayıt yap (file:// değil — APK'da zararsız)
      if (window.location.protocol.startsWith("http")) {
        navigator.serviceWorker.register("/sw.js", { scope: "/" })
          .then((reg) => console.log("[SW] registered:", reg.scope))
          .catch((err) => console.error("[SW] error:", err));
      }
    }
  }, []);
  return null;
}
