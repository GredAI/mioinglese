/* Service worker — cache per uso offline. Cambia CACHE per forzare l'aggiornamento. */
var CACHE = 'inglese-v12';
var ASSETS = [
  './', './index.html', './style.css?v=12', './app.js?v=12', './data.js?v=12',
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
// Network-first: se c'è rete prende sempre l'ultima versione (e aggiorna la cache),
// altrimenti usa la copia salvata (offline).
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then(function (res) {
      var copy = res.clone();
      caches.open(CACHE).then(function (c) { c.put(e.request, copy); });
      return res;
    }).catch(function () { return caches.match(e.request); })
  );
});
