(() => {
  'use strict';

  const RELEASE = '20260821.58';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const INTRO_MODULE_ID = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001';
  let timer = null;

  function targetCourse() {
    try { return (state?.courses || []).find(course => course.id === COURSE_ID) || null; }
    catch (_) { return null; }
  }

  function orderedModules(course) {
    return [...(course?.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  }

  function isIntroduction(module) {
    const type = String(module?.section_type || '').toLowerCase();
    const title = String(module?.title || '').toLowerCase();
    return module?.id === INTRO_MODULE_ID || type === 'introduction' || title.includes('bienvenida y cómo usar el curso') || title.includes('bienvenida y como usar el curso');
  }

  function isClosing(module) {
    const type = String(module?.section_type || '').toLowerCase();
    const title = String(module?.title || '').toLowerCase();
    return type === 'closing' || type === 'closure' || title.includes('cierre');
  }

  function fixLabels() {
    const course = targetCourse();
    const panel = document.querySelector('.module-panel');
    if (!course || !panel) return;

    const modules = orderedModules(course);
    const cards = [...panel.querySelectorAll(':scope > details.module')];
    if (!cards.length) return;

    let academicNumber = 0;
    modules.forEach((module, index) => {
      const card = cards[index];
      if (!card) return;
      const strong = card.querySelector(':scope > summary > div > strong');
      const count = card.querySelector(':scope > summary > div > span');
      if (!strong) return;

      const title = String(module.title || '').trim();
      if (isIntroduction(module)) {
        strong.textContent = `Introducción: ${title}`;
      } else if (isClosing(module)) {
        strong.textContent = `Cierre: ${title.replace(/^cierre\s*[:\-–—]?\s*/i, '') || 'Mensaje final del programa'}`;
      } else {
        academicNumber += 1;
        strong.textContent = `Módulo ${academicNumber}: ${title}`;
      }

      if (count) {
        const n = Number(module.lessons?.length || 0);
        count.textContent = `${n} ${n === 1 ? 'lección' : 'lecciones'}`;
      }
    });

    document.documentElement.dataset.agUtahModuleLabels = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(fixLabels, 60);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  schedule();
})();
