// public/sw.js

const CACHE_NAME = "livedent-go-v10"; 

// الصفحات الثابتة الأساسية (تُخزن دائماً)
const STATIC_ASSETS = [ "/offline.html"];

// قائمة التبويبات الأساسية للداشبورد
const DASHBOARD_TABS = [
  "?tab=main",
  "?tab=patients",
  "?tab=schedule",
  "?tab=treatments",
  "?tab=settings",
  "?tab=clinic",
  "?tab=cv",
];
self.addEventListener("message", (event) => {
  if (event.data?.type === "USER_LOGGED_IN") {
    console.log("[SW] User just logged in. Triggering dashboard precache...");
    // يمكنك هنا إعادة تشغيل منطق التخزين المسبق للداشبورد
    // أو ببساطة إخبار المستخدم بإعادة تحميل الصفحة
  }
});

self.addEventListener("install", (event) => {
  console.log("[SW] Installing v8...");

  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // 1. تخزين الأساسيات
      await cache
        .addAll(STATIC_ASSETS)
        .catch((err) =>
          console.warn("[SW] Failed to precache static assets:", err),
        );

      // 2. 🧠 التخزين الذكي للداشبورد بناءً على localStorage
      try {
        const currentClinicId = localStorage.getItem("currentClinicId");

        if (currentClinicId) {
          const baseUrl = `/dashboard/${currentClinicId}`;
          console.log(
            `[SW] Precaching dashboard for clinic: ${currentClinicId}`,
          );

          // تخزين الصفحة الرئيسية للداشبورد + جميع التبويبات الأساسية
          const urlsToPrecache = [
            baseUrl,
            ...DASHBOARD_TABS.map((tab) => `${baseUrl}${tab}`),
          ];

          // نستخدم Promise.allSettled لضمان عدم فشل التثبيت إذا فشل رابط واحد
          const results = await Promise.allSettled(
            urlsToPrecache.map((url) =>
              fetch(url).then((res) => {
                if (res.ok) return cache.put(url, res.clone());
                throw new Error(`Failed to fetch ${url}`);
              }),
            ),
          );

          // تسجيل أي روابط فشلت للتشخيص فقط
          results.forEach((result, index) => {
            if (result.status === "rejected") {
              console.warn(`[SW] Could not precache: ${urlsToPrecache[index]}`);
            }
          });
        } else {
          console.log("[SW] No clinic ID found, skipping dynamic precache.");
        }
      } catch (err) {
        console.warn("[SW] Dynamic precache failed:", err);
      }
    }),
  );

  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activating and cleaning old caches...");
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

  // 🛡️ تجاهل الطلبات الخارجية والإضافات
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.method !== "GET") return;

  event.respondWith(
    caches.match(request).then(async (cachedResponse) => {
      // إرجاع الكاش فوراً (سواء كان مخزناً مسبقاً أو ديناميكياً)
      if (cachedResponse) return cachedResponse;

      try {
        const networkResponse = await fetch(request);

        // تخزين الاستجابات الناجحة ديناميكياً للاستخدام المستقبلي
        if (networkResponse && networkResponse.status === 200) {
          const responseToCache = networkResponse.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(request, responseToCache));
        }

        return networkResponse;
      } catch (error) {
        // فشل الشبكة + لا يوجد كاش
        if (request.headers.get("accept")?.includes("text/html")) {
          return caches.match("/offline.html");
        }
        return new Response("Offline", { status: 503 });
      }
    }),
  );
});
