(() => {
  'use strict';

  const RELEASE = '20260823.75';
  const OFFICIAL_UTAH_COVER = 'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png';
  let timer = null;
  let observer = null;
  let rendering = false;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char]);

  function isCatalogRoute() {
    return location.hash.replace(/^#/, '').split('/')[0] === 'catalog';
  }

  function isStudentSession() {
    try {
      return Boolean(state?.session && state?.user && String(state?.profile?.role || 'student') === 'student');
    } catch (_) {
      return false;
    }
  }

  function normalizeTitle(value = '') {
    return String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
  }

  function courseImage(course, program) {
    const title = String(course?.title || program?.title || '');
    if (/Utah Driver Success Program/i.test(title)) return OFFICIAL_UTAH_COVER;
    const raw = String(course?.cover_url || program?.image || 'curso-utah-driver.webp').trim();
    if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
    return raw.replace(/^\.?\/?assets\//i, '').replace(/^\.?\//, '') || 'curso-utah-driver.webp';
  }

  function visiblePrograms() {
    let publicPrograms = [];
    let academyCourses = [];
    try { publicPrograms = Array.isArray(PUBLIC_PROGRAMS) ? PUBLIC_PROGRAMS : []; } catch (_) {}
    try { academyCourses = Array.isArray(state?.courses) ? state.courses : []; } catch (_) {}

    const merged = [];
    const seen = new Set();

    publicPrograms.forEach(program => {
      const key = normalizeTitle(program.title);
      const course = academyCourses.find(item => normalizeTitle(item.title) === key) || null;
      merged.push({
        id: course?.id || '',
        title: course?.title || program.title,
        category: course?.category || program.category || 'Programa',
        image: courseImage(course, program),
        description: course?.subtitle || course?.description || program.description || 'Programa de Academia AG.',
        meta: program.meta || `${course?.modules?.length || 0} módulos`,
        status: course?.status === 'published' ? 'Disponible' : (program.status || 'Disponible'),
        academyCourse: course
      });
      seen.add(key);
    });

    academyCourses
      .filter(course => course?.status === 'published')
      .filter(course => !seen.has(normalizeTitle(course.title)))
      .forEach(course => merged.push({
        id: course.id,
        title: course.title,
        category: course.category || 'Programa',
        image: courseImage(course, null),
        description: course.subtitle || course.description || 'Programa disponible en Academia AG.',
        meta: `${course.modules?.length || 0} módulos · Acceso en Academia AG`,
        status: 'Disponible',
        academyCourse: course
      }));

    return merged;
  }

  async function loadOwnEnrollments() {
    try {
      const { data, error } = await db
        .from('enrollments')
        .select('course_id,status,expires_at')
        .eq('user_id', state.user.id);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('No se pudieron consultar las inscripciones del alumno:', error);
      return [];
    }
  }

  async function loadOwnCourseRequests() {
    try {
      const { data, error } = await db
        .from('support_tickets')
        .select('id,subject,status,created_at')
        .eq('user_id', state.user.id)
        .eq('category', 'course')
        .order('created_at', { ascending: false })
        .limit(100);
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.warn('No se pudieron consultar las solicitudes de cursos:', error);
      return [];
    }
  }

  function hasActiveEnrollment(program, enrollments) {
    if (!program.id) return false;
    const now = Date.now();
    return enrollments.some(row => {
      if (row.course_id !== program.id || !['active','completed'].includes(row.status)) return false;
      if (!row.expires_at) return true;
      return new Date(row.expires_at).getTime() > now;
    });
  }

  function requestSubject(program) {
    return program.status === 'Disponible'
      ? `Solicitud de acceso · ${program.title}`
      : `Pre-registro · ${program.title}`;
  }

  function pendingRequest(program, requests) {
    const subjects = new Set([
      requestSubject(program),
      `Solicitud de acceso · ${program.title}`,
      `Pre-registro · ${program.title}`
    ]);
    return requests.find(item => subjects.has(item.subject) && ['open','in_progress'].includes(item.status));
  }

  function injectStyles() {
    if (document.querySelector('#course-access-request-v75-style')) return;
    const style = document.createElement('style');
    style.id = 'course-access-request-v75-style';
    style.textContent = `
      .student-catalog-banner-v75{margin:0 auto 28px;max-width:1180px;padding:18px 20px;border:1px solid rgba(0,81,52,.18);border-radius:18px;background:#f1f7f4;color:#17382d;display:flex;align-items:center;justify-content:space-between;gap:18px}
      .student-catalog-banner-v75 strong{display:block;margin-bottom:3px;color:#005134}
      .student-catalog-banner-v75 p{margin:0;color:#5f6f68;font-size:.9rem}
      .catalog-card .access-state-v75{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:.76rem;font-weight:800;color:#005134}
      .catalog-card .access-state-v75::before{content:'✓';width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#e8f5ee}
      .catalog-card .request-state-v75{display:flex;align-items:center;gap:8px;margin-top:14px;font-size:.76rem;font-weight:800;color:#8a6a15}
      .catalog-card .request-state-v75::before{content:'◷';width:22px;height:22px;border-radius:50%;display:grid;place-items:center;background:#fff7dc}
      .catalog-card .pre-register-note-v75{margin-top:12px;padding:10px 12px;border-radius:12px;background:#f6f7fb;color:#59616c;font-size:.75rem;line-height:1.45}
      .catalog-card [data-course-access-request][disabled]{opacity:.65;cursor:not-allowed;transform:none}
      .student-return-v75{white-space:nowrap}
      @media(max-width:760px){.student-catalog-banner-v75{align-items:flex-start;flex-direction:column}.student-catalog-banner-v75 .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function cardMarkup(program, enrollments, requests) {
    const hasAccess = hasActiveEnrollment(program, enrollments);
    const pending = pendingRequest(program, requests);
    const available = program.status === 'Disponible';
    const displayStatus = available ? 'Disponible' : 'Próximamente · Pre-registro abierto';

    let actions = '';
    if (hasAccess && program.id) {
      actions = `
        <div class="access-state-v75">Ya tienes acceso a este curso</div>
        <div class="catalog-actions"><a class="btn btn-primary" href="#course/${esc(program.id)}">Abrir curso</a><a class="btn btn-secondary" href="#courses">Mis cursos</a></div>`;
    } else if (pending) {
      actions = `
        <div class="request-state-v75">${available ? 'Solicitud de acceso enviada' : 'Pre-registro enviado'} · pendiente de revisión</div>
        <div class="catalog-actions"><button class="btn btn-primary" type="button" disabled>${available ? 'Solicitud enviada' : 'Ya estás pre-registrado'}</button><a class="btn btn-secondary" href="#help">Ver mis solicitudes</a></div>`;
    } else if (available) {
      actions = `
        <div class="catalog-actions"><button class="btn btn-primary" type="button" data-course-access-request data-course-id="${esc(program.id)}" data-course-title="${esc(program.title)}" data-course-available="1">Solicitar acceso</button><a class="btn btn-secondary" href="#help">Tengo una duda</a></div>`;
    } else {
      actions = `
        <div class="pre-register-note-v75">Este programa todavía no ha iniciado. Puedes dejar tu pre-registro para que AG tenga tu solicitud antes de la apertura.</div>
        <div class="catalog-actions"><button class="btn btn-primary" type="button" data-course-access-request data-course-id="${esc(program.id)}" data-course-title="${esc(program.title)}" data-course-available="0">Pre-registrarme</button><a class="btn btn-secondary" href="#help">Más información</a></div>`;
    }

    return `
      <article class="catalog-card" data-student-course-category="${esc(program.category)}" data-student-course-status="${available ? 'available' : 'upcoming'}">
        <div class="catalog-card-media">
          <img src="${esc(program.image)}" alt="${esc(program.title)}" onerror="imageErrorFallback(event)">
          <span class="status-pill ${available ? 'available' : ''}">${esc(displayStatus)}</span>
        </div>
        <div class="catalog-card-body">
          <span class="eyebrow">${esc(program.category)}</span>
          <h3>${esc(program.title)}</h3>
          <p>${esc(program.description)}</p>
          <small>${esc(program.meta)}</small>
          ${actions}
        </div>
      </article>`;
  }

  async function createAccessRequest(button) {
    if (!isStudentSession()) return;
    const title = String(button.dataset.courseTitle || '').trim();
    const courseId = String(button.dataset.courseId || '').trim();
    const available = button.dataset.courseAvailable === '1';
    if (!title) return;

    const subject = `${available ? 'Solicitud de acceso' : 'Pre-registro'} · ${title}`.slice(0, 140);
    const original = button.textContent;
    button.disabled = true;
    button.textContent = available ? 'Enviando solicitud…' : 'Enviando pre-registro…';

    try {
      const { data: existing, error: existingError } = await db
        .from('support_tickets')
        .select('id,status,subject')
        .eq('user_id', state.user.id)
        .eq('category', 'course')
        .in('subject', [`Solicitud de acceso · ${title}`, `Pre-registro · ${title}`])
        .in('status', ['open','in_progress'])
        .limit(1);
      if (existingError) throw existingError;

      if (existing?.length) {
        showToast(available ? 'Ya tienes una solicitud pendiente para este curso.' : 'Ya estás pre-registrado para este programa.');
        schedule(true);
        return;
      }

      const profileName = state.profile?.full_name || state.user?.user_metadata?.full_name || 'Alumno';
      const email = state.profile?.email || state.user?.email || '';
      const message = [
        available
          ? 'El alumno solicita acceso a un curso disponible desde el catálogo de Academia AG.'
          : 'El alumno realizó un pre-registro para un programa próximo desde el catálogo de Academia AG. Contactarlo cuando se abra la inscripción o el acceso.',
        `Curso: ${title}`,
        courseId ? `Course ID: ${courseId}` : '',
        `Alumno: ${profileName}`,
        email ? `Correo: ${email}` : '',
        `Tipo de solicitud: ${available ? 'Acceso a curso disponible' : 'Pre-registro para curso próximo'}`,
        'Origen: Explorar cursos · Academia AG'
      ].filter(Boolean).join('\n');

      const { error } = await db.from('support_tickets').insert({
        user_id: state.user.id,
        category: 'course',
        subject,
        message
      });
      if (error) throw error;

      showToast(
        available
          ? 'Solicitud de acceso enviada. El equipo de AG la revisará.'
          : 'Pre-registro recibido. AG podrá contactarte cuando el programa esté disponible.',
        'success'
      );
      schedule(true);
    } catch (error) {
      console.error('COURSE_ACCESS_REQUEST_FAILED', error);
      showToast(error?.message || 'No se pudo enviar la solicitud.', 'error');
      button.disabled = false;
      button.textContent = original;
    }
  }

  function wireFilters() {
    document.querySelectorAll('[data-public-filter]').forEach(button => {
      button.addEventListener('click', () => {
        const filter = button.dataset.publicFilter || 'Todos';
        document.querySelectorAll('[data-public-filter]').forEach(item => item.classList.toggle('active', item === button));
        document.querySelectorAll('#public-program-grid .catalog-card').forEach(card => {
          card.hidden = filter !== 'Todos' && card.dataset.studentCourseCategory !== filter;
        });
      });
    });
  }

  async function renderStudentCatalog(force = false) {
    if (rendering || !isCatalogRoute() || !isStudentSession()) return;
    const grid = document.querySelector('#public-program-grid');
    if (!grid) return;
    if (!force && grid.dataset.studentCatalogRelease === RELEASE) return;

    rendering = true;
    observer?.disconnect();
    try {
      injectStyles();
      const [enrollments, requests] = await Promise.all([loadOwnEnrollments(), loadOwnCourseRequests()]);
      const programs = visiblePrograms();
      grid.innerHTML = programs.length
        ? programs.map(program => cardMarkup(program, enrollments, requests)).join('')
        : '<article class="catalog-card"><div class="catalog-card-body"><h3>No hay programas publicados por el momento.</h3><p>Vuelve a consultar próximamente.</p></div></article>';
      grid.dataset.studentCatalogRelease = RELEASE;

      const section = grid.closest('.public-section');
      const headingTitle = section?.querySelector('.public-section-heading h2');
      const headingText = section?.querySelector('.public-section-heading p');
      if (headingTitle) headingTitle.textContent = 'Cursos disponibles y próximos programas';
      if (headingText) headingText.textContent = 'Consulta los cursos que ya están disponibles y conoce los que vienen próximamente. Puedes solicitar acceso a los cursos activos o pre-registrarte en los próximos desde tu cuenta.';

      if (section && !section.querySelector('.student-catalog-banner-v75')) {
        section.querySelector('.student-catalog-banner-v74')?.remove();
        const banner = document.createElement('div');
        banner.className = 'student-catalog-banner-v75';
        banner.innerHTML = `<div><strong>Todo el catálogo desde tu cuenta de alumno</strong><p>Los cursos disponibles permiten solicitar acceso. Los programas próximos permiten pre-registrarte para quedar en la lista de interesados.</p></div><a class="btn btn-secondary" href="#courses">Volver a Mis cursos</a>`;
        const filters = section.querySelector('.catalog-filters');
        (filters || grid).insertAdjacentElement('beforebegin', banner);
      }

      const header = document.querySelector('.public-header');
      if (header && !header.querySelector('.student-return-v75')) {
        header.querySelector('.student-return-v74')?.remove();
        const oldButton = header.querySelector('[data-public-login]');
        if (oldButton) oldButton.style.display = 'none';
        const back = document.createElement('a');
        back.className = 'btn btn-primary student-return-v75';
        back.href = '#home';
        back.textContent = 'Volver a mi academia';
        header.appendChild(back);
      }

      grid.querySelectorAll('[data-course-access-request]').forEach(button => {
        button.addEventListener('click', () => createAccessRequest(button));
      });
      wireFilters();
      document.documentElement.dataset.agCourseAccessRequests = RELEASE;
    } finally {
      rendering = false;
      observe();
    }
  }

  function schedule(force = false) {
    clearTimeout(timer);
    timer = setTimeout(() => renderStudentCatalog(force), 120);
  }

  function observe() {
    if (!observer) observer = new MutationObserver(() => schedule(false));
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', () => schedule(true));
  window.addEventListener('pageshow', () => schedule(true));
  observe();
  schedule(true);

  window.ACADEMIA_AG_COURSE_ACCESS_REQUESTS = Object.freeze({ release: RELEASE, apply: () => schedule(true) });
})();