(() => {
  'use strict';

  const RELEASE = '20260819.37';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const EXAM_MODULE_IDS = new Set([
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-bbbb-4111-8111-111111111111',
    '11111111-cccc-4111-8111-111111111111',
    '11111111-dddd-4111-8111-111111111111',
    '11111111-eeee-4111-8111-111111111111',
    '11111111-ffff-4111-8111-111111111111'
  ]);

  let timer = null;

  function appReady() {
    return typeof state !== 'undefined' && Array.isArray(state.courses);
  }

  function course() {
    return appReady() ? state.courses.find(item => item.id === COURSE_ID) || null : null;
  }

  function orderedModules() {
    return [...(course()?.modules || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .map(module => ({
        ...module,
        lessons: [...(module.lessons || [])]
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      }));
  }

  function activeLessonId() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID ? (parts[2] || '') : '';
  }

  function activeContext() {
    const lessonId = activeLessonId();
    if (!lessonId) return null;
    const modules = orderedModules();
    for (let moduleIndex = 0; moduleIndex < modules.length; moduleIndex += 1) {
      const module = modules[moduleIndex];
      const lessonIndex = module.lessons.findIndex(item => item.id === lessonId);
      if (lessonIndex >= 0) return { modules, module, moduleIndex, lesson: module.lessons[lessonIndex], lessonIndex };
    }
    return null;
  }

  function addStyles() {
    if (document.querySelector('#ag-free-course-navigation-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-free-course-navigation-style';
    style.textContent = `
      .ag-free-course-nav{display:flex;gap:12px;align-items:stretch;margin:16px 0 22px;flex-wrap:wrap}
      .ag-free-course-nav a,.ag-free-course-nav button{flex:1 1 220px;min-height:58px;border-radius:16px;border:1px solid rgba(120,199,166,.18);background:rgba(255,255,255,.035);color:#eef6f2;padding:13px 16px;text-decoration:none;display:flex;align-items:center;justify-content:center;gap:9px;font:800 .83rem/1.2 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;transition:.16s ease}
      .ag-free-course-nav a:hover,.ag-free-course-nav button:hover{background:rgba(120,199,166,.10);border-color:rgba(120,199,166,.34);transform:translateY(-1px)}
      .ag-free-course-nav .ag-primary-next{background:#0f6b4e;border-color:#0f6b4e;color:#fff}
      .ag-free-course-nav .ag-primary-next:hover{background:#11815e;border-color:#11815e}
      .lesson-item.ag-lesson-locked,.lesson-item.ag-exam-gate-locked,.utah-module-quiz.ag-questionnaire-locked{opacity:1!important;filter:none!important}
      .lesson-item.ag-lesson-locked a,.lesson-item.ag-exam-gate-locked a,.utah-module-quiz.ag-questionnaire-locked a{pointer-events:auto!important;cursor:pointer!important}
      @media(max-width:700px){.ag-free-course-nav a,.ag-free-course-nav button{flex-basis:100%}}
    `;
    document.head.appendChild(style);
  }

  function removeLegacyLocks() {
    document.querySelector('#ag-student-course-flow-style')?.remove();
    document.querySelector('#ag-questionnaire-flow-styles')?.remove();
    document.querySelectorAll('.ag-lock-badge,.ag-exam-gate-note,.ag-questionnaire-state').forEach(node => node.remove());
    document.querySelectorAll('.ag-lesson-locked,.ag-exam-gate-locked,.ag-questionnaire-locked').forEach(node => {
      node.classList.remove('ag-lesson-locked','ag-exam-gate-locked','ag-questionnaire-locked');
    });
    document.querySelectorAll(`a[href^="#lesson/${COURSE_ID}/"]`).forEach(anchor => {
      anchor.setAttribute('aria-disabled', 'false');
      anchor.tabIndex = 0;
    });
  }

  function navigateTo(lessonId) {
    if (!lessonId) return;
    location.hash = `lesson/${COURSE_ID}/${lessonId}`;
  }

  function openExam(moduleId) {
    try { sessionStorage.setItem('ag-scroll-module-exam', moduleId); } catch (_) {}
    try { window.ACADEMIA_AG_MODULE_EXAM?.enhance?.(); } catch (_) {}

    let attempts = 0;
    const scroll = () => {
      attempts += 1;
      const card = document.querySelector(`.module-exam-card[data-module-id="${moduleId}"]`) || document.querySelector('.module-exam-card');
      if (card) {
        card.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      if (attempts < 20) {
        try { window.ACADEMIA_AG_MODULE_EXAM?.enhance?.(); } catch (_) {}
        setTimeout(scroll, 120);
      }
    };
    scroll();
  }

  function ensureExamOnFinalAcademicLesson(context) {
    if (!EXAM_MODULE_IDS.has(context.module.id)) return;
    if (context.lessonIndex !== context.module.lessons.length - 1) return;
    try { window.ACADEMIA_AG_MODULE_EXAM?.enhance?.(); } catch (_) {}
  }

  function renderNavigation() {
    const context = activeContext();
    const actions = document.querySelector('.lesson-layout .lesson-actions');
    if (!context || !actions) return;

    let nav = document.querySelector('.ag-free-course-nav');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'ag-free-course-nav';
      nav.setAttribute('aria-label', 'Navegación del curso');
      actions.insertAdjacentElement('afterend', nav);
    }

    const prevInside = context.module.lessons[context.lessonIndex - 1] || null;
    const prevModule = context.modules[context.moduleIndex - 1] || null;
    const previous = prevInside || prevModule?.lessons?.[prevModule.lessons.length - 1] || null;

    const nextInside = context.module.lessons[context.lessonIndex + 1] || null;
    const nextModule = context.modules[context.moduleIndex + 1] || null;
    const nextAfterModule = nextModule?.lessons?.[0] || null;
    const isFinalInModule = context.lessonIndex === context.module.lessons.length - 1;
    const needsExam = isFinalInModule && EXAM_MODULE_IDS.has(context.module.id);

    nav.innerHTML = `
      ${previous ? `<a href="#lesson/${COURSE_ID}/${previous.id}">← Anterior</a>` : '<span></span>'}
      ${needsExam
        ? `<button type="button" class="ag-primary-next" data-ag-open-exam="${context.module.id}">Reforzar lo aprendido →</button>`
        : (nextInside || nextAfterModule)
          ? `<a class="ag-primary-next" href="#lesson/${COURSE_ID}/${(nextInside || nextAfterModule).id}">Siguiente →</a>`
          : '<a class="ag-primary-next" href="#course/11111111-1111-4111-8111-111111111111">Volver al curso</a>'}
    `;

    nav.querySelector('[data-ag-open-exam]')?.addEventListener('click', () => openExam(context.module.id));
    ensureExamOnFinalAcademicLesson(context);
  }

  function apply() {
    addStyles();
    removeLegacyLocks();
    renderNavigation();
    document.documentElement.dataset.agFreeNavigation = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 80);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });

  const interval = setInterval(apply, 1000);
  setTimeout(() => clearInterval(interval), 180000);

  window.ACADEMIA_AG_FREE_NAVIGATION = { release: RELEASE, apply, openExam };
  schedule();
})();
