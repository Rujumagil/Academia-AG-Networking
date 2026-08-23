(() => {
  'use strict';

  const RELEASE = '20260823.76';
  const OFFICIAL_UTAH_COVER = 'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png';
  let timer = null;
  let observer = null;

  const esc = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char]);

  function isStudentHome() {
    try {
      const page = location.hash.replace(/^#/, '').split('/')[0] || 'home';
      return page === 'home' && Boolean(state?.session && state?.user) && String(state?.profile?.role || 'student') === 'student';
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
    if (document.querySelector('#student-home-catalog-v76-style')) return;
    const style = document.createElement('style');
    style.id = 'student-home-catalog-v76-style';
    style.textContent = `
      .student-home-discovery-v76{margin-top:28px}
      .student-home-discovery-v76 .discovery-head{display:flex;align-items:end;justify-content:space-between;gap:24px;margin-bottom:18px}
      .student-home-discovery-v76 .discovery-head span{display:block;color:#005134;font-size:.7rem;font-weight:900;letter-spacing:.11em;text-transform:uppercase;margin-bottom:5px}
      .student-home-discovery-v76 .discovery-head h2{margin:0;color:#1e293b;font-family:Georgia,'Times New Roman',serif;font-size:clamp(1.8rem,3vw,2.7rem);font-weight:500;line-height:1.05}
      .student-home-discovery-v76 .discovery-head p{max-width:520px;margin:0;color:#6b7280;font-size:.88rem;line-height:1.55}
      .student-home-grid-v76{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px}
      .student-home-course-v76{overflow:hidden;border:1px solid rgba(30,41,59,.1);border-radius:22px;background:#fff;box-shadow:0 15px 40px rgba(30,41,59,.08)}
      .student-home-course-v76 .media{position:relative;aspect-ratio:16/10;overflow:hidden;background:#e9efec}
      .student-home-course-v76 .media img{width:100%;height:100%;display:block;object-fit:cover}
      .student-home-course-v76 .badge{position:absolute;left:12px;top:12px;padding:7px 10px;border-radius:999px;background:#fff;color:#1e293b;font-size:.65rem;font-weight:900;box-shadow:0 8px 20px rgba(15,23,42,.14)}
      .student-home-course-v76 .badge.available{background:#e8f5ee;color:#005134}
      .student-home-course-v76 .body{padding:17px}
      .student-home-course-v76 .body small{display:block;color:#005134;font-weight:800;text-transform:uppercase;letter-spacing:.08em;font-size:.64rem;margin-bottom:7px}
      .student-home-course-v76 h3{margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:1.3rem;line-height:1.12;color:#1e293b}
      .student-home-course-v76 p{margin:0 0 15px;color:#6b7280;font-size:.8rem;line-height:1.5}
      .student-home-course-v76 .actions{display:flex;gap:9px;align-items:center}
      .student-home-course-v76 .actions .btn{flex:1;text-align:center}
      .student-home-empty-note-v76{margin-top:12px;color:#6b7280;font-size:.76rem;text-align:center}
      @media(max-width:1050px){.student-home-grid-v76{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:720px){.student-home-discovery-v76 .discovery-head{display:block}.student-home-discovery-v76 .discovery-head p{margin-top:10px}.student-home-grid-v76{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function card(program) {
    const available = program.status === 'Disponible';
    return `
      <article class="student-home-course-v76">
        <div class="media">
          <img src="${esc(program.image)}" alt="${esc(program.title)}" onerror="imageErrorFallback(event)">
          <span class="badge ${available ? 'available' : ''}">${available ? 'Disponible ahora' : 'Próximamente'}</span>
        </div>
        <div class="body">
          <small>${esc(program.category || 'Programa')}</small>
          <h3>${esc(program.title)}</h3>
          <p>${esc(program.description || '')}</p>
          <div class="actions">
            <a class="btn btn-primary" href="#catalog/programs">${available ? 'Solicitar acceso' : 'Pre-registrarme'}</a>
          </div>
        </div>
      </article>`;
  }

  function apply() {
    if (!isStudentHome()) return;
    const page = document.querySelector('#page');
    if (!page || page.querySelector('.student-home-discovery-v76')) return;

    const list = programs();
    if (!list.length) return;

    injectStyles();

    const emptyHeading = [...page.querySelectorAll('h1,h2,h3')]
      .find(node => /Aún no tienes cursos asignados/i.test(node.textContent || ''));
    const emptyCopy = emptyHeading?.parentElement?.querySelector('p');
    if (emptyCopy) emptyCopy.textContent = 'Todavía no tienes cursos asignados, pero puedes explorar los programas disponibles y pre-registrarte en los próximos.';

    const section = document.createElement('section');
    section.className = 'student-home-discovery-v76';
    section.dataset.release = RELEASE;
    section.innerHTML = `
      <div class="discovery-head">
        <div><span>Explora Academia AG</span><h2>Cursos disponibles y próximos</h2></div>
        <p>Consulta lo que puedes solicitar hoy y conoce los programas que abrirán próximamente. Desde el catálogo podrás pedir acceso o dejar tu pre-registro.</p>
      </div>
      <div class="student-home-grid-v76">${list.map(card).join('')}</div>
      <p class="student-home-empty-note-v76">El acceso a los cursos disponibles requiere aprobación de AG Business Networking.</p>`;
    page.appendChild(section);
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