(() => {
  'use strict';

  const RELEASE = '20260828.92';
  const PENDING_ORDER_STATUSES = new Set(['pending', 'in_process', 'processing', 'created']);
  const PENDING_REQUEST_STATUSES = new Set(['open', 'in_progress']);
  let timer = null;
  let observer = null;
  let loading = false;
  let localClient = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
  })[char]);

  function routeIsAdmin() {
    return location.hash.replace(/^#/, '').split('/')[0] === 'admin';
  }

  function getDb() {
    try {
      if (typeof db !== 'undefined' && db) return db;
    } catch (_) {}
    if (localClient) return localClient;
    const cfg = window.SUPABASE_CONFIG;
    if (!window.supabase?.createClient || !cfg?.url || !cfg?.publishableKey) return null;
    localClient = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return localClient;
  }

  async function safeQuery(label, promise) {
    try {
      const result = await promise;
      if (result?.error) {
        console.warn(`[Admin Access Queue] ${label}:`, result.error);
        return [];
      }
      return result?.data || [];
    } catch (error) {
      console.warn(`[Admin Access Queue] ${label}:`, error);
      return [];
    }
  }

  function isCourseAccessRequest(ticket) {
    return ticket?.category === 'course' && /^Solicitud de acceso\s*·/i.test(ticket.subject || '');
  }

  function requestedCourseTitle(ticket) {
    const subject = String(ticket?.subject || '');
    const title = subject.replace(/^Solicitud de acceso\s*·\s*/i, '').trim();
    if (title && title !== subject) return title;
    return String(ticket?.message || '').match(/(?:^|\n)Curso:\s*(.+)/i)?.[1]?.trim() || 'Curso solicitado';
  }

  function profileName(profile, fallback = '') {
    return profile?.full_name?.trim() || profile?.email || fallback || 'Alumno';
  }

  function formatDate(value) {
    if (!value) return '—';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    const today = new Date();
    const sameDay = date.toDateString() === today.toDateString();
    if (sameDay) return `Hoy · ${date.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`;
    return date.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' });
  }

  function effectiveAccessStatus(access) {
    if (access?.status === 'active' && access?.expires_at && new Date(access.expires_at) <= new Date()) return 'expired';
    return String(access?.status || 'active').toLowerCase();
  }

  function sourceLabel(source) {
    const value = String(source || '').toLowerCase();
    if (value === 'manual') return 'Manual';
    if (value === 'purchase' || value === 'order' || value === 'payment') return 'Compra';
    if (value === 'import') return 'Importación';
    if (value === 'wix') return 'Wix';
    return source ? String(source) : 'Academia';
  }

  function statusMarkup(kind, label) {
    return `<span class="aaq-status-v92 ${esc(kind)}"><i></i>${esc(label)}</span>`;
  }

  function injectStyles() {
    if (document.querySelector('#admin-access-queue-v92-style')) return;
    const style = document.createElement('style');
    style.id = 'admin-access-queue-v92-style';
    style.textContent = `
      #adminexec-access.adminexec-access-queue-v92{overflow:visible}
      #adminexec-access .aaq-head-v92{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:16px}
      #adminexec-access .aaq-head-v92>div>span{display:block;color:#005134;font-weight:900;font-size:.67rem;letter-spacing:.1em;text-transform:uppercase;margin-bottom:4px}
      #adminexec-access .aaq-head-v92 h2{margin:0;color:#1e293b;font-family:Georgia,'Times New Roman',serif;font-weight:500;font-size:1.55rem}
      #adminexec-access .aaq-head-v92 p{margin:5px 0 0;color:#6b7280;font-size:.76rem;line-height:1.45}
      #adminexec-access .aaq-manage-v92{border:0;background:transparent;color:#005134;font:inherit;font-size:.72rem;font-weight:900;cursor:pointer;white-space:nowrap;padding:7px 0}
      #adminexec-access .aaq-summary-v92{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:9px;margin:0 0 16px}
      #adminexec-access .aaq-summary-card-v92{appearance:none;text-align:left;border:1px solid rgba(30,41,59,.09);background:#fbfcfb;border-radius:14px;padding:12px 13px;min-width:0;color:#1e293b;font:inherit;cursor:default;transition:transform .16s ease,border-color .16s ease,box-shadow .16s ease}
      #adminexec-access button.aaq-summary-card-v92{cursor:pointer}
      #adminexec-access button.aaq-summary-card-v92:hover{transform:translateY(-1px);border-color:rgba(0,81,52,.24);box-shadow:0 8px 22px rgba(30,41,59,.06)}
      #adminexec-access .aaq-summary-card-v92 strong{display:block;font-size:1.28rem;line-height:1.05;margin-bottom:4px}
      #adminexec-access .aaq-summary-card-v92 span{display:block;color:#6b7280;font-size:.66rem;font-weight:800}
      #adminexec-access .aaq-summary-card-v92.request{background:#fffaf0;border-color:#f0dfb7}.aaq-summary-card-v92.request strong{color:#9a6b0b}
      #adminexec-access .aaq-summary-card-v92.activation{background:#f4f7fb;border-color:#dce4ef}.aaq-summary-card-v92.activation strong{color:#1e4778}
      #adminexec-access .aaq-summary-card-v92.active{background:#f1f8f4;border-color:#d9ebe2}.aaq-summary-card-v92.active strong{color:#005134}
      #adminexec-access .aaq-summary-card-v92.restricted{background:#fafafa}.aaq-summary-card-v92.restricted strong{color:#6b7280}
      #adminexec-access .aaq-toolbar-v92{display:flex;align-items:center;justify-content:space-between;gap:10px;margin:0 0 10px}
      #adminexec-access .aaq-toolbar-v92 strong{font-size:.72rem;color:#344054}.aaq-toolbar-v92 span{font-size:.67rem;color:#7b8490}
      #adminexec-access .aaq-table-head-v92,#adminexec-access .aaq-row-v92{display:grid;grid-template-columns:minmax(210px,1.55fr) minmax(105px,.62fr) minmax(90px,.52fr) minmax(92px,.48fr) minmax(82px,.42fr);gap:12px;align-items:center}
      #adminexec-access .aaq-table-head-v92{background:#f6f8f7;border-top:1px solid #edf0ee;border-bottom:1px solid #e5e9e7;padding:10px 13px;color:#7b8490;font-size:.61rem;font-weight:900;text-transform:uppercase;letter-spacing:.055em}
      #adminexec-access .aaq-list-v92{display:grid}
      #adminexec-access .aaq-row-v92{padding:12px 13px;border-bottom:1px solid #edf0ee;min-height:58px}
      #adminexec-access .aaq-row-v92:last-child{border-bottom:0}
      #adminexec-access .aaq-row-v92.attention{background:linear-gradient(90deg,rgba(255,249,232,.65),transparent 52%)}
      #adminexec-access .aaq-person-v92{min-width:0}.aaq-person-v92 strong{display:block;color:#263444;font-size:.78rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.aaq-person-v92 small{display:block;color:#7b8490;font-size:.66rem;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      #adminexec-access .aaq-status-v92{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;padding:5px 8px;border-radius:999px;font-size:.62rem;font-weight:900;white-space:nowrap}.aaq-status-v92 i{width:6px;height:6px;border-radius:50%;background:currentColor}
      #adminexec-access .aaq-status-v92.request{background:#fff3d6;color:#8b650d}.aaq-status-v92.activation{background:#edf3fb;color:#275a92}.aaq-status-v92.active{background:#e8f5ee;color:#005134}.aaq-status-v92.restricted{background:#f2f3f5;color:#667085}
      #adminexec-access .aaq-source-v92,#adminexec-access .aaq-date-v92{color:#697384;font-size:.68rem;white-space:nowrap}
      #adminexec-access .aaq-action-v92{border:1px solid #d8e0dc;background:#fff;color:#005134;border-radius:9px;padding:7px 9px;font:inherit;font-size:.64rem;font-weight:900;cursor:pointer;white-space:nowrap}
      #adminexec-access .aaq-action-v92.primary{background:#005134;color:#fff;border-color:#005134}
      #adminexec-access .aaq-empty-v92{padding:28px 18px;text-align:center;border:1px dashed #d7dfdb;border-radius:14px;color:#7b8490;font-size:.73rem;margin:8px 0 0}
      .adminexec-nav-badge-v92{display:inline-grid;place-items:center;min-width:18px;height:18px;padding:0 5px;margin-left:5px;border-radius:999px;background:#005134;color:#fff;font-size:.58rem;font-weight:900;line-height:1}
      @media(max-width:1000px){#adminexec-access .aaq-table-head-v92,#adminexec-access .aaq-row-v92{grid-template-columns:minmax(190px,1.4fr) minmax(105px,.7fr) minmax(85px,.5fr) minmax(75px,.45fr)}#adminexec-access .aaq-table-head-v92 span:nth-child(3),#adminexec-access .aaq-row-v92>.aaq-source-v92{display:none}}
      @media(max-width:720px){#adminexec-access .aaq-summary-v92{grid-template-columns:repeat(2,minmax(0,1fr))}#adminexec-access .aaq-head-v92{display:block}#adminexec-access .aaq-manage-v92{margin-top:8px}#adminexec-access .aaq-table-head-v92{display:none}#adminexec-access .aaq-row-v92{grid-template-columns:minmax(0,1fr) auto;gap:7px 12px;align-items:start;padding:13px}#adminexec-access .aaq-row-v92>.aaq-person-v92{grid-column:1/2}#adminexec-access .aaq-row-v92>.aaq-status-v92{grid-column:2/3;grid-row:1}#adminexec-access .aaq-row-v92>.aaq-source-v92{display:block;grid-column:1/2}#adminexec-access .aaq-row-v92>.aaq-date-v92{grid-column:1/2}#adminexec-access .aaq-row-v92>.aaq-action-v92{grid-column:2/3;grid-row:2/4;align-self:center}}
    `;
    document.head.appendChild(style);
  }

  async function loadData() {
    const client = getDb();
    if (!client) throw new Error('Supabase no está disponible.');

    const [tickets, profiles, orders, accesses, products] = await Promise.all([
      safeQuery('support_tickets', client.from('support_tickets')
        .select('id,user_id,category,subject,message,status,created_at,updated_at')
        .eq('category', 'course')
        .order('created_at', { ascending: false })
        .limit(100)),
      safeQuery('profiles', client.from('profiles')
        .select('id,email,full_name,role,account_status')
        .order('created_at', { ascending: false })),
      safeQuery('orders', client.from('orders')
        .select('id,user_id,product_id,provider,payer_email,status,created_at,approved_at')
        .order('created_at', { ascending: false })
        .limit(300)),
      safeQuery('student_access', client.from('student_access')
        .select('id,user_id,product_id,status,source,granted_at,expires_at,updated_at')
        .order('granted_at', { ascending: false })
        .limit(500)),
      safeQuery('products', client.from('products')
        .select('id,name,status')
        .order('created_at', { ascending: false }))
    ]);

    return { tickets, profiles, orders, accesses, products };
  }

  function buildModel(data) {
    const profileMap = new Map(data.profiles.map(item => [item.id, item]));
    const productMap = new Map(data.products.map(item => [item.id, item]));
    const pendingRequests = data.tickets
      .filter(isCourseAccessRequest)
      .filter(ticket => PENDING_REQUEST_STATUSES.has(String(ticket.status || '').toLowerCase()));

    const activeAccesses = data.accesses.filter(access => effectiveAccessStatus(access) === 'active');
    const restrictedAccesses = data.accesses.filter(access => effectiveAccessStatus(access) !== 'active');
    const activeKeys = new Set(activeAccesses.map(access => `${access.user_id || ''}:${access.product_id || ''}`));
    const pendingActivations = data.orders.filter(order => {
      const status = String(order.status || '').toLowerCase();
      if (!PENDING_ORDER_STATUSES.has(status)) return false;
      if (!order.user_id || !order.product_id) return true;
      return !activeKeys.has(`${order.user_id}:${order.product_id}`);
    });

    const requestRows = pendingRequests.map(ticket => ({
      kind: 'request',
      name: profileName(profileMap.get(ticket.user_id)),
      item: requestedCourseTitle(ticket),
      status: ticket.status === 'in_progress' ? 'En revisión' : 'Solicitud',
      source: 'Solicitud',
      date: ticket.created_at,
      action: 'Revisar',
      target: 'admin-course-requests-v78'
    }));

    const activationRows = pendingActivations.map(order => ({
      kind: 'activation',
      name: profileName(profileMap.get(order.user_id), order.payer_email || 'Alumno por vincular'),
      item: productMap.get(order.product_id)?.name || 'Producto por confirmar',
      status: 'Por activar',
      source: sourceLabel(order.provider || 'Compra'),
      date: order.created_at,
      action: 'Activar',
      target: 'access-center'
    }));

    const activeRows = activeAccesses.map(access => ({
      kind: 'active',
      name: profileName(profileMap.get(access.user_id)),
      item: productMap.get(access.product_id)?.name || 'Producto académico',
      status: 'Activo',
      source: sourceLabel(access.source),
      date: access.granted_at,
      action: 'Ver',
      target: 'access-center'
    }));

    const restrictedRows = restrictedAccesses.map(access => ({
      kind: 'restricted',
      name: profileName(profileMap.get(access.user_id)),
      item: productMap.get(access.product_id)?.name || 'Producto académico',
      status: effectiveAccessStatus(access) === 'expired' ? 'Vencido' : 'Restringido',
      source: sourceLabel(access.source),
      date: access.updated_at || access.granted_at,
      action: 'Revisar',
      target: 'access-center'
    }));

    const rows = [
      ...requestRows.slice(0, 4),
      ...activationRows.slice(0, 4),
      ...activeRows.slice(0, 6),
      ...restrictedRows.slice(0, 2)
    ].slice(0, 10);

    return {
      pendingRequests,
      pendingActivations,
      activeAccesses,
      restrictedAccesses,
      rows,
      attention: pendingRequests.length + pendingActivations.length
    };
  }

  function rowMarkup(row) {
    const label = row.kind === 'request' ? row.status : row.status;
    return `<div class="aaq-row-v92 ${row.kind === 'request' || row.kind === 'activation' ? 'attention' : ''}">
      <div class="aaq-person-v92"><strong>${esc(row.name)}</strong><small>${esc(row.item)}</small></div>
      ${statusMarkup(row.kind, label)}
      <span class="aaq-source-v92">${esc(row.source)}</span>
      <span class="aaq-date-v92">${esc(formatDate(row.date))}</span>
      <button type="button" class="aaq-action-v92 ${row.kind === 'request' || row.kind === 'activation' ? 'primary' : ''}" data-aaq-target="${esc(row.target)}">${esc(row.action)}</button>
    </div>`;
  }

  function openGeneral(target) {
    sessionStorage.setItem('ag-admin-scroll-target', target || 'access-center');
    location.hash = 'workspace/general';
  }

  function patchNav(model) {
    const button = document.querySelector('[data-adminexec-scroll="adminexec-access"]');
    if (!button) return;
    button.querySelector('.adminexec-nav-badge-v92')?.remove();
    if (model.attention > 0) {
      button.insertAdjacentHTML('beforeend', `<span class="adminexec-nav-badge-v92" title="Pendientes de atención">${model.attention}</span>`);
    }
  }

  function renderPanel(panel, model) {
    panel.classList.add('adminexec-access-queue-v92');
    panel.dataset.accessQueueRelease = RELEASE;
    panel.innerHTML = `
      <div class="aaq-head-v92">
        <div><span>Centro de accesos</span><h2>Pendientes y accesos</h2><p>Solicitudes, activaciones y accesos activos reunidos en una sola bandeja de trabajo.</p></div>
        <button type="button" class="aaq-manage-v92" data-aaq-target="access-center">Gestionar todo →</button>
      </div>

      <div class="aaq-summary-v92" aria-label="Resumen de accesos">
        <button type="button" class="aaq-summary-card-v92 request" data-aaq-target="admin-course-requests-v78"><strong>${model.pendingRequests.length}</strong><span>Solicitudes pendientes</span></button>
        <button type="button" class="aaq-summary-card-v92 activation" data-aaq-target="access-center"><strong>${model.pendingActivations.length}</strong><span>Por activar</span></button>
        <button type="button" class="aaq-summary-card-v92 active" data-aaq-target="access-center"><strong>${model.activeAccesses.length}</strong><span>Accesos activos</span></button>
        <button type="button" class="aaq-summary-card-v92 restricted" data-aaq-target="access-center"><strong>${model.restrictedAccesses.length}</strong><span>Restringidos / vencidos</span></button>
      </div>

      <div class="aaq-toolbar-v92"><strong>${model.attention ? `${model.attention} requieren atención` : 'Operación al día'}</strong><span>Solicitudes y activaciones aparecen primero</span></div>
      <div class="aaq-table-head-v92"><span>Alumno / producto</span><span>Estado</span><span>Origen</span><span>Fecha</span><span>Acción</span></div>
      <div class="aaq-list-v92">${model.rows.length ? model.rows.map(rowMarkup).join('') : '<div class="aaq-empty-v92">Todavía no hay solicitudes, activaciones ni accesos registrados.</div>'}</div>`;

    panel.querySelectorAll('[data-aaq-target]').forEach(button => {
      button.addEventListener('click', () => openGeneral(button.dataset.aaqTarget));
    });
    patchNav(model);
  }

  async function render(force = false) {
    if (loading || !routeIsAdmin()) return;
    const panel = document.querySelector('#adminexec-access');
    if (!panel) return;
    if (!force && panel.dataset.accessQueueRelease === RELEASE) return;

    loading = true;
    try {
      injectStyles();
      const data = await loadData();
      if (!routeIsAdmin()) return;
      const livePanel = document.querySelector('#adminexec-access');
      if (!livePanel) return;
      renderPanel(livePanel, buildModel(data));
      document.documentElement.dataset.agAdminAccessQueue = RELEASE;
    } catch (error) {
      console.error('ADMIN_ACCESS_QUEUE_V92_FAILED', error);
    } finally {
      loading = false;
    }
  }

  function schedule(force = false) {
    clearTimeout(timer);
    timer = setTimeout(() => render(force), 120);
  }

  function observe() {
    if (!observer) observer = new MutationObserver(() => schedule(false));
    observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', () => schedule(false));
  window.addEventListener('pageshow', () => schedule(false));
  observe();
  schedule(false);

  window.ACADEMIA_AG_ADMIN_ACCESS_QUEUE = Object.freeze({ release: RELEASE, refresh: () => render(true) });
})();
