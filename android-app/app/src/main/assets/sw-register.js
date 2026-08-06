// Tailwind v4 — service worker registration
// PWA: offline support for cached assets
const SW_PATH = "/sw.js";

if (typeof window !== "undefined" && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register(SW_PATH).catch((err) => {
      console.warn("[SW] registration failed:", err);
    });
  });
}
