// public/sw.js

const CACHE_NAME = "livedent-go-v11"; 
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

  // 🛡️ 1. تجاهل طلبات الإضافات والبروتوكولات غير المدعومة فوراً
  if (!request.url.startsWith(self.location.origin)) return;

  // 2. تجاهل طلبات الكتابة
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      // إرجاع الكاش فوراً إذا وجد
      if (cachedResponse) return cachedResponse;

      try {
        const networkResponse = await fetch(request);

        // ✅ 3. التخزين الآمن (نسخ الاستجابة قبل استخدامها)
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return networkResponse;
      } catch (error) {
        // 4. فشل الشبكة + لا يوجد كاش
        if (request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/offline.html");
        }

        // إرجاء استجابة صالحة بدلاً من undefined لمنع انهيار الـ SW
        return new Response("Offline", { status: 503 });
      }
    }),
  );
});
