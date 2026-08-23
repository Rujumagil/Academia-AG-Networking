(() => {
  'use strict';

  const RELEASE = '20260823.73';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const OFFICIAL_COVER = 'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png';

  let timer = null;
  let observer = null;

  function patchState() {
    try {
      if (typeof state === 'undefined' || !Array.isArray(state?.courses)) return;
      const course = state.courses.find(item => item?.id === COURSE_ID || /Utah Driver Success Program/i.test(String(item?.title || '')));
      if (course) {
        course.cover_url = OFFICIAL_COVER;
        course.cover_path = null;
      }
    } catch (_) {}
  }

  function patchImage(img) {
    if (!img) return;
    if (img.src === OFFICIAL_COVER) return;
    img.src = OFFICIAL_COVER;
    img.alt = 'Portada oficial Utah Driver Success Program™ · Angelica Gallardo';
    img.dataset.agUtahOfficialCover = RELEASE;
  }

  function patchDom() {
    const currentHash = location.hash.replace(/^#/, '');

    document.querySelectorAll('img').forEach(img => {
      const host = img.closest('a, article, .course-card, .learning-course-card, .catalog-card, .course-cover, .hero');
      const text = `${host?.textContent || ''} ${img.alt || ''}`;
      const href = host?.getAttribute?.('href') || host?.querySelector?.('a')?.getAttribute?.('href') || '';
      const isUtah = /Utah Driver Success Program|Utah Driver/i.test(text) || href === `#course/${COURSE_ID}`;
      if (isUtah) patchImage(img);
    });

    if (currentHash === `course/${COURSE_ID}`) {
      document.querySelectorAll('.course-cover > img, .course-head img, .hero > img').forEach(patchImage);
    }

    document.querySelectorAll(`a[href="#course/${COURSE_ID}"] img`).forEach(patchImage);
  }

  function apply() {
    observer?.disconnect();
    try {
      patchState();
      patchDom();
      document.documentElement.dataset.agUtahOfficialCover = RELEASE;
    } finally {
      observe();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 140);
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

  window.ACADEMIA_AG_UTAH_OFFICIAL_COVER = Object.freeze({
    release: RELEASE,
    courseId: COURSE_ID,
    cover: OFFICIAL_COVER,
    apply
  });
})();