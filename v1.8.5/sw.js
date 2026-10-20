/* ARS Site Audit service worker - offline cache */
const CACHE = 'ars-site-audit-v1.8.5';
const PREFIX = 'ars-site-audit-v';
const ASSETS = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-touch-icon.png', './icons/icon.svg', './pdf-lib.min.js', './quote-assets.js', './pdfjs.min.js', './pdfjs.worker.min.js'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting())); });
// only remove this app's own old caches (beta and live share the origin)
// go-live (1.8.3): pages still running the old device-only v1.2.x app are reloaded once onto the new version
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => { const old = ks.filter(k => k.startsWith(PREFIX) && k !== CACHE); const legacy = old.some(k => /^ars-site-audit-v1\.[0-2]\./.test(k));
  return Promise.all(old.map(k => caches.delete(k))).then(() => self.clients.claim()).then(() => legacy ? self.clients.matchAll({ type: 'window' }).then(cs => Promise.all(cs.filter(c => !new URL(c.url).pathname.includes('/beta/')).map(c => c.navigate(c.url).catch(() => null)))) : null); })); });
self.addEventListener('fetch', e => {
  const req = e.request; const url = new URL(req.url); if (req.method !== 'GET' || url.origin !== location.origin) return;
  if (url.pathname.startsWith(new URL('./beta/', self.registration.scope).pathname)) return;   // leave the beta app alone
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
