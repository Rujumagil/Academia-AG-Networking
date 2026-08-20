(() => {
  'use strict';

  const RELEASE = '20260820.45';
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

  function currentModule(course) {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || !parts[2]) return null;
    for (const module of course.modules || []) {
      if ((module.lessons || []).some(lesson => lesson.id === parts[2])) return module;
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
    const module = currentModule(course);
    if (!module) return;
    setText(document.querySelector('.page > .page-subtitle, #page > .page-subtitle'), moduleLabel(module));
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