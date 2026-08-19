(() => {
  'use strict';

  const RELEASE = '20260819.10';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const WELCOME_MODULE_ID = '11111111-0000-4111-8111-000000000001';
  const MODULE_1_ID = '11111111-aaaa-4111-8111-111111111111';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';
  const REQUIRED_VIDEO_COUNT = 14;
  const CACHE_KEY = `academia-ag:youtube:${PLAYLIST_ID}:videos:v1`;

  /*
    La playlist se usa SOLO como índice interno para descubrir los IDs.
    El alumno nunca reproduce la playlist completa.
    0 = Bienvenida, 1..13 = C1 01..C1 13.
  */
  const TITLE_INDEX = new Map([
    ['tu primer paso hacia la licencia', 1],
    ['quien necesita una licencia de utah', 2],
    ['quien puede manejar sin obtener una licencia de utah', 3],
    ['que es el learner permit', 4],
    ['cuanto tiempo debes mantener tu learner permit', 5],
    ['conductores jovenes restricciones importantes', 6],
    ['provisional class d', 7],
    ['limited term driver license', 8],
    ['driving privilege card dpc', 9],
    ['documentos que debes preparar', 10],
    ['renovacion reemplazo y cambio de direccion', 11],
    ['caso practico que tramite necesita cada persona', 12],
    ['resumen', 13]
  ]);

  const PLAYLIST_LABELS = [
    '00 Bienvenida y cómo usar el curso',
    'C1 01','C1 02','C1 03','C1 04','C1 05','C1 06','C1 07',
    'C1 08','C1 09','C1 10','C1 11','C1 12','C1 13'
  ];

  let videoIds = readCachedIds();
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

  function readCachedIds() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      if (parsed?.playlistId === PLAYLIST_ID && Array.isArray(parsed.ids) && parsed.ids.length >= REQUIRED_VIDEO_COUNT) {
        return parsed.ids.slice(0, REQUIRED_VIDEO_COUNT);
      }
    } catch (_) {}
    return [];
  }

  function saveCachedIds(ids) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        playlistId: PLAYLIST_ID,
        ids: ids.slice(0, REQUIRED_VIDEO_COUNT),
        savedAt: Date.now()
      }));
    } catch (_) {}
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
        position:relative!important;
        display:block!important;
        width:100%!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        aspect-ratio:16/9!important;
        padding:0!important;
        margin:0!important;
        overflow:hidden!important;
        isolation:isolate!important;
        border-radius:22px!important;
        border:1px solid rgba(120,199,166,.20)!important;
        background:#05080d!important;
        box-shadow:0 18px 44px rgba(0,0,0,.20),inset 0 0 0 1px rgba(255,255,255,.03)!important;
      }
      .video-shell.youtube-video-active::before,
      .video-shell.youtube-video-active::after{
        display:none!important;
        content:none!important;
        pointer-events:none!important;
      }
      .video-shell.youtube-video-active>.video-center,
      .video-shell.youtube-video-active>.video-bar,
      .video-shell.youtube-video-active>img,
      .video-shell.youtube-video-active>.drive-popout-shield,
      .video-shell.youtube-video-active>.drive-player-loading{display:none!important}

      .video-shell.youtube-video-active iframe.youtube-lesson-frame,
      .video-shell.youtube-video-active iframe[id^="ag-youtube-single-"]{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        min-width:100%!important;
        min-height:100%!important;
        max-width:none!important;
        max-height:none!important;
        border:0!important;
        border-radius:inherit!important;
        background:#05080d!important;
        display:block!important;
        z-index:60!important;
        pointer-events:auto!important;
        touch-action:manipulation!important;
      }

      .youtube-single-holder{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
      }

      .youtube-player-loading,
      .youtube-player-error,
      .youtube-lesson-ended{
        position:absolute!important;
        inset:0!important;
        z-index:80!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:11px!important;
        padding:28px!important;
        text-align:center!important;
        background:linear-gradient(145deg,rgba(7,20,26,.97),rgba(5,8,13,.98))!important;
        color:#d7e2df!important;
      }
      .youtube-player-loading::before{
        content:'';
        width:26px;
        height:26px;
        border-radius:50%;
        border:2px solid rgba(255,255,255,.14);
        border-top-color:#78c7a6;
        animation:agYouTubeSpin .8s linear infinite;
      }
      .youtube-player-loading strong,
      .youtube-player-error strong,
      .youtube-lesson-ended strong{font-size:1rem;color:#fff}
      .youtube-player-loading span,
      .youtube-player-error span,
      .youtube-lesson-ended span{max-width:460px;font-size:.78rem;line-height:1.55;color:#a8bbb5}
      .youtube-lesson-ended button{
        min-height:44px;
        padding:0 18px;
        border:1px solid rgba(120,199,166,.28);
        border-radius:13px;
        background:#0d5b43;
        color:#fff;
        font:700 .82rem/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
        cursor:pointer;
      }
      .youtube-lesson-ended button:hover{background:#0f6b4e}
      @keyframes agYouTubeSpin{to{transform:rotate(360deg)}}

      .youtube-playlist-resolver{
        position:fixed!important;
        left:-10000px!important;
        top:-10000px!important;
        width:2px!important;
        height:2px!important;
        opacity:.001!important;
        overflow:hidden!important;
        pointer-events:none!important;
      }

      @media(max-width:720px){
        .video-shell.youtube-video-active{
          border-radius:18px!important;
          box-shadow:0 14px 32px rgba(0,0,0,.18)!important;
        }
        .youtube-player-loading,
        .youtube-player-error,
        .youtube-lesson-ended{padding:22px!important}
      }
      @media(max-width:420px){
        .video-shell.youtube-video-active{border-radius:16px!important}
      }
    `;
  }

  function course() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function lessonIndex(module, lesson) {
    if (!module || !lesson) return null;
    const key = normalize(lesson.title || '');
    if (module.id === WELCOME_MODULE_ID && key.includes('bienvenida')) return 0;
    if (module.id !== MODULE_1_ID) return null;
    return TITLE_INDEX.has(key) ? TITLE_INDEX.get(key) : null;
  }

  function activeLessonContext() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    const current = course();
    if (!current) return null;

    for (const module of current.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === parts[2]);
      if (!lesson) continue;
      return { module, lesson, index: lessonIndex(module, lesson) };
    }
    return null;
  }

  function directEmbed(videoId) {
    const origin = encodeURIComponent(location.origin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&controls=1&fs=1&enablejsapi=1&iv_load_policy=3&origin=${origin}`;
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => {
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('youtube-api-timeout'));
      }, 15000);

      window.onYouTubeIframeAPIReady = () => {
        try { if (typeof previous === 'function') previous(); } catch (_) {}
        window.clearTimeout(timeout);
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

  async function resolveVideoIds(force = false) {
    if (!force && videoIds.length >= REQUIRED_VIDEO_COUNT) return videoIds;
    if (resolverPromise) return resolverPromise;

    resolverPromise = (async () => {
      await loadYouTubeApi();

      return await new Promise((resolve, reject) => {
        const host = document.createElement('div');
        host.className = 'youtube-playlist-resolver';
        const target = document.createElement('div');
        target.id = `ag-playlist-resolver-${Date.now()}`;
        host.appendChild(target);
        document.body.appendChild(host);

        let resolver = null;
        let finished = false;
        let checks = 0;

        const finish = (ids, error = null) => {
          if (finished) return;
          finished = true;
          try { resolver?.destroy?.(); } catch (_) {}
          host.remove();

          if (Array.isArray(ids) && ids.length >= REQUIRED_VIDEO_COUNT) {
            videoIds = ids.slice(0, REQUIRED_VIDEO_COUNT);
            saveCachedIds(videoIds);
            patchStateWithDirectVideos();
            resolve(videoIds);
            return;
          }

          reject(error || new Error('playlist-ids-not-resolved'));
        };

        const poll = event => {
          checks += 1;
          let ids = [];
          try { ids = event.target.getPlaylist?.() || []; } catch (_) {}
          if (ids.length >= REQUIRED_VIDEO_COUNT) return finish(ids);
          if (checks >= 50) return finish([], new Error('playlist-ids-timeout'));
          window.setTimeout(() => poll(event), 250);
        };

        resolver = new window.YT.Player(target.id, {
          width: '2',
          height: '2',
          playerVars: {
            listType: 'playlist',
            list: PLAYLIST_ID,
            index: 0,
            controls: 0,
            disablekb: 1,
            playsinline: 1
          },
          events: {
            onReady(event) {
              try {
                event.target.cuePlaylist({ listType:'playlist', list:PLAYLIST_ID, index:0, startSeconds:0 });
              } catch (_) {}
              window.setTimeout(() => poll(event), 250);
            },
            onError(event) {
              finish([], new Error(`playlist-resolver-error-${event.data}`));
            }
          }
        });

        window.setTimeout(() => finish([], new Error('playlist-resolver-timeout')), 15000);
      });
    })().finally(() => {
      resolverPromise = null;
    });

    return resolverPromise;
  }

  function patchStateWithDirectVideos() {
    if (videoIds.length < REQUIRED_VIDEO_COUNT) return;
    const current = course();
    if (!current?.modules?.length) return;

    for (const module of current.modules) {
      for (const lesson of module.lessons || []) {
        const index = lessonIndex(module, lesson);
        const videoId = index == null ? null : videoIds[index];
        if (!videoId) continue;
        lesson.video_provider = 'youtube';
        lesson.youtube_video_id = videoId;
        lesson.youtube_playlist_id = PLAYLIST_ID;
        lesson.youtube_playlist_index = index;
        lesson.youtube_playlist_label = PLAYLIST_LABELS[index] || '';
        lesson.video_url = directEmbed(videoId);
      }
    }
  }

  function destroyVisiblePlayer() {
    try { visiblePlayer?.destroy?.(); } catch (_) {}
    visiblePlayer = null;
    activeKey = '';
  }

  function showLoading(shell) {
    shell.classList.remove('drive-video-active', 'drive-frame-ready', 'native-video-active');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());
    const loading = document.createElement('div');
    loading.className = 'youtube-player-loading';
    loading.innerHTML = '<strong>Preparando video…</strong><span>Estamos cargando esta lección de forma individual.</span>';
    shell.appendChild(loading);
  }

  function showError(shell) {
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());
    const error = document.createElement('div');
    error.className = 'youtube-player-error';
    error.innerHTML = '<strong>No pudimos cargar este video.</strong><span>La lección permanece disponible. Vuelve a intentarlo en unos segundos.</span>';
    shell.appendChild(error);
  }

  function showEnded(shell) {
    shell.querySelector(':scope > .youtube-lesson-ended')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'youtube-lesson-ended';
    overlay.innerHTML = '<strong>Video finalizado</strong><span>Continúa desde el contenido del curso para avanzar al siguiente tema. Así tu progreso permanece sincronizado con la Academia.</span><button type="button">Repetir video</button>';
    overlay.querySelector('button')?.addEventListener('click', () => {
      overlay.remove();
      try {
        visiblePlayer?.seekTo?.(0, true);
        visiblePlayer?.playVideo?.();
      } catch (_) {}
    });
    shell.appendChild(overlay);
  }

  async function mountSingleVideo(context, shell, videoId) {
    const key = `${context.lesson.id}:${videoId}`;
    if (key === activeKey && shell.querySelector('iframe[id^="ag-youtube-single-"]')) return;

    destroyVisiblePlayer();
    shell.classList.remove('drive-video-active', 'drive-frame-ready', 'native-video-active', 'ag-video-migrating', 'ag-video-pending');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const holder = document.createElement('div');
    holder.className = 'youtube-single-holder';
    holder.id = `ag-youtube-single-${String(context.lesson.id).replace(/[^a-z0-9_-]/gi, '')}`;
    const loading = document.createElement('div');
    loading.className = 'youtube-player-loading';
    loading.innerHTML = '<strong>Preparando video…</strong><span>Cargando esta lección.</span>';
    shell.appendChild(holder);
    shell.appendChild(loading);
    activeKey = key;

    try {
      await loadYouTubeApi();
      if (!holder.isConnected || activeKey !== key) return;

      visiblePlayer = new window.YT.Player(holder.id, {
        videoId,
        playerVars: {
          rel: 0,
          playsinline: 1,
          controls: 1,
          fs: 1,
          iv_load_policy: 3,
          origin: location.origin
        },
        events: {
          onReady() {
            if (activeKey !== key) return;
            loading.remove();
            const frame = shell.querySelector('iframe');
            if (frame) {
              frame.classList.add('youtube-lesson-frame');
              frame.title = context.lesson.title || 'Video de la lección';
              frame.referrerPolicy = 'strict-origin-when-cross-origin';
            }
          },
          onStateChange(event) {
            if (activeKey !== key) return;
            if (event.data === window.YT.PlayerState.ENDED) showEnded(shell);
            if (event.data === window.YT.PlayerState.PLAYING) shell.querySelector(':scope > .youtube-lesson-ended')?.remove();
          },
          onError(event) {
            console.warn('YouTube single video error:', event.data);
            if (activeKey === key) showError(shell);
          }
        }
      });
    } catch (error) {
      console.warn('YouTube single video:', error?.message || error);
      if (activeKey === key) showError(shell);
    }
  }

  async function apply() {
    addStyles();
    patchStateWithDirectVideos();

    const context = activeLessonContext();
    if (!context || context.index == null) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    const cachedId = videoIds[context.index];
    if (cachedId) {
      mountSingleVideo(context, shell, cachedId);
      return;
    }

    if (!shell.classList.contains('youtube-video-active') || !shell.querySelector('.youtube-player-loading')) showLoading(shell);

    try {
      const ids = await resolveVideoIds();
      const videoId = ids[context.index];
      if (!videoId) throw new Error('video-id-missing');
      if (!shell.isConnected) return;
      mountSingleVideo(context, shell, videoId);
    } catch (error) {
      console.warn('YouTube video resolver:', error?.message || error);
      if (shell.isConnected) showError(shell);
    }
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 50);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['src','class']
  });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('orientationchange', schedule, { passive:true });
  window.addEventListener('resize', schedule, { passive:true });
  document.addEventListener('DOMContentLoaded', schedule, { once:true });

  const interval = window.setInterval(apply, 850);
  window.setTimeout(() => window.clearInterval(interval), 180000);

  window.ACADEMIA_AG_YOUTUBE_UTAH = {
    release: RELEASE,
    playlistId: PLAYLIST_ID,
    playlistLabels: PLAYLIST_LABELS.slice(),
    getResolvedVideoIds: () => videoIds.slice(),
    refreshVideoIds: () => resolveVideoIds(true),
    apply
  };

  schedule();
})();