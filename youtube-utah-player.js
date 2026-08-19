(() => {
  'use strict';

  const RELEASE = '20260819.7';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';

  const TITLE_INDEX = new Map([
    ['bienvenida', 0],
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

  let playlistIds = [];
  let resolving = false;
  let ytPromise = null;
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
    if (document.querySelector('#academia-ag-youtube-utah-player')) return;
    const style = document.createElement('style');
    style.id = 'academia-ag-youtube-utah-player';
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
      .video-shell.youtube-video-active::after{display:none!important;content:none!important}
      .video-shell.youtube-video-active>.video-center,
      .video-shell.youtube-video-active>.video-bar,
      .video-shell.youtube-video-active>img,
      .video-shell.youtube-video-active>.drive-popout-shield,
      .video-shell.youtube-video-active>.drive-player-loading{display:none!important}
      .video-shell.youtube-video-active iframe.youtube-lesson-frame{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        min-width:100%!important;
        min-height:100%!important;
        border:0!important;
        border-radius:inherit!important;
        background:#05080d!important;
        display:block!important;
        z-index:50!important;
        pointer-events:auto!important;
      }
      .youtube-resolver-host{
        position:fixed!important;
        left:-9999px!important;
        top:-9999px!important;
        width:2px!important;
        height:2px!important;
        opacity:.001!important;
        pointer-events:none!important;
        overflow:hidden!important;
      }
      @media(max-width:720px){
        .video-shell.youtube-video-active{border-radius:18px!important;box-shadow:0 14px 32px rgba(0,0,0,.18)!important}
      }
      @media(max-width:420px){
        .video-shell.youtube-video-active{border-radius:16px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function course() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function activeLessonContext() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    const current = course();
    if (!current) return null;

    for (const module of current.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === parts[2]);
      if (!lesson) continue;
      const key = normalize(lesson.title || '');
      let index = TITLE_INDEX.get(key);
      if (index == null && module.id === '11111111-0000-4111-8111-000000000001' && key.includes('bienvenida')) index = 0;
      return { module, lesson, index };
    }
    return null;
  }

  function directEmbed(videoId) {
    const origin = encodeURIComponent(location.origin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&controls=1&fs=1&enablejsapi=1&origin=${origin}`;
  }

  function patchState() {
    if (playlistIds.length < 14) return 0;
    const current = course();
    if (!current?.modules?.length) return 0;
    let changed = 0;

    for (const module of current.modules) {
      for (const lesson of module.lessons || []) {
        const key = normalize(lesson.title || '');
        let index = TITLE_INDEX.get(key);
        if (index == null && module.id === '11111111-0000-4111-8111-000000000001' && key.includes('bienvenida')) index = 0;
        if (index == null || !playlistIds[index]) continue;
        const url = directEmbed(playlistIds[index]);
        if (lesson.video_url !== url) {
          lesson.video_url = url;
          lesson.youtube_playlist_index = index;
          lesson.youtube_playlist_label = PLAYLIST_LABELS[index] || '';
          changed++;
        }
      }
    }
    return changed;
  }

  function renderActiveLesson() {
    if (playlistIds.length < 14) return;
    const context = activeLessonContext();
    if (!context || context.index == null || !playlistIds[context.index]) return;

    addStyles();
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;
    const videoId = playlistIds[context.index];
    const existing = shell.querySelector('iframe.youtube-lesson-frame');
    if (existing?.dataset.youtubeVideoId === videoId) return;

    shell.classList.remove('drive-video-active', 'drive-frame-ready', 'native-video-active');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const frame = document.createElement('iframe');
    frame.className = 'lesson-frame youtube-lesson-frame';
    frame.dataset.youtubeVideoId = videoId;
    frame.dataset.youtubePlaylistIndex = String(context.index);
    frame.src = directEmbed(videoId);
    frame.title = context.lesson.title || 'Video de la lección';
    frame.loading = 'eager';
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; fullscreen');
    frame.setAttribute('allowfullscreen', '');
    shell.appendChild(frame);
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (ytPromise) return ytPromise;

    ytPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      let timeout;
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

      timeout = setTimeout(() => {
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('youtube-api-timeout'));
      }, 12000);
    });
    return ytPromise;
  }

  async function resolvePlaylist() {
    if (playlistIds.length >= 14 || resolving) return;
    resolving = true;

    try {
      await loadYouTubeApi();
      const host = document.createElement('div');
      host.className = 'youtube-resolver-host';
      const iframe = document.createElement('iframe');
      iframe.id = `ag-youtube-resolver-${Date.now()}`;
      iframe.src = `https://www.youtube-nocookie.com/embed?enablejsapi=1&origin=${encodeURIComponent(location.origin)}&listType=playlist&list=${PLAYLIST_ID}&playsinline=1&controls=0`;
      iframe.setAttribute('allow', 'encrypted-media');
      host.appendChild(iframe);
      document.body.appendChild(host);

      let settled = false;
      let player;
      const finish = ids => {
        if (settled) return;
        settled = true;
        if (Array.isArray(ids) && ids.length >= 14) playlistIds = ids.slice();
        try { player?.destroy?.(); } catch (_) {}
        host.remove();
        if (playlistIds.length >= 14) {
          patchState();
          renderActiveLesson();
        }
      };

      player = new window.YT.Player(iframe, {
        events: {
          onReady(event) {
            try {
              event.target.cuePlaylist({ listType:'playlist', list:PLAYLIST_ID, index:0, startSeconds:0 });
            } catch (_) {}

            let checks = 0;
            const check = () => {
              checks++;
              let ids = [];
              try { ids = event.target.getPlaylist?.() || []; } catch (_) {}
              if (ids.length >= 14) return finish(ids);
              if (checks < 32) return setTimeout(check, 250);
              finish([]);
            };
            setTimeout(check, 150);
          },
          onError() { finish([]); }
        }
      });

      setTimeout(() => finish([]), 10000);
    } catch (error) {
      console.warn('YouTube playlist resolver:', error?.message || error);
    } finally {
      resolving = false;
    }
  }

  function apply() {
    addStyles();
    patchState();
    renderActiveLesson();
    if (playlistIds.length < 14) resolvePlaylist();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 55);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('orientationchange', schedule, { passive:true });

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['src','class']
  });

  const interval = setInterval(apply, 800);
  setTimeout(() => clearInterval(interval), 120000);

  window.ACADEMIA_AG_YOUTUBE_UTAH = {
    release: RELEASE,
    playlistId: PLAYLIST_ID,
    playlistLabels: PLAYLIST_LABELS.slice(),
    getPlaylistIds: () => playlistIds.slice(),
    apply
  };

  schedule();
})();
