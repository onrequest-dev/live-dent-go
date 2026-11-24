// public/sw.js

const CACHE_NAME = "livedent-go-v1";
const ASSETS_TO_CACHE = ["/", "/offline.html"];

// ✅ 1. التثبيت
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE)),
  );
  self.skipWaiting();
});

// ✅ 2. التنظيف
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

// ✅ 3. الاعتراض الذكي (Network First Strict)
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // تجاهل أي طلب ليس GET (مثل POST, PUT, DELETE)
  // هذه الطلبات ستذهب للشبكة مباشرة، وإذا فشلت سيعالجها كود التطبيق (IndexedDB)
  if (request.method !== "GET") return;

  event.respondWith(
    fetch(request)
      .then((networkResponse) => {
        // ✅ نحن هنا لأن الإنترنت موجود والطلب نجح

        // تحديث الكاش في الخلفية للاستخدام المستقبلي عند انقطاع النت
        // ملاحظة: نقوم بعمل clone لأن الـ Response يمكن قراءته مرة واحدة فقط
        const responseToCache = networkResponse.clone();

        caches.open(CACHE_NAME).then((cache) => {
          // نحفظ فقط الاستجابات الناجحة (Status 200)
          if (networkResponse.status === 200) {
            cache.put(request, responseToCache);
          }
        });

        // إرجاع الاستجابة الجديدة من السيرفر للمستخدم فوراً
        return networkResponse;
      })
      .catch(() => {
        // ✅ نحن هنا لأن الإنترنت غير موجود أو فشل الطلب

        // محاولة البحث عن نسخة مخزنة سابقاً
        return caches.match(request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse; // عرض البيانات القديمة
          }

          // إذا لم يوجد كاش (صفحة جديدة)، عرض صفحة الأوفلاين
          if (request.headers.get("accept").includes("text/html")) {
            return caches.match("/offline.html");
          }

          // لطلبات API الفاشلة وغير الموجودة في الكاش، نعيد خطأ ليتم معالجته من قبل التطبيق
          return new Response(JSON.stringify({ error: "Offline" }), {
            headers: { "Content-Type": "application/json" },
            status: 503,
          });
        });
      }),
  );
});
