// public/sw.js
const CACHE = "livedent-v13";
const OFFLINE_URL = "/offline.html";
const PRECACHE = ["/", "/offline.html"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.map((k) => (k !== CACHE ? caches.delete(k) : null))),
      ),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!request.url.startsWith(self.location.origin)) return;
  if (request.method !== "GET") return;
  event.respondWith(handle(request));
});

async function handle(request) {
  const cache = await caches.open(CACHE);

  // 1) أونلاين: جرّب الشبكة أولاً
  try {
    const response = await fetch(request);

    if (response && response.status === 200 && response.type !== "opaque") {
      // خزّن تحت **مفتاحين**:
      // (أ) المفتاح الكامل (URL + headers) — للطلبات المطابقة
      cache.put(request, response.clone()).catch(() => {});

      // (ب) مفتاح HTML-normalized — حتى لو كان الطلب RSC، خزّن نسخة تُستخدم لـ F5
      if (request.headers.get("RSC") === "1") {
        // هذا RSC — لا نخزّنه كمفتاح HTML (يفسد الصفحة)
      } else if (request.headers.get("accept")?.includes("text/html")) {
        // HTML — خزّنه أيضاً تحت مفتاح "بدون query"
        const url = new URL(request.url);
        const htmlKey = new Request(url.origin + url.pathname);
        cache.put(htmlKey, response.clone()).catch(() => {});
      }
    }
    return response;
  } catch {
    // 2) أوفلاين — ترتيب المحاولات:

    // (أ) تطابق تام (نفس URL + نفس headers)
    let cached = await cache.match(request);
    if (cached) return cached;

    // (ب) تطابق مع تجاهل الـ query (?tab=...)
    const url = new URL(request.url);

    // إذا كان طلب HTML: جرّب HTML مخزّن لنفس المسار أو مسار مشابه
    if (
      request.mode === "navigate" ||
      request.headers.get("accept")?.includes("text/html")
    ) {
      // جرّب HTML لنفس المسار بالضبط (بدون query)
      cached = await cache.match(url.origin + url.pathname);
      if (cached) return cached;

      // جرّب أي HTML/URL تحت نفس عائلة المسار
      // مثال: /dashboard/abc?tab=x → يبحث في /dashboard/abc?*
      cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
    }

    // إذا كان RSC: جرّب RSC لأي tab لنفس المسار
    if (request.headers.get("RSC") === "1") {
      cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
    }

    // (ج) fallback نهائي
    const offline = await cache.match(OFFLINE_URL);
    return offline ?? new Response("Offline", { status: 503 });
  }
}
