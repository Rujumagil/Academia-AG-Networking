(() => {
  const app = document.querySelector('#app');

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
              <a class="btn btn-secondary" href="diagnostico.html?v=20260817.6">Abrir diagnóstico</a>
              <a class="auth-link" href="limpiar-cache.html?v=20260817.6">Limpiar versión anterior</a>
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
    throw lastError || new Error('No fue posible cargar Supabase.');
  }

  async function start() {
    renderStatus('Academia AG', 'Preparando tu acceso…');
    try {
      const cfg = window.SUPABASE_CONFIG;
      const placeholder = !cfg?.url || !cfg?.publishableKey || cfg.url.includes('TU-PROYECTO') || cfg.publishableKey.includes('TU_SUPABASE');
      if (placeholder) {
        renderStatus(
          'Academia AG lista para conectar',
          'La configuración local todavía no contiene los datos públicos de Supabase. Pulsa “Limpiar versión anterior” para cargar la versión actualizada.',
          true
        );
        return;
      }
      await loadSupabaseLibrary();
      await loadScript('app.js?v=20260817.6');
      await loadScript('lesson-experience.js?v=20260817.6');
      setTimeout(() => {
        const stillLoading = document.querySelector('.loading-card');
        if (stillLoading) renderStatus('No pudimos iniciar la academia','La aplicación tardó más de lo esperado. Abre el diagnóstico para identificar el punto exacto.',true);
      }, 15000);
    } catch (error) {
      console.error('Error de inicio:', error);
      renderStatus('No pudimos cargar Academia AG','La conexión o una versión guardada en el navegador impidió iniciar la página.',true);
    }
  }

  window.addEventListener('error', event => console.error('Error global:', event.error || event.message));
  window.addEventListener('unhandledrejection', event => console.error('Promesa rechazada:', event.reason));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
