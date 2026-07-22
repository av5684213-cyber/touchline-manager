// v2.9.11: Push notification ölü kodu kaldırıldı
// Bu service worker WebView native kabuğunda çalışmıyor (FCM entegrasyonu yok).
// Sadece offline cache için tutuluyor — push/notificationclick event'leri silindi.

const CACHE_NAME = 'touchline-v1';
const OFFLINE_URL = '/offline';

const STATIC_ASSETS = [
  '/',
  '/offline',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/manifest.json',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/api/')) return;

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request)
        .then(cached => cached || caches.match('/offline'))
      )
  );
});

// v2.9.11: push ve notificationclick event'leri kaldırıldı
// (native WebView kabuğunda FCM yok — bu kod hiç tetiklenmiyordu)
