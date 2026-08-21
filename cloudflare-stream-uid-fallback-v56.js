(() => {
  'use strict';

  const RELEASE = '20260821.56';
  const SDK_URL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
  const SAVE_EVERY_MS = 8000;
  let sdkPromise = null;
  let active = null;
  let timer = null;

  function context() {
    try {
      const parts = location.hash.replace(/^#/, '').split('/');
      if (parts[0] !== 'lesson' || !parts[1] || !parts[2] || typeof state === 'undefined') return null;
      const course = (state.courses || []).find(item => item.id === parts[1] || item.slug === parts[1]);
      if (!course) return null;
      for (const module of course.modules || []) {
        const lesson = (module.lessons || []).find(item => item.id === parts[2]);
        if (lesson) return { course, module, lesson };
      }
    } catch (_) {}
    return null;
  }

  function needsFallback(lesson) {
    return String(lesson?.stream_provider || '').toLowerCase() === 'cloudflare'
      && Boolean(String(lesson?.stream_uid || '').trim())
      && !String(lesson?.stream_hls_url || '').trim();
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

  function loadScript(src, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const clock = setTimeout(() => {
        script.remove();
        reject(new Error('Tiempo agotado al cargar Cloudflare Stream SDK.'));
      }, timeout);
      script.src = src;
      script.async = true;
      script.onload = () => { clearTimeout(clock); resolve(); };
      script.onerror = () => { clearTimeout(clock); script.remove(); reject(new Error('No se pudo cargar Cloudflare Stream SDK.')); };
      document.head.appendChild(script);
    });
  }

  async function ensureSdk() {
    if (window.Stream) return window.Stream;
    if (!sdkPromise) {
      sdkPromise = loadScript(SDK_URL).then(() => {
        if (!window.Stream) throw new Error('Cloudflare Stream SDK no disponible.');
        return window.Stream;
      });
    }
    return sdkPromise;
  }

  async function saveProgress(ctx, player, complete = false, force = false) {
    if (!ctx?.lesson?.id || !player || typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return null;
    const now = Date.now();
    if (!force && active?.lastSave && now - active.lastSave < SAVE_EVERY_MS) return null;
    if (active) active.lastSave = now;

    const previous = existingProgress(ctx.lesson.id);
    const duration = Number(player.duration || ctx.lesson.stream_duration_seconds || 0);
    const current = Number(player.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    const done = Boolean(previous?.completed || complete);

    const payload = {
      user_id: state.user.id,
      lesson_id: ctx.lesson.id,
      completed: done,
      completed_at: done ? (previous?.completed_at || new Date().toISOString()) : null,
      last_position_seconds: complete && duration > 0 ? duration : current,
      watch_percentage: complete ? 100 : Math.max(Number(previous?.watch_percentage || 0), percent),
      last_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) {
      console.error('Stream UID fallback progress:', error);
      return null;
    }
    mergeProgress(data);
    return data;
  }

  function destroy() {
    if (!active) return;
    try { active.cleanup?.(); } catch (_) {}
    active = null;
  }

  async function mount() {
    clearTimeout(timer);
    const ctx = context();
    const shell = document.querySelector('.lesson-layout .video-shell');

    if (!ctx || !shell || !needsFallback(ctx.lesson)) {
      if (active && active.lessonId !== ctx?.lesson?.id) destroy();
      return;
    }

    if (shell.dataset.agStreamUidFallback === ctx.lesson.id && shell.querySelector('[data-stream-uid-fallback]')) return;
    destroy();

    const uid = encodeURIComponent(String(ctx.lesson.stream_uid).trim());
    shell.dataset.agStreamUidFallback = ctx.lesson.id;
    shell.classList.add('ag-stream-shell-v46');
    shell.innerHTML = `
      <div class="ag-stream46" data-stream-uid-fallback>
        <iframe
          class="ag-stream46-frame"
          data-stream-uid-frame
          src="https://iframe.videodelivery.net/${uid}?controls=true&preload=metadata"
          title="${String(ctx.lesson.title || 'Video de Academia AG').replace(/\"/g, '&quot;')}"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen="true"
          loading="eager"></iframe>
        <div class="ag-stream46-brand" aria-hidden="true"><span>ACADEMIA AG</span><b>${String(ctx.lesson.lesson_code || '')}</b></div>
        <div class="ag-stream46-status" data-stream-uid-status>Preparando video…</div>
      </div>`;

    const root = shell.querySelector('[data-stream-uid-fallback]');
    const iframe = root.querySelector('[data-stream-uid-frame]');
    const status = root.querySelector('[data-stream-uid-status]');
    const local = { lessonId: ctx.lesson.id, player: null, lastSave: 0, finished: false, resumed: false, cleanup: null };
    active = local;

    iframe.addEventListener('load', () => { if (status) status.textContent = 'Listo para comenzar.'; }, { once: true });

    try {
      const Stream = await ensureSdk();
      if (active !== local) return;
      const player = Stream(iframe);
      local.player = player;

      const onLoadedMetadata = () => {
        if (local.resumed) return;
        local.resumed = true;
        const row = existingProgress(ctx.lesson.id);
        const saved = Number(row?.last_position_seconds || 0);
        const duration = Number(player.duration || 0);
        if (!row?.completed && saved > 2 && duration > 0 && saved < duration - 3) player.currentTime = saved;
        if (status) status.textContent = saved > 2 && !row?.completed ? 'Continuando desde tu último avance.' : 'Listo para comenzar.';
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
        const label = document.querySelector('#complete-current strong');
        if (label) label.textContent = '✓ Tema completado';
        if (typeof showToast === 'function') showToast('Video completado. El siguiente tema ya está disponible.', 'success');
        try { window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK?.enhance?.(); } catch (_) {}
        if (status) status.textContent = 'Tema completado. Ya puedes continuar.';
      };

      const onVisibility = () => {
        if (document.visibilityState === 'hidden' && local.player && !local.player.ended) saveProgress(ctx, local.player, false, true);
      };

      player.addEventListener('loadedmetadata', onLoadedMetadata);
      player.addEventListener('play', onPlay);
      player.addEventListener('pause', onPause);
      player.addEventListener('timeupdate', onTimeUpdate);
      player.addEventListener('ended', onEnded);
      document.addEventListener('visibilitychange', onVisibility);
      local.cleanup = () => document.removeEventListener('visibilitychange', onVisibility);
      document.documentElement.dataset.agCloudflareUidFallback = RELEASE;
    } catch (error) {
      console.error('Cloudflare UID fallback:', error);
      if (status) status.textContent = 'Video listo para reproducir.';
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(mount, 90);
  }

  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
})();