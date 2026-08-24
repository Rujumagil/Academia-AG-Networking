(() => {
  'use strict';

  const RELEASE = '20260824.81';
  const SOUND_KEY = 'academia-ag:notification-sound';
  let timer = null;
  let rendering = false;

  function onProfile() {
    return location.hash.replace(/^#/, '').split('/')[0] === 'profile';
  }

  function soundEnabled() {
    return localStorage.getItem(SOUND_KEY) !== '0';
  }

  function setSoundEnabled(enabled) {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  }

  function supported() {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  async function hasSubscription() {
    if (!supported()) return false;
    try {
      const registration = await navigator.serviceWorker.ready;
      return Boolean(await registration.pushManager.getSubscription());
    } catch (_) {
      return false;
    }
  }

  function status(permission, active) {
    if (!supported()) return ['No compatible', 'error', 'Este navegador no admite Web Push.'];
    if (permission === 'denied') return ['Bloqueadas', 'error', 'Las notificaciones están bloqueadas para este sitio. Actívalas desde los permisos del navegador.'];
    if (active) return ['Push activo', 'active', 'Este dispositivo está registrado para recibir avisos de Academia AG.'];
    if (permission === 'granted') return ['Permiso concedido', 'warning', 'El navegador ya dio permiso. Falta completar el registro Push de este dispositivo.'];
    return ['Sin activar', '', 'Activa las notificaciones para recibir avisos de accesos, cursos, soporte, eventos y certificados.'];
  }

  function injectStyles() {
    if (document.querySelector('#push-profile-panel-v81-style')) return;
    const style = document.createElement('style');
    style.id = 'push-profile-panel-v81-style';
    style.textContent = `
      .push-profile-v81{padding:22px 24px;border-radius:26px;border:1px solid rgba(23,35,63,.08);background:linear-gradient(145deg,rgba(255,255,255,.97),rgba(249,250,248,.92));box-shadow:0 18px 48px rgba(23,35,63,.065)}
      .push-profile-head-v81{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;padding-bottom:17px;margin-bottom:18px;border-bottom:1px solid rgba(23,35,63,.07)}
      .push-profile-head-v81 small{display:block;color:#005134;font-weight:900;letter-spacing:.08em;text-transform:uppercase;margin-bottom:5px}.push-profile-head-v81 h2{margin:0;color:#17233f;font-size:1.45rem}.push-profile-head-v81 p{margin:7px 0 0;color:#6e7b8e;font-size:.78rem;line-height:1.5;max-width:680px}
      .push-profile-badge-v81{white-space:nowrap;padding:7px 10px;border-radius:999px;background:#f3f4f6;color:#667085;font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.push-profile-badge-v81.active{background:#e8f5ee;color:#005134}.push-profile-badge-v81.warning{background:#fff7dc;color:#805f10}.push-profile-badge-v81.error{background:#fff0ee;color:#9c2f24}
      .push-profile-grid-v81{display:grid;grid-template-columns:1fr 1fr;gap:12px}.push-profile-item-v81{padding:15px;border:1px solid rgba(23,35,63,.08);border-radius:16px;background:#fbfcfb}.push-profile-item-v81 strong{display:block;color:#17233f;font-size:.82rem}.push-profile-item-v81 span{display:block;color:#7a8799;font-size:.72rem;line-height:1.45;margin-top:4px}.push-profile-toggle-v81{display:flex;align-items:center;gap:9px;margin-top:11px;color:#344054;font-size:.76rem;font-weight:800}.push-profile-toggle-v81 input{width:18px;height:18px;accent-color:#005134}
      .push-profile-actions-v81{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.push-profile-actions-v81 button{min-height:42px;padding:0 14px;border-radius:12px;border:1px solid rgba(23,35,63,.10);background:#fff;color:#17233f;font:inherit;font-size:.74rem;font-weight:900;cursor:pointer}.push-profile-actions-v81 button.primary{background:#17233f;color:#fff;border-color:#17233f}.push-profile-actions-v81 button:disabled{opacity:.6;cursor:not-allowed}.push-profile-result-v81{margin-top:12px;padding:10px 12px;border-radius:12px;font-size:.72rem;display:none}.push-profile-result-v81.show{display:block}.push-profile-result-v81.ok{background:#edf7f2;color:#07563c}.push-profile-result-v81.error{background:#fff3f1;color:#932f26}.push-profile-note-v81{margin:13px 0 0;color:#7a8799;font-size:.68rem;line-height:1.5}
      @media(max-width:720px){.push-profile-head-v81{display:block}.push-profile-badge-v81{display:inline-flex;margin-top:11px}.push-profile-grid-v81{grid-template-columns:1fr}.push-profile-actions-v81 button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  async function render() {
    if (rendering || !onProfile()) return;
    const page = document.querySelector('#page');
    if (!page) return;
    const main = page.querySelector('.profile-main-column') || page;
    if (main.querySelector('#push-profile-panel-v81')) return;

    rendering = true;
    try {
      injectStyles();
      document.querySelector('#push-center-v80')?.remove();

      const active = await hasSubscription();
      const permission = 'Notification' in window ? Notification.permission : 'unsupported';
      const [label, statusClass, message] = status(permission, active);

      const panel = document.createElement('section');
      panel.id = 'push-profile-panel-v81';
      panel.className = 'push-profile-v81';
      panel.innerHTML = `
        <div class="push-profile-head-v81">
          <div><small>Alertas de Academia AG</small><h2>Notificaciones del dispositivo</h2><p>${message}</p></div>
          <span class="push-profile-badge-v81 ${statusClass}">${label}</span>
        </div>
        <div class="push-profile-grid-v81">
          <div class="push-profile-item-v81"><strong>Notificaciones Push</strong><span>Recibe avisos de accesos aprobados, cursos, soporte, eventos y certificados.</span></div>
          <div class="push-profile-item-v81"><strong>Sonido dentro de la academia</strong><span>Reproduce un tono breve cuando llega un aviso mientras estás usando la plataforma.</span><label class="push-profile-toggle-v81"><input type="checkbox" data-push-sound-v81 ${soundEnabled() ? 'checked' : ''}> Reproducir sonido</label></div>
        </div>
        <div class="push-profile-actions-v81">
          ${active
            ? '<button type="button" class="primary" data-push-test-v81>Enviar prueba Push</button><button type="button" data-push-disable-v81>Desactivar Push</button>'
            : '<button type="button" class="primary" data-push-enable-v81>Activar notificaciones</button><button type="button" data-sound-test-v81>Probar sonido</button>'}
        </div>
        <div class="push-profile-result-v81" data-push-result-v81></div>
        <p class="push-profile-note-v81">El sonido cuando la app está cerrada lo controla Android, iOS, Windows o el navegador. Dentro de Academia AG usamos nuestro aviso sonoro cuando el dispositivo lo permite.</p>`;

      const options = main.querySelector('.profile-options-grid');
      if (options) options.insertAdjacentElement('beforebegin', panel);
      else main.appendChild(panel);

      const result = panel.querySelector('[data-push-result-v81]');
      const setResult = (text, ok = false) => {
        result.textContent = text;
        result.className = `push-profile-result-v81 show ${ok ? 'ok' : 'error'}`;
      };

      panel.querySelector('[data-push-sound-v81]')?.addEventListener('change', event => {
        setSoundEnabled(Boolean(event.target.checked));
        if (event.target.checked) window.ACADEMIA_AG_PUSH?.playChime?.();
      });

      panel.querySelector('[data-sound-test-v81]')?.addEventListener('click', () => {
        window.ACADEMIA_AG_PUSH?.playChime?.();
        setResult('Prueba de sonido reproducida.', true);
      });

      panel.querySelector('[data-push-enable-v81]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = 'Activando…';
        try {
          if (!window.ACADEMIA_AG_PUSH?.enable) throw new Error('El motor de notificaciones todavía no terminó de cargar. Actualiza la página e intenta nuevamente.');
          await window.ACADEMIA_AG_PUSH.enable();
          setResult('Notificaciones Push activadas correctamente en este dispositivo.', true);
          setTimeout(() => { panel.remove(); schedule(); }, 350);
        } catch (error) {
          setResult(error?.message || 'No se pudieron activar las notificaciones.');
          button.disabled = false;
          button.textContent = 'Activar notificaciones';
        }
      });

      panel.querySelector('[data-push-disable-v81]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        try {
          await window.ACADEMIA_AG_PUSH?.disable?.();
          setResult('Notificaciones Push desactivadas en este dispositivo.', true);
          setTimeout(() => { panel.remove(); schedule(); }, 350);
        } catch (error) {
          setResult(error?.message || 'No se pudieron desactivar las notificaciones.');
          button.disabled = false;
        }
      });

      panel.querySelector('[data-push-test-v81]')?.addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = 'Enviando prueba…';
        try {
          const data = await window.ACADEMIA_AG_PUSH?.test?.();
          setResult(`Prueba enviada a ${data?.success || 0} dispositivo(s).`, true);
        } catch (error) {
          setResult(error?.message || 'No se pudo enviar la prueba Push.');
        } finally {
          button.disabled = false;
          button.textContent = 'Enviar prueba Push';
        }
      });

      document.documentElement.dataset.agPushProfile = RELEASE;
    } finally {
      rendering = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(render, 80);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  new MutationObserver(() => {
    if (onProfile() && !document.querySelector('#push-profile-panel-v81')) schedule();
  }).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  schedule();
  window.ACADEMIA_AG_PUSH_PROFILE = Object.freeze({ release: RELEASE, apply: schedule });
})();