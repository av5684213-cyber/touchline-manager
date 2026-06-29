// Touchline Manager Service Worker
// Cache static assets for offline use
const CACHE_NAME = "touchline-v1";
const STATIC_ASSETS = ["/", "/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // Sadece GET isteklerini cache'le
  if (req.method !== "GET") return;
  // Supabase API isteklerini cache'leme
  const url = new URL(req.url);
  if (url.hostname.includes("supabase")) return;

  // Network-first strategy: önce network, hata olursa cache
  event.respondWith(
    fetch(req)
      .then((res) => {
        // Başarılı response'u cache'le (sadece same-origin)
        if (res.ok && url.origin === self.location.origin) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, clone)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("/")))
  );
});
