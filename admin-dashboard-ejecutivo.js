(() => {
  'use strict';

  const RELEASE = '20260818.1';
  const COMPAS_ONE_URL = 'https://app.proyectocompas.com/';
  const cfg = window.SUPABASE_CONFIG;
  let client = null;
  let timer = null;
  let requestVersion = 0;

  const icon = name => ({
    users: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    course: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    money: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M16 12a4 4 0 0 1-8 0 4 4 0 0 1 8 0ZM2 9h2M20 15h2"/></svg>',
    access: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4M12 15v2"/></svg>',
    register: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
    support: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 14a8 8 0 0 1 16 0"/><path d="M18 19c0 1-1 2-2 2h-4"/><path d="M4 14v3a2 2 0 0 0 2 2h1v-7H6a2 2 0 0 0-2 2ZM20 14v3a2 2 0 0 1-2 2h-1v-7h1a2 2 0 0 1 2 2Z"/></svg>',
    award: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="m8.5 12-2 9 5.5-3 5.5 3-2-9"/></svg>',
    chart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3v18h18"/><path d="m7 16 4-5 4 3 5-7"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    external: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3h7v7M10 14 21 3"/><path d="M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6v6h-6"/><path d="M4 18v-6h6"/><path d="M18.5 9A7 7 0 0 0 6 6.5L4 12M20 12l-2 5.5A7 7 0 0 1 5.5 15"/></svg>',
    grid: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    log: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5M9 13h7M9 17h7M9 9h2"/></svg>'
  }[name] || '');

  function routeIsAdmin() {
    return location.hash.replace(/^#/, '') === 'admin';
  }

  function esc(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  function safeDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  function formatDate(value, compact = false) {
    const date = safeDate(value);
    if (!date) return '—';
    return date.toLocaleDateString('es-MX', compact
      ? { day: '2-digit', month: 'short' }
      : { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function daysAgo(value) {
    const date = safeDate(value);
    if (!date) return '';
    const diff = Math.max(0, Math.floor((Date.now() - date.getTime()) / 86400000));
    if (diff === 0) return 'Hoy';
    if (diff === 1) return 'Ayer';
    if (diff < 30) return `Hace ${diff} días`;
    return formatDate(value);
  }

  function recent(value, days = 30) {
    const date = safeDate(value);
    return Boolean(date && date.getTime() >= Date.now() - days * 86400000);
  }

  function approvedStatus(status = '') {
    return ['approved', 'paid', 'completed', 'success'].includes(String(status).toLowerCase());
  }

  function pendingStatus(status = '') {
    return ['pending', 'in_process', 'processing', 'created'].includes(String(status).toLowerCase());
  }

  function profileName(profile) {
    return profile?.full_name?.trim() || profile?.email || 'Alumno';
  }

  function statusLabel(status = '') {
    const value = String(status || '').toLowerCase();
    return ({
      active: 'Activo', suspended: 'Suspendido', revoked: 'Revocado', expired: 'Expirado',
      approved: 'Aprobada', paid: 'Pagada', completed: 'Completada', success: 'Aprobada',
      pending: 'Pendiente', in_process: 'En proceso', processing: 'En proceso', created: 'Creada',
      cancelled: 'Cancelada', canceled: 'Cancelada', rejected: 'Rechazada', refunded: 'Reembolsada',
      open: 'Abierto', closed: 'Cerrado', resolved: 'Resuelto'
    })[value] || (value ? value.replaceAll('_', ' ') : 'Sin estado');
  }

  function statusClass(status = '') {
    const value = String(status || '').toLowerCase();
    if (['active', 'approved', 'paid', 'completed', 'success', 'resolved'].includes(value)) return 'is-success';
    if (['pending', 'in_process', 'processing', 'created', 'open'].includes(value)) return 'is-warning';
    if (['suspended', 'cancelled', 'canceled', 'rejected', 'revoked', 'expired'].includes(value)) return 'is-danger';
    return 'is-neutral';
  }

  function money(value, currency = 'MXN') {
    const amount = Number(value || 0);
    try {
      return new Intl.NumberFormat('es-MX', { style: 'currency', currency: currency || 'MXN', maximumFractionDigits: 0 }).format(amount);
    } catch {
      return `${amount.toLocaleString('es-MX')} ${currency || ''}`.trim();
    }
  }

  function getClient() {
    if (client) return client;
    if (!window.supabase?.createClient || !cfg?.url || !cfg?.publishableKey) return null;
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
    });
    return client;
  }

  async function safeQuery(label, promise) {
    try {
      const result = await promise;
      if (result.error) {
        console.warn(`[Admin Ejecutivo] ${label}:`, result.error);
        return [];
      }
      return result.data || [];
    } catch (error) {
      console.warn(`[Admin Ejecutivo] ${label}:`, error);
      return [];
    }
  }

  async function loadDashboardData() {
    const db = getClient();
    if (!db) throw new Error('Supabase no está disponible.');
    const { data: sessionData } = await db.auth.getSession();
    const userId = sessionData?.session?.user?.id;
    if (!userId) throw new Error('No hay una sesión activa.');

    const { data: ownProfile, error: profileError } = await db
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    if (profileError) throw profileError;
    if (ownProfile?.role !== 'admin') return { isAdmin: false };

    const [profiles, enrollments, orders, accesses, history, certificates, courses, products, tickets, workspaces] = await Promise.all([
      safeQuery('profiles', db.from('profiles').select('*').order('created_at', { ascending: false })),
      safeQuery('enrollments', db.from('enrollments').select('*').order('enrolled_at', { ascending: false })),
      safeQuery('orders', db.from('orders').select('*').order('created_at', { ascending: false }).limit(500)),
      safeQuery('student_access', db.from('student_access').select('*').order('granted_at', { ascending: false }).limit(500)),
      safeQuery('access_history', db.from('access_history').select('*').order('created_at', { ascending: false }).limit(500)),
      safeQuery('certificates', db.from('certificates').select('*').order('issued_at', { ascending: false }).limit(500)),
      safeQuery('courses', db.from('courses').select('*').neq('status', 'archived').order('created_at', { ascending: false })),
      safeQuery('products', db.from('products').select('*').order('created_at', { ascending: false })),
      safeQuery('support_tickets', db.from('support_tickets').select('*').order('created_at', { ascending: false }).limit(250)),
      safeQuery('workspaces', db.from('workspaces').select('*').order('name', { ascending: true }))
    ]);

    return { isAdmin: true, ownProfile, profiles, enrollments, orders, accesses, history, certificates, courses, products, tickets, workspaces };
  }

  function weeklySeries(rows, dateField, weeks = 6) {
    const now = new Date();
    const startCurrentWeek = new Date(now);
    const day = (startCurrentWeek.getDay() + 6) % 7;
    startCurrentWeek.setHours(0, 0, 0, 0);
    startCurrentWeek.setDate(startCurrentWeek.getDate() - day);

    const buckets = Array.from({ length: weeks }, (_, index) => {
      const offset = weeks - index - 1;
      const start = new Date(startCurrentWeek);
      start.setDate(start.getDate() - offset * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return {
        label: start.toLocaleDateString('es-MX', { day: '2-digit', month: 'short' }),
        start,
        end,
        count: 0
      };
    });

    rows.forEach(row => {
      const date = safeDate(row?.[dateField]);
      if (!date) return;
      const bucket = buckets.find(item => date >= item.start && date < item.end);
      if (bucket) bucket.count += 1;
    });
    return buckets;
  }

  function trendBars(series, tone = 'green') {
    const max = Math.max(1, ...series.map(item => item.count));
    return `<div class="adminexec-bars ${tone}">
      ${series.map(item => `<div class="adminexec-bar-col" title="${esc(item.label)}: ${item.count}">
        <span style="height:${Math.max(item.count ? 16 : 5, Math.round((item.count / max) * 100))}%"></span>
        <small>${esc(item.label)}</small>
      </div>`).join('')}
    </div>`;
  }

  function metricCard(iconName, label, value, caption, tone = '') {
    return `<article class="adminexec-metric ${tone}">
      <span class="adminexec-metric-icon">${icon(iconName)}</span>
      <div class="adminexec-metric-copy">
        <small>${esc(label)}</small>
        <strong>${esc(value)}</strong>
        <span>${esc(caption)}</span>
      </div>
    </article>`;
  }

  function buildRevenueDisplay(orders) {
    const totals = new Map();
    orders.filter(order => approvedStatus(order.status)).forEach(order => {
      const currency = String(order.currency || 'MXN').toUpperCase();
      totals.set(currency, (totals.get(currency) || 0) + Number(order.amount || 0));
    });
    const entries = [...totals.entries()];
    if (!entries.length) return '$0';
    return entries.slice(0, 2).map(([currency, total]) => money(total, currency)).join(' · ');
  }

  function renderLoading(page) {
    page.innerHTML = `<section class="adminexec-loading">
      <span class="adminexec-loading-mark">AG</span>
      <div><strong>Preparando centro de control</strong><p>Consolidando alumnos, compras, accesos y registros académicos…</p></div>
      <i></i>
    </section>`;
  }

  function rowEmpty(message) {
    return `<div class="adminexec-empty"><span>${icon('log')}</span><p>${esc(message)}</p></div>`;
  }

  function renderDashboard(page, data) {
    const now = new Date();
    const students = data.profiles.filter(profile => profile.role === 'student');
    const activeStudents = students.filter(profile => !profile.account_status || profile.account_status === 'active');
    const suspendedStudents = students.filter(profile => profile.account_status && profile.account_status !== 'active');
    const registrations30 = students.filter(profile => recent(profile.created_at, 30));
    const activeEnrollments = data.enrollments.filter(row => !row.status || row.status === 'active');
    const approvedOrders = data.orders.filter(order => approvedStatus(order.status));
    const approvedOrders30 = approvedOrders.filter(order => recent(order.approved_at || order.created_at, 30));
    const pendingOrders = data.orders.filter(order => pendingStatus(order.status));
    const activeAccesses = data.accesses.filter(access => access.status === 'active' && (!access.expires_at || new Date(access.expires_at) > now));
    const limitedAccesses = data.accesses.filter(access => access.status !== 'active' || (access.expires_at && new Date(access.expires_at) <= now));
    const accessEvents30 = data.history.filter(row => recent(row.created_at, 30));
    const certificates30 = data.certificates.filter(row => recent(row.issued_at || row.created_at, 30));
    const openTickets = data.tickets.filter(ticket => !['closed', 'resolved'].includes(String(ticket.status || '').toLowerCase()));
    const publishedCourses = data.courses.filter(course => course.status === 'published');

    const profileMap = new Map(data.profiles.map(item => [item.id, item]));
    const productMap = new Map(data.products.map(item => [item.id, item]));

    const enrollmentCountByUser = new Map();
    activeEnrollments.forEach(row => enrollmentCountByUser.set(row.user_id, (enrollmentCountByUser.get(row.user_id) || 0) + 1));
    const accessCountByUser = new Map();
    activeAccesses.forEach(row => accessCountByUser.set(row.user_id, (accessCountByUser.get(row.user_id) || 0) + 1));

    const studentRows = students.slice(0, 8).map(student => `
      <div class="adminexec-table-row adminexec-student-row">
        <div class="adminexec-person">
          <span>${esc((profileName(student).charAt(0) || 'A').toUpperCase())}</span>
          <div><strong>${esc(profileName(student))}</strong><small>${esc(student.email || 'Sin correo')}</small></div>
        </div>
        <span class="adminexec-status ${statusClass(student.account_status || 'active')}">${esc(statusLabel(student.account_status || 'active'))}</span>
        <span class="adminexec-cell-number">${enrollmentCountByUser.get(student.id) || 0}<small>cursos</small></span>
        <span class="adminexec-cell-number">${accessCountByUser.get(student.id) || 0}<small>accesos</small></span>
        <span class="adminexec-date">${esc(daysAgo(student.created_at))}</span>
      </div>`).join('');

    const orderRows = data.orders.slice(0, 8).map(order => {
      const student = profileMap.get(order.user_id);
      const product = productMap.get(order.product_id);
      const buyer = student ? profileName(student) : (order.payer_email || 'Sin alumno vinculado');
      return `<div class="adminexec-table-row adminexec-order-row">
        <div><strong>${esc(product?.name || order.external_reference || 'Compra')}</strong><small>${esc(buyer)}</small></div>
        <strong class="adminexec-money">${esc(order.amount == null ? '—' : money(order.amount, order.currency || 'MXN'))}</strong>
        <span class="adminexec-status ${statusClass(order.status)}">${esc(statusLabel(order.status))}</span>
        <span class="adminexec-date">${esc(formatDate(order.approved_at || order.created_at, true))}</span>
      </div>`;
    }).join('');

    const accessRows = data.accesses.slice(0, 8).map(access => {
      const student = profileMap.get(access.user_id);
      const product = productMap.get(access.product_id);
      const effectiveStatus = access.status === 'active' && access.expires_at && new Date(access.expires_at) <= now ? 'expired' : access.status;
      return `<div class="adminexec-table-row adminexec-access-row">
        <div><strong>${esc(profileName(student))}</strong><small>${esc(product?.name || 'Producto académico')}</small></div>
        <span class="adminexec-status ${statusClass(effectiveStatus)}">${esc(statusLabel(effectiveStatus))}</span>
        <span class="adminexec-source">${esc(access.source || 'manual')}</span>
        <span class="adminexec-date">${esc(formatDate(access.granted_at, true))}</span>
      </div>`;
    }).join('');

    const historyRows = data.history.slice(0, 10).map(event => {
      const student = profileMap.get(event.user_id);
      const product = productMap.get(event.product_id);
      const action = statusLabel(event.action || event.new_status || 'registro');
      return `<div class="adminexec-log-row">
        <span class="adminexec-log-dot ${statusClass(event.new_status || event.action)}"></span>
        <div><strong>${esc(action)}</strong><p>${esc(profileName(student))} · ${esc(product?.name || 'Acceso académico')}</p></div>
        <small>${esc(daysAgo(event.created_at))}</small>
      </div>`;
    }).join('');

    const workspaceCards = data.workspaces.slice(0, 4).map(workspace => {
      const workspaceCourses = data.courses.filter(course => course.workspace_id === workspace.id);
      const workspaceProducts = data.products.filter(product => product.workspace_id === workspace.id);
      return `<a class="adminexec-workspace-card" href="#workspace/${esc(workspace.id)}" style="--adminexec-accent:${esc(workspace.accent_color || '#005134')}">
        <span class="adminexec-workspace-icon">${icon('grid')}</span>
        <div><strong>${esc(workspace.name)}</strong><p>${workspaceCourses.length} cursos · ${workspaceProducts.length} productos</p></div>
        <span class="adminexec-arrow">${icon('arrow')}</span>
      </a>`;
    }).join('');

    const registrationSeries = weeklySeries(students, 'created_at');
    const orderSeries = weeklySeries(approvedOrders.map(item => ({ ...item, metric_date: item.approved_at || item.created_at })), 'metric_date');
    const accessSeries = weeklySeries(data.history.filter(item => ['granted', 'active'].includes(String(item.action || item.new_status || '').toLowerCase())), 'created_at');

    page.innerHTML = `
      <section class="adminexec-shell" data-adminexec-release="${RELEASE}">
        <section class="adminexec-hero">
          <div class="adminexec-hero-copy">
            <span class="adminexec-eyebrow">Centro de control · Academia AG</span>
            <h1>Dashboard ejecutivo</h1>
            <p>Supervisa la operación académica desde un solo lugar: alumnos, compras, accesos, registros y métricas. El CRM, prospectos y seguimiento comercial permanecen centralizados en Compás One.</p>
            <div class="adminexec-hero-actions">
              <button class="adminexec-button primary" type="button" data-open-general="admin-users">Gestionar alumnos</button>
              <button class="adminexec-button secondary" type="button" data-open-general="access-center">Compras y accesos</button>
              <a class="adminexec-button ghost" href="${COMPAS_ONE_URL}" target="_blank" rel="noopener">Abrir Compás One ${icon('external')}</a>
            </div>
          </div>
          <div class="adminexec-hero-side">
            <span class="adminexec-live"><i></i> Datos de Academia AG</span>
            <strong>${students.length}</strong>
            <small>alumnos registrados</small>
            <button class="adminexec-refresh" type="button" id="adminexec-refresh">${icon('refresh')} Actualizar datos</button>
          </div>
        </section>

        <nav class="adminexec-nav" aria-label="Áreas del panel administrativo">
          <button type="button" data-adminexec-scroll="adminexec-overview">Resumen</button>
          <button type="button" data-adminexec-scroll="adminexec-students">Alumnos</button>
          <button type="button" data-adminexec-scroll="adminexec-orders">Compras</button>
          <button type="button" data-adminexec-scroll="adminexec-access">Accesos</button>
          <button type="button" data-adminexec-scroll="adminexec-records">Registros</button>
          <button type="button" data-adminexec-scroll="adminexec-academy">Academia</button>
        </nav>

        <section class="adminexec-metrics" id="adminexec-overview">
          ${metricCard('users', 'Alumnos', students.length, `${activeStudents.length} activos · ${suspendedStudents.length} restringidos`, 'green')}
          ${metricCard('course', 'Inscripciones activas', activeEnrollments.length, `${publishedCourses.length} cursos publicados`, 'navy')}
          ${metricCard('money', 'Ingresos aprobados', buildRevenueDisplay(data.orders), `${approvedOrders.length} compras aprobadas`, 'gold')}
          ${metricCard('access', 'Accesos activos', activeAccesses.length, `${limitedAccesses.length} suspendidos, vencidos o revocados`, 'teal')}
        </section>

        <section class="adminexec-secondary-metrics">
          <article><span>${icon('register')}</span><div><strong>${registrations30.length}</strong><small>Nuevos alumnos · 30 días</small></div></article>
          <article><span>${icon('money')}</span><div><strong>${approvedOrders30.length}</strong><small>Compras aprobadas · 30 días</small></div></article>
          <article><span>${icon('access')}</span><div><strong>${accessEvents30.length}</strong><small>Movimientos de acceso · 30 días</small></div></article>
          <article><span>${icon('support')}</span><div><strong>${openTickets.length}</strong><small>Tickets abiertos</small></div></article>
          <article><span>${icon('award')}</span><div><strong>${certificates30.length}</strong><small>Certificados · 30 días</small></div></article>
          <article><span>${icon('chart')}</span><div><strong>${pendingOrders.length}</strong><small>Compras por revisar</small></div></article>
        </section>

        <section class="adminexec-grid adminexec-insights">
          <article class="adminexec-panel adminexec-trends">
            <div class="adminexec-panel-heading"><div><span>Actividad</span><h2>Tendencia operativa</h2></div><small>Últimas 6 semanas</small></div>
            <div class="adminexec-trend-block"><div><strong>Altas de alumnos</strong><span>${students.filter(item => recent(item.created_at, 42)).length} registros</span></div>${trendBars(registrationSeries, 'green')}</div>
            <div class="adminexec-trend-block"><div><strong>Compras aprobadas</strong><span>${approvedOrders.filter(item => recent(item.approved_at || item.created_at, 42)).length} compras</span></div>${trendBars(orderSeries, 'gold')}</div>
            <div class="adminexec-trend-block"><div><strong>Accesos otorgados</strong><span>${data.history.filter(item => recent(item.created_at, 42) && ['granted','active'].includes(String(item.action || item.new_status || '').toLowerCase())).length} movimientos</span></div>${trendBars(accessSeries, 'teal')}</div>
          </article>

          <article class="adminexec-panel adminexec-boundary">
            <div class="adminexec-compas-mark">C1</div>
            <span class="adminexec-eyebrow">Sin duplicar funciones</span>
            <h2>Compás One concentra el CRM</h2>
            <p>Prospectos, conversaciones, seguimiento comercial, campañas y relación con clientes se gestionan en Compás One. Este panel se enfoca únicamente en la operación de Academia AG.</p>
            <ul><li>Academia AG: alumnos, cursos, compras, accesos y progreso.</li><li>Compás One: CRM, leads, ventas y seguimiento.</li></ul>
            <a class="adminexec-button primary" href="${COMPAS_ONE_URL}" target="_blank" rel="noopener">Ir a Compás One ${icon('external')}</a>
          </article>
        </section>

        <section class="adminexec-panel adminexec-table-panel" id="adminexec-students">
          <div class="adminexec-panel-heading"><div><span>Alumnos</span><h2>Registros recientes</h2></div><button type="button" data-open-general="admin-users">Administrar todos ${icon('arrow')}</button></div>
          <div class="adminexec-table-head adminexec-student-head"><span>Alumno</span><span>Estado</span><span>Cursos</span><span>Accesos</span><span>Registro</span></div>
          <div class="adminexec-table-body">${studentRows || rowEmpty('Todavía no hay alumnos registrados.')}</div>
        </section>

        <section class="adminexec-grid adminexec-two-tables">
          <article class="adminexec-panel adminexec-table-panel" id="adminexec-orders">
            <div class="adminexec-panel-heading"><div><span>Compras</span><h2>Últimas operaciones</h2></div><button type="button" data-open-general="access-center">Ver centro de accesos ${icon('arrow')}</button></div>
            <div class="adminexec-table-head adminexec-order-head"><span>Producto / alumno</span><span>Importe</span><span>Estado</span><span>Fecha</span></div>
            <div class="adminexec-table-body">${orderRows || rowEmpty('Todavía no hay compras registradas.')}</div>
          </article>

          <article class="adminexec-panel adminexec-table-panel" id="adminexec-access">
            <div class="adminexec-panel-heading"><div><span>Accesos</span><h2>Accesos recientes</h2></div><button type="button" data-open-general="access-center">Gestionar ${icon('arrow')}</button></div>
            <div class="adminexec-table-head adminexec-access-head"><span>Alumno / producto</span><span>Estado</span><span>Origen</span><span>Alta</span></div>
            <div class="adminexec-table-body">${accessRows || rowEmpty('Todavía no hay accesos registrados.')}</div>
          </article>
        </section>

        <section class="adminexec-grid adminexec-bottom-grid">
          <article class="adminexec-panel" id="adminexec-records">
            <div class="adminexec-panel-heading"><div><span>Auditoría</span><h2>Registro de movimientos</h2></div><small>${data.history.length} eventos cargados</small></div>
            <div class="adminexec-log-list">${historyRows || rowEmpty('Sin movimientos de acceso registrados.')}</div>
          </article>

          <article class="adminexec-panel" id="adminexec-academy">
            <div class="adminexec-panel-heading"><div><span>Operación académica</span><h2>Espacios y contenidos</h2></div><button type="button" data-open-general="admin-courses">Administración general ${icon('arrow')}</button></div>
            <div class="adminexec-workspace-list">${workspaceCards || rowEmpty('No hay espacios de trabajo configurados.')}</div>
            <div class="adminexec-academy-summary">
              <span><strong>${data.courses.length}</strong> cursos</span>
              <span><strong>${publishedCourses.length}</strong> publicados</span>
              <span><strong>${data.products.length}</strong> productos</span>
              <span><strong>${data.certificates.length}</strong> certificados emitidos</span>
            </div>
          </article>
        </section>
      </section>`;

    delete page.dataset.adminExecLoading;
    page.dataset.adminExecRelease = RELEASE;
    bindDashboard(page);
  }

  function bindDashboard(page) {
    page.querySelectorAll('[data-adminexec-scroll]').forEach(button => {
      button.addEventListener('click', () => page.querySelector(`#${button.dataset.adminexecScroll}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    });

    page.querySelectorAll('[data-open-general]').forEach(button => {
      button.addEventListener('click', () => {
        sessionStorage.setItem('ag-admin-scroll-target', button.dataset.openGeneral || '');
        location.hash = 'workspace/general';
      });
    });

    page.querySelector('#adminexec-refresh')?.addEventListener('click', () => render(true));
  }

  function handleDeferredScroll() {
    const route = location.hash.replace(/^#/, '');
    if (route !== 'workspace/general') return;
    const target = sessionStorage.getItem('ag-admin-scroll-target');
    if (!target) return;
    setTimeout(() => {
      const node = document.querySelector(`#${CSS.escape(target)}`);
      if (!node) return;
      node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      sessionStorage.removeItem('ag-admin-scroll-target');
    }, 450);
  }

  async function render(force = false) {
    handleDeferredScroll();
    if (!routeIsAdmin()) return;
    const page = document.querySelector('#page');
    if (!page) return;
    if (!force && page.querySelector(`.adminexec-shell[data-adminexec-release="${RELEASE}"]`)) return;
    if (!force && page.dataset.adminExecLoading === RELEASE) return;

    const version = ++requestVersion;
    page.dataset.adminExecLoading = RELEASE;
    renderLoading(page);
    try {
      const data = await loadDashboardData();
      if (version !== requestVersion || !routeIsAdmin()) return;
      if (!data.isAdmin) {
        delete page.dataset.adminExecLoading;
        return;
      }
      renderDashboard(page, data);
    } catch (error) {
      console.error('[Admin Ejecutivo]', error);
      if (version !== requestVersion || !routeIsAdmin()) return;
      delete page.dataset.adminExecLoading;
      page.innerHTML = `<section class="adminexec-error"><strong>No pudimos cargar el dashboard ejecutivo.</strong><p>${esc(error.message || 'Intenta nuevamente.')}</p><button type="button" id="adminexec-retry">Volver a intentar</button></section>`;
      page.querySelector('#adminexec-retry')?.addEventListener('click', () => render(true));
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      handleDeferredScroll();
      render(false);
    }, 70);
  }

  window.addEventListener('hashchange', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.ACADEMIA_AG_ADMIN_EXECUTIVE = { release: RELEASE, render };
  schedule();
})();