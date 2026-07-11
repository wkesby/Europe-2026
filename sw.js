/* Europe 2026 — service worker
   Strategies:
   - HTML + data.enc : network-first (fresh when online), cache fallback (works offline)
   - Wikimedia photos : cache-first (never change; saves mobile data)
   - other same-origin: stale-while-revalidate
   Bump VERSION to force-refresh all caches after big changes. */
const VERSION = 'europe2026-v7';
const CORE = [
  './',
  './index.html',
  './mobile.html',
  './cinematic.html',
  './data.enc',
  './cinematic.enc',
  './tickets/louvre.enc',
  './tickets/versailles.enc',
  './tickets/fever.enc',
  './tickets/vatican.enc',
  './tickets/sorrento.enc',
  './tickets/adolfo.enc',
  './tickets/mama.enc',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil((async () => {
    const cache = await caches.open(VERSION);
    // Add individually so one miss doesn't abort the whole precache
    await Promise.all(CORE.map(u => cache.add(u).catch(() => {})));
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Wikimedia landmark photos + Leaflet/unpkg + Google Fonts — cache-first, immutable
  if (url.hostname.endsWith('wikimedia.org') || url.hostname === 'unpkg.com'
      || url.hostname.endsWith('openstreetmap.org')
      || url.hostname.endsWith('googleapis.com') || url.hostname.endsWith('gstatic.com')) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const hit = await cache.match(req);
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return new Response('', { status: 504 }); // img onerror -> SVG scene fallback
      }
    })());
    return;
  }

  if (url.origin !== location.origin) return; // leave other cross-origin alone

  // data.json — network-first; normalise the ?v= cache-buster so offline lookups hit
  if (url.pathname.endsWith('/data.enc') || url.pathname.endsWith('/cinematic.enc')) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      const key = new Request(url.pathname); // strip query for a stable cache key
      try {
        const res = await fetch(req, { cache: 'no-store' });
        if (res.ok) cache.put(key, res.clone());
        return res;
      } catch (err) {
        const hit = await cache.match(key) || await cache.match('./data.json');
        return hit || new Response('{}', { headers: { 'Content-Type': 'application/json' } });
      }
    })());
    return;
  }

  // HTML navigations — network-first with cache fallback
  if (req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/')) {
    e.respondWith((async () => {
      const cache = await caches.open(VERSION);
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        return (await cache.match(req, { ignoreSearch: true }))
            || (await cache.match('./mobile.html'))
            || new Response('Offline', { status: 503 });
      }
    })());
    return;
  }

  // Everything else same-origin — stale-while-revalidate
  e.respondWith((async () => {
    const cache = await caches.open(VERSION);
    const hit = await cache.match(req, { ignoreSearch: true });
    const refresh = fetch(req).then(res => {
      if (res && res.ok) cache.put(req, res.clone());
      return res;
    }).catch(() => null);
    return hit || (await refresh) || new Response('', { status: 504 });
  })());
});
