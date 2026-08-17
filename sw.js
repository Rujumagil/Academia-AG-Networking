const CACHE = 'academia-ag-v20260817.6';
const STATIC_ASSETS = [
  './',
  './index.html',
  './academia.html',
  './404.html',
  './styles.css?v=20260817.6',
  './app.js?v=20260817.6',
  './bootstrap.js?v=20260817.6',
  './lesson-experience.js?v=20260817.6',
  './supabase-config.js?v=20260817.6',
  './manifest.json',
  './diagnostico.html',
  './limpiar-cache.html',
  './verificar-imagenes.html',
  './curso-utah-driver.webp',
  './curso-emprende-utah.webp',
  './curso-finanzas.webp',
  './curso-marketing.webp',
  './curso-ingles.webp',
  './hero-academia.webp',
  './icon-192.png',
  './icon-512.png',
  './icono-oficial.png',
  './logo-completo-oficial.png',
  './logo-texto-oficial.png',
  './logo.webp',
  './recurso-utah-driver.webp',
  './recurso-manual-ag.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(STATIC_ASSETS.map(asset => cache.add(asset)))
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const isCritical = event.request.mode === 'navigate' || (sameOrigin && /\.(?:html|js|css)$/i.test(url.pathname));

  if (isCritical) {
    event.respondWith(
      fetch(event.request, { cache: 'no-store' })
        .then(response => {
          if (response.ok && sameOrigin) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
          return response;
        })
        .catch(() => caches.match(event.request).then(cached => cached || caches.match('./academia.html') || caches.match('./index.html')))
    );
    return;
  }

  if (sameOrigin) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
        if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
        return response;
      }))
    );
  }
});
