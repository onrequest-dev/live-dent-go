// public/sw.js

const CACHE_NAME = "livedent-go-v2"; // ✅ تغيير الإصدار لإجبار التحديث
const STATIC_ASSETS = [
  "/",
  "/offline.html",
  // أضف هنا الأيقونات أو الخطوط الثابتة إن وجدت
];

// ✅ التثبيت وتخزين الأساسيات فقط
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// ✅ التنظيف
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

// ✅ الاعتراض الذكي والمخصص لـ Next.js
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // تجاهل طلبات POST/PUT/DELETE تماماً
  if (request.method !== "GET") return;

  // تحديد نوع الطلب (صفحة HTML أم ملف ثابت أم API)
  const isHtmlRequest = request.headers.get("accept")?.includes("text/html");
  const isNextAsset = request.url.includes("/_next/");

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // 1. إذا وجدنا نسخة مخزنة، نعرضها فوراً (للسرعة القصوى أوفلاين)
      if (cachedResponse) {
        return cachedResponse;
      }

      // 2. إذا لم تكن مخزنة، نذهب للشبكة
      return fetch(request)
        .then((response) => {
          // نخزن فقط الاستجابات الناجحة
          if (response.status === 200) {
            const responseToCache = response.clone();
            caches
              .open(CACHE_NAME)
              .then((cache) => cache.put(request, responseToCache));
          }
          return response;
        })
        .catch(() => {
          // 3. فشل الشبكة + لا يوجد كاش = عرض صفحة الأوفلاين (للصفحات فقط)
          if (isHtmlRequest) {
            return caches.match("/offline.html");
          }
          // لملفات JS/CSS/API الفاشلة، نرجع خطأ ليتم التعامل معه داخلياً
          return new Response("Offline", { status: 503 });
        });
    }),
  );
});
