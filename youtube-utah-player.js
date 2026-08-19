(() => {
  'use strict';

  const RELEASE = '20260819.8';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const WELCOME_MODULE_ID = '11111111-0000-4111-8111-000000000001';
  const MODULE_1_ID = '11111111-aaaa-4111-8111-111111111111';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';

  /*
    La playlist está ordenada por el propietario y los títulos del aula
    determinan qué posición corresponde a cada lección.
    0 = Bienvenida, 1..13 = C1 01..C1 13.
    El promocional NO se incluye hasta terminar su verificación.
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

  let ytApiPromise = null;
  let player = null;
  let activeKey = '';
  let activeFrame = null;
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
      .video-shell.youtube-video-active>.drive-player-loading{
        display:none!important;
      }
      .video-shell.youtube-video-active iframe.youtube-lesson-frame{
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
      .video-shell.youtube-video-active>.youtube-player-loading{
        position:absolute!important;
        inset:0!important;
        z-index:65!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:10px!important;
        background:linear-gradient(145deg,#07141a,#05080d)!important;
        color:#c3d2cd!important;
        font:700 .76rem/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.03em!important;
        pointer-events:none!important;
        transition:opacity .25s ease,visibility .25s ease!important;
      }
      .video-shell.youtube-video-active.youtube-player-ready>.youtube-player-loading{
        opacity:0!important;
        visibility:hidden!important;
      }
      .video-shell.youtube-video-active>.youtube-player-loading::before{
        content:''!important;
        width:25px!important;
        height:25px!important;
        border-radius:50%!important;
        border:2px solid rgba(255,255,255,.14)!important;
        border-top-color:#78c7a6!important;
        animation:agYouTubeSpin .8s linear infinite!important;
      }
      @keyframes agYouTubeSpin{to{transform:rotate(360deg)}}
      @media(max-width:720px){
        .video-shell.youtube-video-active{
          border-radius:18px!important;
          box-shadow:0 14px 32px rgba(0,0,0,.18)!important;
        }
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

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = window.setTimeout(() => {
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('youtube-api-timeout'));
      }, 12000);

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

  function playlistEmbed(index) {
    const origin = encodeURIComponent(location.origin);
    return `https://www.youtube-nocookie.com/embed?listType=playlist&list=${PLAYLIST_ID}&index=${index}&rel=0&playsinline=1&controls=1&fs=1&enablejsapi=1&origin=${origin}`;
  }

  function destroyCurrentPlayer() {
    try { player?.destroy?.(); } catch (_) {}
    player = null;
    activeFrame = null;
    activeKey = '';
  }

  function prepareShell(shell, context) {
    const key = `${context.lesson.id}:${context.index}`;
    if (
      key === activeKey &&
      activeFrame?.isConnected &&
      shell.contains(activeFrame)
    ) return false;

    destroyCurrentPlayer();

    shell.classList.remove('drive-video-active', 'drive-frame-ready', 'native-video-active');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const frame = document.createElement('iframe');
    frame.id = `ag-youtube-lesson-${String(context.lesson.id).replace(/[^a-z0-9_-]/gi, '')}`;
    frame.className = 'lesson-frame youtube-lesson-frame';
    frame.dataset.youtubePlaylistIndex = String(context.index);
    frame.src = playlistEmbed(context.index);
    frame.title = `${context.lesson.title || 'Video de la lección'} · ${PLAYLIST_LABELS[context.index] || ''}`;
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; fullscreen');
    frame.setAttribute('allowfullscreen', '');

    const loading = document.createElement('div');
    loading.className = 'youtube-player-loading';
    loading.textContent = 'Preparando video…';

    shell.appendChild(frame);
    shell.appendChild(loading);

    activeKey = key;
    activeFrame = frame;
    return true;
  }

  async function mountYouTube(context, shell) {
    const created = prepareShell(shell, context);
    if (!created) return;

    const frame = activeFrame;
    const expectedKey = activeKey;

    try {
      await loadYouTubeApi();
      if (!frame?.isConnected || expectedKey !== activeKey) return;

      player = new window.YT.Player(frame, {
        events: {
          onReady(event) {
            if (expectedKey !== activeKey) return;
            try {
              event.target.cuePlaylist({
                listType: 'playlist',
                list: PLAYLIST_ID,
                index: context.index,
                startSeconds: 0
              });
            } catch (error) {
              console.warn('No se pudo posicionar la playlist de YouTube:', error);
            }
            window.setTimeout(() => shell.classList.add('youtube-player-ready'), 350);
          },
          onStateChange(event) {
            if (expectedKey !== activeKey) return;
            if (event.data === window.YT.PlayerState.CUED || event.data === window.YT.PlayerState.PLAYING || event.data === window.YT.PlayerState.PAUSED) {
              shell.classList.add('youtube-player-ready');
            }
          },
          onError(event) {
            console.warn('YouTube player error:', event.data);
            shell.classList.add('youtube-player-ready');
          }
        }
      });

      /* Fallback visual: nunca dejar una pantalla de carga permanente. */
      window.setTimeout(() => {
        if (expectedKey === activeKey && shell.isConnected) shell.classList.add('youtube-player-ready');
      }, 3500);
    } catch (error) {
      console.warn('YouTube player:', error?.message || error);
      shell.classList.add('youtube-player-ready');
    }
  }

  function patchStateMetadata() {
    const current = course();
    if (!current?.modules?.length) return;

    for (const module of current.modules) {
      for (const lesson of module.lessons || []) {
        const index = lessonIndex(module, lesson);
        if (index == null) continue;
        lesson.youtube_playlist_id = PLAYLIST_ID;
        lesson.youtube_playlist_index = index;
        lesson.youtube_playlist_label = PLAYLIST_LABELS[index] || '';
        lesson.video_provider = 'youtube';
      }
    }
  }

  function apply() {
    addStyles();
    patchStateMetadata();

    const context = activeLessonContext();
    if (!context || context.index == null) {
      if (activeFrame?.isConnected === false) destroyCurrentPlayer();
      return;
    }

    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    mountYouTube(context, shell);
  }

  function schedule() {
    window.clearTimeout(timer);
    timer = window.setTimeout(apply, 45);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('orientationchange', schedule, { passive:true });
  window.addEventListener('resize', schedule, { passive:true });

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['src','class']
  });

  /* Drive puede seguir alimentando temporalmente los módulos 2–6.
     Este intervalo garantiza que Introducción + Módulo 1 siempre
     recuperen prioridad visual de YouTube después de cualquier re-render. */
  const interval = window.setInterval(apply, 650);
  window.setTimeout(() => window.clearInterval(interval), 180000);

  window.ACADEMIA_AG_YOUTUBE_UTAH = {
    release: RELEASE,
    playlistId: PLAYLIST_ID,
    playlistLabels: PLAYLIST_LABELS.slice(),
    apply
  };

  schedule();
})();