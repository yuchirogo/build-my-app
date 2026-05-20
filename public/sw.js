// BlindGuard AI Service Worker — offline shell + model cache
const VERSION = "v1";
const SHELL = `bg-shell-${VERSION}`;
const MODEL = `bg-model-${VERSION}`;

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(SHELL).then((c) => c.addAll(["/", "/manifest.json"]).catch(() => {}))
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Cache trọng số mô hình TFJS / COCO-SSD (rất lớn, ít đổi)
  const isModel =
    url.hostname.includes("tfhub.dev") ||
    url.hostname.includes("storage.googleapis.com") ||
    url.pathname.endsWith(".bin") ||
    url.pathname.includes("model.json");

  if (isModel) {
    e.respondWith(
      caches.open(MODEL).then(async (cache) => {
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const res = await fetch(req);
          if (res.ok) cache.put(req, res.clone());
          return res;
        } catch (err) {
          return hit ?? Response.error();
        }
      })
    );
    return;
  }

  // App shell: stale-while-revalidate cho same-origin GET
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.open(SHELL).then(async (cache) => {
        const hit = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res.ok && res.type === "basic") cache.put(req, res.clone());
          return res;
        }).catch(() => hit);
        return hit || network;
      })
    );
  }
});
