// Beekey Medics service worker — makes the app installable and usable on flaky networks.
// Code & pages: network first (always fresh when online), cache as offline fallback.
// Photos & icons: cache first (they rarely change).
const CACHE = 'beekey-v7';
const SHELL = ['./', 'index.html', 'css/styles.css', 'js/app.js', 'js/data.js', 'js/store.js', 'js/hex.js', 'js/partner.js',
  'js/icons.js', 'js/icons-care.js', 'js/admin.js', 'js/features.js', 'js/livemap.js', 'js/native.js', 'js/config.js', 'js/db.js', 'assets/logo.svg', 'assets/icon-192.png', 'manifest.webmanifest'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const isMedia = /\.(webp|png|jpg|jpeg|svg)$/.test(url.pathname);
  if (isMedia) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })));
    return;
  }
  e.respondWith(fetch(req).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)); return res; })
    .catch(() => caches.match(req).then((hit) => hit || caches.match('index.html'))));
});
// Tapping a reminder notification opens the app on the reminders tab.
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then((list) => (list[0] ? list[0].focus() : self.clients.openWindow('./#/orders/reminders'))));
});
