(() => {
  'use strict';

  const RELEASE = '20260820.46';
  const SDK_URL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
  const SAVE_EVERY_MS = 8000;
  let sdkPromise = null;
  let mountTimer = null;
  let active = null;

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
      && Boolean(String(lesson?.stream_uid || '').trim())
      && /^https:\/\//i.test(String(lesson?.stream_hls_url || ''));
  }

  function playerOrigin(lesson) {
    try {
      return new URL(String(lesson.stream_hls_url)).origin;
    } catch {
      return '';
    }
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

  async function saveProgress(ctx, player, completed = false, force = false) {
    if (!ctx?.lesson?.id || !player || typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return null;
    const now = Date.now();
    if (!force && active?.lastSave && now - active.lastSave < SAVE_EVERY_MS) return null;
    if (active) active.lastSave = now;

    const old = existingProgress(ctx.lesson.id);
    const duration = Number(player.duration || ctx.lesson.stream_duration_seconds || 0);
    const current = Number(player.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
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
      console.error('Stream V46 progress:', error);
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

  function setStatus(root, text, mode = '') {
    const node = root.querySelector('[data-stream46-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.mode = mode;
  }

  function loadScript(src, timeout = 12000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error('Tiempo agotado al cargar el reproductor de Stream.'));
      }, timeout);
      script.src = src;
      script.async = true;
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error('No se pudo cargar el reproductor de Stream.')); };
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

  function destroy() {
    if (!active) return;
    try { active.cleanup?.(); } catch {}
    active = null;
  }

  async function mount() {
    clearTimeout(mountTimer);
    const ctx = context();
    const shell = document.querySelector('.lesson-layout .video-shell');

    if (!ctx || !shell || !isCloudflare(ctx.lesson)) {
      if (active && active.lessonId !== ctx?.lesson?.id) destroy();
      return;
    }

    if (shell.dataset.agStreamV46 === ctx.lesson.id && shell.querySelector('.ag-stream46')) return;
    destroy();

    const origin = playerOrigin(ctx.lesson);
    if (!origin) return;
    const uid = encodeURIComponent(String(ctx.lesson.stream_uid).trim());
    const iframeSrc = `${origin}/${uid}/iframe?controls=true&preload=metadata`;

    shell.classList.add('ag-stream-shell-v46');
    shell.dataset.agStreamV46 = ctx.lesson.id;
    shell.innerHTML = `
      <div class="ag-stream46" data-stream46>
        <iframe
          class="ag-stream46-frame"
          data-stream46-frame
          src="${iframeSrc}"
          title="${String(ctx.lesson.title || 'Video de Academia AG').replace(/\"/g, '&quot;')}"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen="true"
          loading="eager"></iframe>
        <div class="ag-stream46-brand" aria-hidden="true">
          <span>ACADEMIA AG</span>
          <b>${String(ctx.lesson.lesson_code || '')}</b>
        </div>
        <div class="ag-stream46-status" data-stream46-status>Preparando video…</div>
      </div>`;

    const root = shell.querySelector('[data-stream46]');
    const iframe = root.querySelector('[data-stream46-frame]');
    const local = { lessonId: ctx.lesson.id, player: null, lastSave: 0, finished: false, resumed: false, cleanup: null };
    active = local;

    // El iframe ya es reproducible por sí mismo. El SDK se usa solo para progreso y navegación.
    iframe.addEventListener('load', () => setStatus(root, 'Listo para comenzar.', 'ready'), { once: true });

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
        if (!row?.completed && saved > 2 && duration > 0 && saved < duration - 3) {
          player.currentTime = saved;
          setStatus(root, `Continuamos desde ${Math.floor(saved / 60)}:${String(Math.floor(saved % 60)).padStart(2, '0')}.`, 'resume');
        } else {
          setStatus(root, 'Listo para comenzar.', 'ready');
        }
      };

      const onPlay = () => setStatus(root, 'Tu progreso se guarda automáticamente.', 'ready');
      const onPause = () => { if (!player.ended) saveProgress(ctx, player, false, true); };
      const onTimeUpdate = () => saveProgress(ctx, player, false, false);
      const onEnded = async () => {
        if (local.finished) return;
        local.finished = true;
        setStatus(root, 'Video completado. Guardando avance…', 'complete');
        const row = await saveProgress(ctx, player, true, true);
        if (!row) {
          local.finished = false;
          setStatus(root, 'No pudimos guardar tu avance. Intenta nuevamente.', 'error');
          return;
        }

        const label = document.querySelector('#complete-current strong');
        if (label) label.textContent = '✓ Lección completada';
        if (typeof showToast === 'function') showToast('Video completado.', 'success');

        const next = nextStep(ctx);
        if (next?.lesson) {
          setStatus(root, 'Abriendo el siguiente contenido…', 'complete');
          setTimeout(() => { location.hash = `lesson/${ctx.course.id}/${next.lesson.id}`; }, 900);
        } else if (next?.moduleBoundary) {
          setStatus(root, 'Módulo completado. Continúa con Reforzar lo aprendido.', 'complete');
        } else {
          setStatus(root, 'Contenido completado.', 'complete');
        }
      };
      const onError = event => {
        console.error('Cloudflare Stream V46 player error:', event);
        setStatus(root, 'No pudimos reproducir este video. Actualiza la página e intenta nuevamente.', 'error');
      };
      const onVisibility = () => {
        if (document.visibilityState === 'hidden' && local.player && !local.player.ended) {
          saveProgress(ctx, local.player, false, true);
        }
      };

      player.addEventListener('loadedmetadata', onLoadedMetadata);
      player.addEventListener('play', onPlay);
      player.addEventListener('pause', onPause);
      player.addEventListener('timeupdate', onTimeUpdate);
      player.addEventListener('ended', onEnded);
      player.addEventListener('error', onError);
      document.addEventListener('visibilitychange', onVisibility);

      local.cleanup = () => {
        document.removeEventListener('visibilitychange', onVisibility);
      };
      document.documentElement.dataset.agCloudflareStream = RELEASE;
    } catch (error) {
      // No se bloquea la reproducción: los controles nativos del iframe siguen funcionando.
      console.error('Stream V46 SDK:', error);
      setStatus(root, 'Video listo. Tu avance se sincronizará al actualizar.', 'ready');
    }
  }

  function schedule() {
    clearTimeout(mountTimer);
    mountTimer = setTimeout(mount, 90);
  }

  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
})();