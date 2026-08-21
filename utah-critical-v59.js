(() => {
  'use strict';

  const RELEASE = '20260821.59';
  const INTRO_UID = 'c48240b91b7be5b831af4da77193a672';
  const SDK_URL = 'https://embed.cloudflarestream.com/embed/sdk.latest.js';
  let sdkPromise = null;
  let timer = null;
  let activeLessonId = null;
  let lastSave = 0;

  const norm = value => String(value || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim();

  function isUtahPage() {
    const text = norm(document.body?.innerText || '');
    return text.includes('utah driver success program');
  }

  function currentLessonId() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[2] ? parts[2] : null;
  }

  function isIntroPage() {
    const h1 = document.querySelector('.page-title, .lesson-page h1, main h1, h1');
    const text = norm(h1?.textContent || '');
    return text.includes('bienvenida') && text.includes('usar el curso');
  }

  function injectStyles() {
    if (document.querySelector('#utah-critical-v59-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-critical-v59-style';
    style.textContent = `
      .module-panel{min-width:0!important;overflow:hidden!important}
      .module{min-width:0!important}
      .module summary{align-items:flex-start!important;gap:10px!important}
      .module summary>div{display:flex!important;flex:1 1 auto!important;min-width:0!important;flex-direction:column!important;gap:5px!important}
      .module summary>div>strong{display:block!important;min-width:0!important;line-height:1.3!important;overflow-wrap:anywhere!important}
      .module summary>div>span{display:block!important;margin:0!important;line-height:1.2!important;font-size:.72rem!important}
      .module summary>span:last-child{flex:0 0 auto!important;width:20px!important;margin-top:1px!important}
      .lesson-item{min-width:0!important;grid-template-columns:32px minmax(0,1fr) auto!important}
      .lesson-item>a{min-width:0!important;display:flex!important;flex-direction:column!important;gap:3px!important}
      .lesson-item>a>strong{display:block!important;min-width:0!important;line-height:1.28!important;overflow-wrap:anywhere!important}
      .ag-intro59{position:absolute;inset:0;z-index:50;background:#06131b}
      .ag-intro59 iframe{display:block;width:100%;height:100%;border:0;background:#06131b}
      .ag-intro59-status{position:absolute;left:16px;bottom:14px;z-index:60;padding:7px 11px;border-radius:999px;background:rgba(4,21,29,.78);color:#fff;font-size:.75rem;backdrop-filter:blur(8px);pointer-events:none}
      .ag-intro59-status.complete{background:rgba(0,81,52,.9)}
      .ag-intro59-status.error{background:rgba(130,35,35,.92)}
      @media(max-width:760px){.module-panel{padding:14px!important}.module summary{padding:13px 12px!important}.module summary>div>strong{font-size:.94rem!important}}
    `;
    document.head.appendChild(style);
  }

  function cleanModuleTitle(text) {
    return String(text || '')
      .replace(/^M[oó]dulo\s+\d+\s*:\s*/i, '')
      .replace(/^Introducci[oó]n\s*:\s*/i, '')
      .replace(/^Cierre\s*:\s*/i, '')
      .trim();
  }

  function fixModuleLabels() {
    if (!isUtahPage()) return;
    document.querySelectorAll('.module-panel').forEach(panel => {
      let academic = 0;
      const cards = [...panel.querySelectorAll(':scope > details.module')];
      cards.forEach((card, index) => {
        const strong = card.querySelector(':scope > summary > div > strong');
        const count = card.querySelector(':scope > summary > div > span');
        if (!strong) return;
        const title = cleanModuleTitle(strong.textContent);
        const t = norm(title);
        if (index === 0 && t.includes('bienvenida') && t.includes('usar el curso')) {
          strong.textContent = `Introducción: ${title}`;
        } else if (t.includes('cierre')) {
          strong.textContent = `Cierre: ${title.replace(/^cierre\s*[-:–—]?\s*/i, '') || 'Mensaje final del programa'}`;
        } else {
          academic += 1;
          strong.textContent = `Módulo ${academic}: ${title}`;
        }
        if (count) {
          const match = String(count.textContent || '').match(/\d+/);
          const n = match ? Number(match[0]) : card.querySelectorAll('.lesson-item').length;
          count.textContent = `${n} ${n === 1 ? 'lección' : 'lecciones'}`;
        }
      });
    });

    if (isIntroPage()) {
      const subtitle = document.querySelector('.page-subtitle');
      if (subtitle) subtitle.textContent = 'Introducción: Bienvenida y cómo usar el curso';
    }
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

  function progressRow(lessonId) {
    try { return (state?.progressRows || []).find(row => row.lesson_id === lessonId) || null; }
    catch (_) { return null; }
  }

  function mergeProgress(row) {
    try {
      if (!row || !state?.progressRows) return;
      const index = state.progressRows.findIndex(item => item.lesson_id === row.lesson_id);
      if (index >= 0) state.progressRows[index] = row;
      else state.progressRows.push(row);
    } catch (_) {}
  }

  async function saveProgress(player, completed = false, force = false) {
    const lessonId = currentLessonId();
    if (!lessonId || typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return null;
    const now = Date.now();
    if (!force && now - lastSave < 8000) return null;
    lastSave = now;

    const old = progressRow(lessonId);
    const duration = Number(player?.duration || 0);
    const current = Number(player?.currentTime || 0);
    const percent = duration > 0 ? Math.min(100, Math.max(0, current / duration * 100)) : 0;
    const done = Boolean(old?.completed || completed);
    const payload = {
      user_id: state.user.id,
      lesson_id: lessonId,
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
      console.error('Utah intro v59 progress:', error);
      return null;
    }
    mergeProgress(data);
    return data;
  }

  async function mountIntro() {
    if (!isUtahPage() || !isIntroPage()) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;
    const lessonId = currentLessonId();
    if (!lessonId) return;
    if (activeLessonId === lessonId && shell.querySelector('.ag-intro59 iframe')) return;

    activeLessonId = lessonId;
    shell.innerHTML = `
      <div class="ag-intro59">
        <iframe
          data-intro59-frame
          src="https://iframe.videodelivery.net/${INTRO_UID}?controls=true&preload=metadata"
          title="Bienvenida y cómo usar el curso"
          allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowfullscreen
          loading="eager"></iframe>
        <div class="ag-intro59-status" data-intro59-status>Preparando video…</div>
      </div>`;

    const root = shell.querySelector('.ag-intro59');
    const iframe = root.querySelector('[data-intro59-frame]');
    const status = root.querySelector('[data-intro59-status]');
    const setStatus = (text, mode = '') => {
      if (!status) return;
      status.textContent = text;
      status.className = `ag-intro59-status ${mode}`.trim();
    };
    iframe.addEventListener('load', () => setStatus('Listo para comenzar.'), { once: true });

    try {
      const Stream = await ensureSdk();
      const player = Stream(iframe);
      let resumed = false;
      let finished = false;

      player.addEventListener('loadedmetadata', () => {
        if (resumed) return;
        resumed = true;
        const row = progressRow(lessonId);
        const saved = Number(row?.last_position_seconds || 0);
        const duration = Number(player.duration || 0);
        if (!row?.completed && saved > 2 && duration > 0 && saved < duration - 3) player.currentTime = saved;
        setStatus(saved > 2 && !row?.completed ? 'Continuando desde tu último avance.' : 'Listo para comenzar.');
      });
      player.addEventListener('play', () => setStatus('Tu progreso se guarda automáticamente.'));
      player.addEventListener('pause', () => { if (!player.ended) saveProgress(player, false, true); });
      player.addEventListener('timeupdate', () => saveProgress(player, false, false));
      player.addEventListener('ended', async () => {
        if (finished) return;
        finished = true;
        setStatus('Video completado. Guardando avance…', 'complete');
        const row = await saveProgress(player, true, true);
        if (!row) {
          finished = false;
          setStatus('No pudimos guardar el avance. Intenta nuevamente.', 'error');
          return;
        }
        setStatus('Tema completado. El siguiente tema ya está disponible.', 'complete');
        try { if (typeof showToast === 'function') showToast('Tema completado. El siguiente tema ya está disponible.', 'success'); } catch (_) {}
        try { window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK?.enhance?.(); } catch (_) {}
        try {
          if (typeof loadApplicationData === 'function') await loadApplicationData();
          if (typeof route === 'function') route();
        } catch (_) {}
      });
      player.addEventListener('error', () => setStatus('Cloudflare no pudo reproducir este video.', 'error'));
    } catch (error) {
      console.error('Utah intro v59 player:', error);
      setStatus('El video está cargado. Si no inicia, actualiza la página.', 'error');
    }
  }

  function run() {
    injectStyles();
    fixModuleLabels();
    clearTimeout(timer);
    timer = setTimeout(mountIntro, 80);
    document.documentElement.dataset.agUtahCritical = RELEASE;
  }

  new MutationObserver(run).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', run);
  window.addEventListener('pageshow', run);
  run();
})();
