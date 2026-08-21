(() => {
  'use strict';

  const RELEASE = '20260821.62';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const INTRO_MODULE_ID = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001';
  const CLOSING_MODULE_ID = '7c4d9f60-9999-4b7b-9f2c-2d5e1a8c4001';
  const SDK_URL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
  const SAVE_EVERY_MS = 8000;
  let sdkPromise = null;
  let timer = null;
  let active = null;

  function context() {
    try {
      const parts = location.hash.replace(/^#/, '').split('/');
      if (parts[0] !== 'lesson' || !parts[1] || !parts[2] || typeof state === 'undefined') return null;
      const course = (state.courses || []).find(item => item.id === parts[1] || item.slug === parts[1]);
      if (!course || course.id !== COURSE_ID) return null;
      for (const module of course.modules || []) {
        const lesson = (module.lessons || []).find(item => item.id === parts[2]);
        if (lesson) return { course, module, lesson };
      }
    } catch (_) {}
    return null;
  }

  function orderedModules(course) {
    return [...(course?.modules || [])].sort((a,b) => Number(a.position || 0) - Number(b.position || 0));
  }

  function moduleType(module) {
    if (!module) return 'academic';
    if (module.id === INTRO_MODULE_ID) return 'introduction';
    if (module.id === CLOSING_MODULE_ID) return 'closing';
    return module.section_type || 'academic';
  }

  function moduleLabel(module) {
    const type = moduleType(module);
    if (type === 'introduction') return `Introducción · ${module.title}`;
    if (type === 'closing') return 'Cierre del curso';
    const number = Number(module.academic_number || 0);
    return `Módulo ${number || ''}${number ? ' · ' : ''}${module.title}`;
  }

  function patchLabels() {
    if (typeof state === 'undefined') return;
    const course = (state.courses || []).find(item => item.id === COURSE_ID);
    if (!course) return;
    const modules = orderedModules(course);
    document.querySelectorAll('.module-panel').forEach(panel => {
      const cards = [...panel.querySelectorAll(':scope > details.module')];
      cards.forEach((card, index) => {
        const module = modules[index];
        if (!module) return;
        const strong = card.querySelector(':scope > summary > div > strong');
        const count = card.querySelector(':scope > summary > div > span');
        const nextLabel = moduleLabel(module);
        if (strong && strong.textContent !== nextLabel) strong.textContent = nextLabel;
        const total = Number(module.lessons?.length || 0);
        const nextCount = `${total} ${total === 1 ? 'lección' : 'lecciones'}`;
        if (count && count.textContent !== nextCount) count.textContent = nextCount;
      });
    });
    const ctx = context();
    const subtitle = document.querySelector('.page-subtitle');
    if (ctx && subtitle) {
      const value = moduleLabel(ctx.module);
      if (subtitle.textContent !== value) subtitle.textContent = value;
    }
  }

  function isCloudflare(lesson) {
    return String(lesson?.stream_provider || '').toLowerCase() === 'cloudflare'
      && Boolean(String(lesson?.stream_uid || '').trim());
  }

  function existingProgress(lessonId) {
    try { return (state.progressRows || []).find(row => row.lesson_id === lessonId) || null; }
    catch (_) { return null; }
  }

  function mergeProgress(row) {
    if (!row || typeof state === 'undefined') return;
    const index = (state.progressRows || []).findIndex(item => item.lesson_id === row.lesson_id);
    if (index >= 0) state.progressRows[index] = row;
    else state.progressRows.push(row);
  }

  async function saveProgress(ctx, player, completed = false, force = false) {
    if (!ctx?.lesson?.id || !player || typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return null;
    const now = Date.now();
    if (!force && active?.lastSave && now - active.lastSave < SAVE_EVERY_MS) return null;
    if (active) active.lastSave = now;
    const old = existingProgress(ctx.lesson.id);
    const duration = Number(player.duration || ctx.lesson.stream_duration_seconds || 0);
    const current = Number(player.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, Math.max(0, current / duration * 100)) : 0;
    const done = Boolean(old?.completed || completed);
    const payload = {
      user_id: state.user.id,
      lesson_id: ctx.lesson.id,
      completed: done,
      completed_at: done ? (old?.completed_at || new Date().toISOString()) : null,
      last_position_seconds: completed && duration > 0 ? duration : current,
      watch_percentage: completed ? 100 : Math.max(Number(old?.watch_percentage || 0), percent),
      last_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    const { data, error } = await db.from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' }).select().single();
    if (error) {
      console.error('Utah runtime progress:', error);
      return null;
    }
    mergeProgress(data);
    return data;
  }

  function ensureSdk() {
    if (window.Stream) return Promise.resolve(window.Stream);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => window.Stream ? resolve(window.Stream) : reject(new Error('Cloudflare Stream SDK no disponible'));
      script.onerror = () => reject(new Error('No se pudo cargar Cloudflare Stream SDK'));
      document.head.appendChild(script);
    });
    return sdkPromise;
  }

  function destroy() {
    if (!active) return;
    try { active.cleanup?.(); } catch (_) {}
    active = null;
  }

  async function mountPlayer() {
    const ctx = context();
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!ctx || !shell || !isCloudflare(ctx.lesson)) {
      if (active && active.lessonId !== ctx?.lesson?.id) destroy();
      return;
    }
    if (shell.dataset.agUtahRuntime === ctx.lesson.id && shell.querySelector('[data-utah-stream-frame]')) return;
    destroy();
    const uid = encodeURIComponent(String(ctx.lesson.stream_uid).trim());
    shell.dataset.agUtahRuntime = ctx.lesson.id;
    shell.classList.add('ag-stream-shell-v46');
    shell.innerHTML = `
      <div class="ag-stream46">
        <iframe class="ag-stream46-frame" data-utah-stream-frame
          src="https://iframe.videodelivery.net/${uid}?controls=true&preload=metadata"
          title="${String(ctx.lesson.title || 'Video de Academia AG').replace(/\"/g,'&quot;')}"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen loading="eager"></iframe>
        <div class="ag-stream46-brand" aria-hidden="true"><span>ACADEMIA AG</span><b>${String(ctx.lesson.lesson_code || '')}</b></div>
        <div class="ag-stream46-status" data-utah-stream-status>Preparando video…</div>
      </div>`;
    const iframe = shell.querySelector('[data-utah-stream-frame]');
    const status = shell.querySelector('[data-utah-stream-status]');
    const local = { lessonId: ctx.lesson.id, lastSave: 0, player: null, cleanup: null, finished: false };
    active = local;
    iframe.addEventListener('load', () => { if (status) status.textContent = 'Listo para comenzar.'; }, { once: true });
    try {
      const Stream = await ensureSdk();
      if (active !== local) return;
      const player = Stream(iframe);
      local.player = player;
      let resumed = false;
      const onLoadedMetadata = () => {
        if (resumed) return;
        resumed = true;
        const row = existingProgress(ctx.lesson.id);
        const saved = Number(row?.last_position_seconds || 0);
        const duration = Number(player.duration || 0);
        if (!row?.completed && saved > 2 && duration > 0 && saved < duration - 3) player.currentTime = saved;
      };
      const onPlay = () => { if (status) status.textContent = 'Tu progreso se guarda automáticamente.'; };
      const onPause = () => { if (!player.ended) saveProgress(ctx, player, false, true); };
      const onTimeUpdate = () => saveProgress(ctx, player, false, false);
      const onEnded = async () => {
        if (local.finished) return;
        local.finished = true;
        if (status) status.textContent = 'Video completado. Guardando avance…';
        const row = await saveProgress(ctx, player, true, true);
        if (!row) {
          local.finished = false;
          if (status) status.textContent = 'No pudimos guardar tu avance. Intenta nuevamente.';
          return;
        }
        if (status) status.textContent = 'Tema completado. Ya puedes continuar.';
        try { if (typeof showToast === 'function') showToast('Tema completado. El siguiente tema ya está disponible.', 'success'); } catch (_) {}
        try { window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK?.enhance?.(); } catch (_) {}
      };
      const onVisibility = () => { if (document.visibilityState === 'hidden' && local.player && !local.player.ended) saveProgress(ctx, local.player, false, true); };
      player.addEventListener('loadedmetadata', onLoadedMetadata);
      player.addEventListener('play', onPlay);
      player.addEventListener('pause', onPause);
      player.addEventListener('timeupdate', onTimeUpdate);
      player.addEventListener('ended', onEnded);
      document.addEventListener('visibilitychange', onVisibility);
      local.cleanup = () => document.removeEventListener('visibilitychange', onVisibility);
    } catch (error) {
      console.error('Utah runtime player:', error);
      if (status) status.textContent = 'Video listo para reproducir.';
    }
  }

  function run() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      patchLabels();
      mountPlayer();
      document.documentElement.dataset.agUtahRuntime = RELEASE;
    }, 80);
  }

  new MutationObserver(run).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', run);
  window.addEventListener('pageshow', run);
  run();
})();
