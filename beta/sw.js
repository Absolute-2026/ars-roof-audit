/* ARS Site Audit BETA service worker - offline cache */
const CACHE = 'ars-site-audit-beta-v1.8.2';
const PREFIX = 'ars-site-audit-beta-v';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/icon.svg', './pdf-lib.min.js', './quote-assets.js', './pdfjs.min.js', './pdfjs.worker.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
// only remove this app's own old caches (beta and live share the origin)
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin) return;
  // stale-while-revalidate: serve from cache instantly (works offline), refresh cache in background
  e.respondWith(caches.open(CACHE).then(async c => {
    const key = req.mode === 'navigate' ? './index.html' : req;
    const hit = await c.match(key, { ignoreSearch: true });
    const net = fetch(req).then(r => { if (r && r.ok) c.put(key, r.clone()); return r; }).catch(() => null);
    return hit || (await net) || new Response('Offline', { status: 503 });
  }));
});
// v1.6.1 weekly-sheet reminders (Web Push). Tapping the notification opens today's column (or focuses the open app there).
self.addEventListener('push', e => {
  let d = {}; try { d = e.data ? e.data.json() : {}; } catch (x) { d = { body: e.data && e.data.text() }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Weekly site sheet', { body: d.body || 'Tick off today on your weekly sheet.', icon: './icons/icon-192.png', badge: './icons/icon-192.png', tag: d.tag || 'ars-today', renotify: true, data: { url: d.url || './#/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close(); const url = new URL((e.notification.data && e.notification.data.url) || './#/', self.registration.scope).href;
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    const c = cs.find(w => w.url.startsWith(self.registration.scope));
    if (c) { c.postMessage({ type: 'ars-open', url }); return c.focus().then(w => (w && 'navigate' in w ? w.navigate(url) : w)).catch(() => self.clients.openWindow(url)); }
    return self.clients.openWindow(url);
  }));
});
