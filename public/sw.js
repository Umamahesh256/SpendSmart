self.addEventListener('install', (event) => {
  // Force the new service worker to become active immediately
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear all caches
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          return caches.delete(cacheName);
        })
      );
    }).then(() => {
      // Claim clients to take control immediately
      return self.clients.claim();
    }).then(() => {
      // Unregister the service worker
      self.registration.unregister();
    })
  );
});

// Pass through all fetch requests to network
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request));
});
