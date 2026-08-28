const CACHE = "ticklens-shell-v1";
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
  event.respondWith(caches.match(event.request).then((cached) => cached ?? fetch(event.request).then((response) => {
    void cacheResponse(event.request, response);
    return response;
  })));
});

async function cacheResponse(request, response) {
  if (response.ok) await (await caches.open(CACHE)).put(request, response.clone());
}
