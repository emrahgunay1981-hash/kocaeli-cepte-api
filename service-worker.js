const CACHE_NAME = "kocaeli-cepte-v1";
const PRECACHE_URLS = ["/index.html", "/manifest.json"];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  // API isteklerini önbelleğe alma, her zaman ağdan çek (haberler/eczaneler güncel kalsın)
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).catch(() => caches.match("/index.html"));
    })
  );
});

