// Service worker: red primero para el código de la app (así cada commit llega al recargar),
// caché como respaldo sin conexión. Nunca toca las llamadas a Supabase.
const CACHE = "recomp-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== CACHE) await caches.delete(k);
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname.endsWith("supabase.co")) return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const res = await fetch(req, { cache: "no-cache" }); // revalida siempre: ignora la caché HTTP de 10 min de GitHub Pages
      if (res && (res.ok || res.type === "opaque")) cache.put(req, res.clone());
      return res;
    } catch {
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      if (req.mode === "navigate") { const idx = await cache.match("./index.html"); if (idx) return idx; }
      throw new Error("offline");
    }
  })());
});
