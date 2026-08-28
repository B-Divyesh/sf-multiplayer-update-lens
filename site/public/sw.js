const CACHE = "ticklens-shell-v2";
const SHELL = ["/", "/ticklens-herbarium.webp", "/privacy/", "/terms/"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith("ticklens-") && key !== CACHE).map((key) => caches.delete(key)))).then(() => self.clients.claim()));
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || new URL(event.request.url).origin !== location.origin) return;
  if (event.request.mode === "navigate") {
    // Navigation must lead with the network. A static worker can otherwise
    // trap an installed client on an old HTML shell after a later deployment.
    const network = fetch(event.request);
    event.waitUntil(network.then((response) => cacheResponse(event.request, response)).catch(() => undefined));
    event.respondWith(network.catch(() => caches.match(event.request).then((cached) => cached ?? Response.error())));
    return;
  }
  const cached = caches.match(event.request);
  const network = cached.then((response) => response ? undefined : fetch(event.request));
  event.waitUntil(network.then((response) => response ? cacheResponse(event.request, response) : undefined).catch(() => undefined));
  event.respondWith(Promise.all([cached, network]).then(([cachedResponse, networkResponse]) => cachedResponse ?? networkResponse ?? Response.error()));
});

async function cacheResponse(request, response) {
  if (!response.ok) return;
  // Clone synchronously: respondWith() may consume the original while the
  // cache opens, after which the response body can no longer be cloned.
  const cacheCopy = response.clone();
  const cache = await caches.open(CACHE);
  await cache.put(request, cacheCopy);
}
