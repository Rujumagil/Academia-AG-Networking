const CACHE = 'academia-ag-v20260824.86';
const STATIC_ASSETS = [
  './','./index.html','./academia.html','./importar-alumnos.html','./404.html',
  './styles.css?v=20260817.13','./premium-learning.css?v=20260817.13','./home-course-cards.css?v=20260817.13',
  './sidebar-enterprise.css?v=20260817.14','./sidebar-icons-premium.css?v=20260817.15','./mis-cursos-appletv.css?v=20260817.16',
  './evaluaciones-premium.css?v=20260817.17','./biblioteca-premium.css?v=20260817.18','./certificados-premium.css?v=20260817.19',
  './perfil-premium.css?v=20260817.20','./calendario-premium.css?v=20260817.21','./calendario-hotfix.css?v=20260817.22',
  './admin-dashboard-ejecutivo.css?v=20260818.1','./admin-dashboard-tabs.css?v=20260818.2','./admin-dashboard-corporativo.css?v=20260818.3',
  './first-login-password.css?v=20260818.4','./student-experience-premium.css?v=20260819.6','./academy-agents.css?v=20260820.41',
  './cloudflare-stream-v46.css?v=20260821.63',
  './app.js?v=20260821.63','./bootstrap.js?v=20260824.86','./utah-course-runtime.js?v=20260822.65','./utah-sequential-lock-v57.js?v=20260823.57','./certificate-auto-pdf-v91.js?v=20260825.91',
  './utah-clean-ui-v66.js?v=20260822.66','./utah-student-flow-v70.js?v=20260823.70','./utah-auditor-hotfix-v83.js?v=20260824.83','./utah-c3-promo-force-v85.js?v=20260824.85','./academy-student-polish-v71.js?v=20260823.71','./academy-academic-polish-v72.js?v=20260823.72','./utah-course-images-v67.js?v=20260822.67','./utah-official-cover-v73.js?v=20260823.73','./course-access-request-v75.js?v=20260823.75','./student-home-catalog-v77.js?v=20260823.77','./student-inline-access-v79.js?v=20260823.79','./admin-course-requests-v78.js?v=20260823.78','./admin-course-request-delivery-v86.js?v=20260824.86','./push-notifications-v80.js?v=20260823.80','./academy-profile-support-mobile-v81.js?v=20260823.81','./push-profile-panel-v81.js?v=20260824.81',
  './utah-module-exam-v2.js?v=20260820.48','./utah-module2-exam-v2.js?v=20260820.49','./utah-module3-exam-v2.js?v=20260820.50',
  './utah-module4-exam-v2.js?v=20260820.51','./utah-module5-exam-v2.js?v=20260820.52','./utah-module6-exam-v2.js?v=20260821.53',
  './academy-agents.js?v=20260819.40','./academy-rebuild-state.js?v=20260820.43','./student-experience-premium.js?v=20260819.6',
  './quiz-randomizer.js?v=20260824.83','./premium-learning.js?v=20260817.12','./sidebar-icons-premium.js?v=20260817.15',
  './evaluaciones-premium.js?v=20260817.17','./perfil-premium.js?v=20260817.20','./calendario-premium.js?v=20260817.22',
  './admin-dashboard-ejecutivo.js?v=20260818.1','./admin-dashboard-tabs.js?v=20260818.2','./first-login-password.js?v=20260818.4',
  './admin-import-link.js?v=20260818.5','./supabase-config.js?v=20260817.13',
  './manifest.json','./diagnostico.html','./limpiar-cache.html','./verificar-imagenes.html',
  './curso-emprende-utah.webp','./curso-finanzas.webp','./curso-marketing.webp','./curso-ingles.webp',
  './hero-academia.webp','./icon-192.png','./icon-512.png','./icono-oficial.png','./logo-completo-oficial.png','./logo-texto-oficial.png',
  './logo.webp','./recurso-manual-ag.webp'
];

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => Promise.allSettled(STATIC_ASSETS.map(asset => cache.add(asset)))));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('push', event => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch (_) {
    payload = { body: event.data ? event.data.text() : '' };
  }

  const title = payload.title || 'Academia AG';
  const rawUrl = String(payload.url || '/academia.html#notifications');
  const safeUrl = rawUrl.startsWith('/academia.html') || rawUrl.startsWith('./academia.html')
    ? rawUrl
    : '/academia.html#notifications';

  const options = {
    body: payload.body || 'Tienes una nueva notificación.',
    icon: payload.icon || './icon-192.png',
    badge: payload.badge || './icon-192.png',
    tag: payload.tag || `academia-ag-${payload.notificationId || Date.now()}`,
    renotify: true,
    silent: false,
    vibrate: [180, 80, 180],
    data: {
      url: safeUrl,
      notificationId: payload.notificationId || null,
      ticketId: payload.ticketId || null,
      type: payload.type || 'general'
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  const rawUrl = String(event.notification?.data?.url || '/academia.html#notifications');
  const targetUrl = new URL(rawUrl, self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      try {
        const current = new URL(client.url);
        if (current.origin !== self.location.origin) continue;
        if ('navigate' in client) await client.navigate(targetUrl);
        if ('focus' in client) return client.focus();
      } catch (_) {}
    }
    if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
  })());
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  const sameOrigin = url.origin === self.location.origin;
  const critical = event.request.mode === 'navigate' || (sameOrigin && /\.(?:html|js|css)$/i.test(url.pathname));

  if (critical) {
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