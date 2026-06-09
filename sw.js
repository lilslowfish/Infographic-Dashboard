const CACHE_NAME = 'f1-hud-cache-v1';
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './privacy.html'
];

// Install Event: pre-cache critical assets
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event: clean up old caches
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event: Stale-While-Revalidate strategy
self.addEventListener('fetch', (e) => {
  // Only cache GET requests (ignore chrome-extension, APIs, etc.)
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) {
    return;
  }

  e.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(e.request).then((cachedResponse) => {
        const fetchPromise = fetch(e.request).then((networkResponse) => {
          if (networkResponse.status === 200) {
            cache.put(e.request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => {
          // If offline and request fails, return cached response if available
          return cachedResponse;
        });

        // Return cached response instantly (fast load), fallback to network fetch
        return cachedResponse || fetchPromise;
      });
    })
  );
});
