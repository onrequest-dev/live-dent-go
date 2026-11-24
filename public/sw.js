// public/sw.js
const CACHE = "livedent-v14";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(["/", OFFLINE_URL])));
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

function isRSC(request) {
  return request.headers.get("RSC") === "1";
}

function isHTML(request) {
  return (
    request.mode === "navigate" ||
    (request.headers.get("accept") || "").includes("text/html")
  );
}

async function handle(request) {
  const cache = await caches.open(CACHE);
  const url = new URL(request.url);

  // مفتاح موحّد
  const rscKey = () =>
    new Request(url.origin + url.pathname + url.search + "::rsc");

  // 1) أونلاين أولاً
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      if (isRSC(request)) {
        // خزّن RSC تحت مفتاح موحّد (يتجاهل headers Next الداخلية)
        cache.put(rscKey(), response.clone()).catch(() => {});
      } else if (isHTML(request)) {
        // خزّن HTML تحت pathname (بدون query) — يخدم كل التابات
        cache
          .put(new Request(url.origin + url.pathname), response.clone())
          .catch(() => {});
        // وخزّن أيضاً تحت URL الكامل
        cache
          .put(
            new Request(url.origin + url.pathname + url.search),
            response.clone(),
          )
          .catch(() => {});
      } else {
        cache.put(request, response.clone()).catch(() => {});
      }
    }
    return response;
  } catch {
    // 2) أوفلاين
    let cached;

    if (isRSC(request)) {
      // RSC: طابق الرابط الكامل أولاً
      cached = await cache.match(rscKey());
      if (cached) return cached;
      // ثم أي tab آخر لنفس المسار
      cached = await cache.match(rscKey(), { ignoreSearch: true });
      if (cached) return cached;
    }

    if (isHTML(request)) {
      // HTML: URL كامل
      cached = await cache.match(
        new Request(url.origin + url.pathname + url.search),
      );
      if (cached) return cached;
      // بدون query
      cached = await cache.match(new Request(url.origin + url.pathname));
      if (cached) return cached;
    }

    // تطابق تام عام
    cached = await cache.match(request);
    if (cached) return cached;

    // fallback
    if (isHTML(request)) {
      const off = await cache.match(OFFLINE_URL);
      if (off) return off;
    }

    return new Response("Offline", { status: 503 });
  }
}
