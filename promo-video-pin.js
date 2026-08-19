(() => {
  'use strict';

  const RELEASE = '20260819.38';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const PROMOS = {
    '11111111-aaaa-4111-8111-111111111111': 'A2HKXlc9eLg',
    '11111111-bbbb-4111-8111-111111111111': 'XMMTev0RPt0',
    '11111111-cccc-4111-8111-111111111111': 'mF4E5nikJnA',
    '11111111-dddd-4111-8111-111111111111': '-0p1n_vNymo',
    '11111111-eeee-4111-8111-111111111111': 'RchGISb7B-A'
  };

  let timer = null;

  function routeLessonId() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID ? (parts[2] || '') : '';
  }

  function context() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    const course = state.courses.find(item => item.id === COURSE_ID);
    const lessonId = routeLessonId();
    if (!course || !lessonId) return null;

    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === lessonId);
      if (lesson) return { course, module, lesson };
    }
    return null;
  }

  function isPromoLesson(lesson) {
    const title = String(lesson?.title || '');
    return /contenido\s+especial\s+del\s+m[oó]dulo|video\s+promocional|\bpromo\b|comercial/i.test(title);
  }

  function embed(videoId) {
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&enablejsapi=1&modestbranding=1&origin=${encodeURIComponent(location.origin)}`;
  }

  function apply() {
    const ctx = context();
    if (!ctx || !isPromoLesson(ctx.lesson)) return;

    const videoId = PROMOS[ctx.module.id];
    if (!videoId) return;

    const expected = embed(videoId);
    ctx.lesson.video_url = expected;

    const iframe = document.querySelector('.lesson-layout .video-shell iframe.lesson-frame');
    if (iframe && !iframe.src.includes(`/embed/${videoId}`)) iframe.src = expected;

    const heading = document.querySelector('.page-title');
    if (heading && /contenido\s+especial\s+del\s+m[oó]dulo/i.test(heading.textContent || '')) {
      heading.textContent = 'Video promocional del módulo';
    }

    document.querySelectorAll('.module-panel .lesson-item a strong').forEach(node => {
      if (/contenido\s+especial\s+del\s+m[oó]dulo/i.test(node.textContent || '')) node.textContent = 'Video promocional del módulo';
    });

    document.documentElement.dataset.agPromoPin = RELEASE;
    document.documentElement.dataset.agPromoVideo = videoId;
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

  window.ACADEMIA_AG_PROMO_VIDEO_PIN = { release: RELEASE, apply };
  schedule();
})();
