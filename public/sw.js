// public/sw.js

const CACHE_NAME = "livedent-go-v3"; // ✅ تغيير الإصدار مجدداً
const STATIC_ASSETS = ["/", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)),
        ),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // 1. إرجاع النسخة المخزنة فوراً للسرعة القصوى
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse.status === 200) {
            // 2. تحديث الكاش في الخلفية إذا كان الرد ناجحاً
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, networkResponse.clone()));
          }
          return networkResponse;
        })
        .catch(() => cachedResponse); // إذا فشل النت، نكتفي بالكاش الموجود

      // 3. إذا لم يوجد كاش أصلاً، انتظر الشبكة
      return cachedResponse || fetchPromise;
    }),
  );
});
