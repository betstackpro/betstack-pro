// betstack sw — SELF-DESTRUCT build.
// This deliberately unregisters the service worker and wipes all caches on
// every device, ending the stale-cache loop. After this propagates, the app
// always loads fresh from the network. We can reintroduce caching later.
self.addEventListener('install', e => { self.skipWaiting(); });
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
    } catch (err) {}
    try { await self.registration.unregister(); } catch (err) {}
    try {
      const clientsList = await self.clients.matchAll({ type: 'window' });
      clientsList.forEach(c => c.navigate(c.url));
    } catch (err) {}
  })());
});
// Never serve from cache — always go to network.
self.addEventListener('fetch', e => { return; });
