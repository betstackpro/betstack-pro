// Betstack Pro service worker
// Network-first for the page (so updates always show), cache-first for static assets.
// CRITICAL: never caches API/auth/payment calls — those must always hit the live network.
const CACHE = 'betstack-v12';
const ASSETS = [
  '/', '/index.html', '/manifest.webmanifest',
  '/icon-192.png', '/icon-512.png', '/icon-maskable-512.png', '/apple-touch-icon.png'
];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return; // never touch POSTs (login, register, checkout)
  let url;
  try { url = new URL(req.url); } catch (_) { return; }

  // Never cache the backend Worker or any /api/ traffic — always go to network.
  if (url.hostname.endsWith('workers.dev') || url.pathname.startsWith('/api/')) return;

  // Page navigations: network-first, fall back to cached shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('/index.html')))
    );
    return;
  }

  // Static assets: cache-first, then network.
  e.respondWith(
    caches.match(req).then(m =>
      m || fetch(req).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(req, cp)); return r; }).catch(() => m)
    )
  );
});
