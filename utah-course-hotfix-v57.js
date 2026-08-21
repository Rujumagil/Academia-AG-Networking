(() => {
  'use strict';

  const RELEASE = '20260821.57';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const INTRO_CODE = 'INTRO-01';
  const INTRO_UID = 'c48240b91b7be5b831af4da77193a672';
  const SDK_URL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
  const SAVE_EVERY_MS = 8000;
  let sdkPromise = null;
  let timer = null;
  let active = null;

  function injectStyles() {
    if (document.querySelector('#utah-course-hotfix-v57-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-course-hotfix-v57-style';
    style.textContent = `
      .module-panel{min-width:0;overflow:hidden}
      .module{min-width:0}
      .module summary{align-items:flex-start;gap:10px}
      .module summary>div{display:flex;flex:1 1 auto;min-width:0;flex-direction:column;gap:5px}
      .module summary>div>strong{display:block;min-width:0;line-height:1.35;overflow-wrap:anywhere}
      .module summary>div>span{display:block!important;margin:0;line-height:1.2;color:var(--muted);font-size:.72rem}
      .module summary>span:last-child{flex:0 0 auto;display:grid;place-items:center;width:20px;height:20px;margin-top:1px}
      .lesson-list{min-width:0}
      .lesson-item{min-width:0;grid-template-columns:32px minmax(0,1fr) auto}
      .lesson-item>a{min-width:0;display:flex;flex-direction:column;gap:3px}
      .lesson-item>a>strong{display:block;min-width:0;line-height:1.28;overflow-wrap:anywhere}
      .lesson-item>a>small{display:block;line-height:1.2}
      .lesson-item>span:last-child{white-space:nowrap;font-size:.72rem;color:var(--muted)}
      @media (max-width:760px){
        .module-panel{padding:14px}
        .module summary{padding:14px 12px}
        .module summary>div>strong{font-size:.94rem}
        .lesson-item{padding:11px 10px;gap:8px}
      }
      .ag-intro57{position:absolute;inset:0;z-index:5;background:#07151d}
      .ag-intro57 iframe{width:100%;height:100%;border:0;display:block}
      .ag-intro57-status{position:absolute;left:16px;bottom:14px;z-index:3;padding:7px 10px;border-radius:999px;background:rgba(3,18,26,.72);color:#fff;font-size:.76rem;backdrop-filter:blur(8px)}
      .ag-intro57-status[data-mode="complete"]{background:rgba(0,81,52,.86)}
      .ag-intro57-status[data-mode="error"]{background:rgba(130,35,35,.9)}
    `;
    document.head.appendChild(style);
  }

  function context() {
    if (typeof state === 'undefined') return null;
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || !parts[1] || !parts[2]) return null;
    const course = (state.courses || []).find(item => item.id === parts[1] || item.slug === parts[1]);
    if (!course || course.id !== COURSE_ID) return null;
    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === parts[2]);
      if (lesson) return { course, module, lesson };
    }
    return null;
  }

  function isIntro(ctx) {
    return Boolean(ctx?.lesson && String(ctx.lesson.lesson_code || '') === INTRO_CODE);
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

  function setStatus(root, text, mode = '') {
    const node = root?.querySelector('[data-intro57-status]');
    if (!node) return;
    node.textContent = text;
    node.dataset.mode = mode;
  }

  function loadSdk() {
    if (window.Stream) return Promise.resolve(window.Stream);
    if (sdkPromise) return sdkPromise;
    sdkPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SDK_URL;
      script.async = true;
      script.onload = () => window.Stream ? resolve(window.Stream) : reject(new Error('SDK de Stream no disponible.'));
      script.onerror = () => reject(new Error('No se pudo cargar el SDK de Stream.'));
      document.head.appendChild(script);
    });
    return sdkPromise;
  }

  async function saveProgress(ctx, player, completed = false, force = false) {
    if (!ctx?.lesson?.id || !player || typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return null;
    const now = Date.now();
    if (!force && active?.lastSave && now - active.lastSave < SAVE_EVERY_MS) return null;
    if (active) active.lastSave = now;

    const old = existingProgress(ctx.lesson.id);
    const duration = Number(player.duration || 0);
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

    const { data, error } = await db.from('lesson_progress')
      .upsert(payload, { onConflict: 'user_id,lesson_id' })
      .select().single();
    if (error) {
      console.error('Intro V57 progress:', error);
      return null;
    }
    mergeProgress(data);
    return data;
  }

  function destroyActive() {
    if (!active) return;
    try { active.cleanup?.(); } catch (_) {}
    active = null;
  }

  async function mountIntro() {
    const ctx = context();
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!isIntro(ctx) || !shell) {
      if (active && active.lessonId !== ctx?.lesson?.id) destroyActive();
      return;
    }

    // Si el reproductor general ya montó Cloudflare correctamente, no lo sustituimos.
    if (shell.querySelector('.ag-stream46 iframe')) return;
    if (shell.dataset.agIntroV57 === ctx.lesson.id && shell.querySelector('.ag-intro57')) return;

    destroyActive();
    shell.dataset.agIntroV57 = ctx.lesson.id;
    shell.innerHTML = `
      <div class="ag-intro57">
        <iframe
          data-intro57-frame
          src="https://iframe.videodelivery.net/${INTRO_UID}?controls=true&preload=metadata"
          title="Bienvenida y cómo usar el curso"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen="true"
          loading="eager"></iframe>
        <div class="ag-intro57-status" data-intro57-status>Preparando video…</div>
      </div>`;

    const root = shell.querySelector('.ag-intro57');
    const iframe = root.querySelector('[data-intro57-frame]');
    const local = { lessonId: ctx.lesson.id, player: null, lastSave: 0, finished: false, resumed: false, cleanup: null };
    active = local;

    iframe.addEventListener('load', () => setStatus(root, 'Listo para comenzar.'), { once: true });

    try {
      const Stream = await loadSdk();
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
          setStatus(root, `Continuamos desde ${Math.floor(saved / 60)}:${String(Math.floor(saved % 60)).padStart(2, '0')}.`);
        } else setStatus(root, 'Listo para comenzar.');
      };
      const onPlay = () => setStatus(root, 'Tu progreso se guarda automáticamente.');
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
        if (label) label.textContent = '✓ Tema completado';
        if (typeof showToast === 'function') showToast('Tema completado. El siguiente contenido ya está disponible.', 'success');
        try { window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK?.enhance?.(); } catch (_) {}
        setTimeout(() => {
          try {
            const next = window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK?.firstIncomplete?.();
            if (next && next.id !== ctx.lesson.id) location.hash = `lesson/${ctx.course.id}/${next.id}`;
          } catch (_) {}
        }, 700);
      };
      const onError = () => setStatus(root, 'No pudimos reproducir el video. Actualiza la página e intenta nuevamente.', 'error');
      const onVisibility = () => {
        if (document.visibilityState === 'hidden' && local.player && !local.player.ended) saveProgress(ctx, local.player, false, true);
      };

      player.addEventListener('loadedmetadata', onLoadedMetadata);
      player.addEventListener('play', onPlay);
      player.addEventListener('pause', onPause);
      player.addEventListener('timeupdate', onTimeUpdate);
      player.addEventListener('ended', onEnded);
      player.addEventListener('error', onError);
      document.addEventListener('visibilitychange', onVisibility);
      local.cleanup = () => document.removeEventListener('visibilitychange', onVisibility);
    } catch (error) {
      console.error('Intro V57 player:', error);
      setStatus(root, 'Video listo. Si el avance no se guarda, actualiza la página.', 'error');
    }
  }

  function run() {
    injectStyles();
    clearTimeout(timer);
    timer = setTimeout(mountIntro, 90);
    document.documentElement.dataset.agUtahCourseHotfix = RELEASE;
  }

  window.addEventListener('hashchange', run);
  window.addEventListener('pageshow', run);
  new MutationObserver(run).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  run();
})();
