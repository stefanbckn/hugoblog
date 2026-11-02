// Bewaart de app op het toestel, zodat ze ook zonder bereik op het veld werkt.
// Eerst het netwerk (zo krijg je altijd de nieuwste versie), anders de kopie.
// Verhoog VERSION als er een bestand bijkomt of wegvalt.

const VERSION = "coach-timer-v2";
const FILES = [
  "./", "index.html", "app.css", "manifest.webmanifest",
  "js/app.js", "js/model.js", "js/store.js",
  "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png",
  "sounds/start.wav", "sounds/stop.wav", "sounds/warning.wav", "sounds/whistle.wav", "sounds/finish.wav",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== location.origin) return;
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request, { ignoreSearch: true })),
  );
});
