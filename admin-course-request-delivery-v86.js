(() => {
  'use strict';

  const RELEASE = '20260824.86';
  const POLL_MS = 15000;
  const STORAGE_PREFIX = 'ag-admin-course-requests-seen:';
  let pollTimer = null;
  let channel = null;
  let running = false;
  let knownPendingIds = new Set();
  let initialized = false;

  function adminReady() {
    try {
      return Boolean(
        state?.session &&
        state?.user &&
        typeof isAdmin === 'function' &&
        isAdmin()
      );
    } catch (_) {
      return false;
    }
  }

  function storageKey() {
    try { return `${STORAGE_PREFIX}${state?.user?.id || 'admin'}`; }
    catch (_) { return `${STORAGE_PREFIX}admin`; }
  }

  function readSeen() {
    try {
      const parsed = JSON.parse(localStorage.getItem(storageKey()) || '[]');
      return new Set(Array.isArray(parsed) ? parsed.slice(-250) : []);
    } catch (_) {
      return new Set();
    }
  }

  function writeSeen(ids) {
    try { localStorage.setItem(storageKey(), JSON.stringify([...ids].slice(-250))); }
    catch (_) {}
  }

  function pendingOnly(rows = []) {
    return rows.filter(ticket => ['open', 'in_progress'].includes(String(ticket?.status || '').toLowerCase()));
  }

  function requestTitle(ticket) {
    const raw = String(ticket?.subject || '').replace(/^(Solicitud de acceso|Pre-registro)\s*·\s*/i, '').trim();
    return raw || 'Curso de Academia AG';
  }

  function ensureStyles() {
    if (document.querySelector('#admin-course-request-delivery-v86-style')) return;
    const style = document.createElement('style');
    style.id = 'admin-course-request-delivery-v86-style';
    style.textContent = `
      #ag-admin-request-inbox-v86{position:fixed;right:18px;top:82px;z-index:8500;display:none;align-items:center;gap:10px;border:1px solid rgba(0,81,52,.18);border-radius:16px;background:rgba(255,255,255,.97);box-shadow:0 16px 44px rgba(15,23,42,.16);padding:10px 12px;color:#17382d;font:inherit;cursor:pointer;backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px)}
      #ag-admin-request-inbox-v86[data-visible="1"]{display:flex}
      #ag-admin-request-inbox-v86 .ag-ar86-icon{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:#eaf5ef;color:#005134;font-weight:900}
      #ag-admin-request-inbox-v86 .ag-ar86-copy{display:grid;text-align:left;line-height:1.15}
      #ag-admin-request-inbox-v86 .ag-ar86-copy strong{font-size:.76rem;color:#1e293b}
      #ag-admin-request-inbox-v86 .ag-ar86-copy small{font-size:.65rem;color:#64748b;margin-top:3px}
      #ag-admin-request-inbox-v86 .ag-ar86-count{min-width:28px;height:28px;padding:0 7px;border-radius:999px;display:grid;place-items:center;background:#005134;color:#fff;font-size:.72rem;font-weight:900}
      @media(max-width:720px){#ag-admin-request-inbox-v86{top:auto;right:12px;left:12px;bottom:84px;justify-content:flex-start}#ag-admin-request-inbox-v86 .ag-ar86-copy{flex:1}}
    `;
    document.head.appendChild(style);
  }

  function ensureInboxButton() {
    ensureStyles();
    let button = document.querySelector('#ag-admin-request-inbox-v86');
    if (button) return button;
    button = document.createElement('button');
    button.type = 'button';
    button.id = 'ag-admin-request-inbox-v86';
    button.dataset.release = RELEASE;
    button.innerHTML = `
      <span class="ag-ar86-icon">↗</span>
      <span class="ag-ar86-copy"><strong>Solicitudes de acceso</strong><small data-ag-ar86-label>Sin solicitudes pendientes</small></span>
      <span class="ag-ar86-count" data-ag-ar86-count>0</span>`;
    button.addEventListener('click', () => {
      location.hash = '#admin';
      setTimeout(() => {
        window.ACADEMIA_AG_ADMIN_COURSE_REQUESTS?.refresh?.();
        setTimeout(() => document.querySelector('#admin-course-requests-v78')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 180);
      }, 120);
    });
    document.body.appendChild(button);
    return button;
  }

  function renderInbox(count) {
    const button = ensureInboxButton();
    const safeCount = Math.max(0, Number(count) || 0);
    button.dataset.visible = adminReady() ? '1' : '0';
    const countNode = button.querySelector('[data-ag-ar86-count]');
    const labelNode = button.querySelector('[data-ag-ar86-label]');
    if (countNode) countNode.textContent = String(safeCount);
    if (labelNode) labelNode.textContent = safeCount === 1 ? '1 pendiente de revisión' : `${safeCount} pendientes de revisión`;
    button.setAttribute('aria-label', safeCount === 1 ? '1 solicitud de acceso pendiente' : `${safeCount} solicitudes de acceso pendientes`);
  }

  function notifyAdmin(ticket, totalPending) {
    const title = requestTitle(ticket);
    try {
      if (typeof showToast === 'function') {
        showToast(`Nueva solicitud de acceso: ${title}`, 'success');
      }
    } catch (_) {}

    try {
      if (document.hidden && 'Notification' in window && Notification.permission === 'granted') {
        new Notification('Nueva solicitud de acceso · Academia AG', {
          body: `${title}. Pendientes: ${totalPending}`,
          icon: 'icon-192.png',
          tag: `ag-course-request-${ticket?.id || Date.now()}`
        });
      }
    } catch (_) {}
  }

  async function refreshAdminPanel() {
    try {
      if (typeof window.ACADEMIA_AG_ADMIN_COURSE_REQUESTS?.refresh === 'function') {
        await window.ACADEMIA_AG_ADMIN_COURSE_REQUESTS.refresh();
      }
    } catch (error) {
      console.warn('ADMIN_REQUEST_PANEL_REFRESH_FAILED', error);
    }
  }

  async function fetchPending() {
    const { data, error } = await db
      .from('support_tickets')
      .select('id,user_id,subject,status,created_at')
      .eq('category', 'course')
      .in('status', ['open', 'in_progress'])
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return pendingOnly(data || []);
  }

  async function poll({ announce = true } = {}) {
    if (running || !adminReady()) {
      if (!adminReady()) renderInbox(0);
      return;
    }
    running = true;
    try {
      const rows = await fetchPending();
      const currentIds = new Set(rows.map(row => row.id));
      const seen = readSeen();
      const unseen = rows.filter(row => !seen.has(row.id));
      const changed = currentIds.size !== knownPendingIds.size || [...currentIds].some(id => !knownPendingIds.has(id));

      renderInbox(rows.length);

      if (!initialized) {
        initialized = true;
        if (rows.length && announce) {
          try { showToast(`Tienes ${rows.length} solicitud${rows.length === 1 ? '' : 'es'} de acceso pendiente${rows.length === 1 ? '' : 's'}.`, 'info'); }
          catch (_) {}
        }
      } else if (unseen.length && announce) {
        notifyAdmin(unseen[0], rows.length);
      }

      if (unseen.length) {
        unseen.forEach(row => seen.add(row.id));
        writeSeen(seen);
      }

      knownPendingIds = currentIds;
      if (changed && /^#(?:admin|workspace)(?:\/|$)/.test(location.hash || '')) await refreshAdminPanel();
    } catch (error) {
      console.warn('ADMIN_COURSE_REQUEST_POLL_FAILED', error);
    } finally {
      running = false;
    }
  }

  function startPolling() {
    clearInterval(pollTimer);
    pollTimer = setInterval(() => poll({ announce: true }), POLL_MS);
  }

  function startRealtime() {
    if (!adminReady() || channel || typeof db?.channel !== 'function') return;
    try {
      channel = db
        .channel(`ag-admin-course-requests-${state.user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'support_tickets', filter: 'category=eq.course' },
          () => {
            setTimeout(() => poll({ announce: true }), 120);
          }
        )
        .subscribe(status => {
          document.documentElement.dataset.agCourseRequestRealtime = String(status || '').toLowerCase();
        });
    } catch (error) {
      console.warn('ADMIN_COURSE_REQUEST_REALTIME_FAILED', error);
      channel = null;
    }
  }

  function stopRealtime() {
    if (!channel) return;
    try { db.removeChannel?.(channel); }
    catch (_) {}
    channel = null;
  }

  function boot() {
    if (!adminReady()) {
      renderInbox(0);
      stopRealtime();
      return;
    }
    ensureInboxButton();
    poll({ announce: true });
    startPolling();
    startRealtime();
  }

  window.addEventListener('hashchange', () => {
    boot();
    setTimeout(() => poll({ announce: false }), 220);
  });
  window.addEventListener('focus', () => poll({ announce: true }));
  window.addEventListener('pageshow', boot);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) poll({ announce: true });
  });

  setTimeout(boot, 600);
  setTimeout(boot, 1800);

  window.ACADEMIA_AG_ADMIN_COURSE_REQUEST_DELIVERY = Object.freeze({
    release: RELEASE,
    poll: () => poll({ announce: false }),
    open: () => document.querySelector('#ag-admin-request-inbox-v86')?.click()
  });
})();
