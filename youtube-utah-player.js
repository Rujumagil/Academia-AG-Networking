(() => {
  'use strict';

  const RELEASE = '20260819.14';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const PLAYLIST_ID = 'PLNjZZNlnN-Kc';
  const CACHE_KEY = `academia-ag:youtube:${PLAYLIST_ID}:title-map:v3`;

  const WELCOME_MODULE_ID = '11111111-0000-4111-8111-000000000001';
  const CLOSING_MODULE_ID = '11111111-0000-4111-8111-000000000008';

  const MODULE_CONFIG = new Map([
    ['11111111-aaaa-4111-8111-111111111111', { prefix: 'C1', core: 13, promo: 14 }],
    ['11111111-bbbb-4111-8111-111111111111', { prefix: 'C2', core: 18, promo: 19 }],
    ['11111111-cccc-4111-8111-111111111111', { prefix: 'C3', core: 20, promo: 21 }],
    ['11111111-dddd-4111-8111-111111111111', { prefix: 'C4', core: 21, promo: 22 }],
    ['11111111-eeee-4111-8111-111111111111', { prefix: 'C5', core: 20, promo: 21 }],
    ['11111111-ffff-4111-8111-111111111111', { prefix: 'C6', core: 25, promo: null }]
  ]);

  const EXPECTED_CODES = (() => {
    const codes = ['00'];
    for (const config of MODULE_CONFIG.values()) {
      for (let position = 1; position <= config.core; position += 1) {
        codes.push(`${config.prefix} ${String(position).padStart(2, '0')}`);
      }
      if (config.promo) codes.push(`${config.prefix} PROMO`);
    }
    codes.push('CIERRE ANGELICA');
    return new Set(codes);
  })();

  let videoMap = readCache();
  let ytApiPromise = null;
  let scanPromise = null;
  let visiblePlayer = null;
  let activeKey = '';
  let timer = null;

  function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  function saveCache() {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        playlistId: PLAYLIST_ID,
        map: videoMap,
        savedAt: Date.now()
      }));
      localStorage.removeItem(`academia-ag:youtube:${PLAYLIST_ID}:title-map:v2`);
      localStorage.removeItem(`academia-ag:youtube:${PLAYLIST_ID}:videos:v1`);
    } catch (_) {}
  }

  function extractCodeFromYoutubeTitle(title = '') {
    const raw = String(title || '').trim();
    const normalized = raw
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toUpperCase();

    if (/^\s*00\b/.test(normalized) && /BIENVENIDA/.test(normalized)) return '00';
    if (/CIERRE\s+ANGELICA/.test(normalized)) return 'CIERRE ANGELICA';

    const promo = normalized.match(/\bC\s*([1-6])\s*[-_. ]*PROMO\b/);
    if (promo) {
      const code = `C${Number(promo[1])} PROMO`;
      return EXPECTED_CODES.has(code) ? code : null;
    }

    const lesson = normalized.match(/\bC\s*([1-6])\s*[-_. ]*0*([1-9]|1\d|2[0-5])\b/);
    if (!lesson) return null;
    const code = `C${Number(lesson[1])} ${String(Number(lesson[2])).padStart(2, '0')}`;
    return EXPECTED_CODES.has(code) ? code : null;
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
      .youtube-single-holder,.video-shell.youtube-video-active iframe{
        position:absolute!important;inset:0!important;width:100%!important;height:100%!important;
        min-width:100%!important;min-height:100%!important;border:0!important;z-index:60!important;
        border-radius:inherit!important;background:#05080d!important;
      }
      .youtube-player-loading,.youtube-player-error,.youtube-lesson-ended{
        position:absolute!important;inset:0!important;z-index:80!important;display:flex!important;flex-direction:column!important;
        align-items:center!important;justify-content:center!important;gap:11px!important;padding:28px!important;text-align:center!important;
        background:linear-gradient(145deg,rgba(7,20,26,.97),rgba(5,8,13,.98))!important;color:#d7e2df!important;
      }
      .youtube-player-loading::before{
        content:'';width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.14);
        border-top-color:#78c7a6;animation:agYouTubeSpin .8s linear infinite;
      }
      .youtube-player-loading strong,.youtube-player-error strong,.youtube-lesson-ended strong{font-size:1rem;color:#fff}
      .youtube-player-loading span,.youtube-player-error span,.youtube-lesson-ended span{
        max-width:480px;font-size:.78rem;line-height:1.55;color:#a8bbb5
      }
      .youtube-lesson-ended button{
        min-height:44px;padding:0 18px;border:1px solid rgba(120,199,166,.28);border-radius:13px;
        background:#0d5b43;color:#fff;font:700 .82rem/1 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer
      }
      .youtube-lesson-ended button:hover{background:#0f6b4e}
      .youtube-resolver-host{
        position:fixed!important;left:-10000px!important;top:-10000px!important;width:2px!important;height:2px!important;
        opacity:.001!important;overflow:hidden!important;pointer-events:none!important
      }
      @keyframes agYouTubeSpin{to{transform:rotate(360deg)}}
      @media(max-width:720px){
        .video-shell.youtube-video-active{border-radius:18px!important;box-shadow:0 14px 32px rgba(0,0,0,.18)!important}
        .youtube-player-loading,.youtube-player-error,.youtube-lesson-ended{padding:22px!important}
      }
      @media(max-width:420px){.video-shell.youtube-video-active{border-radius:16px!important}}
    `;
  }

  function course() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function lessonCode(module, lesson) {
    if (!module || !lesson) return null;

    if (module.id === WELCOME_MODULE_ID) return '00';
    if (module.id === CLOSING_MODULE_ID) return 'CIERRE ANGELICA';

    const config = MODULE_CONFIG.get(module.id);
    if (!config) return null;

    const position = Number(lesson.position);
    if (Number.isInteger(position) && position >= 1 && position <= config.core) {
      return `${config.prefix} ${String(position).padStart(2, '0')}`;
    }
    if (config.promo && position === config.promo) return `${config.prefix} PROMO`;
    return null;
  }

  function patchPresentationTitles() {
    const current = course();
    if (!current?.modules?.length) return;

    for (const module of current.modules) {
      const config = MODULE_CONFIG.get(module.id);
      if (config?.promo) {
        const promo = (module.lessons || []).find(lesson => Number(lesson.position) === config.promo);
        if (promo && /^(extra|contenido especial)/i.test(String(promo.title || ''))) {
          promo.title = 'Contenido especial del módulo';
        }
      }
      if (module.id === CLOSING_MODULE_ID) {
        const closing = (module.lessons || [])[0];
        if (closing) closing.title = 'Mensaje final de Angélica Gallardo';
      }
    }
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
      let lastLength = -1;
      let stableRounds = 0;

      const finish = (ids, error) => {
        if (finished) return;
        finished = true;
        try { player?.destroy?.(); } catch (_) {}
        host.remove();
        if (Array.isArray(ids) && ids.length) resolve(ids);
        else reject(error || new Error('playlist-empty'));
      };

      const poll = event => {
        checks += 1;
        let ids = [];
        try { ids = event.target.getPlaylist?.() || []; } catch (_) {}

        if (ids.length > 0) {
          if (ids.length === lastLength) stableRounds += 1;
          else stableRounds = 0;
          lastLength = ids.length;

          if (stableRounds >= 4 || ids.length >= EXPECTED_CODES.size) return finish(ids);
        }

        if (checks >= 60) return finish(ids, new Error('playlist-timeout'));
        setTimeout(() => poll(event), 350);
      };

      player = new window.YT.Player(target.id, {
        width: '2',
        height: '2',
        playerVars: {
          listType: 'playlist',
          list: PLAYLIST_ID,
          controls: 0,
          disablekb: 1,
          playsinline: 1
        },
        events: {
          onReady(event) {
            try { event.target.cuePlaylist({ listType: 'playlist', list: PLAYLIST_ID, index: 0 }); } catch (_) {}
            setTimeout(() => poll(event), 250);
          },
          onError(event) {
            finish([], new Error(`playlist-error-${event.data}`));
          }
        }
      });

      setTimeout(() => finish([], new Error('playlist-hard-timeout')), 25000);
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
        if (tries >= 35) return resolve(String(data.title || ''));
        setTimeout(check, 160);
      };

      setTimeout(check, 160);
    });
  }

  async function scanPlaylistByTitle() {
    if (scanPromise) return scanPromise;

    scanPromise = (async () => {
      const ids = await getPlaylistIds();
      await loadYouTubeApi();

      await new Promise((resolve, reject) => {
        const host = document.createElement('div');
        host.className = 'youtube-resolver-host';
        const target = document.createElement('div');
        target.id = `ag-title-resolver-${Date.now()}`;
        host.appendChild(target);
        document.body.appendChild(host);

        let player = null;
        let settled = false;

        const cleanup = () => {
          if (settled) return;
          settled = true;
          try { player?.destroy?.(); } catch (_) {}
          host.remove();
        };

        player = new window.YT.Player(target.id, {
          width: '2',
          height: '2',
          videoId: ids[0],
          playerVars: { controls: 0, disablekb: 1, playsinline: 1 },
          events: {
            async onReady(event) {
              try {
                for (const id of ids) {
                  const title = await titleForVideo(event.target, id);
                  const code = extractCodeFromYoutubeTitle(title);
                  if (code && !videoMap[code]) {
                    videoMap[code] = id;
                    saveCache();
                    patchStateWithVideos();
                  }
                }
                cleanup();
                resolve(videoMap);
              } catch (error) {
                cleanup();
                reject(error);
              }
            },
            onError() {
              /* Un video que no permita cue no detiene el escaneo de los demás. */
            }
          }
        });

        setTimeout(() => {
          if (settled) return;
          cleanup();
          resolve(videoMap);
        }, 180000);
      });

      return videoMap;
    })().finally(() => {
      scanPromise = null;
    });

    return scanPromise;
  }

  async function resolveVideoId(code) {
    if (!code) return null;
    if (videoMap[code]) return videoMap[code];

    scanPlaylistByTitle().catch(error => console.warn('No se pudo completar el índice de YouTube:', error?.message || error));

    const startedAt = Date.now();
    while (Date.now() - startedAt < 120000) {
      if (videoMap[code]) return videoMap[code];
      await delay(250);
    }
    return null;
  }

  function directEmbed(videoId) {
    const origin = encodeURIComponent(location.origin);
    return `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&playsinline=1&controls=1&fs=1&enablejsapi=1&iv_load_policy=3&origin=${origin}`;
  }

  function patchStateWithVideos() {
    const current = course();
    if (!current?.modules?.length) return;

    patchPresentationTitles();

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
    shell.classList.remove('drive-video-active', 'drive-frame-ready', 'native-video-active', 'ag-video-migrating', 'ag-video-pending');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const box = document.createElement('div');
    box.className = className;
    box.innerHTML = html;
    shell.appendChild(box);
  }

  function showLoading(shell, code) {
    prepareShell(
      shell,
      'youtube-player-loading',
      `<strong>Preparando video…</strong><span>Estamos cargando ${code ? `la lección ${code}` : 'esta lección'} de forma individual.</span>`
    );
  }

  function showError(shell) {
    prepareShell(
      shell,
      'youtube-player-error',
      '<strong>Este video todavía no está disponible aquí.</strong><span>Verifica que el video esté en la playlist, como No listado y con la inserción permitida.</span>'
    );
  }

  function showEnded(shell) {
    shell.querySelector(':scope > .youtube-lesson-ended')?.remove();
    const overlay = document.createElement('div');
    overlay.className = 'youtube-lesson-ended';
    overlay.innerHTML = '<strong>Video finalizado</strong><span>Tu avance se está guardando. Continúa desde el contenido de la Academia para desbloquear el siguiente tema.</span><button type="button">Repetir video</button>';
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
    if (key === activeKey && shell.querySelector('.youtube-single-holder')) return;

    destroyVisiblePlayer();
    shell.classList.remove('drive-video-active', 'drive-frame-ready', 'native-video-active', 'ag-video-migrating', 'ag-video-pending');
    shell.classList.add('youtube-video-active');
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const holder = document.createElement('div');
    holder.className = 'youtube-single-holder';
    holder.id = `ag-youtube-single-${String(context.lesson.id).replace(/[^a-z0-9_-]/gi, '')}`;
    shell.appendChild(holder);
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
            shell.classList.add('youtube-player-ready');
          },
          onStateChange(event) {
            if (activeKey !== key) return;
            if (event.data === window.YT.PlayerState.ENDED) showEnded(shell);
          },
          onError(event) {
            console.warn('YouTube player error:', event.data);
            showError(shell);
          }
        }
      });
    } catch (error) {
      console.warn('YouTube player:', error?.message || error);
      showError(shell);
    }
  }

  async function apply() {
    addStyles();
    patchPresentationTitles();
    patchStateWithVideos();

    const context = activeLessonContext();
    if (!context || !context.code) return;

    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    const existingId = videoMap[context.code];
    if (existingId) {
      mountSingleVideo(context, shell, existingId);
      return;
    }

    const loadingKey = `loading:${context.lesson.id}:${context.code}`;
    if (activeKey !== loadingKey) {
      destroyVisiblePlayer();
      activeKey = loadingKey;
      showLoading(shell, context.code);
    }

    const videoId = await resolveVideoId(context.code);
    if (!videoId) {
      if (activeKey === loadingKey) showError(shell);
      return;
    }

    if (activeLessonContext()?.lesson?.id !== context.lesson.id) return;
    activeKey = '';
    patchStateWithVideos();
    mountSingleVideo(context, shell, videoId);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => apply().catch(error => console.warn('YouTube Utah:', error?.message || error)), 45);
  }

  window.addEventListener('hashchange', () => {
    destroyVisiblePlayer();
    schedule();
  });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('orientationchange', schedule, { passive: true });

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList: true,
    subtree: true
  });

  const interval = setInterval(() => {
    patchPresentationTitles();
    patchStateWithVideos();
    schedule();
  }, 1200);
  setTimeout(() => clearInterval(interval), 180000);

  window.ACADEMIA_AG_YOUTUBE_UTAH = {
    release: RELEASE,
    playlistId: PLAYLIST_ID,
    expectedVideos: EXPECTED_CODES.size,
    get map() { return { ...videoMap }; },
    refresh() {
      videoMap = {};
      saveCache();
      return scanPlaylistByTitle();
    },
    apply
  };

  scanPlaylistByTitle().catch(() => {});
  schedule();
})();
