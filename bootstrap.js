(() => {
  const app = document.querySelector('#app');

  function publicSiteUrl() {
    const configured = String(window.SUPABASE_CONFIG?.publicSiteUrl || '').trim();
    return /^https?:\/\//i.test(configured) ? configured : 'https://www.agbusinessnetworking.com/';
  }

  function renderStatus(title, message, showActions = false) {
    app.innerHTML = `
      <main class="login-screen">
        <section class="login-card glass loading-card">
          <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
          <h1>${title}</h1>
          <p>${message}</p>
          ${showActions ? `
            <div class="bootstrap-actions">
              <button class="btn btn-primary" id="retry-app">Volver a intentar</button>
              <a class="btn btn-secondary" href="${publicSiteUrl()}">Ir a AG Business Networking</a>
            </div>` : '<div class="spinner" aria-label="Cargando"></div>'}
        </section>
      </main>`;
    document.querySelector('#retry-app')?.addEventListener('click', () => location.reload());
  }

  function loadScript(src, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`Tiempo agotado al cargar ${src}`));
      }, timeout);
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error(`No se pudo cargar ${src}`)); };
      document.head.appendChild(script);
    });
  }

  async function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return;
    const sources = [
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
      'https://unpkg.com/@supabase/supabase-js@2'
    ];
    let lastError;
    for (const src of sources) {
      try {
        await loadScript(src);
        if (window.supabase?.createClient) return;
        throw new Error('La librería cargó, pero no creó window.supabase.');
      } catch (error) {
        console.warn(error);
        lastError = error;
      }
    }
    throw lastError || new Error('No fue posible cargar la biblioteca de datos.');
  }

  async function start() {
    renderStatus('Academia AG', 'Preparando tu acceso…');
    try {
      const cfg = window.SUPABASE_CONFIG;
      const placeholder = !cfg?.url || !cfg?.publishableKey || cfg.url.includes('TU-PROYECTO') || cfg.publishableKey.includes('TU_SUPABASE');
      if (placeholder) {
        renderStatus('Estamos actualizando tu aula','La plataforma está terminando de preparar tu acceso. Intenta nuevamente en unos segundos.',true);
        return;
      }

      await loadSupabaseLibrary();
      await loadScript('app.js?v=20260819.30');
      await loadScript('quiz-randomizer.js?v=20260817.12');
      await loadScript('course-structure.js?v=20260819.30');
      await loadScript('premium-learning.js?v=20260817.12');
      await loadScript('lesson-cleanup.js?v=20260817.12');
      await loadScript('module-exam.js?v=20260817.12');
      await loadScript('sidebar-icons-premium.js?v=20260817.15');
      await loadScript('evaluaciones-premium.js?v=20260817.17');
      await loadScript('perfil-premium.js?v=20260817.20');
      await loadScript('calendario-premium.js?v=20260817.22');
      await loadScript('admin-dashboard-ejecutivo.js?v=20260818.1');
      await loadScript('admin-dashboard-tabs.js?v=20260818.2');
      await loadScript('first-login-password.js?v=20260818.4');
      await loadScript('admin-import-link.js?v=20260818.5');
    } catch (error) {
      console.error('Error de inicio de Academia AG:', error);
      renderStatus('No pudimos abrir tu aula','Revisa tu conexión a internet y vuelve a intentarlo. Tu avance permanece guardado.',true);
    }
  }

  window.addEventListener('error', event => console.error('Error global:', event.error || event.message));
  window.addEventListener('unhandledrejection', event => console.error('Promesa rechazada:', event.reason));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
