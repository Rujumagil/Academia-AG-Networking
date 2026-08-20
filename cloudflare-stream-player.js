(() => {
  'use strict';

  const RELEASE = '20260820.41';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const HLS_SRC = 'https://cdn.jsdelivr.net/npm/hls.js@1.6.10/dist/hls.min.js';
  let hlsInstance = null;
  let saveTimer = null;
  let mountTimer = null;

  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || !parts[1] || !parts[2]) return null;
    return { courseId: parts[1], lessonId: parts[2] };
  }

  function context() {
    const r = route();
    if (!r || typeof state === 'undefined') return null;
    const course = state?.courses?.find(item => item.id === r.courseId);
    if (!course) return null;
    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === r.lessonId);
      if (lesson) return { course, module, lesson };
    }
    return null;
  }

  function progressRow(lessonId) {
    return state?.progressRows?.find(item => item.lesson_id === lessonId) || null;
  }

  function formatTime(seconds) {
    const value = Math.max(0, Math.floor(Number(seconds || 0)));
    const m = Math.floor(value / 60);
    const s = String(value % 60).padStart(2, '0');
    return `${m}:${s}`;
  }

  function escapeText(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ag-hls]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.Hls), { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = HLS_SRC;
      script.async = true;
      script.dataset.agHls = '1';
      script.onload = () => resolve(window.Hls);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  async function saveProgress(ctx, video, completed = false) {
    if (typeof db === 'undefined' || !state?.user?.id || !ctx?.lesson?.id) return false;
    const duration = Number.isFinite(video.duration) ? video.duration : Number(ctx.lesson.stream_duration_seconds || 0);
    const current = completed ? duration : Number(video.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    const previous = progressRow(ctx.lesson.id);
    const payload = {
      user_id: state.user.id,
      lesson_id: ctx.lesson.id,
      completed: Boolean(completed || previous?.completed),
      completed_at: completed ? new Date().toISOString() : (previous?.completed_at || null),
      last_position_seconds: Number(current.toFixed(2)),
      watch_percentage: Number(percent.toFixed(2)),
      last_watched_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await db
      .from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select('*')
      .single();

    if (error) {
      console.warn('Cloudflare Stream progress:', error);
      return false;
    }

    const index = state.progressRows.findIndex(item => item.lesson_id === ctx.lesson.id);
    if (index >= 0) state.progressRows[index] = data;
    else state.progressRows.push(data);
    return true;
  }

  function nextLesson(ctx) {
    const lessons = ctx.module.lessons || [];
    const index = lessons.findIndex(item => item.id === ctx.lesson.id);
    return index >= 0 ? lessons[index + 1] || null : null;
  }

  function endedOverlay(ctx) {
    const next = nextLesson(ctx);
    const host = document.querySelector('.ag-stream-player');
    if (!host || host.querySelector('.ag-stream-ended')) return;
    const overlay = document.createElement('div');
    overlay.className = 'ag-stream-ended';
    overlay.innerHTML = `
      <div class="ag-stream-ended-card">
        <h3>✓ Video completado</h3>
        <p>Tu avance quedó guardado.</p>
        <div class="ag-stream-ended-actions">
          ${next ? `<button class="btn btn-primary" data-next>Continuar con la siguiente lección</button>` : `<button class="btn btn-primary" data-review>Reforzar lo aprendido</button>`}
          <button class="btn btn-secondary" data-replay>Volver a ver</button>
        </div>
      </div>`;
    host.appendChild(overlay);

    overlay.querySelector('[data-replay]')?.addEventListener('click', () => {
      const video = host.querySelector('video');
      overlay.remove();
      if (video) { video.currentTime = 0; video.play().catch(() => {}); }
    });

    overlay.querySelector('[data-next]')?.addEventListener('click', () => {
      location.hash = `lesson/${ctx.course.id}/${next.id}`;
    });

    overlay.querySelector('[data-review]')?.addEventListener('click', () => {
      try { sessionStorage.setItem('ag-scroll-module-exam', ctx.module.id); } catch {}
      try { window.ACADEMIA_AG_MODULE_EXAM?.enhance?.(); } catch {}
      setTimeout(() => document.querySelector('.module-exam-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    });
  }

  function wireControls(ctx, root, video) {
    const play = root.querySelector('[data-action="play"]');
    const progress = root.querySelector('.ag-stream-progress');
    const time = root.querySelector('.ag-stream-time');
    const speed = root.querySelector('.ag-stream-speed');
    const fullscreen = root.querySelector('[data-action="fullscreen"]');
    const status = root.querySelector('.ag-stream-status');
    const resume = root.querySelector('.ag-stream-resume');

    const update = () => {
      if (time) time.textContent = `${formatTime(video.currentTime)} / ${formatTime(video.duration)}`;
      if (progress && Number.isFinite(video.duration) && video.duration > 0) progress.value = String((video.currentTime / video.duration) * 100);
      if (play) play.textContent = video.paused ? '▶' : '❚❚';
    };

    play?.addEventListener('click', () => video.paused ? video.play().catch(() => {}) : video.pause());
    video.addEventListener('click', () => video.paused ? video.play().catch(() => {}) : video.pause());
    video.addEventListener('play', () => { if (status) status.textContent = 'Reproduciendo'; update(); });
    video.addEventListener('pause', () => { if (status) status.textContent = 'Pausado'; update(); saveProgress(ctx, video, false); });
    video.addEventListener('timeupdate', () => {
      update();
      clearTimeout(saveTimer);
      saveTimer = setTimeout(() => saveProgress(ctx, video, false), 12000);
    });
    video.addEventListener('loadedmetadata', () => {
      update();
      const saved = Number(progressRow(ctx.lesson.id)?.last_position_seconds || 0);
      if (saved > 8 && saved < video.duration - 8 && resume) {
        resume.textContent = `Continuar desde ${formatTime(saved)}`;
        resume.classList.add('show');
        resume.onclick = () => {
          video.currentTime = saved;
          resume.classList.remove('show');
          video.play().catch(() => {});
        };
      }
    });
    progress?.addEventListener('input', () => {
      if (Number.isFinite(video.duration) && video.duration > 0) video.currentTime = (Number(progress.value) / 100) * video.duration;
    });
    speed?.addEventListener('change', () => { video.playbackRate = Number(speed.value || 1); });
    fullscreen?.addEventListener('click', () => root.requestFullscreen?.());
    video.addEventListener('ended', async () => {
      if (status) status.textContent = 'Completado';
      await saveProgress(ctx, video, true);
      try { showToast?.('Video completado. Tu avance quedó guardado.', 'success'); } catch {}
      endedOverlay(ctx);
    });
    update();
  }

  async function mount() {
    const ctx = context();
    if (!ctx || ctx.course.id !== COURSE_ID) return;
    if (ctx.lesson.stream_provider !== 'cloudflare' || !ctx.lesson.stream_hls_url) return;

    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell || shell.dataset.agStreamLesson === ctx.lesson.id) return;

    if (hlsInstance) {
      try { hlsInstance.destroy(); } catch {}
      hlsInstance = null;
    }

    shell.dataset.agStreamLesson = ctx.lesson.id;
    shell.innerHTML = `
      <div class="ag-stream-player" data-release="${RELEASE}">
        <video playsinline preload="metadata" ${ctx.lesson.stream_thumbnail_url ? `poster="${escapeText(ctx.lesson.stream_thumbnail_url)}"` : ''}></video>
        <div class="ag-stream-status">Preparando video…</div>
        <button class="ag-stream-resume" type="button"></button>
        <div class="ag-stream-controls">
          <button class="ag-stream-btn" type="button" data-action="play" aria-label="Reproducir o pausar">▶</button>
          <input class="ag-stream-progress" type="range" min="0" max="100" step="0.1" value="0" aria-label="Progreso del video">
          <span class="ag-stream-time">0:00 / 0:00</span>
          <select class="ag-stream-speed" aria-label="Velocidad">
            <option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="2">2×</option>
          </select>
          <button class="ag-stream-btn" type="button" data-action="fullscreen" aria-label="Pantalla completa">⛶</button>
        </div>
      </div>`;

    const root = shell.querySelector('.ag-stream-player');
    const video = root.querySelector('video');
    const status = root.querySelector('.ag-stream-status');
    wireControls(ctx, root, video);

    const hlsUrl = String(ctx.lesson.stream_hls_url || '').trim();
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      if (status) status.textContent = 'Listo para reproducir';
    } else {
      try {
        const Hls = await loadHls();
        if (!Hls?.isSupported?.()) throw new Error('HLS no compatible');
        hlsInstance = new Hls({ enableWorker: true, lowLatencyMode: false });
        hlsInstance.loadSource(hlsUrl);
        hlsInstance.attachMedia(video);
        hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => { if (status) status.textContent = 'Listo para reproducir'; });
        hlsInstance.on(Hls.Events.ERROR, (_event, data) => {
          if (data?.fatal && status) status.textContent = 'No pudimos cargar el video';
        });
      } catch (error) {
        console.error('Cloudflare Stream player:', error);
        if (status) status.textContent = 'Video no disponible';
      }
    }

    document.documentElement.dataset.agStreamPlayer = RELEASE;
    document.documentElement.dataset.agStreamLesson = ctx.lesson.id;
  }

  function schedule() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, 100);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      const ctx = context();
      const video = document.querySelector('.ag-stream-player video');
      if (ctx && video) saveProgress(ctx, video, false);
    }
  });
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  schedule();

  window.ACADEMIA_AG_STREAM_PLAYER = { release: RELEASE, mount };
})();
