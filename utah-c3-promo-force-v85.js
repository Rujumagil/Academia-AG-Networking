(() => {
  'use strict';

  const RELEASE = '20260824.85';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const MODULE3_ID = '7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001';
  const C3_DRIVE_ID = '1z-1qOwXlYr0hlTAEhyfZQCDjpJAigck4';
  const C3_SOURCE_NAME = 'YO YA SE MANEJAR.mov';
  let timer = null;
  let observer = null;

  function course() {
    try {
      return (state?.courses || []).find(item => item.id === COURSE_ID) || null;
    } catch (_) {
      return null;
    }
  }

  function module3() {
    return (course()?.modules || []).find(item => item.id === MODULE3_ID) || null;
  }

  function promoLesson() {
    const module = module3();
    if (!module) return null;
    const lessons = module.lessons || [];
    return lessons.find(item => String(item.lesson_code || item.code || '').toUpperCase() === 'C3-PROMO')
      || lessons.find(item => String(item.lesson_kind || '').toLowerCase() === 'promo')
      || lessons.find(item => /contenido\s+especial|promo/i.test(String(item.title || '')))
      || null;
  }

  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID) return null;
    return { lessonId: parts[2] || '' };
  }

  function isCurrentC3Promo() {
    const current = route();
    const lesson = promoLesson();
    return Boolean(current?.lessonId && lesson?.id && current.lessonId === lesson.id);
  }

  function drivePreviewUrl() {
    return `https://drive.google.com/file/d/${C3_DRIVE_ID}/preview`;
  }

  function forceSourceOnState() {
    const lesson = promoLesson();
    if (!lesson) return null;
    lesson.video_url = drivePreviewUrl();
    lesson.stream_provider = 'google-drive';
    lesson.stream_uid = '';
    lesson.stream_hls_url = '';
    lesson.stream_dash_url = '';
    lesson.stream_thumbnail_url = '';
    lesson.lesson_kind = lesson.lesson_kind || 'promo';
    return lesson;
  }

  function renderForcedVideo() {
    if (!isCurrentC3Promo()) return false;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return false;

    const existing = shell.querySelector('[data-ag-c3-promo-force]');
    if (existing && shell.dataset.agC3PromoForce === RELEASE) return true;

    shell.dataset.agC3PromoForce = RELEASE;
    shell.innerHTML = `
      <div class="ag-stream46" data-ag-c3-promo-force>
        <iframe
          class="ag-stream46-frame"
          src="${drivePreviewUrl()}"
          title="Contenido especial del Módulo 3"
          style="border:0;width:100%;height:100%;min-height:260px"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          loading="eager"></iframe>
        <div class="ag-stream46-brand" aria-hidden="true">
          <span>ACADEMIA AG</span><b>C3-PROMO</b>
        </div>
        <div class="ag-stream46-status" data-mode="ready">Contenido especial del Módulo 3</div>
      </div>`;

    const title = document.querySelector('.page-title');
    if (title) title.textContent = 'Contenido especial del Módulo 3';

    const flowHint = document.querySelector('.ag-utah-flow70 .ag-flow-hint');
    if (flowHint) flowHint.textContent = 'Contenido opcional · no afecta tu avance';

    document.documentElement.dataset.agC3PromoForce = RELEASE;
    document.documentElement.dataset.agC3PromoSource = C3_SOURCE_NAME;
    return true;
  }

  function apply() {
    forceSourceOnState();
    renderForcedVideo();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 60);
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });
  observe();
  schedule();

  window.ACADEMIA_AG_C3_PROMO_FORCE = {
    release: RELEASE,
    sourceName: C3_SOURCE_NAME,
    driveId: C3_DRIVE_ID,
    apply,
    isCurrentC3Promo
  };
})();
