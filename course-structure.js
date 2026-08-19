(() => {
  'use strict';

  const RELEASE = '20260819.30';
  const UTAH_COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const ACADEMIC_MODULES = [
    'Licencias, permisos y documentación',
    'Salud, exámenes y preparación del vehículo',
    'Manejo básico',
    'Reglas del camino y señales',
    'Alcohol, drogas y retos al manejar',
    'Emergencias, compartir el camino y tu récord'
  ];
  const REVIEW_MODULES = new Set(ACADEMIC_MODULES);

  let timer = null;

  function currentRouteIsUtah() {
    const hash = location.hash.replace(/^#/, '');
    return hash === `course/${UTAH_COURSE_ID}` || hash.startsWith(`lesson/${UTAH_COURSE_ID}/`);
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function cleanModuleTitle(value = '') {
    return String(value)
      .replace(/^Módulo\s+\d+:\s*/i, '')
      .replace(/^Introducción\s*[·:\-]\s*/i, '')
      .trim();
  }

  function displayModuleTitle(cleanTitle) {
    if (/^Bienvenida y cómo usar el curso$/i.test(cleanTitle)) {
      return 'Introducción · Bienvenida y cómo usar el curso';
    }
    if (/^Cierre del curso$/i.test(cleanTitle)) return 'Cierre del curso';
    const index = ACADEMIC_MODULES.findIndex(item => item.toLowerCase() === cleanTitle.toLowerCase());
    return index >= 0 ? `Módulo ${index + 1}: ${cleanTitle}` : cleanTitle;
  }

  function addStyles() {
    if (document.querySelector('#utah-course-structure-styles')) return;
    const style = document.createElement('style');
    style.id = 'utah-course-structure-styles';
    style.textContent = `
      .utah-module-quiz .utah-quiz-dot{
        width:32px;height:32px;border-radius:50%;display:grid;place-items:center;
        flex:0 0 32px;background:rgba(120,199,166,.10);color:#78c7a6;font-weight:900;
        border:1px solid rgba(120,199,166,.24)
      }
      .utah-module-quiz a{min-width:0}
      .utah-module-quiz a small{color:#78c7a6;font-weight:800}
      .utah-module-quiz>a+small{white-space:nowrap}
    `;
    document.head.appendChild(style);
  }

  function normalizeLessonTypes(module) {
    module.querySelectorAll('.lesson-item:not(.utah-module-quiz) a small').forEach(label => {
      const value = label.textContent.trim().toLowerCase();
      const mapped = ({ video:'Video', text:'Lectura', activity:'Actividad', resource:'Recurso', live:'En vivo' })[value];
      if (mapped) setText(label, mapped);
    });
  }

  function insertReviewStep(module, moduleTitle) {
    if (!REVIEW_MODULES.has(moduleTitle)) return;
    const list = module.querySelector('.lesson-list');
    if (!list || list.querySelector('.utah-module-quiz')) return;

    const row = document.createElement('div');
    row.className = 'lesson-item utah-module-quiz';
    row.innerHTML = `
      <span class="utah-quiz-dot" aria-hidden="true">?</span>
      <a href="#evaluations" aria-label="Abrir cuestionario Reforzar lo aprendido">
        <strong>Reforzar lo aprendido</strong>
        <small>Cuestionario</small>
      </a>
      <small>Repaso</small>`;
    list.appendChild(row);
  }

  function normalizeModule(module) {
    const heading = module.querySelector('summary strong');
    if (!heading) return;

    const cleanTitle = cleanModuleTitle(heading.textContent);
    setText(heading, displayModuleTitle(cleanTitle));
    normalizeLessonTypes(module);
    insertReviewStep(module, cleanTitle);

    const realLessons = module.querySelectorAll('.lesson-item:not(.utah-module-quiz)').length;
    const reviewSteps = REVIEW_MODULES.has(cleanTitle) ? 1 : 0;
    const count = module.querySelector('summary div > span');
    const total = realLessons + reviewSteps;
    setText(count, `${total} ${total === 1 ? 'paso' : 'pasos'}`);
  }

  function normalizeLessonSubtitle() {
    const subtitle = document.querySelector('.page-subtitle');
    if (!subtitle || !/^Módulo:/i.test(subtitle.textContent.trim())) return;
    const cleanTitle = cleanModuleTitle(subtitle.textContent.replace(/^Módulo:\s*/i, ''));
    if (/^Bienvenida y cómo usar el curso$/i.test(cleanTitle)) {
      setText(subtitle, 'Introducción');
      return;
    }
    if (/^Cierre del curso$/i.test(cleanTitle)) {
      setText(subtitle, 'Cierre del curso');
      return;
    }
    const index = ACADEMIC_MODULES.findIndex(item => item.toLowerCase() === cleanTitle.toLowerCase());
    if (index >= 0) setText(subtitle, `Módulo ${index + 1}: ${cleanTitle}`);
  }

  function normalizeCourseFacts() {
    document.querySelectorAll('.course-facts > span').forEach(item => {
      if (item.querySelector('small')?.textContent.trim() !== 'Contenido') return;
      setText(item.querySelector('strong'), 'Introducción · 6 módulos · cierre');
    });
  }

  function enhance() {
    if (!currentRouteIsUtah()) return;
    addStyles();
    document.querySelectorAll('.module-panel .module').forEach(normalizeModule);
    normalizeLessonSubtitle();
    normalizeCourseFacts();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 60);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_COURSE_STRUCTURE = { release: RELEASE, enhance };
  schedule();
})();
