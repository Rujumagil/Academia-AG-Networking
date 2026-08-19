(() => {
  'use strict';

  const RELEASE = '20260819.11';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const WELCOME_MODULE_ID = '11111111-0000-4111-8111-000000000001';
  const MODULE_1_ID = '11111111-aaaa-4111-8111-111111111111';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';
  const CACHE_KEY = `academia-ag:youtube:${PLAYLIST_ID}:title-map:v2`;

  /* La playlist sirve SOLO para descubrir IDs. La lección visible siempre
     carga un único video por su título real de YouTube. */
  const LESSON_CODE = new Map([
    ['tu primer paso hacia la licencia', 'C1 01'],
    ['quien necesita una licencia de utah', 'C1 02'],
    ['quien puede manejar sin obtener una licencia de utah', 'C1 03'],
    ['que es el learner permit', 'C1 04'],
    ['cuanto tiempo debes mantener tu learner permit', 'C1 05'],
    ['conductores jovenes restricciones importantes', 'C1 06'],
    ['provisional class d', 'C1 07'],
    ['limited term driver license', 'C1 08'],
    ['driving privilege card dpc', 'C1 09'],
    ['documentos que debes preparar', 'C1 10'],
    ['renovacion reemplazo y cambio de direccion', 'C1 11'],
    ['caso practico que tramite necesita cada persona', 'C1 12'],
    ['resumen', 'C1 13']
  ]);

  const EXPECTED_CODES = ['00', ...Array.from({ length: 13 }, (_, i) => `C1 ${String(i + 1).padStart(2, '0')}`)];

  let videoMap = readCache();
  let ytApiPromise = null;
  let resolverPromise = null;
  let visiblePlayer = null;
  let activeKey = '';
  let timer = null;

  function normalize(value = '') {
    return String(value)
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[¿?¡!,:;·—–\-]/g, ' ')
      .replace(/[^a-z0-9 ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (parsed?.playlistId !== PLAYLIST_ID || !parsed?.map) return {};
      return { ...parsed.map };
    } catch (_) {
      return {};
    }
  }

  function saveCache(map) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ playlistId: PLAYLIST_ID, map, savedAt: Date.now() }));
      localStorage.removeItem(`academia-ag:youtube:${PLAYLIST_ID}:videos:v1`);
    } catch (_) {}
  }

  function hasCompleteMap() {
    return EXPECTED_CODES.every(code => /^[A-Za-z0-9_-]{6,}$/.test(String(videoMap[code] || '')));
  }

  function extractCodeFromYoutubeTitle(title = '') {
    const raw = String(title).trim();
    if (/^\s*00\b/i.test(raw) && /bienvenida/i.test(raw)) return '00';
    const match = raw.match(/\bC\s*1\s*[-_. ]?\s*(0?[1-9]|1[0-3])\b/i);
    if (!match) return null;
    return `C1 ${String(Number(match[1])).padStart(2, '0')}`;
  }

  function addStyles() {
    let style = document.querySelector('#academia-ag-youtube-utah-player');
    if (!style) {
      style = document.createElement('style');
      style.id = 'academia-ag-youtube-utah-player';
      document.head.appendChild(style);
    }

    style.textContent = `
      .video-shell.youtube-video-active{
        position:relative!important;display:block!important;width:100%!important;height:auto!important;
        min-height:0!important;max-height:none!important;aspect-ratio:16/9!important;padding:0!important;margin:0!important;
        overflow:hidden!important;isolation:isolate!important;border-radius:22px!important;
        border:1px solid rgba(120,199,166,.20)!important;background:#05080d!important;
        box-shadow:0 18px 44px rgba(0,0,0,.20),inset 0 0 0 1px rgba(255,255,255,.03)!important;
      }
      .video-shell.youtube-video-active::before,.video-shell.youtube-video-active::after{display:none!important;content:none!important}
      .video-shell.youtube-video-active>.video-center,.video-shell.youtube-video-active>.video-bar,
      .video-shell.youtube-video-active>img,.video-shell.youtube-video-active>.drive-popout-shield,
      .video-shell.youtube-video-active>.drive-player-loading{display:none!important}
      .youtube-single-holder,.video-shell.youtube-video-active iframe{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;border:0!important;z-index:60!important}
      .youtube-player-loading,.youtube-player-error,.youtube-lesson-ended{
        position:absolute!important;inset:0!important;z-index:80!important;display:flex!important;flex-direction:column!important;
        align-items:center!important;justify-content:center!important;gap:11px!important;padding:28px!important;text-align:center!important;
        background:linear-gradient(145deg,rgba(7,20,26,.97),rgba(5,8,13,.98))!important;color:#d7e2df!important;
      }
      .youtube-player-loading::before{content:'';width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.14);border-top-color:#78c7a6;animation:agYouTubeSpin .8s linear infinite}
      .youtube-player-loading strong,.youtube-player-error strong,.youtube-lesson-ended strong{font-size:1rem;color:#fff}
      .youtube-player-loading span,.youtube-player-error span,.youtube-lesson-ended span{max-width:460px;font-size:.78rem;line-height:1.55;color:#a8bbb5}
      .youtube-lesson-ended button{min-height:44px;padding:0 18px;border:1px solid rgba(120,199,166,.28);border-radius:13px;background:#0d5b43;color:#fff;font:700 .82rem/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer}
      .youtube-lesson-ended button:hover{background:#0f6b4e}
      .youtube-resolver-host{position:fixed!important;left:-10000px!important;top:-10000px!important;width:2px!important;height:2px!important;opacity:.001!important;overflow:hidden!important;pointer-events:none!important}
      @keyframes agYouTubeSpin{to{transform:rotate(360deg)}}
      @media(max-width:720px){.video-shell.youtube-video-active{border-radius:18px!important;box-shadow:0 14px 32px rgba(0,0,0,.18)!important}.youtube-player-loading,.youtube-player-error,.youtube-lesson-ended{padding:22px!important}}
      @media(max-width:420px){.video-shell.youtube-video-active{border-radius:16px!important}}
    `;
  }

  function course() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function lessonCode(module, lesson) {
    if (!module || !lesson) return null;
    const key = normalize(lesson.title || '');
    if (module.id === WELCOME_MODULE_ID && key.includes('bienvenida')) return '00';
    if (module.id !== MODULE_1_ID) return null;
    return LESSON_CODE.get(key) || null;
  }

  function activeLessonContext() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    const current = course();
    if (!current) return null;
    for (const module of current.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === parts[2]);
      if (lesson) return { module, lesson, code: lessonCode(module, lesson) };
    }
    return null;
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;
    ytApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = setTimeout(() => window.YT?.Player ? resolve(window.YT) : reject(new Error('youtube-api-timeout')), 15000);
      window.onYouTubeIframeAPIReady = () => {
        try { if (typeof previous === 'function') previous(); } catch (_) {}
        clearTimeout(timeout);
        resolve(window.YT);
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
    return ytApiPromise;
  }

  async function getPlaylistIds() {
    await loadYouTubeApi();
    return await new Promise((resolve, reject) => {
      const host = document.createElement('div');
      host.className = 'youtube-resolver-host';
      const target = document.createElement('div');
      target.id = `ag-playlist-index-${Date.now()}`;
      host.appendChild(target);
      document.body.appendChild(host);
      let player = null;
      let finished = false;
      let checks = 0;
      const finish = (ids, error) => {
        if (finished) return;
        finished = true;
        try { player?.destroy?.(); } catch (_) {}
        host.remove();
        if (ids?.length) resolve(ids); else reject(error || new Error('playlist-empty'));
      };
      const poll = event => {
        checks += 1;
        let ids = [];
        try { ids = event.target.getPlaylist?.() || []; } catch (_) {}
        if (ids.length >= 14) return finish(ids);
        if (checks >= 60) return finish([], new Error('playlist-timeout'));
        setTimeout(() => poll(event), 250);
      };
      player = new window.YT.Player(target.id, {
        width:'2', height:'2',
        playerVars:{ listType:'playlist', list:PLAYLIST_ID, controls:0, disablekb:1, playsinline:1 },
        events:{
          onReady(event){
            try { event.target.cuePlaylist({ listType:'playlist', list:PLAYLIST_ID, index:0 }); } catch (_) {}
            setTimeout(() => poll(event), 250);
          },
          onError(event){ finish([], new Error(`playlist-error-${event.data}`)); }
        }
      });
      setTimeout(() => finish([], new Error('playlist-hard-timeout')), 18000);
    });
  }

  async function titleForVideo(player, videoId) {
    return await new Promise(resolve => {
      let tries = 0;
      try { player.cueVideoById(videoId); } catch (_) { resolve(''); return; }
      const check = () => {
        tries += 1;
        let data = {};
        try { data = player.getVideoData?.() || {}; } catch (_) {}
        if (data.video_id === videoId && data.title) return resolve(String(data.title));
        if (tries >= 30) return resolve(String(data.title || ''));
        setTimeout(check, 180);
      };
      setTimeout(check, 180);
    });
  }

  async function mapIdsByYoutubeTitle(ids) {
    await loadYouTubeApi();
    if (!ids.length) return {};
    return await new Promise((resolve, reject) => {
      const host = document.createElement('div');
      host.className = 'youtube-resolver-host';
      const target = document.createElement('div');
      target.id = `ag-title-resolver-${Date.now()}`;
      host.appendChild(target);
      document.body.appendChild(host);
      let player = null;
      const cleanup = () => { try { player?.destroy?.(); } catch (_) {} host.remove(); };
      player = new window.YT.Player(target.id, {
        width:'2', height:'2', videoId:ids[0],
        playerVars:{ controls:0, disablekb:1, playsinline:1 },
        events:{
          async onReady(event){
            try {
              const map = {};
              for (const id of ids) {
                const title = await titleForVideo(event.target, id);
                const code = extractCodeFromYoutubeTitle(title);
                if (code && !map[code]) map[code] = id;
              }
              cleanup();
              resolve(map);
            } catch (error) {
              cleanup();
              reject(error);
            }
          },
          onError(){ /* el siguiente cue puede resolver otro video */ }
        }
      });
      setTimeout(() => { cleanup(); reject(new Error('title-resolver-timeout')); }, 90000);
    });
  }

  async function resolveVideoMap(force = false) {
    if (!force && hasCompleteMap()) return videoMap;
    if (resolverPromise) return resolverPromise;
    resolverPromise = (async () => {
      const ids = await getPlaylistIds();
      const mapped = await mapIdsByYoutubeTitle(ids);
      if (!EXPECTED_CODES.every(code => mapped[code])) throw new Error('youtube-title-map-incomplete');
      videoMap = mapped;
      saveCache(videoMap);
      patchStateWithVideos();
      return videoMap;
    })().finally(() => { resolverPromise = null; });
    return resolverPromise;
  }

  function directEmbed(videoId) {
    const origin = encodeURIComponent(location.origin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&controls=1&fs=1&enablejsapi=1&iv_load_policy=3&origin=${origin}`;
  }

  function patchStateWithVideos() {
    const current = course();
    if (!current?.modules?.length) return;
    for (const module of current.modules) {
      for (const lesson of module.lessons || []) {
        const code = lessonCode(module, lesson);
        const videoId = code ? videoMap[code] : null;
        if (!videoId) continue;
        lesson.video_provider = 'youtube';
        lesson.youtube_video_id = videoId;
        lesson.youtube_title_code = code;
        lesson.video_url = directEmbed(videoId);
      }
    }
  }

  function destroyVisiblePlayer() {
    try { visiblePlayer?.destroy?.(); } catch (_) {}
    visiblePlayer = null;
    activeKey = '';
  }

  function prepareShell(shell, className, html) {
    shell.classList.remove('drive-video-active','drive-frame-ready','native-video-active','ag-video-migrating','ag-video-pending');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());
    const box = document.createElement('div');
    box.className = className;
    box.innerHTML = html;
    shell.appendChild(box);
  }

  function showLoading(shell) {
    prepareShell(shell, 'youtube-player-loading', '<strong>Preparando video…</strong><span>Estamos identificando esta lección por su título para mostrar el video correcto.</span>');
  }

  function showError(shell) {
    prepareShell(shell, 'youtube-player-error', '<strong>No pudimos cargar este video.</strong><span>Actualiza la página en unos segundos. Si continúa, revisaremos este video sin afectar tu avance.</span>');
  }

  function showEnded(shell) {
    shell.querySelector(':scope > .youtube-lesson-ended')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'youtube-lesson-ended';
    overlay.innerHTML = '<strong>Video finalizado</strong><span>Continúa desde el contenido del curso para avanzar al siguiente tema y mantener sincronizado tu progreso.</span><button type="button">Repetir video</button>';
    overlay.querySelector('button')?.addEventListener('click', () => {
      overlay.remove();
      try { visiblePlayer?.seekTo?.(0, true); visiblePlayer?.playVideo?.(); } catch (_) {}
    });
    shell.appendChild(overlay);
  }

  async function mountSingleVideo(context, shell, videoId) {
    const key = `${context.lesson.id}:${videoId}`;
    if (key === activeKey && shell.querySelector('iframe')) return;
    destroyVisiblePlayer();
    shell.classList.remove('drive-video-active','drive-frame-ready','native-video-active','ag-video-migrating','ag-video-pending');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const holder = document.createElement('div');
    holder.id = `ag-youtube-single-${String(context.lesson.id).replace(/[^a-z0-9_-]/gi,'')}`;
    holder.className = 'youtube-single-holder';
    const loading = document.createElement('div');
    loading.className = 'youtube-player-loading';
    loading.innerHTML = '<strong>Preparando video…</strong><span>Cargando esta lección.</span>';
    shell.append(holder, loading);
    activeKey = key;

    try {
      await loadYouTubeApi();
      if (activeKey !== key || !holder.isConnected) return;
      visiblePlayer = new window.YT.Player(holder.id, {
        videoId,
        playerVars:{ rel:0, playsinline:1, controls:1, fs:1, iv_load_policy:3, modestbranding:1, origin:location.origin },
        events:{
          onReady(){ if (activeKey === key) loading.remove(); },
          onStateChange(event){ if (activeKey === key && event.data === window.YT.PlayerState.ENDED) showEnded(shell); },
          onError(event){ console.warn('YouTube video error:', context.code, videoId, event.data); if (activeKey === key) showError(shell); }
        }
      });
      setTimeout(() => { if (activeKey === key && loading.isConnected) loading.remove(); }, 3500);
    } catch (error) {
      console.warn('YouTube player:', error);
      if (activeKey === key) showError(shell);
    }
  }

  async function apply() {
    addStyles();
    patchStateWithVideos();
    const context = activeLessonContext();
    if (!context || !context.code) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    let videoId = videoMap[context.code];
    if (!videoId) {
      showLoading(shell);
      try {
        await resolveVideoMap();
        videoId = videoMap[context.code];
      } catch (error) {
        console.warn('YouTube title mapping:', error?.message || error);
        showError(shell);
        return;
      }
    }
    if (videoId) mountSingleVideo(context, shell, videoId);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 45);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('orientationchange', schedule, { passive:true });
  window.addEventListener('resize', schedule, { passive:true });

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['src','class'] });

  const interval = setInterval(apply, 750);
  setTimeout(() => clearInterval(interval), 180000);

  window.ACADEMIA_AG_YOUTUBE_UTAH = {
    release: RELEASE,
    playlistId: PLAYLIST_ID,
    getVideoMap: () => ({ ...videoMap }),
    refreshMapping: () => resolveVideoMap(true),
    apply
  };

  schedule();
})();