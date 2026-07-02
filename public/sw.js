// BlindGuard AI Service Worker
// - App shell: NetworkFirst cho navigation (không cache-first HTML)
// - Assets hashed: CacheFirst
// - Model TFJS: CacheFirst dài hạn
// - Offline fallback: /offline.html
const VERSION = "v2";
const SHELL = `bg-shell-${VERSION}`;
const MODEL = `bg-model-${VERSION}`;
const ASSETS = `bg-assets-${VERSION}`;

const OFFLINE_URLS = ["/", "/offline.html", "/manifest.json"];

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(caches.open(SHELL).then((c) => c.addAll(OFFLINE_URLS).catch(() => {})));
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

self.addEventListener("message", (e) => {
  if (e.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Bỏ qua OAuth / API động
  if (url.pathname.startsWith("/~oauth") || url.pathname.startsWith("/api/")) return;

  // Trọng số mô hình TFJS
  const isModel =
    url.hostname.includes("tfhub.dev") ||
    url.hostname.includes("storage.googleapis.com") ||
    url.pathname.endsWith(".bin") ||
    url.pathname.includes("model.json");

  if (isModel) {
    e.respondWith(cacheFirst(req, MODEL));
    return;
  }

  // HTML navigation → NetworkFirst + fallback offline
  const isNav = req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html");
  if (isNav && url.origin === self.location.origin) {
    e.respondWith(networkFirstHtml(req));
    return;
  }

  // Same-origin static assets (hashed) → CacheFirst
  if (url.origin === self.location.origin && /\.(js|css|woff2?|ttf|png|jpg|jpeg|svg|webp|ico)$/i.test(url.pathname)) {
    e.respondWith(cacheFirst(req, ASSETS));
  }
});

async function cacheFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    return hit ?? Response.error();
  }
}

async function networkFirstHtml(req) {
  const cache = await caches.open(SHELL);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch {
    const hit = (await cache.match(req)) || (await cache.match("/")) || (await cache.match("/offline.html"));
    return hit ?? new Response("Bạn đang ngoại tuyến", { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
}
