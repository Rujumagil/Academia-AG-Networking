(() => {
  'use strict';

  const RELEASE = '20260823.80';
  const SOUND_KEY = 'academia-ag:notification-sound';
  const POLL_MS = 20000;
  let audioContext = null;
  let realtimeChannel = null;
  let pollTimer = null;
  let uiTimer = null;
  let knownNotificationIds = new Set();
  let initializedIds = false;
  let pushActive = false;
  let syncing = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot',"'":'&#039;'
  })[char]);

  function isSessionReady() {
    try { return Boolean(state?.session && state?.user); } catch (_) { return false; }
  }

  function soundEnabled() {
    return localStorage.getItem(SOUND_KEY) !== '0';
  }

  function setSoundEnabled(enabled) {
    localStorage.setItem(SOUND_KEY, enabled ? '1' : '0');
  }

  function notificationSupported() {
    return 'Notification' in window && 'serviceWorker' in navigator;
  }

  function pushSupported() {
    return notificationSupported() && 'PushManager' in window;
  }

  function isIos() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  }

  function isStandalone() {
    return window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true;
  }

  function injectStyles() {
    if (document.querySelector('#push-notifications-v80-style')) return;
    const style = document.createElement('style');
    style.id = 'push-notifications-v80-style';
    style.textContent = `
      .push-center-v80{margin:24px 0;padding:22px;border:1px solid rgba(30,41,59,.11);border-radius:22px;background:#fff;box-shadow:0 16px 44px rgba(30,41,59,.07)}
      .push-head-v80{display:flex;justify-content:space-between;align-items:flex-start;gap:18px}.push-head-v80 h2{margin:0;font-family:Georgia,'Times New Roman',serif;font-size:1.75rem;font-weight:500;color:#1e293b}.push-head-v80 p{margin:7px 0 0;color:#667085;font-size:.82rem;max-width:720px}.push-badge-v80{white-space:nowrap;padding:7px 10px;border-radius:999px;background:#f3f4f6;color:#667085;font-size:.66rem;font-weight:900;text-transform:uppercase;letter-spacing:.06em}.push-badge-v80.active{background:#e8f5ee;color:#005134}.push-badge-v80.warning{background:#fff7dc;color:#805f10}.push-badge-v80.error{background:#fff0ee;color:#9c2f24}
      .push-grid-v80{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:18px}.push-item-v80{padding:15px;border:1px solid #e4e8e6;border-radius:16px;background:#fbfcfb}.push-item-v80 strong{display:block;color:#1e293b;font-size:.82rem}.push-item-v80 span{display:block;color:#667085;font-size:.72rem;margin-top:4px;line-height:1.45}.push-toggle-v80{display:flex;align-items:center;gap:9px;margin-top:11px;font-size:.76rem;font-weight:800;color:#344054}.push-toggle-v80 input{accent-color:#005134;width:18px;height:18px}.push-actions-v80{display:flex;gap:9px;flex-wrap:wrap;margin-top:18px}.push-actions-v80 button{border:1px solid #d8dee2;background:#fff;color:#344054;border-radius:12px;padding:10px 14px;font:inherit;font-size:.74rem;font-weight:900;cursor:pointer}.push-actions-v80 button.primary{background:#005134;color:#fff;border-color:#005134}.push-actions-v80 button:disabled{opacity:.55;cursor:not-allowed}.push-note-v80{margin:14px 0 0;color:#7a828d;font-size:.68rem;line-height:1.5}.push-note-v80 strong{color:#53606c}.push-error-v80{margin-top:12px;padding:10px 12px;border-radius:12px;background:#fff3f1;color:#932f26;font-size:.72rem}.push-success-v80{margin-top:12px;padding:10px 12px;border-radius:12px;background:#edf7f2;color:#07563c;font-size:.72rem}
      @media(max-width:720px){.push-head-v80{display:block}.push-badge-v80{display:inline-flex;margin-top:12px}.push-grid-v80{grid-template-columns:1fr}.push-actions-v80 button{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function unlockAudio() {
    try {
      if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
    } catch (_) {}
  }

  function playChime() {
    if (!soundEnabled()) return;
    try {
      unlockAudio();
      if (!audioContext || audioContext.state !== 'running') return;
      const now = audioContext.currentTime;
      const gain = audioContext.createGain();
      gain.connect(audioContext.destination);
      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.exponentialRampToValueAtTime(0.12, now + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.48);

      const first = audioContext.createOscillator();
      first.type = 'sine';
      first.frequency.setValueAtTime(740, now);
      first.connect(gain);
      first.start(now);
      first.stop(now + 0.20);

      const second = audioContext.createOscillator();
      second.type = 'sine';
      second.frequency.setValueAtTime(988, now + 0.17);
      second.connect(gain);
      second.start(now + 0.17);
      second.stop(now + 0.44);
    } catch (error) {
      console.warn('No se pudo reproducir el sonido de notificación:', error);
    }
  }

  function relevant(notification) {
    if (!notification || !isSessionReady()) return false;
    return !notification.target_user || notification.target_user === state.user.id;
  }

  function updateBellCount() {
    try {
      const reads = new Set((state.notificationReads || []).map(row => row.notification_id));
      const visible = (state.notifications || []).filter(relevant);
      const count = visible.filter(row => !reads.has(row.id)).length;
      const button = document.querySelector('.notification-button');
      if (!button) return;
      let badge = button.querySelector('.notification-count');
      if (!count) {
        badge?.remove();
        return;
      }
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'notification-count';
        button.appendChild(badge);
      }
      badge.textContent = count > 9 ? '9+' : String(count);
    } catch (_) {}
  }

  async function localSystemNotification(notification) {
    if (!notificationSupported() || Notification.permission !== 'granted' || pushActive) return;
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(notification.title || 'Academia AG', {
        body: notification.message || 'Tienes una nueva notificación.',
        icon: './icon-192.png',
        badge: './icon-192.png',
        tag: `ag-local-${notification.id || Date.now()}`,
        renotify: true,
        silent: false,
        vibrate: [180, 80, 180],
        data: { url: `./academia.html${String(notification.href || '#notifications').startsWith('#') ? notification.href : '#notifications'}` }
      });
    } catch (error) {
      console.warn('No se pudo mostrar la notificación local:', error);
    }
  }

  async function handleNotification(notification, { initial = false } = {}) {
    if (!notification?.id || !relevant(notification)) return;
    if (knownNotificationIds.has(notification.id)) return;
    knownNotificationIds.add(notification.id);

    if (!Array.isArray(state.notifications)) state.notifications = [];
    if (!state.notifications.some(item => item.id === notification.id)) state.notifications.unshift(notification);
    updateBellCount();

    if (initial) return;
    if (typeof showToast === 'function') showToast(notification.title || 'Tienes una nueva notificación.', 'success');
    playChime();
    await localSystemNotification(notification);

    // Cuando el administrador crea un aviso desde el Centro de Control,
    // su propia sesión dispara el envío Web Push. La Edge Function es idempotente.
    try {
      if (state.profile?.role === 'admin' && notification.created_by === state.user.id) {
        await dispatchNotification(notification.id);
      }
    } catch (_) {}
  }

  async function pollNotifications() {
    if (!isSessionReady() || syncing) return;
    syncing = true;
    try {
      const { data, error } = await db
        .from('notifications')
        .select('id,target_user,notification_type,title,message,href,created_by,created_at,expires_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data || []).filter(relevant);

      if (!initializedIds) {
        rows.forEach(row => knownNotificationIds.add(row.id));
        initializedIds = true;
      } else {
        for (const row of [...rows].reverse()) await handleNotification(row);
      }

      // Reintenta en segundo plano el despacho de solicitudes de curso pendientes.
      // Si el backend Push aún no está desplegado, esta llamada falla sin afectar la academia.
      await syncPendingCourseRequests();
      await syncRecentAdminNotifications(rows);
    } catch (error) {
      console.warn('No se pudieron sincronizar notificaciones:', error?.message || error);
    } finally {
      syncing = false;
    }
  }

  async function syncPendingCourseRequests() {
    if (!isSessionReady() || state.profile?.role !== 'student') return;
    try {
      const { data, error } = await db
        .from('support_tickets')
        .select('id,status,category')
        .eq('user_id', state.user.id)
        .eq('category', 'course')
        .in('status', ['open','in_progress'])
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) return;
      for (const ticket of data || []) {
        await dispatchCourseRequest(ticket.id, true);
      }
    } catch (_) {}
  }

  async function syncRecentAdminNotifications(rows = []) {
    if (!isSessionReady() || state.profile?.role !== 'admin') return;
    const cutoff = Date.now() - 5 * 60 * 1000;
    for (const row of rows) {
      if (row.created_by !== state.user.id) continue;
      if (new Date(row.created_at).getTime() < cutoff) continue;
      await dispatchNotification(row.id, true);
    }
  }

  async function invokePush(body, quiet = false) {
    try {
      const { data, error } = await db.functions.invoke('send-web-push', { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data || {};
    } catch (error) {
      if (!quiet) throw error;
      return null;
    }
  }

  async function dispatchCourseRequest(ticketId, quiet = false) {
    if (!ticketId) return null;
    return invokePush({ action: 'course_request', ticketId }, quiet);
  }

  async function dispatchNotification(notificationId, quiet = false) {
    if (!notificationId) return null;
    return invokePush({ action: 'notification', notificationId }, quiet);
  }

  function base64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map(char => char.charCodeAt(0)));
  }

  async function currentSubscription() {
    if (!pushSupported()) return null;
    const registration = await navigator.serviceWorker.ready;
    return registration.pushManager.getSubscription();
  }

  async function refreshPushState() {
    try { pushActive = Boolean(await currentSubscription()); }
    catch (_) { pushActive = false; }
    return pushActive;
  }

  async function enablePush() {
    unlockAudio();
    if (!notificationSupported()) throw new Error('Este navegador no admite notificaciones del dispositivo.');
    if (!pushSupported()) throw new Error('Este navegador no admite Web Push.');
    if (isIos() && !isStandalone()) {
      throw new Error('En iPhone o iPad, primero agrega Academia AG a tu pantalla de inicio y ábrela desde el icono instalado.');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      throw new Error(permission === 'denied'
        ? 'Las notificaciones están bloqueadas en el navegador. Actívalas desde la configuración del sitio.'
        : 'No se concedió permiso para notificaciones.');
    }

    const config = await invokePush({ action: 'config' });
    if (!config?.publicKey) throw new Error('El servidor Push todavía no está activado.');

    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64ToUint8Array(config.publicKey)
      });
    }

    const json = subscription.toJSON();
    const { error } = await db.rpc('save_my_push_subscription', {
      target_endpoint: subscription.endpoint,
      target_p256dh: json.keys?.p256dh || '',
      target_auth: json.keys?.auth || '',
      target_expiration_time: subscription.expirationTime || null,
      target_user_agent: navigator.userAgent || null,
      target_platform: navigator.platform || null
    });
    if (error) {
      await subscription.unsubscribe().catch(() => {});
      throw error;
    }

    pushActive = true;
    setSoundEnabled(true);
    return true;
  }

  async function disablePush() {
    const subscription = await currentSubscription();
    if (subscription) {
      try {
        await db.rpc('disable_my_push_subscription', { target_endpoint: subscription.endpoint });
      } catch (_) {}
      await subscription.unsubscribe().catch(() => {});
    }
    pushActive = false;
  }

  async function sendSelfTest() {
    unlockAudio();
    playChime();
    const result = await invokePush({ action: 'self_test' });
    if (!result?.recipients) throw new Error('No se encontró una suscripción Push activa para este dispositivo.');
    return result;
  }

  function permissionLabel() {
    if (!notificationSupported()) return ['No compatible', 'error'];
    if (Notification.permission === 'denied') return ['Bloqueadas', 'error'];
    if (pushActive) return ['Push activo', 'active'];
    if (Notification.permission === 'granted') return ['Permiso concedido', 'warning'];
    return ['Sin activar', ''];
  }

  function statusMessage() {
    if (!notificationSupported()) return 'Tu navegador no ofrece la API de notificaciones.';
    if (Notification.permission === 'denied') return 'El navegador bloqueó las notificaciones para este sitio. Debes habilitarlas desde los permisos del sitio.';
    if (isIos() && !isStandalone()) return 'En iPhone/iPad, instala Academia AG en la pantalla de inicio para habilitar notificaciones push.';
    if (pushActive) return 'Este dispositivo está registrado para recibir avisos incluso cuando la academia no esté abierta.';
    return 'Activa las notificaciones para recibir avisos de acceso, cursos, soporte, eventos y certificados.';
  }

  async function renderProfilePanel() {
    if (!isSessionReady() || !location.hash.startsWith('#profile')) return;
    const page = document.querySelector('#page');
    if (!page || page.querySelector('#push-center-v80')) return;
    injectStyles();
    await refreshPushState();
    const [label, statusClass] = permissionLabel();

    const panel = document.createElement('section');
    panel.id = 'push-center-v80';
    panel.className = 'push-center-v80';
    panel.innerHTML = `
      <div class="push-head-v80">
        <div><h2>Notificaciones del dispositivo</h2><p>${esc(statusMessage())}</p></div>
        <span class="push-badge-v80 ${statusClass}">${esc(label)}</span>
      </div>
      <div class="push-grid-v80">
        <div class="push-item-v80"><strong>Notificaciones Push</strong><span>Avisos del sistema para accesos, cursos, soporte y novedades importantes.</span></div>
        <div class="push-item-v80"><strong>Sonido dentro de la academia</strong><span>Cuando la academia está abierta usamos un tono breve para avisos nuevos.</span><label class="push-toggle-v80"><input id="push-sound-v80" type="checkbox" ${soundEnabled() ? 'checked' : ''}> Reproducir sonido</label></div>
      </div>
      <div class="push-actions-v80">
        ${pushActive
          ? '<button type="button" class="primary" data-push-test-v80>Enviar prueba Push</button><button type="button" data-push-disable-v80>Desactivar Push</button>'
          : '<button type="button" class="primary" data-push-enable-v80>Activar notificaciones</button><button type="button" data-sound-test-v80>Probar sonido</button>'}
      </div>
      <div id="push-result-v80"></div>
      <p class="push-note-v80"><strong>Importante:</strong> el sonido de una notificación cuando la academia está cerrada lo controla Android, iOS, Windows o el navegador. Dentro de Academia AG sí reproducimos nuestro aviso sonoro cuando el sistema lo permite.</p>`;

    const subtitle = page.querySelector('.page-subtitle');
    if (subtitle) subtitle.insertAdjacentElement('afterend', panel);
    else page.prepend(panel);

    const result = panel.querySelector('#push-result-v80');
    const setResult = (message, success = false) => {
      result.className = success ? 'push-success-v80' : 'push-error-v80';
      result.textContent = message;
    };

    panel.querySelector('#push-sound-v80')?.addEventListener('change', event => {
      setSoundEnabled(Boolean(event.target.checked));
      if (event.target.checked) { unlockAudio(); playChime(); }
    });
    panel.querySelector('[data-sound-test-v80]')?.addEventListener('click', () => {
      unlockAudio();
      playChime();
      setResult('Prueba de sonido reproducida.', true);
    });
    panel.querySelector('[data-push-enable-v80]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Activando…';
      try {
        await enablePush();
        setResult('Notificaciones Push activadas correctamente en este dispositivo.', true);
        setTimeout(() => { panel.remove(); renderProfilePanel(); }, 350);
      } catch (error) {
        setResult(error?.message || 'No se pudieron activar las notificaciones Push.');
        button.disabled = false;
        button.textContent = 'Activar notificaciones';
      }
    });
    panel.querySelector('[data-push-disable-v80]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      try {
        await disablePush();
        setResult('Notificaciones Push desactivadas en este dispositivo.', true);
        setTimeout(() => { panel.remove(); renderProfilePanel(); }, 350);
      } catch (error) {
        setResult(error?.message || 'No se pudieron desactivar las notificaciones.');
        button.disabled = false;
      }
    });
    panel.querySelector('[data-push-test-v80]')?.addEventListener('click', async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.textContent = 'Enviando prueba…';
      try {
        const data = await sendSelfTest();
        setResult(`Prueba enviada a ${data.success || 0} dispositivo(s).`, true);
      } catch (error) {
        setResult(error?.message || 'No se pudo enviar la prueba Push.');
      } finally {
        button.disabled = false;
        button.textContent = 'Enviar prueba Push';
      }
    });
  }

  function setupRealtime() {
    if (!isSessionReady() || realtimeChannel) return;
    try {
      realtimeChannel = db
        .channel(`academy-notifications-v80-${state.user.id}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' }, payload => {
          handleNotification(payload.new).catch(() => {});
        })
        .subscribe();
    } catch (error) {
      console.warn('Realtime de notificaciones no disponible; se usará sincronización periódica.', error);
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollNotifications();
    pollTimer = setInterval(pollNotifications, POLL_MS);
  }

  function scheduleUi() {
    clearTimeout(uiTimer);
    uiTimer = setTimeout(() => renderProfilePanel().catch(() => {}), 120);
  }

  document.addEventListener('pointerdown', unlockAudio, { once: true, passive: true });
  window.addEventListener('hashchange', scheduleUi);
  window.addEventListener('pageshow', () => {
    if (isSessionReady()) {
      setupRealtime();
      startPolling();
      scheduleUi();
    }
  });

  const bootTimer = setInterval(() => {
    if (!isSessionReady()) return;
    clearInterval(bootTimer);
    knownNotificationIds = new Set((state.notifications || []).map(row => row.id));
    initializedIds = true;
    refreshPushState().catch(() => {});
    setupRealtime();
    startPolling();
    scheduleUi();
    document.documentElement.dataset.agPushNotifications = RELEASE;
  }, 250);
  setTimeout(() => clearInterval(bootTimer), 20000);

  window.ACADEMIA_AG_PUSH = Object.freeze({
    release: RELEASE,
    enable: enablePush,
    disable: disablePush,
    test: sendSelfTest,
    dispatchCourseRequest,
    dispatchNotification,
    playChime,
    apply: scheduleUi
  });
})();
