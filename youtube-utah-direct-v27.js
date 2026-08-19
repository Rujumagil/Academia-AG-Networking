(() => {
  'use strict';

  const RELEASE = '20260819.27';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const VIDEO_IDS = [
    'aiIsKF3sCo8','VIalfvelkz0','C8qB7kRyrjI','HqT7C8ANIFo','ZDDB1NPIlvk','1paWtTqq8ME','u45L6abhwRM','bMhuAUEXnOI','UrpFzpqpD2Q','TYzYyJmP0uk','yf8b1NgbV2E','r5y8LW53xb0','RBQ4DA1muRo','DIQlbpmYXVc','7SHmMiYQrPo','sNwpqvfoD1k','ngVfTLFkLYo','J-yjdjIZ30c','cuTUbD1vR_8','mJKyYdkydzs','yPx3-u2G_b8','bnYQLhCj1yI','OuonW4UKmMQ','Xf4MmlKU7tY','zs0fE-nu3-s','tBEk3l6vgr4','QSfm-4t8wv0','SSkApQIPQYg','6uUtnzxoCT4','LYwuRxqEitU','yhPB7uTEdW8','8et7JlkuB4I','0NGx990n5pE','2lhShzmvCjs','2yC9cstFLj0','3y4ngxg1iyI','4VDMXz6QHvM','4XpGeuUS0-w','6r_HHeiNjTI','76z48EjctVU','CXtKUFjROK0','DwEyewnWmno','E49MctjoJ-U','G0Li8_0LyAQ','GI_ogJxmcqE','Ge5P4bfkP8s','H78q02HO6bs','HPb4PL05E1g','HzvK4wH1l0Y','I4k7kl2ulN8','Jh1NpHZmHZk','N9Wi5ukuYwo','Prm9pHNE86Q','RchGISb7B-A','VfPk94HytMQ','W6faLNRyRB4','Y2qpb129v7w','YCWSpp73UrY','YNBSPW9GPJo','bMipCL89PJE','clawNm0tOmM','eDmpV79laFU','gx-_Zd3yjqI','h784KYG6ZP0','hH5c_4aqA98','j4ue_dRGVQA','jP5SyJHtc30','jQ2TYggAyJ4','kML6qSS0LrI','kavWS6eyqS0','lSR3Y1XIyR0','mbG_yekrPLY','pb3fWyY0qyU','phTH5-eUez8','rIi8J_z1KFE','vQUq9rXEN4M','xVRMj-2_XO4','y4YnCRnxqxg','yKMGwCLKSfs','zE72fyWco9M','zPTSXyFxXek','zd2tIlpeXQA'
  ];

  const MODULES = {
    2: { start: 1, max: 14 },
    3: { start: 15, max: 19 },
    4: { start: 34, max: 21 },
    5: { start: 55, max: 22 },
    6: { start: 77, max: 21 },
    7: { start: 98, max: 25 }
  };

  let player = null;
  let apiPromise = null;
  let timer = null;
  let mountedKey = '';
  let mounting = false;

  function addStyles() {
    if (document.querySelector('#ag-youtube-direct-v27-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-youtube-direct-v27-style';
    style.textContent = `
      .video-shell.ag-youtube-direct-v27{position:relative!important;width:100%!important;aspect-ratio:16/9!important;overflow:hidden!important;background:#05080d!important;border-radius:22px!important}
      .video-shell.ag-youtube-direct-v27>img,.video-shell.ag-youtube-direct-v27>.video-center,.video-shell.ag-youtube-direct-v27>.video-bar,.video-shell.ag-youtube-direct-v27>video,.video-shell.ag-youtube-direct-v27>.lesson-native-video,.video-shell.ag-youtube-direct-v27>.lesson-video-fallback,.video-shell.ag-youtube-direct-v27>#video-placeholder{display:none!important}
      .video-shell.ag-youtube-direct-v27 iframe,.video-shell.ag-youtube-direct-v27 .ag-youtube-direct-holder{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;border-radius:inherit!important;background:#05080d!important;z-index:70!important}
      .ag-youtube-direct-loading,.ag-youtube-direct-missing,.youtube-lesson-ended{position:absolute!important;inset:0!important;z-index:90!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:10px!important;padding:28px!important;text-align:center!important;background:linear-gradient(145deg,#07141a,#05080d)!important;color:#fff!important}
      .ag-youtube-direct-loading span,.ag-youtube-direct-missing span,.youtube-lesson-ended span{max-width:560px;color:#a8bbb5;font-size:.8rem;line-height:1.55}
      .youtube-lesson-ended button{min-height:44px;padding:0 18px;border:1px solid rgba(120,199,166,.28);border-radius:13px;background:#0d5b43;color:#fff;font-weight:700;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function route() {
    const parts = location.hash.replace(/^#/,'').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    return { lessonId: parts[2] };
  }

  function currentCourse() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(c => c.id === COURSE_ID) || null;
  }

  function context() {
    const r = route();
    const course = currentCourse();
    if (!r || !course?.modules?.length) return null;
    for (let mi = 0; mi < course.modules.length; mi += 1) {
      const module = course.modules[mi];
      const lessons = module.lessons || [];
      const li = lessons.findIndex(l => l.id === r.lessonId);
      if (li < 0) continue;
      const lesson = lessons[li];
      const modulePosition = Number(module.position) || mi + 1;
      const lessonPosition = Number(lesson.position) || li + 1;
      let index = -1;
      if (modulePosition === 1) index = 0;
      else if (modulePosition === 8) index = 123;
      else {
        const cfg = MODULES[modulePosition];
        if (cfg && lessonPosition >= 1 && lessonPosition <= cfg.max) index = cfg.start + lessonPosition - 1;
      }
      lesson.video_provider = 'youtube';
      return { lesson, modulePosition, lessonPosition, index };
    }
    return null;
  }

  function loadApi() {
    if (window.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = setTimeout(() => {
        if (window.YT?.Player) resolve();
        else reject(new Error('youtube-api-timeout'));
      }, 15000);
      window.onYouTubeIframeAPIReady = () => {
        clearTimeout(timeout);
        try { if (typeof previous === 'function') previous(); } catch (_) {}
        resolve();
      };
      if (!document.querySelector('script[data-ag-youtube-api]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.dataset.agYoutubeApi = '1';
        script.onerror = () => reject(new Error('youtube-api-load-failed'));
        document.head.appendChild(script);
      }
    });
    return apiPromise;
  }

  function resetShell(shell) {
    try { player?.destroy?.(); } catch (_) {}
    player = null;
    shell.classList.remove('ag-youtube-direct-v26');
    shell.classList.add('ag-youtube-direct-v27');
    shell.innerHTML = '';
  }

  function showMissing(shell, ctx, detail = '') {
    resetShell(shell);
    mounting = false;
    mountedKey = '';
    const box = document.createElement('div');
    box.className = 'ag-youtube-direct-missing';
    box.innerHTML = `<strong>Video pendiente de asignar</strong><span>${detail || 'Esta lección todavía no tiene un enlace individual de YouTube cargado.'}</span>`;
    shell.appendChild(box);
  }

  function showEnded(shell) {
    shell.querySelector('.youtube-lesson-ended')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'youtube-lesson-ended';
    overlay.innerHTML = '<strong>Video finalizado</strong><span>Tu avance se está guardando. Ya puedes continuar con el siguiente tema.</span><button type="button">Repetir video</button>';
    overlay.querySelector('button')?.addEventListener('click', () => {
      overlay.remove();
      try { player?.seekTo?.(0, true); player?.playVideo?.(); } catch (_) {}
    });
    shell.appendChild(overlay);
  }

  async function mount(shell, ctx, videoId) {
    const key = `${ctx.lesson.id}:${videoId}`;
    const existing = shell.querySelector('iframe,.ag-youtube-direct-holder');
    if (mountedKey === key && existing) return;

    resetShell(shell);
    mountedKey = key;
    mounting = true;

    const loading = document.createElement('div');
    loading.className = 'ag-youtube-direct-loading';
    loading.innerHTML = `<strong>Cargando video de YouTube…</strong><span>Lección ${ctx.lessonPosition} · Módulo ${ctx.modulePosition}</span>`;
    shell.appendChild(loading);

    const holder = document.createElement('div');
    holder.className = 'ag-youtube-direct-holder';
    holder.id = `ag-youtube-direct-v27-${String(ctx.lesson.id).replace(/[^a-z0-9_-]/gi,'')}`;
    shell.appendChild(holder);

    try {
      await loadApi();
      if (!holder.isConnected || route()?.lessonId !== ctx.lesson.id) {
        if (route()?.lessonId === ctx.lesson.id) {
          mountedKey = '';
          mounting = false;
          schedule();
        }
        return;
      }

      player = new window.YT.Player(holder.id, {
        host: 'https://www.youtube-nocookie.com',
        videoId,
        playerVars: { rel: 0, playsinline: 1, controls: 1, fs: 1, iv_load_policy: 3, origin: location.origin },
        events: {
          onReady() {
            mounting = false;
            shell.querySelector('.ag-youtube-direct-loading')?.remove();
            const frame = shell.querySelector('iframe');
            if (frame) frame.dataset.agYoutubeDirectV27 = 'true';
          },
          onStateChange(event) {
            if (event.data === window.YT.PlayerState.ENDED) showEnded(shell);
          },
          onError(event) {
            showMissing(shell, ctx, `YouTube devolvió el código ${event.data}.`);
          }
        }
      });
    } catch (error) {
      console.error('YouTube direct v27 player error:', error);
      showMissing(shell, ctx, 'No fue posible iniciar el reproductor de YouTube.');
    }
  }

  async function apply() {
    addStyles();
    const ctx = context();
    if (!ctx) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    const videoId = ctx.index >= 0 ? VIDEO_IDS[ctx.index] : '';
    if (!videoId) {
      if (!shell.querySelector('.ag-youtube-direct-missing')) showMissing(shell, ctx);
      return;
    }

    const key = `${ctx.lesson.id}:${videoId}`;
    const mountedNode = shell.querySelector('iframe,.ag-youtube-direct-holder');
    if (mountedKey === key && mountedNode) return;
    if (mounting && mountedKey === key) return;

    await mount(shell, ctx, videoId);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 80);
  }

  const observer = new MutationObserver(() => {
    const ctx = context();
    if (!ctx) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;
    const videoId = ctx.index >= 0 ? VIDEO_IDS[ctx.index] : '';
    const key = videoId ? `${ctx.lesson.id}:${videoId}` : '';
    if (key && mountedKey === key && shell.querySelector('iframe,.ag-youtube-direct-holder')) return;
    schedule();
  });
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => {
    mountedKey = '';
    mounting = false;
    try { player?.destroy?.(); } catch (_) {}
    player = null;
    schedule();
  });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });

  window.ACADEMIA_AG_YOUTUBE_UTAH = { release: RELEASE, mappedVideos: VIDEO_IDS.length, apply };
  schedule();
})();
