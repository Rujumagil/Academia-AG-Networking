(() => {
  'use strict';

  const RELEASE = '20260819.19';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';
  const SEED_VIDEO_ID = 'aiIsKF3sCo8';
  const CACHE_KEY = `academia-ag:youtube:${PLAYLIST_ID}:exclusive-index-map:v1`;

  // Índices absolutos dentro de la playlist (base 0).
  // 0 = Bienvenida.
  // C1: 13 videos + promo; C2: 18 + promo; C3: 20 + promo;
  // C4: 21 + promo; C5: 20 + promo; C6: 25; cierre = 123.
  const MODULES = {
    2: { start: 1, max: 14 },
    3: { start: 15, max: 19 },
    4: { start: 34, max: 21 },
    5: { start: 55, max: 22 },
    6: { start: 77, max: 21 },
    7: { start: 98, max: 25 }
  };

  let ytApiPromise = null;
  let visiblePlayer = null;
  let activeLessonId = '';
  let activeVideoId = '';
  let timer = null;
  const resolving = new Map();

  function readCache() {
    try {
      const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null');
      return parsed?.playlistId === PLAYLIST_ID && parsed?.map ? parsed.map : {};
    } catch (_) {
      return {};
    }
  }

  let indexMap = readCache();

  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        playlistId: PLAYLIST_ID,
        release: RELEASE,
        savedAt: Date.now(),
        map: indexMap
      }));
    } catch (_) {}
  }

  function addStyles() {
    if (document.querySelector('#ag-youtube-exclusive-styles')) return;
    const style = document.createElement('style');
    style.id = 'ag-youtube-exclusive-styles';
    style.textContent = `
      .video-shell.ag-youtube-exclusive{
        position:relative!important;display:block!important;width:100%!important;height:auto!important;
        min-height:0!important;max-height:none!important;aspect-ratio:16/9!important;padding:0!important;
        overflow:hidden!important;border-radius:22px!important;background:#05080d!important;
        border:1px solid rgba(120,199,166,.20)!important;
      }
      .video-shell.ag-youtube-exclusive::before,.video-shell.ag-youtube-exclusive::after{display:none!important;content:none!important}
      .video-shell.ag-youtube-exclusive>.video-center,
      .video-shell.ag-youtube-exclusive>.video-bar,
      .video-shell.ag-youtube-exclusive>.lesson-video-fallback,
      .video-shell.ag-youtube-exclusive>video,
      .video-shell.ag-youtube-exclusive>.lesson-native-video,
      .video-shell.ag-youtube-exclusive>.drive-popout-shield,
      .video-shell.ag-youtube-exclusive>.drive-player-loading{display:none!important}
      .video-shell.ag-youtube-exclusive iframe.ag-youtube-frame,
      .video-shell.ag-youtube-exclusive .ag-youtube-holder{
        position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
        min-width:100%!important;min-height:100%!important;border:0!important;z-index:70!important;
        border-radius:inherit!important;background:#05080d!important;
      }
      .ag-youtube-exclusive-loading,.ag-youtube-exclusive-error,.youtube-lesson-ended{
        position:absolute!important;inset:0!important;z-index:90!important;display:flex!important;flex-direction:column!important;
        align-items:center!important;justify-content:center!important;gap:10px!important;padding:28px!important;text-align:center!important;
        background:linear-gradient(145deg,#07141a,#05080d)!important;color:#d7e2df!important;
      }
      .ag-youtube-exclusive-loading::before{
        content:'';width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.14);
        border-top-color:#78c7a6;animation:agYtExclusiveSpin .8s linear infinite;
      }
      .ag-youtube-exclusive-loading strong,.ag-youtube-exclusive-error strong,.youtube-lesson-ended strong{color:#fff;font-size:1rem}
      .ag-youtube-exclusive-loading span,.ag-youtube-exclusive-error span,.youtube-lesson-ended span{color:#a8bbb5;font-size:.78rem;line-height:1.5}
      .youtube-lesson-ended button{min-height:44px;padding:0 18px;border:1px solid rgba(120,199,166,.28);border-radius:13px;background:#0d5b43;color:#fff;font-weight:700;cursor:pointer}
      .ag-youtube-resolver{position:fixed!important;left:-10000px!important;top:-10000px!important;width:4px!important;height:4px!important;opacity:.001!important;pointer-events:none!important;overflow:hidden!important}
      @keyframes agYtExclusiveSpin{to{transform:rotate(360deg)}}
      @media(max-width:720px){.video-shell.ag-youtube-exclusive{border-radius:18px!important}}
    `;
    document.head.appendChild(style);
  }

  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    return { courseId: parts[1], lessonId: parts[2] };
  }

  function course() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function context() {
    const currentRoute = route();
    const currentCourse = course();
    if (!currentRoute || !currentCourse) return null;

    for (let moduleArrayIndex = 0; moduleArrayIndex < (currentCourse.modules || []).length; moduleArrayIndex += 1) {
      const module = currentCourse.modules[moduleArrayIndex];
      const lessons = module.lessons || [];
      const lessonArrayIndex = lessons.findIndex(item => item.id === currentRoute.lessonId);
      if (lessonArrayIndex < 0) continue;

      const lesson = lessons[lessonArrayIndex];
      const modulePosition = Number(module.position) || (moduleArrayIndex + 1);
      const lessonPosition = Number(lesson.position) || (lessonArrayIndex + 1);
      const playlistIndex = calculatePlaylistIndex(modulePosition, lessonPosition);
      return { module, lesson, modulePosition, lessonPosition, playlistIndex };
    }
    return null;
  }

  function calculatePlaylistIndex(modulePosition, lessonPosition) {
    if (modulePosition === 1) return 0;
    if (modulePosition === 8) return 123;
    const config = MODULES[modulePosition];
    if (!config || lessonPosition < 1 || lessonPosition > config.max) return -1;
    return config.start + lessonPosition - 1;
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (ytApiPromise) return ytApiPromise;

    ytApiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = setTimeout(() => {
        if (window.YT?.Player) resolve(window.YT);
        else reject(new Error('youtube-api-timeout'));
      }, 15000);

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

  function cleanLegacyPlayer(shell) {
    if (!shell) return;
    shell.classList.remove('drive-video-active','drive-frame-ready','native-video-active','ag-video-migrating','ag-video-pending','youtube-video-active');
    shell.classList.add('ag-youtube-exclusive');

    shell.querySelectorAll('video,.lesson-native-video,.lesson-video-fallback,.drive-popout-shield,.drive-player-loading').forEach(node => node.remove());
    shell.querySelectorAll('iframe').forEach(frame => {
      const src = String(frame.getAttribute('src') || '');
      if (!/youtube(?:-nocookie)?\.com/i.test(src) || !frame.classList.contains('ag-youtube-frame')) frame.remove();
    });
  }

  function showLoading(shell, ctx) {
    cleanLegacyPlayer(shell);
    if (shell.querySelector('.ag-youtube-exclusive-loading')) return;
    shell.querySelectorAll(':scope > .ag-youtube-exclusive-error,:scope > .youtube-lesson-ended').forEach(node => node.remove());
    const box = document.createElement('div');
    box.className = 'ag-youtube-exclusive-loading';
    box.innerHTML = `<strong>Cargando video de YouTube…</strong><span>Preparando la lección ${ctx.lessonPosition} del módulo ${ctx.modulePosition}.</span>`;
    shell.appendChild(box);
  }

  function showError(shell, message) {
    cleanLegacyPlayer(shell);
    shell.querySelectorAll(':scope > .ag-youtube-exclusive-loading,:scope > .ag-youtube-exclusive-error').forEach(node => node.remove());
    const box = document.createElement('div');
    box.className = 'ag-youtube-exclusive-error';
    box.innerHTML = `<strong>No pudimos cargar este video.</strong><span>${message}</span>`;
    shell.appendChild(box);
  }

  async function resolveVideoId(playlistIndex) {
    const key = String(playlistIndex);
    if (indexMap[key]) return indexMap[key];
    if (resolving.has(key)) return resolving.get(key);

    const promise = (async () => {
      await loadYouTubeApi();
      return new Promise((resolve, reject) => {
        const host = document.createElement('div');
        host.className = 'ag-youtube-resolver';
        const target = document.createElement('div');
        target.id = `ag-yt-resolver-${playlistIndex}-${Date.now()}`;
        host.appendChild(target);
        document.body.appendChild(host);

        let player = null;
        let finished = false;
        let checks = 0;

        const finish = (videoId, error) => {
          if (finished) return;
          finished = true;
          try { player?.destroy?.(); } catch (_) {}
          host.remove();
          if (videoId) {
            indexMap[key] = videoId;
            saveCache();
            resolve(videoId);
          } else reject(error || new Error('video-id-not-resolved'));
        };

        const poll = () => {
          if (finished) return;
          checks += 1;
          let playlist = [];
          let data = {};
          let currentIndex = -1;
          try { playlist = player?.getPlaylist?.() || []; } catch (_) {}
          try { data = player?.getVideoData?.() || {}; } catch (_) {}
          try { currentIndex = Number(player?.getPlaylistIndex?.()); } catch (_) {}

          if (Array.isArray(playlist) && playlist[playlistIndex]) return finish(String(playlist[playlistIndex]));
          const id = String(data.video_id || '').trim();
          if (id && currentIndex === playlistIndex) return finish(id);

          if (checks >= 60) return finish('', new Error(`playlist-index-timeout-${playlistIndex}`));
          setTimeout(poll, 200);
        };

        player = new window.YT.Player(target.id, {
          width: '4',
          height: '4',
          videoId: SEED_VIDEO_ID,
          playerVars: {
            listType: 'playlist',
            list: PLAYLIST_ID,
            index: playlistIndex,
            controls: 0,
            disablekb: 1,
            playsinline: 1,
            origin: location.origin
          },
          events: {
            onReady(event) {
              try {
                event.target.cuePlaylist({ listType: 'playlist', list: PLAYLIST_ID, index: playlistIndex, startSeconds: 0 });
              } catch (error) {
                finish('', error);
                return;
              }
              setTimeout(poll, 250);
            },
            onError(event) { finish('', new Error(`youtube-playlist-error-${event.data}`)); }
          }
        });

        setTimeout(() => finish('', new Error(`playlist-hard-timeout-${playlistIndex}`)), 15000);
      });
    })().finally(() => resolving.delete(key));

    resolving.set(key, promise);
    return promise;
  }

  function resetVisible(shell) {
    try { visiblePlayer?.destroy?.(); } catch (_) {}
    visiblePlayer = null;
    activeLessonId = '';
    activeVideoId = '';
    if (shell) {
      delete shell.dataset.agYoutubeLesson;
      delete shell.dataset.agYoutubeVideo;
      shell.querySelectorAll('iframe.ag-youtube-frame,.ag-youtube-holder,.youtube-lesson-ended').forEach(node => node.remove());
    }
  }

  function showEnded(shell) {
    shell.querySelector(':scope > .youtube-lesson-ended')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'youtube-lesson-ended';
    overlay.innerHTML = '<strong>Video finalizado</strong><span>Tu avance se está guardando. Continúa con la siguiente lección.</span><button type="button">Repetir video</button>';
    overlay.querySelector('button')?.addEventListener('click', () => {
      overlay.remove();
      try { visiblePlayer?.seekTo?.(0, true); visiblePlayer?.playVideo?.(); } catch (_) {}
    });
    shell.appendChild(overlay);
  }

  async function mountVideo(shell, ctx, videoId) {
    const alreadyMounted = shell.dataset.agYoutubeLesson === ctx.lesson.id
      && shell.dataset.agYoutubeVideo === videoId
      && Boolean(shell.querySelector('iframe.ag-youtube-frame'));
    if (alreadyMounted) return;

    resetVisible(shell);
    cleanLegacyPlayer(shell);
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const holder = document.createElement('div');
    holder.id = `ag-yt-exclusive-${String(ctx.lesson.id).replace(/[^a-z0-9_-]/gi,'')}`;
    holder.className = 'ag-youtube-holder';
    shell.appendChild(holder);

    activeLessonId = ctx.lesson.id;
    activeVideoId = videoId;
    shell.dataset.agYoutubeLesson = ctx.lesson.id;
    shell.dataset.agYoutubeVideo = videoId;

    await loadYouTubeApi();
    if (!holder.isConnected || route()?.lessonId !== ctx.lesson.id) return;

    visiblePlayer = new window.YT.Player(holder.id, {
      host: 'https://www.youtube-nocookie.com',
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
          if (activeLessonId !== ctx.lesson.id || activeVideoId !== videoId) return;
          const frame = shell.querySelector('iframe');
          if (frame) {
            frame.classList.add('ag-youtube-frame');
            frame.setAttribute('data-ag-youtube-exclusive','true');
          }
        },
        onStateChange(event) {
          if (activeLessonId !== ctx.lesson.id || activeVideoId !== videoId) return;
          if (event.data === window.YT.PlayerState.ENDED) showEnded(shell);
        },
        onError(event) {
          showError(shell, `YouTube devolvió el código ${event.data}.`);
        }
      }
    });
  }

  async function apply() {
    addStyles();
    const currentRoute = route();
    if (!currentRoute) return;

    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    cleanLegacyPlayer(shell);

    const ctx = context();
    if (!ctx || ctx.playlistIndex < 0) {
      showError(shell, 'No pudimos identificar la posición de esta lección dentro del curso.');
      return;
    }

    const cachedVideoId = indexMap[String(ctx.playlistIndex)];
    if (cachedVideoId && shell.dataset.agYoutubeLesson === ctx.lesson.id && shell.dataset.agYoutubeVideo === cachedVideoId && shell.querySelector('iframe.ag-youtube-frame')) return;

    showLoading(shell, ctx);

    let videoId;
    try {
      videoId = await resolveVideoId(ctx.playlistIndex);
    } catch (error) {
      if (route()?.lessonId === ctx.lesson.id) showError(shell, `No se pudo resolver la posición ${ctx.playlistIndex + 1} de la playlist.`);
      return;
    }

    if (route()?.lessonId !== ctx.lesson.id) return;
    await mountVideo(shell, ctx, videoId);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => apply().catch(error => console.warn('AG YouTube exclusive:', error)), 50);
  }

  window.addEventListener('hashchange', () => {
    resetVisible(document.querySelector('.lesson-layout .video-shell'));
    schedule();
  });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList:true, subtree:true });

  const interval = setInterval(schedule, 1200);
  setTimeout(() => clearInterval(interval), 180000);

  window.ACADEMIA_AG_YOUTUBE_UTAH = {
    release: RELEASE,
    playlistId: PLAYLIST_ID,
    apply,
    refresh() {
      indexMap = {};
      saveCache();
      schedule();
    }
  };

  schedule();
})();
