/* AFH presentation service worker — offline shell + update channel (RC3) */
const CACHE = "afh-shell-v2";
const ASSETS = ["/", "/manifest.webmanifest", "/icons/afh-192.svg", "/icons/afh-512.svg"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: "AFH_SW_ACTIVATED" }));
        }),
      ),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "AFH_SKIP_WAITING") {
    void self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  // Never intercept cross-origin requests: they were never cached (see the
  // same-origin guard below), and answering a failed cross-origin fetch with
  // an undefined fallback makes Firefox reject the whole request with a
  // ServiceWorker error instead of letting the browser handle it natively.
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok) {
            void caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch((err) => {
          if (cached) return cached;
          throw err;
        });
      return cached || network;
    }),
  );
});
