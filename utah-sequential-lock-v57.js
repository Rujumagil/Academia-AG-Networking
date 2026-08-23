(() => {
  'use strict';

  const RELEASE = '20260823.57';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  let timer = null;
  let observer = null;

  function targetCourse() {
    try { return (state?.courses || []).find(course => course.id === COURSE_ID) || null; }
    catch (_) { return null; }
  }

  function orderedLessons() {
    const course = targetCourse();
    if (!course) return [];
    return [...(course.modules || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .flatMap(module => [...(module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0)));
  }

  function isOptionalLesson(lesson) {
    return String(lesson?.lesson_kind || '').toLowerCase() === 'promo';
  }

  function requiredLessons() {
    return orderedLessons().filter(lesson => !isOptionalLesson(lesson));
  }

  function completed(lessonId) {
    try { return Boolean((state?.progressRows || []).some(row => row.lesson_id === lessonId && row.completed)); }
    catch (_) { return false; }
  }

  function firstIncomplete() {
    return requiredLessons().find(lesson => !completed(lesson.id)) || null;
  }

  // v57: acceso libre a todas las lecciones del curso.
  function canOpen(lessonId) {
    return orderedLessons().some(lesson => lesson.id === lessonId);
  }

  function lessonIdFromHref(href = '') {
    const parts = String(href || '').replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    return parts[2];
  }

  function injectStyles() {
    if (document.querySelector('#utah-sequential-lock-v57-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-sequential-lock-v57-style';
    style.textContent = `
      .utah-v56-lock-label,.utah-v55-lock-label,.utah-v56-sequence-notice:not(.is-optional),.utah-v55-sequence-notice:not(.is-optional){display:none!important}
      .utah-v56-locked,.utah-v55-locked{opacity:1!important;filter:none!important}
      .utah-v56-locked>a,.utah-v56-locked>button,.utah-v55-locked>a,.utah-v55-locked>button{cursor:pointer!important;pointer-events:auto!important}
    `;
    document.head.appendChild(style);
  }

  function unlockSidebar() {
    if (!targetCourse()) return;

    document.querySelectorAll(`a[href^="#lesson/${COURSE_ID}/"]`).forEach(anchor => {
      const lessonId = lessonIdFromHref(anchor.getAttribute('href'));
      if (!lessonId) return;
      const row = anchor.closest('.lesson-item');
      if (!row) return;

      row.classList.remove('utah-v56-locked', 'utah-v55-locked');
      anchor.setAttribute('aria-disabled', 'false');
      anchor.tabIndex = 0;
      anchor.title = '';
      row.querySelector('.utah-v56-lock-label')?.remove();
      row.querySelector('.utah-v55-lock-label')?.remove();

      const button = row.querySelector('[data-complete]');
      const lesson = orderedLessons().find(item => item.id === lessonId);
      if (button && lesson) {
        const done = completed(lessonId);
        button.disabled = true;
        button.title = isOptionalLesson(lesson)
          ? 'Evaluación opcional'
          : done ? 'Tema completado' : 'El progreso se registra al terminar el video.';
        button.textContent = isOptionalLesson(lesson) ? '?' : done ? '✓' : '▶';
      }
    });
  }

  function cleanCurrentLesson() {
    document.querySelectorAll('.utah-v56-sequence-notice:not(.is-optional), .utah-v55-sequence-notice:not(.is-optional)')
      .forEach(node => node.remove());
  }

  function enhance() {
    observer?.disconnect();
    try {
      injectStyles();
      if (!targetCourse()) return;
      unlockSidebar();
      cleanCurrentLesson();
      document.documentElement.dataset.agUtahSequentialLock = RELEASE;
      document.documentElement.dataset.agUtahOpenAccess = '1';
    } finally {
      observe();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 50);
  }

  function observe() {
    if (!observer) observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();

  window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK = {
    release: RELEASE,
    canOpen,
    firstIncomplete,
    bypassEnabled: () => true,
    requiredLessons,
    isOptionalLesson,
    enhance
  };

  schedule();
})();
