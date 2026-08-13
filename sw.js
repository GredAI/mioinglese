/* Service worker — cache per uso offline. Cambia CACHE per forzare l'aggiornamento. */
var CACHE = 'inglese-v5';
var ASSETS = [
  './', './index.html', './style.css', './app.js', './data.js',
  './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }));
  self.skipWaiting();
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.map(function (k) { if (k !== CACHE) return caches.delete(k); }));
  }));
  self.clients.claim();
});
self.addEventListener('fetch', function (e) {
  e.respondWith(
    caches.match(e.request).then(function (r) { return r || fetch(e.request); })
  );
});
