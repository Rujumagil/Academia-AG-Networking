(() => {
  'use strict';

  const RELEASE = '20260821.60';
  const MAX_WAIT_MS = 25000;
  const POLL_MS = 100;
  const startedAt = Date.now();
  let launched = false;

  function isStillBootstrapScreen() {
    const appNode = document.querySelector('#app');
    if (!appNode) return false;
    const text = String(appNode.textContent || '').toLowerCase();
    return text.includes('preparando tu acceso') || text.includes('preparando tu aula');
  }

  async function launchIfNeeded() {
    if (launched) return true;
    if (document.readyState !== 'complete') return false;

    let initFn = null;
    try {
      if (typeof init === 'function') initFn = init;
    } catch (_) {}

    if (!initFn) return false;

    // Si la aplicación ya sustituyó la pantalla inicial, no iniciamos una segunda vez.
    if (!isStillBootstrapScreen()) {
      launched = true;
      document.documentElement.dataset.agBootRescue = `${RELEASE}-not-needed`;
      return true;
    }

    launched = true;
    document.documentElement.dataset.agBootRescue = `${RELEASE}-launching`;
    try {
      await initFn();
      document.documentElement.dataset.agBootRescue = `${RELEASE}-started`;
    } catch (error) {
      console.error('Academia AG boot rescue:', error);
      const appNode = document.querySelector('#app');
      if (appNode) {
        appNode.innerHTML = `
          <main class="login-screen">
            <section class="login-card glass">
              <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
              <h1>No pudimos iniciar la academia</h1>
              <p>${String(error?.message || 'Ocurrió un error inesperado.').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]))}</p>
              <div class="bootstrap-actions">
                <button class="btn btn-primary" type="button" onclick="location.reload()">Volver a intentar</button>
                <a class="btn btn-secondary" href="diagnostico.html">Abrir diagnóstico</a>
              </div>
            </section>
          </main>`;
      }
    }
    return true;
  }

  function poll() {
    launchIfNeeded().then(done => {
      if (done) return;
      if (Date.now() - startedAt >= MAX_WAIT_MS) {
        const appNode = document.querySelector('#app');
        if (appNode && isStillBootstrapScreen()) {
          appNode.innerHTML = `
            <main class="login-screen">
              <section class="login-card glass">
                <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
                <h1>La academia tardó demasiado en iniciar</h1>
                <p>Actualiza la página. Si el problema continúa, abre el diagnóstico para revisar la conexión.</p>
                <div class="bootstrap-actions">
                  <button class="btn btn-primary" type="button" onclick="location.reload()">Actualizar</button>
                  <a class="btn btn-secondary" href="diagnostico.html">Abrir diagnóstico</a>
                </div>
              </section>
            </main>`;
        }
        return;
      }
      setTimeout(poll, POLL_MS);
    });
  }

  window.addEventListener('load', () => setTimeout(poll, 0), { once: true });
  if (document.readyState === 'complete') poll();
})();
