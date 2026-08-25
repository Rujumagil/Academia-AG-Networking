(() => {
  'use strict';

  const RELEASE = '20260825.89';
  let timer = null;
  let observer = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char]);

  function isStudent() {
    try {
      return Boolean(state?.session && state?.user)
        && String(state?.profile?.role || 'student').toLowerCase() === 'student';
    } catch (_) {
      return false;
    }
  }

  function currentPage() {
    return location.hash.replace(/^#/, '').split('/')[0] || 'home';
  }

  function upcomingPrograms() {
    try {
      return (Array.isArray(PUBLIC_PROGRAMS) ? PUBLIC_PROGRAMS : [])
        .filter(program => String(program?.status || '').toLowerCase() !== 'disponible')
        .slice(0, 6);
    } catch (_) {
      return [];
    }
  }

  function removeExploreCoursesNav() {
    document.querySelectorAll('.sidebar a[href="#catalog"], .sidebar .nav-link-secondary[href="#catalog"]').forEach(node => node.remove());

    document.querySelectorAll('.library-empty-state a[href="#catalog"], .certificate-empty-hero a[href="#catalog"]').forEach(link => {
      link.setAttribute('href', '#courses');
      link.textContent = 'Ver mis cursos';
    });
  }

  function salesUrl(program) {
    const message = `Hola, quiero información sobre el programa ${String(program?.title || 'de Academia AG')}.`;
    try {
      if (typeof whatsappUrl === 'function') return whatsappUrl(message);
    } catch (_) {}
    return '#help';
  }

  function injectStyles() {
    if (document.querySelector('#student-sales-discovery-v89-style')) return;
    const style = document.createElement('style');
    style.id = 'student-sales-discovery-v89-style';
    style.textContent = `
      .ag-upcoming89{margin-top:34px;padding-top:26px;border-top:1px solid rgba(30,41,59,.09)}
      .ag-upcoming89__heading{display:flex;align-items:end;justify-content:space-between;gap:22px;margin-bottom:16px}
      .ag-upcoming89__heading span{display:block;margin-bottom:6px;color:#005134;font-size:.67rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase}
      .ag-upcoming89__heading h2{margin:0;color:#1e293b;font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.8rem,3vw,2.7rem);font-weight:500;line-height:1.05}
      .ag-upcoming89__heading p{max-width:560px;margin:0;color:#6b7280;font-size:.86rem;line-height:1.55}
      .ag-upcoming89__rail{display:grid;grid-auto-flow:column;grid-auto-columns:minmax(260px,320px);gap:16px;overflow-x:auto;padding:4px 4px 14px;scroll-snap-type:x mandatory;scrollbar-width:thin}
      .ag-upcoming89__card{scroll-snap-align:start;overflow:hidden;border:1px solid rgba(30,41,59,.1);border-radius:20px;background:#fff;box-shadow:0 12px 30px rgba(30,41,59,.08)}
      .ag-upcoming89__media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#eef3f1}
      .ag-upcoming89__media img{width:100%;height:100%;display:block;object-fit:cover}
      .ag-upcoming89__status{position:absolute;left:12px;top:12px;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.94);color:#005134;font-size:.62rem;font-weight:900;letter-spacing:.05em;text-transform:uppercase;box-shadow:0 6px 16px rgba(15,23,42,.12)}
      .ag-upcoming89__body{padding:16px}
      .ag-upcoming89__category{display:block;margin-bottom:7px;color:#005134;font-size:.62rem;font-weight:850;letter-spacing:.08em;text-transform:uppercase}
      .ag-upcoming89__body h3{margin:0 0 8px;color:#1e293b;font-family:Georgia,'Times New Roman',serif;font-size:1.25rem;line-height:1.15}
      .ag-upcoming89__body p{min-height:58px;margin:0 0 14px;color:#6b7280;font-size:.78rem;line-height:1.5}
      .ag-upcoming89__body .btn{width:100%;min-height:42px!important;justify-content:center}
      @media(max-width:760px){
        .ag-upcoming89{margin-top:26px;padding-top:22px}
        .ag-upcoming89__heading{display:block}
        .ag-upcoming89__heading p{margin-top:8px}
        .ag-upcoming89__rail{grid-auto-columns:minmax(245px,84vw)}
      }
    `;
    document.head.appendChild(style);
  }

  function renderUpcomingInCourses() {
    if (!isStudent() || currentPage() !== 'courses') return;
    const page = document.querySelector('#page');
    const grid = page?.querySelector('#course-grid, .learning-course-list');
    if (!page || !grid) return;

    const programs = upcomingPrograms();
    if (!programs.length) return;

    injectStyles();
    let section = page.querySelector('[data-ag-upcoming89]');
    if (!section) {
      section = document.createElement('section');
      section.className = 'ag-upcoming89';
      section.dataset.agUpcoming89 = '1';
      grid.insertAdjacentElement('afterend', section);
    }

    const signature = programs.map(program => `${program.title}|${program.status}`).join('||');
    if (section.dataset.signature === signature) return;
    section.dataset.signature = signature;

    section.innerHTML = `
      <div class="ag-upcoming89__heading">
        <div><span>Próximamente en Academia AG</span><h2>Programas que también pueden interesarte</h2></div>
        <p>Conoce los próximos cursos desde tu misma área de alumno. Así puedes seguir aprendiendo sin salir de “Mis cursos”.</p>
      </div>
      <div class="ag-upcoming89__rail">
        ${programs.map(program => `
          <article class="ag-upcoming89__card">
            <div class="ag-upcoming89__media">
              <img src="${esc(program.image || 'curso-utah-driver.webp')}" alt="${esc(program.title)}" onerror="imageErrorFallback(event)">
              <span class="ag-upcoming89__status">${esc(program.status || 'Próximamente')}</span>
            </div>
            <div class="ag-upcoming89__body">
              <span class="ag-upcoming89__category">${esc(program.category || 'Programa')}</span>
              <h3>${esc(program.title)}</h3>
              <p>${esc(program.description || '')}</p>
              <a class="btn btn-secondary" href="${esc(salesUrl(program))}" ${String(salesUrl(program)).startsWith('http') ? 'target="_blank" rel="noopener"' : ''}>Quiero información</a>
            </div>
          </article>`).join('')}
      </div>`;
  }

  function apply() {
    removeExploreCoursesNav();
    renderUpcomingInCourses();
    document.documentElement.dataset.agStudentSalesDiscovery = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      observer?.disconnect();
      try { apply(); } finally { observe(); }
    }, 80);
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

  window.ACADEMIA_AG_STUDENT_SALES_DISCOVERY = Object.freeze({ release: RELEASE, apply: schedule });
})();
