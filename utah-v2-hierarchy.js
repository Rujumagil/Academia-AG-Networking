(() => {
  'use strict';

  const RELEASE = '20260820.46';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  let timer = null;

  function currentCourse() {
    if (typeof state === 'undefined') return null;
    const parts = location.hash.replace(/^#/, '').split('/');
    const routeId = parts[1];
    const course = (state.courses || []).find(item => item.id === routeId || item.slug === routeId)
      || (state.courses || []).find(item => item.id === COURSE_ID);
    return course?.id === COURSE_ID ? course : null;
  }

  function currentLessonContext(course) {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || !parts[2]) return null;
    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === parts[2]);
      if (lesson) return { module, lesson };
    }
    return null;
  }

  function moduleLabel(module) {
    if (!module) return '';
    if (module.section_type === 'introduction') return `Introducción · ${module.title}`;
    if (module.section_type === 'closing') return 'Cierre del curso';
    const number = Number(module.academic_number || 0);
    return `Módulo ${number || ''}${number ? ' · ' : ''}${module.title}`;
  }

  function lessonBadge(ctx) {
    if (!ctx) return '';
    const { module, lesson } = ctx;
    if (module.section_type === 'introduction' || lesson.lesson_kind === 'welcome') return 'Introducción';
    if (module.section_type === 'closing' || lesson.lesson_kind === 'closing') return 'Cierre del curso';
    const number = Number(module.academic_number || 0);
    if (lesson.lesson_kind === 'promo') return `Módulo ${number} · Contenido especial`;
    const academicLessons = (module.lessons || []).filter(item => item.lesson_kind === 'lesson');
    const lessonIndex = academicLessons.findIndex(item => item.id === lesson.id);
    return `Módulo ${number} · Lección ${lessonIndex >= 0 ? lessonIndex + 1 : Number(lesson.position || 1)}`;
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function patchModulePanels(course) {
    const modules = [...(course.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    document.querySelectorAll('.module-panel').forEach(panel => {
      const details = [...panel.querySelectorAll(':scope > .module')];
      details.forEach((detail, index) => {
        const module = modules[index];
        if (!module) return;
        detail.dataset.sectionType = module.section_type || '';
        setText(detail.querySelector('summary strong'), moduleLabel(module));
        const total = (module.lessons || []).length;
        setText(detail.querySelector('summary div span'), `${total} ${total === 1 ? 'contenido' : 'contenidos'}`);
      });
    });
  }

  function patchLessonHeading(course) {
    const ctx = currentLessonContext(course);
    if (!ctx) return;
    setText(document.querySelector('.page > .page-subtitle, #page > .page-subtitle'), moduleLabel(ctx.module));

    document.querySelectorAll('#page span, #page div').forEach(node => {
      if (node.children.length) return;
      const text = String(node.textContent || '').trim();
      if (/^Lecci[oó]n\s+\d+\s+de\s+\d+$/i.test(text)) setText(node, lessonBadge(ctx));
    });
  }

  function patchCourseFacts(course) {
    const academic = (course.modules || []).filter(module => module.section_type === 'academic').length;
    const total = course.modules.flatMap(module => module.lessons || []).length;
    document.querySelectorAll('.course-facts span').forEach(item => {
      const label = item.querySelector('small');
      const value = item.querySelector('strong');
      if (label?.textContent?.trim() === 'Contenido') {
        setText(value, `Introducción · ${academic} módulos · Cierre · ${total} contenidos`);
      }
    });
  }

  function patch() {
    const course = currentCourse();
    if (!course) return;
    patchModulePanels(course);
    patchLessonHeading(course);
    patchCourseFacts(course);
    document.documentElement.dataset.agUtahHierarchy = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(patch, 70);
  }

  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
})();