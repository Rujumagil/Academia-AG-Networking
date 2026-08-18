(() => {
  'use strict';

  const RELEASE = '20260818.4';
  const cfg = window.SUPABASE_CONFIG;
  let db = null;
  let checking = false;
  let overlay = null;

  function getClient() {
    if (db) return db;
    if (!window.supabase?.createClient || !cfg?.url || !cfg?.publishableKey) return null;
    db = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return db;
  }

  function removeOverlay() {
    overlay?.remove();
    overlay = null;
    document.documentElement.style.removeProperty('overflow');
  }

  function renderOverlay(name = '') {
    if (overlay) return;
    overlay = document.createElement('div');
    overlay.className = 'firstpass-backdrop';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'firstpass-title');
    overlay.innerHTML = `
      <section class="firstpass-card">
        <div class="firstpass-brand">
          <img src="icono-oficial.png" alt="AG Business Networking">
          <div><strong>Academia AG</strong><span>Seguridad de tu cuenta</span></div>
        </div>
        <h2 id="firstpass-title">Crea tu contraseña personal</h2>
        <p>${name ? `Hola, ${escapeHtml(name)}. ` : ''}Estás ingresando con una contraseña temporal. Antes de continuar, crea una contraseña que solo tú conozcas.</p>
        <form class="firstpass-form" id="firstpass-form">
          <div class="firstpass-field">
            <label for="firstpass-password">Nueva contraseña</label>
            <input id="firstpass-password" type="password" autocomplete="new-password" minlength="8" required>
          </div>
          <div class="firstpass-field">
            <label for="firstpass-confirm">Confirmar contraseña</label>
            <input id="firstpass-confirm" type="password" autocomplete="new-password" minlength="8" required>
          </div>
          <div class="firstpass-rules">Usa al menos 8 caracteres. Evita nombres, fechas o contraseñas que utilices en otros servicios.</div>
          <div class="firstpass-error" id="firstpass-error" aria-live="polite"></div>
          <button class="firstpass-submit" id="firstpass-submit" type="submit">Guardar mi nueva contraseña</button>
        </form>
        <div class="firstpass-security">Tu contraseña se actualiza directamente mediante el sistema seguro de autenticación. Academia AG no muestra ni almacena tu contraseña en la interfaz.</div>
      </section>`;
    document.body.appendChild(overlay);
    document.documentElement.style.overflow = 'hidden';
    overlay.querySelector('#firstpass-password')?.focus();
    overlay.querySelector('#firstpass-form')?.addEventListener('submit', handleSubmit);
  }

  function escapeHtml(value = '') {
    return String(value).replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#039;' })[ch]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const client = getClient();
    if (!client) return;
    const password = overlay.querySelector('#firstpass-password')?.value || '';
    const confirmation = overlay.querySelector('#firstpass-confirm')?.value || '';
    const errorBox = overlay.querySelector('#firstpass-error');
    const submit = overlay.querySelector('#firstpass-submit');

    if (password.length < 8) {
      errorBox.textContent = 'La contraseña debe tener al menos 8 caracteres.';
      return;
    }
    if (password !== confirmation) {
      errorBox.textContent = 'Las contraseñas no coinciden.';
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Guardando…';
    errorBox.textContent = '';

    const { error: passwordError } = await client.auth.updateUser({ password });
    if (passwordError) {
      errorBox.textContent = passwordError.message || 'No pudimos actualizar la contraseña.';
      submit.disabled = false;
      submit.textContent = 'Guardar mi nueva contraseña';
      return;
    }

    const { error: profileError } = await client.rpc('complete_first_password_change');
    if (profileError) {
      console.error('[Primer ingreso] No se pudo confirmar el cambio en profiles:', profileError);
      errorBox.textContent = 'La contraseña cambió, pero no pudimos cerrar el proceso. Contacta a soporte antes de continuar.';
      submit.disabled = false;
      submit.textContent = 'Reintentar confirmación';
      return;
    }

    removeOverlay();
    const toast = document.querySelector('#toast');
    if (toast) {
      toast.textContent = 'Contraseña actualizada. Ya puedes continuar en Academia AG.';
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3800);
    }
  }

  async function check(force = false) {
    if (checking) return;
    const client = getClient();
    if (!client) return;
    checking = true;
    try {
      const { data: sessionData } = await client.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        removeOverlay();
        return;
      }
      const { data: profile, error } = await client
        .from('profiles')
        .select('full_name,must_change_password')
        .eq('id', user.id)
        .maybeSingle();
      if (error) {
        if (force) console.warn('[Primer ingreso] No se pudo consultar el perfil:', error);
        return;
      }
      if (profile?.must_change_password) renderOverlay(profile.full_name || user.email?.split('@')[0] || '');
      else removeOverlay();
    } finally {
      checking = false;
    }
  }

  function schedule() {
    clearTimeout(schedule.timer);
    schedule.timer = setTimeout(() => check(false), 120);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('focus', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  getClient()?.auth.onAuthStateChange(() => setTimeout(() => check(true), 60));
  window.ACADEMIA_AG_FIRST_LOGIN_PASSWORD = { release: RELEASE, check };
  setTimeout(() => check(true), 350);
})();
