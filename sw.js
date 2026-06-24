/* ==========================================================================
   GURUKRUPA WHOLESALE DEPOT - PREMIUM PWA SERVICE WORKER (sw.js)
   ========================================================================== */

const CACHE_NAME = 'gurukrupa-premium-v1';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './qrious.min.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker Premium] Pre-caching local static shell');
      return cache.addAll(ASSETS);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker Premium] Removing obsolete cache store:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (!e.request.url.startsWith('http')) return;

  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(e.request).then((networkResponse) => {
        // Dynamically cache external web fonts
        if (
          networkResponse.status === 200 &&
          (e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com'))
        ) {
          return caches.open(CACHE_NAME).then((cache) => {
            cache.put(e.request, networkResponse.clone());
            return networkResponse;
          });
        }
        return networkResponse;
      }).catch((err) => {
        console.warn('[Service Worker Premium] Offline fetch failure:', err);
      });
    })
  );
});
