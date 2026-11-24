// public/sw.js

const CACHE_NAME = "livedent-go-v4"; 
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

  // تجاهل طلبات الكتابة والطلبات الداخلية للمتصفح
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      // 1. إذا وجدنا نسخة مخزنة، نعرضها فوراً
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. إذا لم توجد، نذهب للشبكة
      try {
        const networkResponse = await fetch(request);

        // ✅ التأكد من أن الاستجابة ناجحة وقابلة للتخزين
        if (networkResponse && networkResponse.status === 200) {
          // ننسخ الاستجابة BEFORE إرجاعها للمتصفح
          const responseToCache = networkResponse.clone();

          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }

        return networkResponse;
      } catch (error) {
        // 3. فشل الشبكة + لا يوجد كاش

        // للصفحات HTML فقط نعرض صفحة الأوفلاين
        if (request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/offline.html");
        }

        // للملفات الأخرى (JS, CSS, Images) نرجع خطأ واضح
        // بدلاً من إرجاع undefined الذي يسبب خطأ Failed to convert
        return new Response("Offline Resource", {
          status: 503,
          statusText: "Service Unavailable",
        });
      }
    }),
  );
});
