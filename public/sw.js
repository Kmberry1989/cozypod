const CACHE = 'cozypod-shell-v2';
const SHELL = './';
const CORE_ASSETS = [
  './',
  './manifest.webmanifest',
  './art/v2/cozypod-wordmark.webp',
  './art/v2/lounge-rainy.webp',
  './art/v2/lantern-keepers.webp',
  './art/podling/body-teal.png',
  './art/podling/body-lime.png',
  './art/podling/body-mint.png',
  './art/podling/body-lilac.png',
  './art/podling/face-happy.png',
  './art/podling/face-sleepy.png',
  './art/podling/face-starry.png',
  './art/podling/sprout-leaf.png',
  './art/podling/sprout-flower.png',
  './art/podling/sprout-mushroom.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(Promise.all([
    caches.keys().then((keys) => Promise.all(keys.filter((key) => key.startsWith('cozypod-') && key !== CACHE).map((key) => caches.delete(key)))),
    self.clients.claim(),
  ]));
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(fetch(request).then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE);
        await cache.put(SHELL, response.clone());
      }
      return response;
    }).catch(() => caches.match(SHELL, { ignoreSearch: true })));
    return;
  }

  if (!['script', 'style', 'image', 'font'].includes(request.destination)) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then(async (response) => {
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  })));
});
