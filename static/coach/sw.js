// Coach Timer is verhuisd naar https://coach.bckn.be. Alle andere adressen onder /coach/
// sturen daarheen door (netlify.toml). Dit bestand blijft staan, omdat een browser een
// service worker niet via een doorverwijzing bijwerkt: deze versie ruimt de oude kopie op,
// schrijft zich uit en stuurt open vensters naar het nieuwe adres.

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k.startsWith("coach-timer")).map((k) => caches.delete(k)));
    await self.registration.unregister();
    for (const client of await self.clients.matchAll({ type: "window" })) {
      client.navigate("https://coach.bckn.be/");
    }
  })());
});
