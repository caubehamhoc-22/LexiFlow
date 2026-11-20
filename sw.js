const CACHE_PREFIX = `lexiflow:${self.registration.scope}:`;
const CACHE = `${CACHE_PREFIX}3.1`;
const ASSETS = [
  './', './index.html', './styles.css', './app.js', './scheduler.js',
  './ipa-en-us.txt', './manifest.webmanifest', './icons/icon.svg',
  './icons/icon-192.png', './icons/icon-512.png',
];
const assetURLs = new Set(ASSETS.map(asset => new URL(asset, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache =>
    cache.addAll(ASSETS.map(asset => new Request(
      new URL(asset, self.registration.scope), {cache: 'reload'}
    )))
  ));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  if (request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(async cache => {
      const url = new URL(request.url);
      url.search = '';
      const entry = url.href === self.registration.scope ||
        url.href === new URL('./index.html', self.registration.scope).href;
      if (entry) return (await cache.match('./index.html')) || fetch(request);
      return fetch(request);
    }));
  } else if (assetURLs.has(request.url)) {
    event.respondWith(caches.open(CACHE).then(async cache =>
      (await cache.match(request)) || fetch(request)
    ));
  }
});
