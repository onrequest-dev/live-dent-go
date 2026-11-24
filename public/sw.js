// public/sw.js
const CACHE = "livedent-v16";
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then(async (cache) => {
      for (const url of ["/", OFFLINE_URL]) {
        try {
          await cache.add(url);
        } catch (e) {
          console.warn(`[SW] skip ${url}:`, e);
        }
      }
    }),
  );
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
        const key = new Request(
          url.origin + url.pathname + url.search + "::rsc",
        );
        cache.put(key, response.clone()).catch(() => {});
      } else if (isHTML(request)) {
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
      // ❌ لا ignoreSearch — يعرض محتوى tab آخر
    }

    if (isHTML(request)) {
      // ✅ URL كامل فقط — لا query fallback
      cached = await cache.match(
        new Request(url.origin + url.pathname + url.search),
      );
      if (cached) return cached;
    }

    // تطابق تام
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
