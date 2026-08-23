(() => {
  'use strict';

  const RELEASE = '20260823.78';
  let observer = null;
  let timer = null;
  let loading = false;
  let cachedTickets = [];
  let cachedProfiles = [];

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char]);

  function normalize(value = '') {
    return String(value)
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function isAdminRoute() {
    try {
      const page = location.hash.replace(/^#/, '').split('/')[0] || 'home';
      return ['admin','workspace'].includes(page) && Boolean(state?.session && state?.user) && typeof isAdmin === 'function' && isAdmin();
    } catch (_) {
      return false;
    }
  }

  function isCourseRequest(ticket) {
    if (!ticket || ticket.category !== 'course') return false;
    return /^Solicitud de acceso\s*·/i.test(ticket.subject || '') || /^Pre-registro\s*·/i.test(ticket.subject || '');
  }

  function requestType(ticket) {
    return /^Pre-registro\s*·/i.test(ticket?.subject || '') ? 'preregister' : 'access';
  }

  function requestedCourseTitle(ticket) {
    const subject = String(ticket?.subject || '');
    const fromSubject = subject.replace(/^(Solicitud de acceso|Pre-registro)\s*·\s*/i, '').trim();
    if (fromSubject && fromSubject !== subject) return fromSubject;
    const message = String(ticket?.message || '');
    return message.match(/(?:^|\n)Curso:\s*(.+)/i)?.[1]?.trim() || 'Curso por confirmar';
  }

  function courseForTicket(ticket) {
    const title = normalize(requestedCourseTitle(ticket));
    const courses = Array.isArray(state?.courses) ? state.courses : [];
    return courses.find(course => normalize(course.title) === title)
      || courses.find(course => normalize(course.title).includes(title) || title.includes(normalize(course.title)))
      || null;
  }

  function profileFor(ticket) {
    return cachedProfiles.find(profile => profile.id === ticket.user_id)
      || (Array.isArray(state?.profiles) ? state.profiles.find(profile => profile.id === ticket.user_id) : null)
      || null;
  }

  function statusMeta(ticket) {
    const resolution = String(ticket?.resolution || '').toLowerCase();
    if (resolution.includes('acceso aprobado')) return ['approved', 'Aprobada'];
    if (ticket?.status === 'closed' || resolution.includes('rechaz')) return ['rejected', 'Rechazada'];
    if (ticket?.status === 'resolved') return ['resolved', requestType(ticket) === 'preregister' ? 'Atendido' : 'Resuelta'];
    if (ticket?.status === 'in_progress') return ['progress', 'En revisión'];
    return ['pending', 'Pendiente'];
  }

  function injectStyles() {
    if (document.querySelector('#admin-course-requests-v78-style')) return;
    const style = document.createElement('style');
    style.id = 'admin-course-requests-v78-style';
    style.textContent = `
      #admin-course-requests-v78{scroll-margin-top:90px;border:1px solid rgba(30,41,59,.10);background:#fff;border-radius:24px;padding:24px;margin:24px 0;box-shadow:0 16px 46px rgba(30,41,59,.07)}
      .acr-head-v78{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:18px}
      .acr-head-v78 .eyebrow{display:block;color:#005134;font-weight:900;font-size:.68rem;letter-spacing:.11em;text-transform:uppercase;margin-bottom:5px}
      .acr-head-v78 h2{margin:0;font-family:Georgia,'Times New Roman',serif;font-weight:500;color:#1e293b;font-size:2rem}
      .acr-head-v78 p{margin:8px 0 0;color:#6b7280;font-size:.86rem}
      .acr-counter-v78{min-width:92px;text-align:center;padding:12px 14px;border-radius:18px;background:#f1f7f4;color:#005134}
      .acr-counter-v78 strong{display:block;font-size:1.55rem;line-height:1}.acr-counter-v78 span{font-size:.66rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em}
      .acr-stats-v78{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:18px}
      .acr-stat-v78{padding:13px 14px;border:1px solid rgba(30,41,59,.09);border-radius:15px;background:#fbfcfb}.acr-stat-v78 strong{display:block;color:#1e293b;font-size:1.15rem}.acr-stat-v78 span{font-size:.68rem;color:#6b7280}
      .acr-toolbar-v78{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:14px;flex-wrap:wrap}
      .acr-filters-v78{display:flex;gap:7px;flex-wrap:wrap}.acr-filter-v78{border:1px solid #dfe4e8;background:#fff;color:#4b5563;padding:8px 12px;border-radius:999px;font:inherit;font-size:.72rem;font-weight:800;cursor:pointer}.acr-filter-v78.active{background:#1e293b;color:#fff;border-color:#1e293b}
      .acr-refresh-v78{border:0;background:#eef5f1;color:#005134;border-radius:12px;padding:9px 12px;font:inherit;font-size:.72rem;font-weight:900;cursor:pointer}
      .acr-list-v78{display:grid;gap:12px}.acr-card-v78{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(210px,.65fr);gap:18px;padding:18px;border:1px solid rgba(30,41,59,.10);border-radius:18px;background:#fff}
      .acr-person-v78{display:flex;gap:12px;align-items:flex-start}.acr-avatar-v78{width:46px;height:46px;border-radius:50%;object-fit:cover;background:#eef2f0;border:1px solid #e0e5e2}.acr-avatar-fallback-v78{width:46px;height:46px;border-radius:50%;display:grid;place-items:center;background:#edf4f0;color:#005134;font-weight:900}
      .acr-card-v78 h3{margin:0 0 4px;color:#1e293b;font-size:1rem}.acr-card-v78 p{margin:0;color:#6b7280;font-size:.76rem;line-height:1.45}.acr-course-v78{margin-top:10px;padding:10px 12px;border-radius:12px;background:#f7f9f8;color:#34423d;font-size:.76rem}.acr-course-v78 strong{color:#005134}
      .acr-card-side-v78{display:flex;flex-direction:column;align-items:flex-end;justify-content:space-between;gap:14px}.acr-status-v78{display:inline-flex;padding:6px 9px;border-radius:999px;font-size:.64rem;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.acr-status-v78.pending,.acr-status-v78.progress{background:#fff7dc;color:#8a6a15}.acr-status-v78.approved,.acr-status-v78.resolved{background:#e8f5ee;color:#005134}.acr-status-v78.rejected{background:#fff0ee;color:#9c2f24}
      .acr-actions-v78{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.acr-actions-v78 button{border:1px solid #d9dfe2;background:#fff;color:#344054;border-radius:10px;padding:8px 10px;font:inherit;font-size:.68rem;font-weight:800;cursor:pointer}.acr-actions-v78 .primary{background:#005134;color:#fff;border-color:#005134}.acr-actions-v78 .danger{color:#9c2f24;border-color:#efc7c2}.acr-actions-v78 button:disabled{opacity:.55;cursor:not-allowed}
      .acr-empty-v78{padding:30px;text-align:center;border:1px dashed #cfd8d3;border-radius:18px;color:#6b7280}.acr-admin-tab-v78{border:0;background:transparent;color:inherit;padding:0;font:inherit;cursor:pointer;font-weight:700}
      .acr-modal-v78{position:fixed;inset:0;z-index:99999;background:rgba(15,23,42,.52);display:grid;place-items:center;padding:20px}.acr-modal-card-v78{width:min(560px,100%);max-height:min(680px,90vh);overflow:auto;background:#fff;border-radius:24px;padding:24px;box-shadow:0 30px 90px rgba(15,23,42,.28)}.acr-modal-card-v78 h2{font-family:Georgia,'Times New Roman',serif;font-weight:500;margin:0 0 8px;color:#1e293b}.acr-modal-card-v78 p{color:#667085;font-size:.82rem}.acr-modal-card-v78 label{display:grid;gap:7px;margin:16px 0;font-size:.74rem;font-weight:800;color:#344054}.acr-modal-card-v78 select,.acr-modal-card-v78 textarea{width:100%;border:1px solid #d8dee2;border-radius:12px;padding:11px 12px;font:inherit;background:#fff}.acr-modal-card-v78 textarea{min-height:92px;resize:vertical}.acr-modal-actions-v78{display:flex;justify-content:flex-end;gap:9px;margin-top:18px}.acr-modal-actions-v78 button{border:1px solid #d9dfe2;background:#fff;border-radius:11px;padding:10px 14px;font:inherit;font-weight:800;cursor:pointer}.acr-modal-actions-v78 .primary{background:#005134;color:#fff;border-color:#005134}.acr-modal-actions-v78 .danger{background:#9c2f24;color:#fff;border-color:#9c2f24}
      @media(max-width:900px){.acr-stats-v78{grid-template-columns:repeat(2,1fr)}.acr-card-v78{grid-template-columns:1fr}.acr-card-side-v78{align-items:flex-start}.acr-actions-v78{justify-content:flex-start}}
      @media(max-width:620px){#admin-course-requests-v78{padding:18px}.acr-head-v78{display:block}.acr-counter-v78{margin-top:12px;width:100%}.acr-stats-v78{grid-template-columns:1fr 1fr}.acr-actions-v78 button{flex:1}}
    `;
    document.head.appendChild(style);
  }

  async function fetchData() {
    const [ticketsResult, profilesResult] = await Promise.all([
      db.from('support_tickets')
        .select('id,user_id,category,subject,message,status,priority,resolution,created_at,updated_at')
        .eq('category', 'course')
        .order('created_at', { ascending: false })
        .limit(100),
      db.from('profiles')
        .select('id,email,full_name,avatar_url,role,account_status')
        .order('full_name', { ascending: true })
    ]);
    if (ticketsResult.error) throw ticketsResult.error;
    if (profilesResult.error) throw profilesResult.error;
    cachedTickets = (ticketsResult.data || []).filter(isCourseRequest);
    cachedProfiles = profilesResult.data || [];
  }

  function stats() {
    const requests = cachedTickets;
    const pending = requests.filter(ticket => ['open','in_progress'].includes(ticket.status)).length;
    const access = requests.filter(ticket => requestType(ticket) === 'access' && ['open','in_progress'].includes(ticket.status)).length;
    const prereg = requests.filter(ticket => requestType(ticket) === 'preregister' && ['open','in_progress'].includes(ticket.status)).length;
    const approved = requests.filter(ticket => statusMeta(ticket)[0] === 'approved').length;
    return { pending, access, prereg, approved };
  }

  function card(ticket) {
    const profile = profileFor(ticket);
    const course = courseForTicket(ticket);
    const [statusClass, statusLabel] = statusMeta(ticket);
    const type = requestType(ticket);
    const pending = ['open','in_progress'].includes(ticket.status);
    const name = profile?.full_name || profile?.email || 'Alumno';
    const email = profile?.email || '';
    const avatar = profile?.avatar_url;
    const date = ticket.created_at ? new Date(ticket.created_at).toLocaleString('es-MX', { dateStyle: 'medium', timeStyle: 'short' }) : '';
    const courseTitle = requestedCourseTitle(ticket);

    return `
      <article class="acr-card-v78" data-acr-ticket="${esc(ticket.id)}" data-acr-filter="${type === 'preregister' ? 'preregister' : (pending ? 'pending' : statusClass)}">
        <div>
          <div class="acr-person-v78">
            ${avatar ? `<img class="acr-avatar-v78" src="${esc(avatar)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'acr-avatar-fallback-v78',textContent:'${esc(name.slice(0,1).toUpperCase())}'}))">` : `<div class="acr-avatar-fallback-v78">${esc(name.slice(0,1).toUpperCase())}</div>`}
            <div>
              <h3>${esc(name)}</h3>
              <p>${esc(email || 'Correo no disponible')} · ${esc(date)}</p>
              <p>${type === 'preregister' ? 'Pre-registro para próximo programa' : 'Solicitud de acceso a curso disponible'}</p>
            </div>
          </div>
          <div class="acr-course-v78"><strong>Curso solicitado:</strong> ${esc(courseTitle)}${course ? '' : ' · pendiente de vincular con un curso publicado'}</div>
        </div>
        <div class="acr-card-side-v78">
          <span class="acr-status-v78 ${esc(statusClass)}">${esc(statusLabel)}</span>
          <div class="acr-actions-v78">
            <button type="button" data-acr-view="${esc(ticket.id)}">Ver alumno</button>
            ${pending && type === 'access' ? `<button type="button" data-acr-assign="${esc(ticket.id)}">Asignar curso</button><button class="primary" type="button" data-acr-approve="${esc(ticket.id)}" ${course ? '' : 'disabled'}>Aprobar</button><button class="danger" type="button" data-acr-reject="${esc(ticket.id)}">Rechazar</button>` : ''}
            ${pending && type === 'preregister' ? `<button class="primary" type="button" data-acr-contacted="${esc(ticket.id)}">Marcar atendido</button><button class="danger" type="button" data-acr-reject="${esc(ticket.id)}">Cerrar</button>` : ''}
          </div>
        </div>
      </article>`;
  }

  function sectionMarkup() {
    const s = stats();
    return `
      <section id="admin-course-requests-v78" data-release="${RELEASE}">
        <div class="acr-head-v78">
          <div><span class="eyebrow">Centro de control</span><h2>Solicitudes de acceso</h2><p>Aprueba accesos, revisa alumnos y administra pre-registros sin mezclarlos con los tickets generales de soporte.</p></div>
          <div class="acr-counter-v78"><strong>${s.pending}</strong><span>pendientes</span></div>
        </div>
        <div class="acr-stats-v78">
          <div class="acr-stat-v78"><strong>${s.access}</strong><span>Accesos pendientes</span></div>
          <div class="acr-stat-v78"><strong>${s.prereg}</strong><span>Pre-registros</span></div>
          <div class="acr-stat-v78"><strong>${s.approved}</strong><span>Aprobadas</span></div>
          <div class="acr-stat-v78"><strong>${cachedTickets.length}</strong><span>Total solicitudes</span></div>
        </div>
        <div class="acr-toolbar-v78">
          <div class="acr-filters-v78">
            <button class="acr-filter-v78 active" type="button" data-acr-filter-button="all">Todas</button>
            <button class="acr-filter-v78" type="button" data-acr-filter-button="pending">Pendientes</button>
            <button class="acr-filter-v78" type="button" data-acr-filter-button="preregister">Pre-registros</button>
            <button class="acr-filter-v78" type="button" data-acr-filter-button="approved">Aprobadas</button>
            <button class="acr-filter-v78" type="button" data-acr-filter-button="rejected">Rechazadas</button>
          </div>
          <button class="acr-refresh-v78" type="button" data-acr-refresh>↻ Actualizar</button>
        </div>
        <div class="acr-list-v78">${cachedTickets.length ? cachedTickets.map(card).join('') : '<div class="acr-empty-v78">No hay solicitudes de acceso ni pre-registros todavía.</div>'}</div>
      </section>`;
  }

  function closeModal() {
    document.querySelector('.acr-modal-v78')?.remove();
  }

  function modal(content) {
    closeModal();
    const overlay = document.createElement('div');
    overlay.className = 'acr-modal-v78';
    overlay.innerHTML = `<div class="acr-modal-card-v78">${content}</div>`;
    overlay.addEventListener('click', event => { if (event.target === overlay) closeModal(); });
    document.body.appendChild(overlay);
    overlay.querySelectorAll('[data-acr-close]').forEach(button => button.addEventListener('click', closeModal));
    return overlay;
  }

  function showStudent(ticket) {
    const profile = profileFor(ticket);
    const courseTitle = requestedCourseTitle(ticket);
    modal(`
      <h2>Perfil del alumno</h2>
      <p>Información asociada a esta solicitud.</p>
      <div class="acr-course-v78"><strong>Nombre:</strong> ${esc(profile?.full_name || 'Sin nombre')}<br><strong>Correo:</strong> ${esc(profile?.email || 'No disponible')}<br><strong>Estado de cuenta:</strong> ${esc(profile?.account_status || 'active')}<br><strong>Curso solicitado:</strong> ${esc(courseTitle)}<br><strong>Fecha:</strong> ${esc(ticket.created_at ? new Date(ticket.created_at).toLocaleString('es-MX') : '')}</div>
      <div class="acr-modal-actions-v78"><button type="button" data-acr-close>Cerrar</button><button class="primary" type="button" data-acr-go-users>Ir a gestión de alumnos</button></div>`);
    document.querySelector('[data-acr-go-users]')?.addEventListener('click', () => {
      closeModal();
      document.querySelector('#admin-users')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function assignmentModal(ticket) {
    const currentCourse = courseForTicket(ticket);
    const courses = (Array.isArray(state?.courses) ? state.courses : []).filter(course => course.status === 'published');
    const overlay = modal(`
      <h2>Asignar curso</h2>
      <p>Selecciona el curso que debe recibir el alumno. Al confirmar, se activará su inscripción y la solicitud quedará resuelta.</p>
      <label>Curso<select data-acr-course-select>${courses.map(course => `<option value="${esc(course.id)}" ${currentCourse?.id === course.id ? 'selected' : ''}>${esc(course.title)}</option>`).join('')}</select></label>
      <div class="acr-modal-actions-v78"><button type="button" data-acr-close>Cancelar</button><button class="primary" type="button" data-acr-confirm-assign ${courses.length ? '' : 'disabled'}>Asignar y aprobar</button></div>`);
    overlay.querySelector('[data-acr-confirm-assign]')?.addEventListener('click', async buttonEvent => {
      const courseId = overlay.querySelector('[data-acr-course-select]')?.value;
      if (!courseId) return;
      await approve(ticket, courseId, buttonEvent.currentTarget);
      closeModal();
    });
  }

  async function notifyUser(ticket, title, message, href = '#courses') {
    try {
      const { error } = await db.from('notifications').insert({
        target_user: ticket.user_id,
        notification_type: 'course',
        title,
        message,
        href,
        created_by: state.user.id
      });
      if (error) throw error;
    } catch (error) {
      console.warn('No se pudo crear la notificación del alumno:', error);
    }
  }

  async function approve(ticket, explicitCourseId = '', button = null) {
    const course = (Array.isArray(state?.courses) ? state.courses : []).find(item => item.id === explicitCourseId) || courseForTicket(ticket);
    if (!course) {
      assignmentModal(ticket);
      return;
    }
    if (button) { button.disabled = true; button.textContent = 'Aprobando…'; }
    try {
      const { data: existing, error: existingError } = await db.from('enrollments')
        .select('id,status')
        .eq('user_id', ticket.user_id)
        .eq('course_id', course.id)
        .maybeSingle();
      if (existingError) throw existingError;

      if (existing) {
        if (!['active','completed'].includes(existing.status)) {
          const { error } = await db.from('enrollments').update({
            status: 'active',
            enrolled_at: new Date().toISOString(),
            completed_at: null,
            expires_at: null
          }).eq('id', existing.id);
          if (error) throw error;
        }
      } else {
        const { error } = await db.from('enrollments').insert({
          user_id: ticket.user_id,
          course_id: course.id,
          status: 'active'
        });
        if (error) throw error;
      }

      const resolution = `Acceso aprobado · ${course.title}`;
      const { error: ticketError } = await db.from('support_tickets').update({
        status: 'resolved',
        resolution,
        updated_at: new Date().toISOString()
      }).eq('id', ticket.id);
      if (ticketError) throw ticketError;

      await notifyUser(ticket, 'Acceso aprobado', `Tu acceso a ${course.title} fue aprobado. Ya puedes abrir el curso desde “Mis cursos”.`);
      if (typeof showToast === 'function') showToast(`Acceso aprobado para ${profileFor(ticket)?.full_name || 'el alumno'}.`, 'success');
      await refresh(true);
    } catch (error) {
      console.error('ADMIN_COURSE_REQUEST_APPROVE_FAILED', error);
      if (typeof showToast === 'function') showToast(error?.message || 'No se pudo aprobar la solicitud.', 'error');
      if (button) { button.disabled = false; button.textContent = 'Aprobar'; }
    }
  }

  async function reject(ticket) {
    const reason = window.prompt('Motivo de rechazo o cierre:', requestType(ticket) === 'preregister' ? 'Pre-registro cerrado por administración.' : 'La solicitud no fue aprobada por administración.');
    if (reason === null) return;
    try {
      const { error } = await db.from('support_tickets').update({
        status: 'closed',
        resolution: String(reason || 'Solicitud cerrada por administración.').slice(0, 1000),
        updated_at: new Date().toISOString()
      }).eq('id', ticket.id);
      if (error) throw error;
      await notifyUser(ticket, requestType(ticket) === 'preregister' ? 'Pre-registro actualizado' : 'Solicitud de acceso actualizada', String(reason || 'Tu solicitud fue cerrada por administración.'), '#help');
      if (typeof showToast === 'function') showToast('Solicitud cerrada.', 'success');
      await refresh(true);
    } catch (error) {
      console.error('ADMIN_COURSE_REQUEST_REJECT_FAILED', error);
      if (typeof showToast === 'function') showToast(error?.message || 'No se pudo cerrar la solicitud.', 'error');
    }
  }

  async function markContacted(ticket) {
    try {
      const title = requestedCourseTitle(ticket);
      const { error } = await db.from('support_tickets').update({
        status: 'resolved',
        resolution: `Pre-registro atendido · ${title}`,
        updated_at: new Date().toISOString()
      }).eq('id', ticket.id);
      if (error) throw error;
      await notifyUser(ticket, 'Pre-registro recibido', `Tu interés en ${title} quedó registrado. AG Business Networking podrá contactarte cuando el programa abra inscripciones.`, '#catalog/programs');
      if (typeof showToast === 'function') showToast('Pre-registro marcado como atendido.', 'success');
      await refresh(true);
    } catch (error) {
      console.error('ADMIN_PREREGISTER_RESOLVE_FAILED', error);
      if (typeof showToast === 'function') showToast(error?.message || 'No se pudo actualizar el pre-registro.', 'error');
    }
  }

  function wire(section) {
    section.querySelectorAll('[data-acr-filter-button]').forEach(button => button.addEventListener('click', () => {
      const filter = button.dataset.acrFilterButton;
      section.querySelectorAll('[data-acr-filter-button]').forEach(item => item.classList.toggle('active', item === button));
      section.querySelectorAll('[data-acr-ticket]').forEach(cardEl => {
        const kind = cardEl.dataset.acrFilter;
        cardEl.hidden = filter !== 'all' && kind !== filter && !(filter === 'pending' && kind === 'preregister');
      });
    }));
    section.querySelector('[data-acr-refresh]')?.addEventListener('click', () => refresh(true));
    section.querySelectorAll('[data-acr-view]').forEach(button => button.addEventListener('click', () => {
      const ticket = cachedTickets.find(item => item.id === button.dataset.acrView); if (ticket) showStudent(ticket);
    }));
    section.querySelectorAll('[data-acr-assign]').forEach(button => button.addEventListener('click', () => {
      const ticket = cachedTickets.find(item => item.id === button.dataset.acrAssign); if (ticket) assignmentModal(ticket);
    }));
    section.querySelectorAll('[data-acr-approve]').forEach(button => button.addEventListener('click', () => {
      const ticket = cachedTickets.find(item => item.id === button.dataset.acrApprove); if (ticket) approve(ticket, '', button);
    }));
    section.querySelectorAll('[data-acr-reject]').forEach(button => button.addEventListener('click', () => {
      const ticket = cachedTickets.find(item => item.id === button.dataset.acrReject); if (ticket) reject(ticket);
    }));
    section.querySelectorAll('[data-acr-contacted]').forEach(button => button.addEventListener('click', () => {
      const ticket = cachedTickets.find(item => item.id === button.dataset.acrContacted); if (ticket) markContacted(ticket);
    }));
  }

  function injectAdminTab(section) {
    const tabs = document.querySelector('.workspace-admin-tabs');
    if (tabs && !tabs.querySelector('[data-acr-admin-tab]')) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'acr-admin-tab-v78';
      button.dataset.acrAdminTab = '1';
      button.textContent = `Solicitudes${stats().pending ? ` (${stats().pending})` : ''}`;
      button.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      tabs.appendChild(button);
    }

    const supportQuick = document.querySelector('[data-admin-scroll="admin-support"]');
    if (supportQuick && !document.querySelector('[data-acr-quick]')) {
      const quick = document.createElement('button');
      quick.type = 'button';
      quick.dataset.acrQuick = '1';
      quick.innerHTML = `<span>⇢</span>Solicitudes de acceso${stats().pending ? ` (${stats().pending})` : ''}`;
      quick.addEventListener('click', () => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      supportQuick.insertAdjacentElement('beforebegin', quick);
    }
  }

  async function render(force = false) {
    if (loading || !isAdminRoute()) return;
    const support = document.querySelector('#admin-support');
    if (!support) return;
    const existing = document.querySelector('#admin-course-requests-v78');
    if (existing && !force) return;

    loading = true;
    observer?.disconnect();
    try {
      injectStyles();
      await fetchData();
      document.querySelector('#admin-course-requests-v78')?.remove();
      support.insertAdjacentHTML('beforebegin', sectionMarkup());
      const section = document.querySelector('#admin-course-requests-v78');
      if (section) {
        wire(section);
        document.querySelector('[data-acr-admin-tab]')?.remove();
        document.querySelector('[data-acr-quick]')?.remove();
        injectAdminTab(section);
      }
      document.documentElement.dataset.agAdminCourseRequests = RELEASE;
    } catch (error) {
      console.error('ADMIN_COURSE_REQUESTS_RENDER_FAILED', error);
      if (typeof showToast === 'function') showToast('No se pudieron cargar las solicitudes de acceso.', 'error');
    } finally {
      loading = false;
      observe();
    }
  }

  async function refresh(force = true) {
    await render(force);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => render(false), 160);
  }

  function observe() {
    if (!observer) observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();
  schedule();

  window.ACADEMIA_AG_ADMIN_COURSE_REQUESTS = Object.freeze({ release: RELEASE, refresh });
})();