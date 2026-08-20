(() => {
  'use strict';

  const RELEASE = '20260820.45';
  const SAVE_EVERY_MS = 8000;
  const HLS_SOURCES = [
    'https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js',
    'https://unpkg.com/hls.js@1/dist/hls.min.js'
  ];

  let hlsPromise = null;
  let mountTimer = null;
  let active = null;

  function fmt(value) {
    const seconds = Math.max(0, Number(value) || 0);
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }

  function context() {
    if (typeof state === 'undefined') return null;
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || !parts[1] || !parts[2]) return null;
    const course = (state.courses || []).find(item => item.id === parts[1] || item.slug === parts[1]);
    if (!course) return null;
    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === parts[2]);
      if (lesson) return { course, module, lesson };
    }
    return null;
  }

  function isCloudflare(lesson) {
    return String(lesson?.stream_provider || '').toLowerCase() === 'cloudflare'
      && /^https:\/\//i.test(String(lesson?.stream_hls_url || ''));
  }

  function existingProgress(lessonId) {
    if (typeof state === 'undefined') return null;
    return (state.progressRows || []).find(row => row.lesson_id === lessonId) || null;
  }

  function mergeProgress(row) {
    if (!row || typeof state === 'undefined') return;
    const index = (state.progressRows || []).findIndex(item => item.lesson_id === row.lesson_id);
    if (index >= 0) state.progressRows[index] = row;
    else state.progressRows.push(row);
  }

  async function saveProgress(ctx, video, completed = false, force = false) {
    if (!ctx?.lesson?.id || !video || typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return null;
    const now = Date.now();
    if (!force && active?.lastSave && now - active.lastSave < SAVE_EVERY_MS) return null;
    if (active) active.lastSave = now;

    const old = existingProgress(ctx.lesson.id);
    const duration = Number.isFinite(video.duration) ? video.duration : Number(ctx.lesson.stream_duration_seconds || 0);
    const current = Number(video.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, (current / duration) * 100) : 0;
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

    const { data, error } = await db
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select()
      .single();

    if (error) {
      console.error('Stream V45 progress:', error);
      return null;
    }
    mergeProgress(data);
    return data;
  }

  function nextStep(ctx) {
    const lessons = [...(ctx.module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    const index = lessons.findIndex(item => item.id === ctx.lesson.id);
    if (lessons[index + 1]) return { lesson: lessons[index + 1] };

    const modules = [...(ctx.course.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    const moduleIndex = modules.findIndex(item => item.id === ctx.module.id);

    if (ctx.module.section_type === 'introduction') {
      const nextModule = modules.slice(moduleIndex + 1).find(item => item.section_type === 'academic');
      const first = [...(nextModule?.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0))[0];
      return first ? { lesson: first } : null;
    }

    if (ctx.module.section_type === 'academic') return { moduleBoundary: true };
    return null;
  }

  function status(root, text, mode = '') {
    const node = root.querySelector('[data-stream-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.mode = mode;
  }

  function sync(root, video) {
    const play = root.querySelector('[data-stream-play]');
    const center = root.querySelector('[data-stream-center-play]');
    const seek = root.querySelector('[data-stream-seek]');
    const current = root.querySelector('[data-stream-current]');
    const duration = root.querySelector('[data-stream-duration]');
    const mute = root.querySelector('[data-stream-mute]');

    if (play) play.textContent = video.paused ? '▶' : '❚❚';
    if (center) center.textContent = video.paused ? '▶' : '❚❚';
    if (current) current.textContent = fmt(video.currentTime);
    if (duration) duration.textContent = fmt(video.duration);
    if (seek && Number.isFinite(video.duration) && video.duration > 0 && !seek.matches(':active')) {
      seek.value = String(Math.round((video.currentTime / video.duration) * 1000));
    }
    if (mute) mute.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
    root.classList.toggle('is-playing', !video.paused && !video.ended);
  }

  function destroy() {
    if (!active) return;
    try { active.hls?.destroy?.(); } catch {}
    try { active.cleanup?.(); } catch {}
    active = null;
  }

  function loadScript(src, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error('Tiempo agotado al cargar HLS.js'));
      }, timeout);
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('No se pudo cargar HLS.js')); };
      document.head.appendChild(script);
    });
  }

  async function getHls() {
    if (window.Hls) return window.Hls;
    if (hlsPromise) return hlsPromise;
    hlsPromise = (async () => {
      let last;
      for (const src of HLS_SOURCES) {
        try {
          await loadScript(src);
          if (window.Hls) return window.Hls;
        } catch (error) { last = error; }
      }
      throw last || new Error('HLS.js no disponible');
    })();
    return hlsPromise;
  }

  async function mount() {
    clearTimeout(mountTimer);
    const ctx = context();
    const shell = document.querySelector('.lesson-layout .video-shell');

    if (!ctx || !shell || !isCloudflare(ctx.lesson)) {
      if (active && active.lessonId !== ctx?.lesson?.id) destroy();
      return;
    }

    if (shell.dataset.agStreamV45 === ctx.lesson.id && shell.querySelector('.ag-stream45')) return;
    destroy();

    shell.classList.add('ag-stream-shell-v45');
    shell.dataset.agStreamV45 = ctx.lesson.id;
    shell.innerHTML = `
      <div class="ag-stream45" data-stream45>
        <video class="ag-stream45-video" playsinline preload="metadata" disablepictureinpicture></video>
        <div class="ag-stream45-top">
          <span>ACADEMIA AG</span>
          <b>${String(ctx.lesson.lesson_code || '')}</b>
        </div>
        <button class="ag-stream45-center" type="button" data-stream-center-play disabled aria-label="Reproducir">▶</button>
        <div class="ag-stream45-controls">
          <button type="button" data-stream-play disabled aria-label="Reproducir o pausar">▶</button>
          <span data-stream-current>0:00</span>
          <input data-stream-seek type="range" min="0" max="1000" value="0" step="1" aria-label="Progreso">
          <span data-stream-duration>0:00</span>
          <button type="button" data-stream-mute aria-label="Silenciar">🔊</button>
          <select data-stream-speed aria-label="Velocidad">
            <option value="0.75">0.75×</option>
            <option value="1" selected>1×</option>
            <option value="1.25">1.25×</option>
            <option value="1.5">1.5×</option>
            <option value="2">2×</option>
          </select>
          <button type="button" data-stream-fullscreen aria-label="Pantalla completa">⛶</button>
        </div>
        <div class="ag-stream45-status" data-stream-status>Cargando video seguro…</div>
      </div>`;

    const root = shell.querySelector('[data-stream45]');
    const video = root.querySelector('video');
    const play = root.querySelector('[data-stream-play]');
    const center = root.querySelector('[data-stream-center-play]');
    const seek = root.querySelector('[data-stream-seek]');
    const mute = root.querySelector('[data-stream-mute]');
    const speed = root.querySelector('[data-stream-speed]');
    const fullscreen = root.querySelector('[data-stream-fullscreen]');

    const local = { lessonId: ctx.lesson.id, hls: null, lastSave: 0, finished: false, resumed: false, cleanup: null };
    active = local;

    const enablePlayback = () => {
      play.disabled = false;
      center.disabled = false;
      status(root, 'Listo para comenzar.', 'ready');
      sync(root, video);
    };

    const togglePlay = async () => {
      if (play.disabled) return;
      try {
        if (video.paused || video.ended) await video.play();
        else video.pause();
      } catch (error) {
        console.error('Stream V45 playback:', error);
        status(root, 'El navegador bloqueó la reproducción. Toca nuevamente ▶.', 'error');
      }
    };

    play.addEventListener('click', togglePlay);
    center.addEventListener('click', togglePlay);
    video.addEventListener('click', togglePlay);
    mute.addEventListener('click', () => { video.muted = !video.muted; sync(root, video); });
    speed.addEventListener('change', () => { video.playbackRate = Number(speed.value) || 1; });
    seek.addEventListener('input', () => {
      if (Number.isFinite(video.duration) && video.duration > 0) {
        video.currentTime = (Number(seek.value) / 1000) * video.duration;
        sync(root, video);
      }
    });
    fullscreen.addEventListener('click', async () => {
      try {
        if (!document.fullscreenElement) await root.requestFullscreen();
        else await document.exitFullscreen();
      } catch (error) { console.warn(error); }
    });

    video.addEventListener('play', () => { status(root, 'Tu progreso se guarda automáticamente.', 'ready'); sync(root, video); });
    video.addEventListener('pause', () => { sync(root, video); if (!video.ended) saveProgress(ctx, video, false, true); });
    video.addEventListener('timeupdate', () => { sync(root, video); saveProgress(ctx, video); });
    video.addEventListener('durationchange', () => sync(root, video));
    video.addEventListener('canplay', enablePlayback, { once: true });
    video.addEventListener('error', () => {
      const code = video.error?.code;
      console.error('Stream V45 media error:', code, video.error);
      status(root, 'No pudimos abrir este video. Actualiza la página e intenta nuevamente.', 'error');
    });

    video.addEventListener('loadedmetadata', () => {
      sync(root, video);
      if (local.resumed) return;
      local.resumed = true;
      const row = existingProgress(ctx.lesson.id);
      const saved = Number(row?.last_position_seconds || 0);
      if (!row?.completed && saved > 2 && Number.isFinite(video.duration) && saved < video.duration - 3) {
        video.currentTime = saved;
        status(root, `Continuamos desde ${fmt(saved)}.`, 'resume');
      }
    });

    video.addEventListener('ended', async () => {
      if (local.finished) return;
      local.finished = true;
      status(root, 'Video completado. Guardando avance…', 'complete');
      const row = await saveProgress(ctx, video, true, true);
      if (!row) {
        local.finished = false;
        status(root, 'No pudimos guardar tu avance. Intenta nuevamente.', 'error');
        return;
      }
      const label = document.querySelector('#complete-current strong');
      if (label) label.textContent = '✓ Lección completada';
      if (typeof showToast === 'function') showToast('Video completado.', 'success');

      const next = nextStep(ctx);
      if (next?.lesson) {
        status(root, 'Abriendo el siguiente contenido…', 'complete');
        setTimeout(() => { location.hash = `lesson/${ctx.course.id}/${next.lesson.id}`; }, 850);
      } else if (next?.moduleBoundary) {
        status(root, 'Módulo completado. Continúa con Reforzar lo aprendido.', 'complete');
      } else {
        status(root, 'Contenido completado.', 'complete');
      }
    });

    const onVisibility = () => {
      if (document.visibilityState === 'hidden' && !video.ended) saveProgress(ctx, video, false, true);
    };
    document.addEventListener('visibilitychange', onVisibility);
    local.cleanup = () => document.removeEventListener('visibilitychange', onVisibility);

    try {
      const source = String(ctx.lesson.stream_hls_url).trim();
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = source;
        video.load();
      } else {
        const Hls = await getHls();
        if (active !== local) return;
        if (!Hls.isSupported()) throw new Error('HLS no es compatible con este navegador.');

        const hls = new Hls({ enableWorker: true, lowLatencyMode: false, backBufferLength: 60 });
        local.hls = hls;
        hls.attachMedia(video);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(source));
        hls.on(Hls.Events.MANIFEST_PARSED, enablePlayback);
        hls.on(Hls.Events.ERROR, (_event, data) => {
          if (!data?.fatal) return;
          console.error('Stream V45 HLS fatal:', data);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            status(root, 'Reconectando video…', 'resume');
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            status(root, 'Recuperando reproducción…', 'resume');
            hls.recoverMediaError();
          } else {
            status(root, 'No pudimos cargar este video.', 'error');
            play.disabled = true;
            center.disabled = true;
          }
        });
      }
      document.documentElement.dataset.agCloudflareStream = RELEASE;
    } catch (error) {
      console.error('Stream V45 init:', error);
      status(root, 'No pudimos preparar el video. Actualiza la página.', 'error');
    }
  }

  function schedule() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, 100);
  }

  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
})();