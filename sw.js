const CACHE = 'academia-ag-v20260819.16';
const STATIC_ASSETS = [
  './',
  './index.html',
  './academia.html',
  './importar-alumnos.html',
  './404.html',
  './styles.css?v=20260817.13',
  './premium-learning.css?v=20260817.13',
  './home-course-cards.css?v=20260817.13',
  './sidebar-enterprise.css?v=20260817.14',
  './sidebar-icons-premium.css?v=20260817.15',
  './mis-cursos-appletv.css?v=20260817.16',
  './evaluaciones-premium.css?v=20260817.17',
  './biblioteca-premium.css?v=20260817.18',
  './certificados-premium.css?v=20260817.19',
  './perfil-premium.css?v=20260817.20',
  './calendario-premium.css?v=20260817.21',
  './calendario-hotfix.css?v=20260817.22',
  './admin-dashboard-ejecutivo.css?v=20260818.1',
  './admin-dashboard-tabs.css?v=20260818.2',
  './admin-dashboard-corporativo.css?v=20260818.3',
  './first-login-password.css?v=20260818.4',
  './student-experience-premium.css?v=20260819.6',
  './app.js?v=20260817.12',
  './bootstrap.js?v=20260819.14',
  './video-source-guard.js?v=20260819.16',
  './youtube-utah-player-fast.js?v=20260819.16',
  './student-experience-premium.js?v=20260819.6',
  './student-course-flow.js?v=20260819.14',
  './questionnaire-flow.js?v=20260819.15',
  './lesson-experience.js?v=20260817.12',
  './video-fix.js?v=20260817.12',
  './quiz-randomizer.js?v=20260817.12',
  './course-structure.js?v=20260819.14',
  './premium-learning.js?v=20260817.12',
  './lesson-cleanup.js?v=20260817.12',
  './module-exam.js?v=20260817.12',
  './sidebar-icons-premium.js?v=20260817.15',
  './evaluaciones-premium.js?v=20260817.17',
  './perfil-premium.js?v=20260817.20',
  './calendario-premium.js?v=20260817.22',
  './admin-dashboard-ejecutivo.js?v=20260818.1',
  './admin-dashboard-tabs.js?v=20260818.2',
  './first-login-password.js?v=20260818.4',
  './admin-import-link.js?v=20260818.5',
  './supabase-config.js?v=20260817.13',
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