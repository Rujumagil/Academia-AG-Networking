(() => {
  'use strict';

  const RELEASE = '20260822.67';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const INTRO_MODULE_ID = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001';
  const CLOSING_MODULE_ID = '7c4d9f60-9999-4b7b-9f2c-2d5e1a8c4001';

  const driveImage = id => `https://drive.google.com/thumbnail?id=${encodeURIComponent(id)}&sz=w1600`;

  const IMAGES = Object.freeze({
    cover: driveImage('1tuyhiM-XDc8cyJzw1W_q6Jqdh91VrzMP'),
    intro: driveImage('1BHLA9oXw9FP67zfmWEj2EEMnczhBAcsM'),
    module1: driveImage('1W3jFSwSA52fgwUiNWUoFDC6PuAZkL5ni'),
    module2: driveImage('1OFzuSXoJegDZpwSwZ4iD4cpCE5hOC8VL'),
    module3: driveImage('1X1LB7lLf4OyRleObOM5rYWrPVkzmS9Ku'),
    module4: driveImage('18ip7RqMrCiOh442gdIh-Vhi4iIXUSdm4'),
    module5: driveImage('1Sl4y4-lII7ik-TVBIzGFFpVqwnv5fii0'),
    module6: driveImage('1CQBSCyaovqC1TwN0FcjmmWXqNdYXFooZ'),
    evaluations: driveImage('1e_nVaOWf003qqUYvU7iv9J3HQAB_Qt_m'),
    closing: driveImage('1pxcVKO-u3_PQIqFSYA4f2iDStZpLLtHV')
  });

  const LABELS = Object.freeze({
    intro: 'Introducción · Bienvenida al curso',
    module1: 'Módulo 1 · Licencias, permisos y documentación',
    module2: 'Módulo 2 · Salud, exámenes y preparación del vehículo',
    module3: 'Módulo 3 · Manejo básico',
    module4: 'Módulo 4 · Reglas del camino y señales',
    module5: 'Módulo 5 · Alcohol, drogas y retos al manejar',
    module6: 'Módulo 6 · Emergencias, compartir el camino y tu récord',
    evaluations: 'Evaluaciones · Utah Driver Success Program',
    closing: 'Cierre del curso · Utah Driver Success Program'
  });

  let timer = null;
  let observer = null;

  function targetCourse() {
    try { return (state?.courses || []).find(course => course.id === COURSE_ID) || null; }
    catch (_) { return null; }
  }

  function orderedModules(course) {
    return [...(course?.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  }

  function currentLessonContext() {
    try {
      const parts = location.hash.replace(/^#/, '').split('/');
      if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
      const course = targetCourse();
      if (!course) return null;
      for (const module of course.modules || []) {
        const lesson = (module.lessons || []).find(item => item.id === parts[2]);
        if (lesson) return { course, module, lesson };
      }
    } catch (_) {}
    return null;
  }

  function moduleImageKey(module, index, modules) {
    const type = String(module?.section_type || '').toLowerCase();
    if (module?.id === INTRO_MODULE_ID || type === 'introduction' || index === 0) return 'intro';
    if (module?.id === CLOSING_MODULE_ID || type === 'closing' || index === modules.length - 1) return 'closing';
    const academicNumber = Number(module?.academic_number || 0);
    if (academicNumber >= 1 && academicNumber <= 6) return `module${academicNumber}`;
    if (index >= 1 && index <= 6) return `module${index}`;
    return null;
  }

  function injectStyles() {
    if (document.querySelector('#utah-course-images-v67-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-course-images-v67-style';
    style.textContent = `
      .utah-official-module-cover-v67{
        margin:14px 14px 12px;
        border-radius:18px;
        overflow:hidden;
        aspect-ratio:16/9;
        background:#081724;
        border:1px solid rgba(59,130,246,.16);
        box-shadow:0 14px 34px rgba(2,12,27,.16);
      }
      .utah-official-module-cover-v67 img{
        display:block;
        width:100%;
        height:100%;
        object-fit:cover;
      }
      .utah-official-evaluation-cover-v67{
        margin:8px 0 18px;
        border-radius:22px;
        overflow:hidden;
        aspect-ratio:16/9;
        background:#081724;
        border:1px solid rgba(59,130,246,.16);
        box-shadow:0 18px 44px rgba(2,12,27,.22);
      }
      .utah-official-evaluation-cover-v67 img{
        display:block;
        width:100%;
        height:100%;
        object-fit:cover;
      }
      @media(max-width:700px){
        .utah-official-module-cover-v67{margin:10px 10px 8px;border-radius:14px}
        .utah-official-evaluation-cover-v67{border-radius:16px;margin-bottom:14px}
      }
    `;
    document.head.appendChild(style);
  }

  function applyImage(img, src, alt) {
    if (!img || !src) return;
    if (img.dataset.agUtahOfficialImage === src) return;
    img.dataset.agUtahOfficialImage = src;
    img.dataset.fallbackApplied = 'false';
    img.alt = alt || img.alt || '';
    img.decoding = 'async';
    img.src = src;
  }

  function patchCourseState() {
    const course = targetCourse();
    if (!course) return null;
    if (course.cover_url !== IMAGES.cover) course.cover_url = IMAGES.cover;
    return course;
  }

  function patchCourseCoverDom() {
    const alt = 'Utah Driver Success Program™';

    document.querySelectorAll(`a[href="#course/${COURSE_ID}"]`).forEach(anchor => {
      const host = anchor.closest('.course-card, .learning-course-card, .hero, .course-cover') || anchor;
      const img = anchor.querySelector('img') || host?.querySelector('img');
      applyImage(img, IMAGES.cover, alt);
    });

    document.querySelectorAll('.course-cover > img').forEach(img => {
      const hash = location.hash.replace(/^#/, '');
      if (hash === `course/${COURSE_ID}`) applyImage(img, IMAGES.cover, alt);
    });

    document.querySelectorAll('.catalog-card').forEach(card => {
      const title = card.querySelector('h3')?.textContent || '';
      if (/Utah Driver Success Program/i.test(title)) applyImage(card.querySelector('img'), IMAGES.cover, alt);
    });

    document.querySelectorAll('.hero').forEach(hero => {
      if (hero.querySelector(`a[href="#course/${COURSE_ID}"]`)) applyImage(hero.querySelector(':scope > img'), IMAGES.cover, alt);
    });
  }

  function patchModuleCovers(course) {
    const hash = location.hash.replace(/^#/, '');
    if (hash !== `course/${COURSE_ID}`) return;

    const modules = orderedModules(course);
    const details = [...document.querySelectorAll('.course-head .module-panel details.module')];
    if (!details.length) return;

    details.forEach((detail, index) => {
      const module = modules[index];
      if (!module) return;
      const key = moduleImageKey(module, index, modules);
      const src = key && IMAGES[key];
      if (!src) return;

      let cover = detail.querySelector(':scope > .utah-official-module-cover-v67');
      if (!cover) {
        cover = document.createElement('div');
        cover.className = 'utah-official-module-cover-v67';
        cover.innerHTML = '<img loading="lazy" decoding="async" alt="">';
        detail.querySelector(':scope > summary')?.insertAdjacentElement('afterend', cover);
      }
      applyImage(cover.querySelector('img'), src, LABELS[key] || module.title || 'Portada del módulo');
    });
  }

  function patchEvaluationCover() {
    const ctx = currentLessonContext();
    if (!ctx || String(ctx.lesson?.lesson_kind || '').toLowerCase() !== 'promo') return;

    const examCard = document.querySelector('.utah-v2-exam-card');
    if (!examCard) return;
    const parent = examCard.parentElement;
    if (!parent) return;

    let cover = parent.querySelector(':scope > .utah-official-evaluation-cover-v67');
    if (!cover) {
      cover = document.createElement('div');
      cover.className = 'utah-official-evaluation-cover-v67';
      cover.innerHTML = '<img loading="eager" decoding="async" alt="">';
      examCard.insertAdjacentElement('beforebegin', cover);
    }
    applyImage(cover.querySelector('img'), IMAGES.evaluations, LABELS.evaluations);
  }

  function apply() {
    observer?.disconnect();
    try {
      injectStyles();
      const course = patchCourseState();
      patchCourseCoverDom();
      if (course) patchModuleCovers(course);
      patchEvaluationCover();
      document.documentElement.dataset.agUtahCourseImages = RELEASE;
    } finally {
      observe();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 70);
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

  window.ACADEMIA_AG_UTAH_IMAGES = {
    release: RELEASE,
    images: IMAGES,
    apply
  };
})();
