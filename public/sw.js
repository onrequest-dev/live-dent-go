// public/sw.js
const CACHE = "livedent-v15";
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

  // 1) أونلاين أولاً
  try {
    const response = await fetch(request);

    if (response && response.status === 200) {
      if (isRSC(request)) {
        // مفتاح موحّد لـ RSC (يتجاهل headers Next الداخلية)
        const key = new Request(
          url.origin + url.pathname + url.search + "::rsc",
        );
        cache.put(key, response.clone()).catch(() => {});
      } else if (isHTML(request)) {
        // HTML: خزّن تحت URL كامل (مع query)
        const key = new Request(url.origin + url.pathname + url.search);
        cache.put(key, response.clone()).catch(() => {});
      } else {
        cache.put(request, response.clone()).catch(() => {});
      }
    }
    return response;
  } catch {
    // 2) أوفلاين
    let cached;

    if (isRSC(request)) {
      const key = new Request(url.origin + url.pathname + url.search + "::rsc");
      cached = await cache.match(key);
      if (cached) return cached;

      // fallback: أي tab آخر لنفس المسار
      cached = await cache.match(key, { ignoreSearch: true });
      if (cached) return cached;
    }

    if (isHTML(request)) {
      // HTML: URL كامل أولاً (مع tab)
      cached = await cache.match(
        new Request(url.origin + url.pathname + url.search),
      );
      if (cached) return cached;

      // fallback: بدون query (لكن فقط إذا كنا لا نملك query)
      if (!url.search) {
        cached = await cache.match(new Request(url.origin + url.pathname));
        if (cached) return cached;
      }
    }

    // تطابق تام عام
    cached = await cache.match(request);
    if (cached) return cached;

    // fallback نهائي
    if (isHTML(request)) {
      const off = await cache.match(OFFLINE_URL);
      if (off) return off;
    }

    return new Response("Offline", { status: 503 });
  }
}
