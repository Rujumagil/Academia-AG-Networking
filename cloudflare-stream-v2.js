(() => {
  'use strict';

  const RELEASE = '20260820.44';
  const HLS_SOURCES = [
    'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js',
    'https://unpkg.com/hls.js@1/dist/hls.min.js'
  ];
  const SAVE_INTERVAL_MS = 8000;
  let hlsPromise = null;
  let mountTimer = null;
  let active = null;

  function formatTime(seconds) {
    const safe = Number.isFinite(Number(seconds)) ? Math.max(0, Number(seconds)) : 0;
    const mins = Math.floor(safe / 60);
    const secs = Math.floor(safe % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function currentLessonContext() {
    if (typeof state === 'undefined') return null;
    const raw = location.hash.replace(/^#/, '').split('/');
    if (raw[0] !== 'lesson' || !raw[1] || !raw[2]) return null;
    const course = state.courses?.find(item => item.id === raw[1] || item.slug === raw[1]);
    if (!course) return null;
    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === raw[2]);
      if (lesson) return { course, module, lesson };
    }
    return null;
  }

  function hasStream(lesson) {
    return String(lesson?.stream_provider || '').toLowerCase() === 'cloudflare'
      && Boolean(String(lesson?.stream_hls_url || '').trim());
  }

  function progressRow(lessonId) {
    if (typeof state === 'undefined') return null;
    return (state.progressRows || []).find(row => row.lesson_id === lessonId) || null;
  }

  function loadScript(src, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`Tiempo agotado al cargar ${src}`));
      }, timeout);
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error(`No se pudo cargar ${src}`)); };
      document.head.appendChild(script);
    });
  }

  async function ensureHls() {
    if (window.Hls) return window.Hls;
    if (hlsPromise) return hlsPromise;
    hlsPromise = (async () => {
      let lastError = null;
      for (const src of HLS_SOURCES) {
        try {
          await loadScript(src);
          if (window.Hls) return window.Hls;
        } catch (error) {
          lastError = error;
        }
      }
      throw lastError || new Error('No fue posible cargar HLS.js');
    })();
    return hlsPromise;
  }

  function updateStateProgress(row) {
    if (!row || typeof state === 'undefined') return;
    const index = (state.progressRows || []).findIndex(item => item.lesson_id === row.lesson_id);
    if (index >= 0) state.progressRows[index] = row;
    else state.progressRows.push(row);
  }

  async function saveProgress(ctx, video, completed = false, force = false) {
    if (!ctx?.lesson?.id || !video || typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return null;
    const now = Date.now();
    if (!force && active?.lastSavedAt && now - active.lastSavedAt < SAVE_INTERVAL_MS) return null;
    if (active) active.lastSavedAt = now;

    const duration = Number(video.duration) || Number(ctx.lesson.stream_duration_seconds) || 0;
    const current = Number(video.currentTime) || 0;
    const percentage = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    const existing = progressRow(ctx.lesson.id);
    const isCompleted = Boolean(existing?.completed || completed);

    const payload = {
      user_id: state.user.id,
      lesson_id: ctx.lesson.id,
      completed: isCompleted,
      completed_at: isCompleted ? (existing?.completed_at || new Date().toISOString()) : null,
      last_position_seconds: completed ? duration : current,
      watch_percentage: completed ? 100 : Math.max(Number(existing?.watch_percentage || 0), percentage),
      last_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) {
      console.error('Cloudflare Stream progress error:', error);
      return null;
    }

    updateStateProgress(data);
    return data;
  }

  function nextLesson(ctx) {
    const modules = [...(ctx.course.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    const moduleIndex = modules.findIndex(item => item.id === ctx.module.id);
    const lessons = [...(ctx.module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    const lessonIndex = lessons.findIndex(item => item.id === ctx.lesson.id);
    const sameModuleNext = lessons[lessonIndex + 1] || null;
    if (sameModuleNext) return { lesson: sameModuleNext, sameModule: true };

    if (ctx.lesson.lesson_kind === 'welcome') {
      const firstAcademicModule = modules.slice(moduleIndex + 1).find(item => item.section_type === 'academic' || Number(item.academic_number) > 0);
      const firstLesson = [...(firstAcademicModule?.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0))[0];
      if (firstLesson) return { lesson: firstLesson, sameModule: false };
    }

    if (ctx.module.section_type === 'academic') return { lesson: null, moduleBoundary: true };

    const nextModule = modules[moduleIndex + 1];
    const firstLesson = [...(nextModule?.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0))[0];
    return firstLesson ? { lesson: firstLesson, sameModule: false } : null;
  }

  function setStatus(root, text, mode = '') {
    const node = root.querySelector('[data-stream-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.mode = mode;
  }

  function updateControls(root, video) {
    const play = root.querySelector('[data-stream-play]');
    const seek = root.querySelector('[data-stream-seek]');
    const current = root.querySelector('[data-stream-current]');
    const duration = root.querySelector('[data-stream-duration]');
    const mute = root.querySelector('[data-stream-mute]');

    if (play) play.textContent = video.paused ? '▶' : '❚❚';
    if (current) current.textContent = formatTime(video.currentTime);
    if (duration) duration.textContent = formatTime(video.duration);
    if (seek && Number.isFinite(video.duration) && video.duration > 0 && !seek.matches(':active')) {
      seek.value = String(Math.round((video.currentTime / video.duration) * 1000));
    }
    if (mute) mute.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
  }

  function destroyActive() {
    if (!active) return;
    try { active.hls?.destroy?.(); } catch {}
    try { active.cleanup?.(); } catch {}
    active = null;
  }

  async function mountPlayer() {
    clearTimeout(mountTimer);
    const ctx = currentLessonContext();
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!ctx || !shell || !hasStream(ctx.lesson)) {
      if (active && active.lessonId !== ctx?.lesson?.id) destroyActive();
      return;
    }

    if (shell.dataset.agStreamLesson === ctx.lesson.id && shell.querySelector('.ag-stream-player')) return;
    destroyActive();

    shell.dataset.agStreamLesson = ctx.lesson.id;
    shell.innerHTML = `
      <div class="ag-stream-player" data-stream-player data-lesson-code="${String(ctx.lesson.lesson_code || '')}">
        <video class="ag-stream-video" playsinline preload="metadata" ${ctx.lesson.stream_thumbnail_url ? `poster="${String(ctx.lesson.stream_thumbnail_url).replace(/"/g, '&quot;')}"` : ''}></video>
        <div class="ag-stream-topbar">
          <span class="ag-stream-brand">ACADEMIA AG</span>
          <span class="ag-stream-code">${String(ctx.lesson.lesson_code || '')}</span>
        </div>
        <button class="ag-stream-center-play" type="button" data-stream-center-play aria-label="Reproducir">▶</button>
        <div class="ag-stream-controls">
          <button type="button" data-stream-play aria-label="Reproducir o pausar">▶</button>
          <span data-stream-current>0:00</span>
          <input data-stream-seek type="range" min="0" max="1000" value="0" step="1" aria-label="Progreso del video">
          <span data-stream-duration>0:00</span>
          <button type="button" data-stream-mute aria-label="Silenciar">🔊</button>
          <select data-stream-speed aria-label="Velocidad de reproducción">
            <option value="0.75">0.75×</option>
            <option value="1" selected>1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
          <button type="button" data-stream-fullscreen aria-label="Pantalla completa">⛶</button>
        </div>
        <div class="ag-stream-status" data-stream-status>Cargando video seguro…</div>
      </div>`;

    const root = shell.querySelector('[data-stream-player]');
    const video = root.querySelector('video');
    const centerPlay = root.querySelector('[data-stream-center-play]');
    const play = root.querySelector('[data-stream-play]');
    const seek = root.querySelector('[data-stream-seek]');
    const mute = root.querySelector('[data-stream-mute]');
    const speed = root.querySelector('[data-stream-speed]');
    const fullscreen = root.querySelector('[data-stream-fullscreen]');

    const localActive = {
      lessonId: ctx.lesson.id,
      hls: null,
      lastSavedAt: 0,
      resumed: false,
      finished: false,
      cleanup: null
    };
    active = localActive;

    const sync = () => updateControls(root, video);
    const togglePlay = async () => {
      try {
        if (video.paused) await video.play();
        else video.pause();
      } catch (error) {
        console.warn('Playback blocked:', error);
      }
    };

    play.addEventListener('click', togglePlay);
    centerPlay.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    mute.addEventListener('click', () => { video.muted = !video.muted; sync(); });
    speed.addEventListener('change', () => { video.playbackRate = Number(speed.value) || 1; });
    fullscreen.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await root.requestFullscreen();
        else await document.exitFullscreen();
      } catch (error) {
        console.warn('Fullscreen error:', error);
      }
    });
    seek.addEventListener('input', () => {
      if (!Number.isFinite(video.duration) || video.duration <= 0) return;
      video.currentTime = (Number(seek.value) / 1000) * video.duration;
      sync();
    });

    video.addEventListener('play', () => {
      root.classList.add('is-playing');
      setStatus(root, 'Tu progreso se guarda automáticamente.', 'ready');
      sync();
    });
    video.addEventListener('pause', () => {
      root.classList.remove('is-playing');
      sync();
      if (!video.ended) saveProgress(ctx, video, false, true);
    });
    video.addEventListener('timeupdate', () => {
      sync();
      saveProgress(ctx, video, false, false);
    });
    video.addEventListener('durationchange', sync);

    video.addEventListener('loadedmetadata', () => {
      sync();
      if (localActive.resumed) return;
      localActive.resumed = true;
      const row = progressRow(ctx.lesson.id);
      const saved = Number(row?.last_position_seconds || 0);
      if (!row?.completed && saved > 2 && Number.isFinite(video.duration) && saved < video.duration - 3) {
        video.currentTime = saved;
        setStatus(root, `Continuamos desde ${formatTime(saved)}.`, 'resume');
      } else {
        setStatus(root, 'Listo para comenzar.', 'ready');
      }
    });

    video.addEventListener('ended', async () => {
      if (localActive.finished) return;
      localActive.finished = true;
      centerPlay.textContent = '✓';
      setStatus(root, 'Video completado. Guardando tu avance…', 'complete');
      const row = await saveProgress(ctx, video, true, true);
      if (!row) {
        localActive.finished = false;
        setStatus(root, 'No pudimos guardar el avance. Intenta nuevamente.', 'error');
        return;
      }

      const completeButton = document.querySelector('#complete-current strong');
      if (completeButton) completeButton.textContent = '✓ Lección completada';
      if (typeof showToast === 'function') showToast('Video completado.', 'success');

      const next = nextLesson(ctx);
      if (next?.lesson) {
        setStatus(root, 'Video completado. Abriendo la siguiente lección…', 'complete');
        setTimeout(() => {
          location.hash = `lesson/${ctx.course.id}/${next.lesson.id}`;
        }, 900);
      } else if (next?.moduleBoundary) {
        setStatus(root, 'Módulo completado. El siguiente paso será Reforzar lo aprendido.', 'complete');
      } else {
        setStatus(root, 'Curso completado.', 'complete');
      }
    });

    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !video.ended) saveProgress(ctx, video, false, true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    localActive.cleanup = () => document.removeEventListener('visibilitychange', onVisibility);

    try {
      const hlsUrl = String(ctx.lesson.stream_hls_url || '').trim();
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = hlsUrl;
      } else {
        const Hls = await ensureHls();
        if (!active || active !== localActive) return;
        if (!Hls.isSupported()) throw new Error('Este navegador no admite reproducción HLS.');
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: false,
          backBufferLength: 30
        });
        localActive.hls = hls;
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data?.fatal) return;
          console.error('HLS fatal error:', data);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
          else {
            setStatus(root, 'No pudimos reproducir este video.', 'error');
            hls.destroy();
          }
        });
      }
      video.load?.();
      document.documentElement.dataset.agCloudflareStreamV2 = RELEASE;
    } catch (error) {
      console.error('Academia AG Stream player error:', error);
      setStatus(root, 'No pudimos cargar el video. Actualiza la página e intenta de nuevo.', 'error');
    }
  }

  function scheduleMount() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mountPlayer, 80);
  }

  const observer = new MutationObserver(scheduleMount);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', scheduleMount);
  window.addEventListener('pageshow', scheduleMount);
  scheduleMount();
})();
