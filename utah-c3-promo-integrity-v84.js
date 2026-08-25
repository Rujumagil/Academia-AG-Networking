(() => {
  'use strict';

  const RELEASE = '20260824.84';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const C1_PROMO_CODE = 'C1-PROMO';
  const C3_PROMO_CODE = 'C3-PROMO';
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

  function findLesson(code) {
    const target = course();
    if (!target) return null;
    for (const module of target.modules || []) {
      const lesson = (module.lessons || []).find(item => String(item.lesson_code || '').toUpperCase() === code);
      if (lesson) return { module, lesson };
    }
    return null;
  }

  function currentLessonId() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID ? (parts[2] || '') : '';
  }

  function duplicateStreamDetected() {
    const c1 = findLesson(C1_PROMO_CODE)?.lesson;
    const c3 = findLesson(C3_PROMO_CODE)?.lesson;
    const uid1 = String(c1?.stream_uid || '').trim();
    const uid3 = String(c3?.stream_uid || '').trim();
    return Boolean(uid1 && uid3 && uid1 === uid3);
  }

  function drivePreviewUrl() {
    return `https://drive.google.com/file/d/${C3_DRIVE_ID}/preview`;
  }

  function applyIntegrityOverride() {
    const entry = findLesson(C3_PROMO_CODE);
    if (!entry?.lesson) return null;

    const lesson = entry.lesson;
    if (!lesson.__agC3PromoOriginal) {
      Object.defineProperty(lesson, '__agC3PromoOriginal', {
        configurable: true,
        enumerable: false,
        writable: true,
        value: {
          stream_provider: lesson.stream_provider || '',
          stream_uid: lesson.stream_uid || '',
          stream_hls_url: lesson.stream_hls_url || '',
          stream_dash_url: lesson.stream_dash_url || '',
          stream_thumbnail_url: lesson.stream_thumbnail_url || ''
        }
      });
    }

    // El contenido promocional es opcional. Mientras C3 apunte al mismo Stream
    // que C1, usamos la fuente original verificada de Drive para no mostrar
    // material incorrecto. Cuando los UID sean distintos, se restaura Cloudflare.
    if (duplicateStreamDetected()) {
      lesson.stream_provider = 'drive-integrity-fallback';
      lesson.stream_uid = '';
      lesson.stream_hls_url = '';
      lesson.stream_dash_url = '';
      lesson.stream_thumbnail_url = '';
      return { module: entry.module, lesson, fallback: true };
    }

    const original = lesson.__agC3PromoOriginal;
    if (String(lesson.stream_provider || '') === 'drive-integrity-fallback' && original) {
      lesson.stream_provider = original.stream_provider;
      lesson.stream_uid = original.stream_uid;
      lesson.stream_hls_url = original.stream_hls_url;
      lesson.stream_dash_url = original.stream_dash_url;
      lesson.stream_thumbnail_url = original.stream_thumbnail_url;
    }
    return { module: entry.module, lesson, fallback: false };
  }

  function renderFallback(ctx) {
    if (!ctx?.fallback || currentLessonId() !== ctx.lesson.id) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    if (shell.dataset.agC3PromoIntegrity === RELEASE && shell.querySelector('[data-ag-c3-promo-frame]')) return;

    shell.dataset.agC3PromoIntegrity = RELEASE;
    shell.classList.add('ag-stream-shell-v46');
    shell.innerHTML = `
      <div class="ag-stream46" data-ag-c3-promo-integrity>
        <iframe
          class="ag-stream46-frame"
          data-ag-c3-promo-frame
          src="${drivePreviewUrl()}"
          title="Contenido especial del Módulo 3"
          style="border:none"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen="true"
          loading="eager"></iframe>
        <div class="ag-stream46-brand" aria-hidden="true">
          <span>ACADEMIA AG</span><b>C3-PROMO</b>
        </div>
        <div class="ag-stream46-status" data-mode="ready">Contenido especial del Módulo 3 · fuente original verificada</div>
      </div>`;

    const title = document.querySelector('.page-title');
    if (title && /contenido especial del m[oó]dulo/i.test(title.textContent || '')) {
      title.textContent = 'Contenido especial del Módulo 3';
    }

    document.documentElement.dataset.agC3PromoIntegrity = RELEASE;
    document.documentElement.dataset.agC3PromoSource = C3_SOURCE_NAME;
  }

  function clearFallbackIfNeeded(ctx) {
    if (ctx?.fallback) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (shell?.dataset.agC3PromoIntegrity) {
      delete shell.dataset.agC3PromoIntegrity;
    }
  }

  function apply() {
    const ctx = applyIntegrityOverride();
    if (!ctx) return;
    if (ctx.fallback) renderFallback(ctx);
    else clearFallbackIfNeeded(ctx);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 70);
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();
  schedule();

  window.ACADEMIA_AG_C3_PROMO_INTEGRITY = {
    release: RELEASE,
    sourceName: C3_SOURCE_NAME,
    duplicateStreamDetected,
    apply
  };
})();
