(() => {
  'use strict';

  const RELEASE = '20260819.23';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';
  const SEED_VIDEO_ID = 'aiIsKF3sCo8';
  const CACHE_KEY = `academia-ag:youtube:${PLAYLIST_ID}:index-map:v23`;
  const MODULES = {
    2: { start: 1, max: 14 },
    3: { start: 15, max: 19 },
    4: { start: 34, max: 21 },
    5: { start: 55, max: 22 },
    6: { start: 77, max: 21 },
    7: { start: 98, max: 25 }
  };

  let ytApiPromise = null;
  let player = null;
  let timer = null;
  let mountingKey = '';
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
    let style = document.querySelector('#ag-youtube-only-v23-style');
    if (!style) {
      style = document.createElement('style');
      style.id = 'ag-youtube-only-v23-style';
      document.head.appendChild(style);
    }
    style.textContent = `
      .video-shell.ag-youtube-only-v23{position:relative!important;display:block!important;width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:16/9!important;padding:0!important;overflow:hidden!important;border-radius:22px!important;background:#05080d!important;border:1px solid rgba(120,199,166,.20)!important}
      .video-shell.ag-youtube-only-v23::before,.video-shell.ag-youtube-only-v23::after{display:none!important;content:none!important}
      .video-shell.ag-youtube-only-v23>img,.video-shell.ag-youtube-only-v23>.video-center,.video-shell.ag-youtube-only-v23>.video-bar,.video-shell.ag-youtube-only-v23>video,.video-shell.ag-youtube-only-v23>.lesson-native-video,.video-shell.ag-youtube-only-v23>.lesson-video-fallback,.video-shell.ag-youtube-only-v23>.drive-popout-shield,.video-shell.ag-youtube-only-v23>.drive-player-loading{display:none!important}
      .video-shell.ag-youtube-only-v23 iframe,.video-shell.ag-youtube-only-v23 .ag-youtube-v23-holder{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;min-width:100%!important;min-height:100%!important;border:0!important;z-index:70!important;border-radius:inherit!important;background:#05080d!important}
      .ag-youtube-v23-loading,.ag-youtube-v23-error,.youtube-lesson-ended{position:absolute!important;inset:0!important;z-index:90!important;display:flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;gap:10px!important;padding:28px!important;text-align:center!important;background:linear-gradient(145deg,#07141a,#05080d)!important;color:#d7e2df!important}
      .ag-youtube-v23-loading::before{content:'';width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.14);border-top-color:#78c7a6;animation:agYtV23Spin .8s linear infinite}
      .ag-youtube-v23-loading strong,.ag-youtube-v23-error strong,.youtube-lesson-ended strong{font-size:1rem;color:#fff}
      .ag-youtube-v23-loading span,.ag-youtube-v23-error span,.youtube-lesson-ended span{max-width:520px;font-size:.78rem;line-height:1.55;color:#a8bbb5}
      .youtube-lesson-ended button{min-height:44px;padding:0 18px;border:1px solid rgba(120,199,166,.28);border-radius:13px;background:#0d5b43;color:#fff;font-weight:700;cursor:pointer}
      .ag-youtube-v23-resolver{position:fixed!important;left:-10000px!important;top:-10000px!important;width:4px!important;height:4px!important;opacity:.001!important;pointer-events:none!important;overflow:hidden!important}
      @keyframes agYtV23Spin{to{transform:rotate(360deg)}}
      @media(max-width:720px){.video-shell.ag-youtube-only-v23{border-radius:18px!important}}
    `;
  }

  function currentRoute() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    return { lessonId: parts[2] };
  }

  function course() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function context() {
    const route = currentRoute();
    const current = course();
    if (!route || !current?.modules?.length) return null;

    for (let moduleIndex = 0; moduleIndex < current.modules.length; moduleIndex += 1) {
      const module = current.modules[moduleIndex];
      const lessons = module.lessons || [];
      const lessonIndex = lessons.findIndex(item => item.id === route.lessonId);
      if (lessonIndex < 0) continue;
      const lesson = lessons[lessonIndex];
      const modulePosition = Number(module.position) || moduleIndex + 1;
      const lessonPosition = Number(lesson.position) || lessonIndex + 1;
      let playlistIndex = -1;
      if (modulePosition === 1) playlistIndex = 0;
      else if (modulePosition === 8) playlistIndex = 123;
      else {
        const config = MODULES[modulePosition];
        if (config && lessonPosition >= 1 && lessonPosition <= config.max) {
          playlistIndex = config.start + lessonPosition - 1;
        }
      }
      return { module, lesson, modulePosition, lessonPosition, playlistIndex };
    }
    return null;
  }

  function scrubState() {
    const current = course();
    if (!current?.modules?.length) return;
    for (const module of current.modules) {
      for (const lesson of module.lessons || []) {
        lesson.video_url = '';
        lesson.video_provider = 'youtube';
      }
    }
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

  async function resolveVideoId(playlistIndex) {
    const key = String(playlistIndex);
    if (indexMap[key]) return indexMap[key];
    if (resolving.has(key)) return resolving.get(key);

    const promise = (async () => {
      await loadYouTubeApi();
      return new Promise((resolve, reject) => {
        const host = document.createElement('div');
        host.className = 'ag-youtube-v23-resolver';
        const target = document.createElement('div');
        target.id = `ag-youtube-v23-resolver-${playlistIndex}-${Date.now()}`;
        host.appendChild(target);
        document.body.appendChild(host);

        let resolver = null;
        let finished = false;
        let checks = 0;
        const finish = (videoId, error) => {
          if (finished) return;
          finished = true;
          try { resolver?.destroy?.(); } catch (_) {}
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
          let list = [];
          let data = {};
          let currentIndex = -1;
          try { list = resolver?.getPlaylist?.() || []; } catch (_) {}
          try { data = resolver?.getVideoData?.() || {}; } catch (_) {}
          try { currentIndex = Number(resolver?.getPlaylistIndex?.()); } catch (_) {}
          if (Array.isArray(list) && list[playlistIndex]) return finish(String(list[playlistIndex]));
          const id = String(data.video_id || '').trim();
          if (id && currentIndex === playlistIndex) return finish(id);
          if (checks >= 60) return finish('', new Error(`playlist-index-timeout-${playlistIndex}`));
          setTimeout(poll, 200);
        };
        resolver = new window.YT.Player(target.id, {
          width: '4',
          height: '4',
          videoId: SEED_VIDEO_ID,
          playerVars: { listType: 'playlist', list: PLAYLIST_ID, index: playlistIndex, controls: 0, disablekb: 1, playsinline: 1, origin: location.origin },
          events: {
            onReady(event) {
              try { event.target.cuePlaylist({ listType: 'playlist', list: PLAYLIST_ID, index: playlistIndex, startSeconds: 0 }); }
              catch (error) { finish('', error); return; }
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

  function clearLegacy(shell, ctx) {
    if (!shell) return;
    shell.classList.remove('drive-video-active','drive-frame-ready','native-video-active','ag-video-migrating','ag-video-pending','youtube-video-active');
    shell.classList.add('ag-youtube-only-v23');

    const sameLesson = shell.dataset.agYoutubeLesson === ctx.lesson.id;
    if (!sameLesson) {
      try { player?.destroy?.(); } catch (_) {}
      player = null;
      mountingKey = '';
      delete shell.dataset.agYoutubeLesson;
      delete shell.dataset.agYoutubeVideo;
    }

    shell.querySelectorAll('video,.lesson-native-video,.lesson-video-fallback,.drive-video-open,.drive-popout-shield,.drive-player-loading,.video-center,.video-bar,img').forEach(node => node.remove());
    shell.querySelectorAll('iframe').forEach(frame => {
      const src = String(frame.getAttribute('src') || '');
      if (!/youtube(?:-nocookie)?\.com/i.test(src) || !sameLesson) frame.remove();
    });
  }

  function showLoading(shell, ctx) {
    clearLegacy(shell, ctx);
    if (shell.querySelector('.ag-youtube-v23-loading')) return;
    shell.querySelectorAll(':scope > .ag-youtube-v23-error,:scope > .youtube-lesson-ended').forEach(node => node.remove());
    const box = document.createElement('div');
    box.className = 'ag-youtube-v23-loading';
    box.innerHTML = `<strong>Cargando video de YouTube…</strong><span>Preparando la lección ${ctx.lessonPosition} del módulo ${ctx.modulePosition}.</span>`;
    shell.appendChild(box);
  }

  function showError(shell, ctx, message) {
    clearLegacy(shell, ctx);
    shell.querySelectorAll(':scope > .ag-youtube-v23-loading,:scope > .ag-youtube-v23-error').forEach(node => node.remove());
    const box = document.createElement('div');
    box.className = 'ag-youtube-v23-error';
    box.innerHTML = `<strong>No pudimos cargar este video.</strong><span>${message}</span>`;
    shell.appendChild(box);
  }

  function showEnded(shell) {
    shell.querySelector(':scope > .youtube-lesson-ended')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'youtube-lesson-ended';
    overlay.innerHTML = '<strong>Video finalizado</strong><span>Tu avance se está guardando. Ya puedes continuar con el siguiente tema.</span><button type="button">Repetir video</button>';
    overlay.querySelector('button')?.addEventListener('click', () => {
      overlay.remove();
      try { player?.seekTo?.(0, true); player?.playVideo?.(); } catch (_) {}
    });
    shell.appendChild(overlay);
  }

  function hasMountedYouTube(shell, ctx, videoId) {
    const frame = shell.querySelector('iframe');
    return shell.dataset.agYoutubeLesson === ctx.lesson.id
      && shell.dataset.agYoutubeVideo === videoId
      && Boolean(frame && /youtube(?:-nocookie)?\.com/i.test(String(frame.src || '')));
  }

  async function mountVideo(shell, ctx, videoId) {
    const key = `${ctx.lesson.id}:${videoId}`;
    if (hasMountedYouTube(shell, ctx, videoId)) return;
    if (mountingKey === key && shell.querySelector('.ag-youtube-v23-holder,iframe')) return;

    try { player?.destroy?.(); } catch (_) {}
    player = null;
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());
    shell.classList.add('ag-youtube-only-v23');
    shell.dataset.agYoutubeLesson = ctx.lesson.id;
    shell.dataset.agYoutubeVideo = videoId;
    mountingKey = key;

    const holder = document.createElement('div');
    holder.className = 'ag-youtube-v23-holder';
    holder.id = `ag-youtube-v23-${String(ctx.lesson.id).replace(/[^a-z0-9_-]/gi,'')}`;
    shell.appendChild(holder);

    await loadYouTubeApi();
    if (!holder.isConnected || currentRoute()?.lessonId !== ctx.lesson.id) return;

    player = new window.YT.Player(holder.id, {
      host: 'https://www.youtube-nocookie.com',
      videoId,
      playerVars: { rel: 0, playsinline: 1, controls: 1, fs: 1, iv_load_policy: 3, origin: location.origin },
      events: {
        onReady() {
          mountingKey = '';
          const frame = shell.querySelector('iframe');
          if (frame) frame.setAttribute('data-ag-youtube-only-v23','true');
        },
        onStateChange(event) {
          if (event.data === window.YT.PlayerState.ENDED) showEnded(shell);
        },
        onError(event) {
          mountingKey = '';
          showError(shell, ctx, `YouTube devolvió el código ${event.data}.`);
        }
      }
    });
  }

  async function apply() {
    addStyles();
    scrubState();
    const ctx = context();
    if (!ctx) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;
    clearLegacy(shell, ctx);

    const cachedId = indexMap[String(ctx.playlistIndex)];
    if (cachedId && hasMountedYouTube(shell, ctx, cachedId)) return;
    const currentKey = cachedId ? `${ctx.lesson.id}:${cachedId}` : '';
    if (currentKey && mountingKey === currentKey && shell.querySelector('.ag-youtube-v23-holder,iframe')) return;

    if (ctx.playlistIndex < 0) {
      showError(shell, ctx, 'No pudimos identificar la posición de esta lección en la playlist.');
      return;
    }

    showLoading(shell, ctx);
    let videoId;
    try { videoId = await resolveVideoId(ctx.playlistIndex); }
    catch (error) {
      if (currentRoute()?.lessonId === ctx.lesson.id) showError(shell, ctx, `No se pudo resolver la posición ${ctx.playlistIndex + 1} de la playlist.`);
      return;
    }
    if (currentRoute()?.lessonId !== ctx.lesson.id) return;
    shell.querySelector(':scope > .ag-youtube-v23-loading')?.remove();
    await mountVideo(shell, ctx, videoId);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => apply().catch(error => console.warn('YouTube Utah v23:', error)), 80);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  const interval = setInterval(schedule, 1500);
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
