(() => {
  'use strict';

  const RELEASE = '20261011.1';
  const PAGES = [
    { id: 'overview', label: 'Resumen', icon: '⌂', description: 'Vista ejecutiva de la administración de Academia AG.', targets: [] },
    { id: 'courses', label: 'Cursos', icon: '▤', description: 'Catálogo de cursos, estado de publicación y acceso al editor.', targets: ['admin-courses'] },
    { id: 'content', label: 'Contenido', icon: '＋', description: 'Crear cursos, módulos, lecciones y organizar la estructura académica.', targets: ['create-course-panel','admin-content','course-structure-manager'] },
    { id: 'resources', label: 'Biblioteca', icon: '▧', description: 'Libros, manuales, archivos y recursos privados para alumnos.', targets: ['admin-resources'] },
    { id: 'evaluations', label: 'Evaluaciones', icon: '✓', description: 'Evaluaciones, preguntas, intentos y configuración académica.', targets: ['admin-assessments'] },
    { id: 'instructors', label: 'Instructores', icon: '♙', description: 'Asignación y administración de instructores por curso.', targets: ['admin-instructors'], adminOnly: true },
    { id: 'access', label: 'Accesos y ventas', icon: '◆', description: 'Productos, accesos, compras y permisos comerciales.', targets: ['access-center'], adminOnly: true },
    { id: 'notices', label: 'Avisos', icon: '♢', description: 'Comunicación y avisos dirigidos a la comunidad académica.', targets: ['admin-notifications'], adminOnly: true },
    { id: 'support', label: 'Soporte', icon: '?', description: 'Tickets y atención a alumnos.', targets: ['admin-support'], adminOnly: true },
    { id: 'students', label: 'Alumnos', icon: '◎', description: 'Usuarios, inscripciones y administración de alumnos.', targets: ['admin-users'], adminOnly: true }
  ];

  const scrollTargetMap = {
    'admin-courses': 'courses',
    'create-course-panel': 'content',
    'admin-content': 'content',
    'course-structure-manager': 'content',
    'admin-resources': 'resources',
    'admin-assessments': 'evaluations',
    'admin-instructors': 'instructors',
    'access-center': 'access',
    'admin-notifications': 'notices',
    'admin-support': 'support',
    'admin-users': 'students'
  };

  let scheduled = false;

  function routeInfo() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'workspace' || !parts[1]) return null;
    const workspaceId = parts[1];
    let section = parts[2] || '';

    if (!section) {
      let legacyTarget = '';
      try { legacyTarget = sessionStorage.getItem('ag-admin-scroll-target') || ''; } catch (_) {}
      section = scrollTargetMap[legacyTarget] || 'overview';
      try { sessionStorage.removeItem('ag-admin-scroll-target'); } catch (_) {}
      history.replaceState(null, '', '#workspace/' + encodeURIComponent(workspaceId) + '/' + section);
    }

    if (!PAGES.some(item => item.id === section)) section = 'overview';
    return { workspaceId, section };
  }

  function isAdminEmbed() {
    return new URLSearchParams(location.search).get('crm_admin') === '1';
  }

  function isAdminUser() {
    const label = document.querySelector('.user-mini span span')?.textContent || '';
    return /administrador/i.test(label);
  }

  function visiblePages() {
    const admin = isAdminUser();
    return PAGES.filter(page => !page.adminOnly || admin);
  }

  function baseHash(workspaceId, section) {
    return '#workspace/' + encodeURIComponent(workspaceId) + '/' + section;
  }

  function ensureStyles() {
    if (document.querySelector('#ag-admin-section-pages-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-admin-section-pages-style';
    style.textContent = `
      .workspace-admin-tabs{display:none!important}
      [data-ag-admin-page-hidden="true"]{display:none!important}
      .ag-admin-page-hub{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:16px;margin:22px 0 8px}
      .ag-admin-page-card{display:flex;gap:14px;align-items:flex-start;padding:20px;border:1px solid rgba(30,41,59,.1);border-radius:20px;background:#fff;text-decoration:none;color:inherit;box-shadow:0 12px 34px rgba(15,23,42,.055);transition:transform .18s ease,box-shadow .18s ease,border-color .18s ease}
      .ag-admin-page-card:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(15,23,42,.09);border-color:rgba(0,81,52,.24)}
      .ag-admin-page-card-icon{width:44px;height:44px;border-radius:14px;display:grid;place-items:center;background:#edf6f2;color:#005134;font-weight:900;font-size:1.15rem;flex:0 0 auto}
      .ag-admin-page-card strong,.ag-admin-page-card span{display:block}
      .ag-admin-page-card strong{font-size:.95rem;color:#162033}
      .ag-admin-page-card span{font-size:.76rem;color:#718096;line-height:1.55;margin-top:4px}
      .ag-admin-section-head{display:flex;justify-content:space-between;align-items:flex-end;gap:18px;margin:20px 0 18px;padding:18px 20px;border-radius:18px;background:#fff;border:1px solid rgba(30,41,59,.09);box-shadow:0 10px 30px rgba(15,23,42,.04)}
      .ag-admin-section-head small,.ag-admin-section-head strong,.ag-admin-section-head span{display:block}
      .ag-admin-section-head small{font-size:.68rem;letter-spacing:.11em;text-transform:uppercase;color:#00724f;font-weight:900}
      .ag-admin-section-head strong{font-family:Georgia,'Times New Roman',serif;font-size:1.65rem;color:#142035;margin-top:4px}
      .ag-admin-section-head span{font-size:.76rem;color:#6f7d91;line-height:1.5;margin-top:5px}
      .ag-admin-section-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end}
      .ag-admin-section-actions a{padding:9px 12px;border-radius:10px;border:1px solid #dbe4ec;background:#fff;color:#253349;text-decoration:none;font-size:.72rem;font-weight:800}
      .ag-admin-section-actions a.primary{background:#005134;color:#fff;border-color:#005134}
      .ag-admin-section-switcher{display:flex;gap:8px;overflow-x:auto;padding:0 0 12px;margin-bottom:5px;scrollbar-width:thin}
      .ag-admin-section-switcher a{white-space:nowrap;text-decoration:none;padding:8px 11px;border-radius:999px;background:#fff;border:1px solid #dfe7ee;color:#5c6a7d;font-size:.7rem;font-weight:800}
      .ag-admin-section-switcher a.active{background:#0c2c47;color:#fff;border-color:#0c2c47}
      .workspace-admin-hero .ag-admin-section-current{margin-top:10px;display:inline-flex;padding:7px 10px;border-radius:999px;background:rgba(255,255,255,.12);font-size:.72rem;font-weight:800;color:#fff}
      @media(max-width:1100px){.ag-admin-page-hub{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:720px){.ag-admin-page-hub{grid-template-columns:1fr}.ag-admin-section-head{align-items:flex-start;flex-direction:column}.ag-admin-section-actions{justify-content:flex-start}.ag-admin-section-head strong{font-size:1.35rem}}
    `;
    document.head.appendChild(style);
  }

  function clearGenerated() {
    document.querySelector('#ag-admin-page-hub')?.remove();
    document.querySelector('#ag-admin-section-head')?.remove();
    document.querySelector('#ag-admin-section-switcher')?.remove();
    document.querySelector('.workspace-admin-hero .ag-admin-section-current')?.remove();
  }

  function allControlledNodes() {
    const ids = new Set(PAGES.flatMap(page => page.targets));
    return [...ids].map(id => document.getElementById(id)).filter(Boolean);
  }

  function hideAllSections() {
    allControlledNodes().forEach(node => node.dataset.agAdminPageHidden = 'true');
  }

  function showTargets(pageDef) {
    pageDef.targets.forEach(id => {
      const node = document.getElementById(id);
      if (node) node.dataset.agAdminPageHidden = 'false';
    });
  }

  function createHub(workspaceId) {
    const quick = document.querySelector('.instructor-quick-actions');
    const hero = document.querySelector('.workspace-admin-hero');
    const anchor = quick || hero;
    if (!anchor) return;

    const nav = document.createElement('section');
    nav.id = 'ag-admin-page-hub';
    nav.className = 'ag-admin-page-hub';
    nav.innerHTML = visiblePages().filter(page => page.id !== 'overview').map(page => `
      <a class="ag-admin-page-card" href="${baseHash(workspaceId,page.id)}">
        <span class="ag-admin-page-card-icon">${page.icon}</span>
        <span><strong>${page.label}</strong><span>${page.description}</span></span>
      </a>
    `).join('');
    anchor.insertAdjacentElement('afterend', nav);
  }

  function createSectionHeader(workspaceId, section) {
    const current = PAGES.find(page => page.id === section) || PAGES[0];
    const hero = document.querySelector('.workspace-admin-hero');
    if (!hero) return;

    const badge = document.createElement('span');
    badge.className = 'ag-admin-section-current';
    badge.textContent = current.label;
    hero.querySelector('div')?.appendChild(badge);

    const head = document.createElement('section');
    head.id = 'ag-admin-section-head';
    head.className = 'ag-admin-section-head';
    head.innerHTML = `
      <div>
        <small>Administración · ${current.label}</small>
        <strong>${current.label}</strong>
        <span>${current.description}</span>
      </div>
      <div class="ag-admin-section-actions">
        <a href="${baseHash(workspaceId,'overview')}">← Panel</a>
        ${section === 'content' ? '' : '<a class="primary" href="' + baseHash(workspaceId,'content') + '">＋ Crear contenido</a>'}
      </div>
    `;

    hero.insertAdjacentElement('afterend', head);

    const switcher = document.createElement('nav');
    switcher.id = 'ag-admin-section-switcher';
    switcher.className = 'ag-admin-section-switcher';
    switcher.setAttribute('aria-label','Cambiar sección administrativa');
    switcher.innerHTML = visiblePages().map(page =>
      '<a class="' + (page.id === section ? 'active' : '') + '" href="' + baseHash(workspaceId,page.id) + '">' + page.label + '</a>'
    ).join('');
    head.insertAdjacentElement('afterend', switcher);
  }

  function patchHeroButton(workspaceId) {
    const button = document.querySelector('.workspace-admin-hero [data-admin-scroll="create-course-panel"]');
    if (!button) return;
    button.dataset.agPageTarget = 'content';
    button.onclick = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      location.hash = baseHash(workspaceId,'content').slice(1);
    };
  }

  function apply() {
    scheduled = false;
    if (!isAdminEmbed()) return;

    const info = routeInfo();
    if (!info) return;

    const hero = document.querySelector('.workspace-admin-hero');
    if (!hero) return;

    ensureStyles();
    clearGenerated();
    hideAllSections();

    const summary = document.querySelector('.instructor-summary-grid');
    const quick = document.querySelector('.instructor-quick-actions');

    if (info.section === 'overview') {
      if (summary) summary.dataset.agAdminPageHidden = 'false';
      if (quick) quick.dataset.agAdminPageHidden = 'false';
      createHub(info.workspaceId);
    } else {
      if (summary) summary.dataset.agAdminPageHidden = 'true';
      if (quick) quick.dataset.agAdminPageHidden = 'true';
      const pageDef = PAGES.find(page => page.id === info.section) || PAGES[0];
      showTargets(pageDef);
      createSectionHeader(info.workspaceId, info.section);
    }

    patchHeroButton(info.workspaceId);
    document.documentElement.dataset.agAdminSectionPages = RELEASE;
    document.documentElement.dataset.agAdminSection = info.section;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  document.addEventListener('click', event => {
    if (!isAdminEmbed()) return;
    const trigger = event.target.closest('[data-admin-scroll]');
    if (!trigger) return;
    const info = routeInfo();
    if (!info) return;
    const section = scrollTargetMap[trigger.dataset.adminScroll];
    if (!section) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    location.hash = baseHash(info.workspaceId, section).slice(1);
  }, true);

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_ADMIN_SECTION_PAGES = {
    release: RELEASE,
    pages: PAGES,
    open(section) {
      const info = routeInfo();
      if (!info) return;
      const valid = PAGES.some(page => page.id === section) ? section : 'overview';
      location.hash = baseHash(info.workspaceId, valid).slice(1);
    }
  };

  schedule();
})();
