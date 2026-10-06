// =========================================================
// KOCAELİ CEPTE - SERVICE WORKER
// =========================================================
// Strateji: ÖNCE İNTERNET (network-first).
// Uygulama her açıldığında sayfanın en güncel hâli internetten
// çekilir ve bir kopyası kaydedilir. İnternet yoksa kayıtlı
// kopya gösterilir. Böylece GitHub'a yapılan her değişiklik
// uygulamaya hemen yansır.
//
// Not: Bu dosyada büyük bir değişiklik yaparsan CACHE_NAME'deki
// sürüm numarasını artır (v2 -> v3). Eski kayıtlar silinir.
// =========================================================

const CACHE_NAME = "kocaeli-cepte-v2";
const PRECACHE_URLS = ["/", "/index.html", "/manifest.json"];

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
  const request = event.request;

  // Sadece GET isteklerini ele al.
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Başka sitelere giden istekler (hava durumu, haber resimleri vb.)
  // ve API istekleri: hiç karışma, doğrudan internetten gelsin.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then(response => {
        // Başarılı cevabın bir kopyasını kaydet (internetsiz kullanım için).
        if (response && response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      })
      .catch(() =>
        // İnternet yoksa: kayıtlı kopya, o da yoksa ana sayfa.
        caches.match(request).then(cached => cached || caches.match("/index.html"))
      )
  );
});
