(() => {
  'use strict';

  const RELEASE = '20260823.77';
  const OFFICIAL_UTAH_COVER = 'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png';
  let timer = null;
  let observer = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char]);

  function isEmptyStudentHome() {
    try {
      const page = location.hash.replace(/^#/, '').split('/')[0] || 'home';
      const student = Boolean(state?.session && state?.user) && String(state?.profile?.role || 'student') === 'student';
      const noAssignedCourses = Array.isArray(state?.courses) && state.courses.length === 0;
      return page === 'home' && student && noAssignedCourses;
    } catch (_) {
      return false;
    }
  }

  function programs() {
    try {
      return (Array.isArray(PUBLIC_PROGRAMS) ? PUBLIC_PROGRAMS : []).map(program => ({
        ...program,
        image: /Utah Driver Success Program/i.test(program.title)
          ? OFFICIAL_UTAH_COVER
          : String(program.image || 'curso-utah-driver.webp')
      }));
    } catch (_) {
      return [];
    }
  }

  function injectStyles() {
    if (document.querySelector('#student-home-catalog-v77-style')) return;
    const style = document.createElement('style');
    style.id = 'student-home-catalog-v77-style';
    style.textContent = `
      .student-home-discovery-v77{width:100%;margin:0;padding:0 0 30px}
      .student-home-discovery-v77 .discovery-intro{display:flex;align-items:end;justify-content:space-between;gap:28px;margin:4px 0 20px}
      .student-home-discovery-v77 .discovery-intro span{display:block;color:#005134;font-size:.68rem;font-weight:900;letter-spacing:.12em;text-transform:uppercase;margin-bottom:6px}
      .student-home-discovery-v77 .discovery-intro h1{margin:0;color:#1e293b;font-family:Georgia,'Times New Roman',serif;font-size:clamp(2rem,3.5vw,3rem);font-weight:500;line-height:1.04}
      .student-home-discovery-v77 .discovery-intro p{max-width:540px;margin:0;color:#6b7280;font-size:.9rem;line-height:1.55}
      .student-home-grid-v77{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px}
      .student-home-course-v77{overflow:hidden;border:1px solid rgba(30,41,59,.1);border-radius:24px;background:#fff;box-shadow:0 18px 46px rgba(30,41,59,.09);transition:transform .2s ease,box-shadow .2s ease}
      .student-home-course-v77:hover{transform:translateY(-4px);box-shadow:0 24px 56px rgba(30,41,59,.13)}
      .student-home-course-v77 .media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#e9efec}
      .student-home-course-v77 .media img{width:100%;height:100%;display:block;object-fit:cover}
      .student-home-course-v77 .badge{position:absolute;left:13px;top:13px;padding:7px 11px;border-radius:999px;background:#f4f4f5;color:#374151;font-size:.64rem;font-weight:900;box-shadow:0 8px 20px rgba(15,23,42,.12)}
      .student-home-course-v77 .badge.available{background:#e8f5ee;color:#005134}
      .student-home-course-v77 .body{padding:18px}
      .student-home-course-v77 .body small{display:block;color:#005134;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.63rem;margin-bottom:8px}
      .student-home-course-v77 h3{margin:0 0 9px;font-family:Georgia,'Times New Roman',serif;font-size:1.36rem;line-height:1.13;color:#1e293b}
      .student-home-course-v77 p{margin:0 0 16px;color:#6b7280;font-size:.8rem;line-height:1.5;min-height:58px}
      .student-home-course-v77 .btn{width:100%;justify-content:center;text-align:center}
      .student-home-foot-v77{display:flex;align-items:center;justify-content:space-between;gap:18px;margin-top:18px;padding:15px 18px;border-radius:16px;background:#f1f7f4;color:#49645a;font-size:.78rem}
      .student-home-foot-v77 strong{color:#005134}
      @media(max-width:1100px){.student-home-grid-v77{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:760px){.student-home-discovery-v77 .discovery-intro{display:block}.student-home-discovery-v77 .discovery-intro p{margin-top:10px}.student-home-grid-v77{grid-template-columns:1fr}.student-home-foot-v77{align-items:flex-start;flex-direction:column}}
    `;
    document.head.appendChild(style);
  }

  function card(program) {
    const available = program.status === 'Disponible';
    return `
      <article class="student-home-course-v77">
        <div class="media">
          <img src="${esc(program.image)}" alt="${esc(program.title)}" onerror="imageErrorFallback(event)">
          <span class="badge ${available ? 'available' : ''}">${available ? 'Disponible ahora' : 'Próximamente'}</span>
        </div>
        <div class="body">
          <small>${esc(program.category || 'Programa')}</small>
          <h3>${esc(program.title)}</h3>
          <p>${esc(program.description || '')}</p>
          <a class="btn btn-primary" href="#catalog/programs">${available ? 'Solicitar acceso' : 'Pre-registrarme'}</a>
        </div>
      </article>`;
  }

  function findEmptyBlock(page) {
    const heading = [...page.querySelectorAll('h1,h2,h3')]
      .find(node => /Aún no tienes cursos asignados/i.test(node.textContent || ''));
    if (!heading) return null;
    return heading.closest('section') || heading.closest('article') || heading.parentElement;
  }

  function apply() {
    if (!isEmptyStudentHome()) return;
    const page = document.querySelector('#page');
    if (!page || page.querySelector('.student-home-discovery-v77')) return;

    const list = programs();
    if (!list.length) return;
    injectStyles();

    page.querySelector('.student-home-discovery-v76')?.remove();
    const emptyBlock = findEmptyBlock(page);

    const section = document.createElement('section');
    section.className = 'student-home-discovery-v77';
    section.dataset.release = RELEASE;
    section.innerHTML = `
      <div class="discovery-intro">
        <div><span>Explora Academia AG</span><h1>Elige tu próximo curso</h1></div>
        <p>Aún no tienes cursos asignados. Aquí puedes ver los programas disponibles y los que abrirán próximamente. Solicita acceso o deja tu pre-registro desde tu cuenta.</p>
      </div>
      <div class="student-home-grid-v77">${list.map(card).join('')}</div>
      <div class="student-home-foot-v77"><span><strong>Disponible:</strong> puedes solicitar acceso hoy.</span><span><strong>Próximamente:</strong> puedes pre-registrarte para quedar en la lista de interesados.</span></div>`;

    if (emptyBlock && emptyBlock !== page) {
      emptyBlock.replaceWith(section);
    } else {
      page.prepend(section);
    }
    document.documentElement.dataset.agStudentHomeCatalog = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      observer?.disconnect();
      try { apply(); } finally { observe(); }
    }, 120);
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

  window.ACADEMIA_AG_STUDENT_HOME_CATALOG = Object.freeze({ release: RELEASE, apply: schedule });
})();