(() => {
  'use strict';

  const RELEASE = '20260819.34';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const EXAM_MODULE_IDS = new Set([
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-bbbb-4111-8111-111111111111',
    '11111111-cccc-4111-8111-111111111111',
    '11111111-dddd-4111-8111-111111111111',
    '11111111-eeee-4111-8111-111111111111',
    '11111111-ffff-4111-8111-111111111111'
  ]);

  let apiPromise = null;
  let player = null;
  let playerLessonId = '';
  let playerIframe = null;
  let heartbeat = null;
  let timer = null;
  let attaching = false;
  let hasPlayed = false;
  let maxCurrentTime = 0;
  const finishing = new Set();

  function appReady() {
    return typeof state !== 'undefined'
      && Array.isArray(state.courses)
      && Array.isArray(state.progressRows)
      && typeof db !== 'undefined'
      && Boolean(state.user?.id);
  }

  function course() {
    if (!appReady()) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function orderedModules() {
    return [...(course()?.modules || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .map(module => ({
        ...module,
        lessons: [...(module.lessons || [])]
          .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      }));
  }

  function activeLessonId() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID ? (parts[2] || '') : '';
  }

  function contextForLesson(lessonId) {
    for (const module of orderedModules()) {
      const lessonIndex = module.lessons.findIndex(item => item.id === lessonId);
      if (lessonIndex >= 0) return { module, lesson: module.lessons[lessonIndex], lessonIndex };
    }
    return null;
  }

  function isCompleted(lessonId) {
    return appReady() && state.progressRows.some(row => row.lesson_id === lessonId && row.completed);
  }

  function show(message, type = 'info') {
    try { if (typeof showToast === 'function') showToast(message, type); } catch (_) {}
  }

  function navigate(hash) {
    const clean = String(hash || '').replace(/^#/, '');
    if (!clean) return;
    if (location.hash.replace(/^#/, '') !== clean) location.hash = clean;
    setTimeout(() => {
      try { if (typeof route === 'function') route(); } catch (_) {}
    }, 80);
  }

  async function saveCompleted(lessonId) {
    if (!appReady() || !lessonId) return false;
    if (isCompleted(lessonId)) return true;

    const now = new Date().toISOString();
    const payload = {
      user_id: state.user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: now,
      updated_at: now
    };

    try {
      const { data, error } = await db
        .from('lesson_progress')
        .upsert(payload, { onConflict: 'user_id,lesson_id' })
        .select()
        .single();

      if (error) throw error;
      const index = state.progressRows.findIndex(row => row.lesson_id === lessonId);
      if (index >= 0) state.progressRows[index] = data;
      else state.progressRows.push(data);

      try { window.ACADEMIA_AG_STUDENT_COURSE_FLOW?.apply?.(); } catch (_) {}
      try { window.ACADEMIA_AG_QUESTIONNAIRE_FLOW?.apply?.(); } catch (_) {}
      return true;
    } catch (error) {
      console.error('No se pudo guardar el progreso del video:', error);
      show('No pudimos guardar tu avance. Intenta terminar el video nuevamente.', 'error');
      return false;
    }
  }

  async function advanceAfterCompletion(lessonId) {
    const context = contextForLesson(lessonId);
    if (!context || activeLessonId() !== lessonId) return;

    const { module, lessonIndex } = context;
    const nextInsideModule = module.lessons[lessonIndex + 1];

    if (nextInsideModule) {
      show('Video completado. Abriendo el siguiente tema…', 'success');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (activeLessonId() === lessonId) navigate(`lesson/${COURSE_ID}/${nextInsideModule.id}`);
      return;
    }

    if (EXAM_MODULE_IDS.has(module.id)) {
      try { sessionStorage.setItem('ag-scroll-module-exam', module.id); } catch (_) {}
      show('Módulo completado. Continúa con “Reforzar lo aprendido”.', 'success');
      try { window.ACADEMIA_AG_MODULE_EXAM?.enhance?.(); } catch (_) {}
      try { window.ACADEMIA_AG_QUESTIONNAIRE_FLOW?.apply?.(); } catch (_) {}
      setTimeout(() => {
        const card = document.querySelector(`.module-exam-card[data-module-id="${module.id}"]`) || document.querySelector('.module-exam-card');
        card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 500);
      return;
    }

    const modules = orderedModules();
    const moduleIndex = modules.findIndex(item => item.id === module.id);
    const nextLesson = modules[moduleIndex + 1]?.lessons?.[0];
    if (nextLesson) {
      show('Video completado. Continuamos con el siguiente tema…', 'success');
      await new Promise(resolve => setTimeout(resolve, 500));
      if (activeLessonId() === lessonId) navigate(`lesson/${COURSE_ID}/${nextLesson.id}`);
      return;
    }

    show('Curso completado. Tu progreso quedó guardado.', 'success');
  }

  async function finishLesson(lessonId, source = 'ended') {
    if (!lessonId || finishing.has(lessonId) || activeLessonId() !== lessonId) return;
    finishing.add(lessonId);
    document.documentElement.dataset.agYoutubeFinishSource = source;
    try {
      const saved = await saveCompleted(lessonId);
      if (saved) await advanceAfterCompletion(lessonId);
    } finally {
      finishing.delete(lessonId);
    }
  }

  function stopHeartbeat() {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = null;
  }

  function stopTracking() {
    stopHeartbeat();
    player = null;
    playerIframe = null;
    playerLessonId = '';
    hasPlayed = false;
    maxCurrentTime = 0;
  }

  function startHeartbeat(lessonId) {
    stopHeartbeat();
    heartbeat = setInterval(() => {
      if (!player || activeLessonId() !== lessonId) return;
      try {
        const playerState = Number(player.getPlayerState?.());
        const current = Number(player.getCurrentTime?.() || 0);
        const duration = Number(player.getDuration?.() || 0);
        if (playerState === 1) hasPlayed = true;
        if (Number.isFinite(current)) maxCurrentTime = Math.max(maxCurrentTime, current);
        document.documentElement.dataset.agYoutubeState = String(playerState);
        document.documentElement.dataset.agYoutubeCurrent = String(Math.round(current * 10) / 10);
        document.documentElement.dataset.agYoutubeDuration = String(Math.round(duration * 10) / 10);

        const atEnd = duration > 0
          && current >= Math.max(0, duration - 0.7)
          && (hasPlayed || maxCurrentTime > 2 || playerState === 0);
        if (playerState === 0 || atEnd) finishLesson(lessonId, playerState === 0 ? 'ended' : 'time');
      } catch (_) {}
    }, 500);
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;

    apiPromise = new Promise((resolve, reject) => {
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

      if (!document.querySelector('script[data-ag-youtube-progress-api]')) {
        const script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        script.dataset.agYoutubeProgressApi = RELEASE;
        script.onerror = () => reject(new Error('youtube-api-load-failed'));
        document.head.appendChild(script);
      }
    });
    return apiPromise;
  }

  function nativeIframe() {
    const iframe = document.querySelector('.lesson-layout .video-shell iframe.lesson-frame');
    if (!iframe) return null;
    const src = String(iframe.getAttribute('src') || '');
    return /youtube(?:-nocookie)?\.com\/embed\//i.test(src) ? iframe : null;
  }

  function prepareIframe(iframe, lessonId) {
    if (!iframe.id) iframe.id = `ag-youtube-native-${String(lessonId).replace(/[^a-z0-9_-]/gi, '')}`;
    iframe.dataset.agYoutubeProgress = RELEASE;
    try {
      const url = new URL(iframe.src, location.href);
      let changed = false;
      if (url.searchParams.get('enablejsapi') !== '1') {
        url.searchParams.set('enablejsapi', '1');
        changed = true;
      }
      if (url.searchParams.get('origin') !== location.origin) {
        url.searchParams.set('origin', location.origin);
        changed = true;
      }
      if (url.searchParams.get('playsinline') !== '1') {
        url.searchParams.set('playsinline', '1');
        changed = true;
      }
      if (changed) {
        iframe.src = url.toString();
        return false;
      }
    } catch (_) {}
    return true;
  }

  async function attachExistingPlayer(lessonId, iframe) {
    await loadYouTubeApi();
    if (!iframe.isConnected || activeLessonId() !== lessonId) return;

    const readyForApi = prepareIframe(iframe, lessonId);
    if (!readyForApi) {
      iframe.addEventListener('load', schedule, { once: true });
      return;
    }

    hasPlayed = false;
    maxCurrentTime = 0;
    playerIframe = iframe;
    playerLessonId = lessonId;

    player = new window.YT.Player(iframe.id, {
      events: {
        onReady(event) {
          if (activeLessonId() !== lessonId) return;
          player = event.target;
          playerIframe = event.target.getIframe?.() || iframe;
          document.documentElement.dataset.agYoutubeProgress = RELEASE;
          document.documentElement.dataset.agYoutubePlayer = 'ready';
          startHeartbeat(lessonId);
        },
        onStateChange(event) {
          if (activeLessonId() !== lessonId) return;
          document.documentElement.dataset.agYoutubeState = String(event.data);
          if (event.data === 1 || event.data === window.YT.PlayerState.PLAYING) hasPlayed = true;
          if (event.data === 0 || event.data === window.YT.PlayerState.ENDED) finishLesson(lessonId, 'ended');
        },
        onError(event) {
          console.error('Error del reproductor de YouTube:', event.data);
          document.documentElement.dataset.agYoutubePlayer = `error-${event.data}`;
        }
      }
    });
  }

  async function attach() {
    if (attaching || !appReady()) return;
    const lessonId = activeLessonId();
    if (!lessonId) {
      stopTracking();
      return;
    }
    if (player && playerLessonId === lessonId) return;

    const iframe = nativeIframe();
    if (!iframe) return;
    attaching = true;
    try {
      stopTracking();
      document.documentElement.dataset.agYoutubePlayer = 'connecting';
      await attachExistingPlayer(lessonId, iframe);
    } catch (error) {
      console.error('No se pudo conectar el progreso automático de YouTube:', error);
      document.documentElement.dataset.agYoutubePlayer = 'connect-error';
      stopTracking();
    } finally {
      attaching = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(attach, 120);
  }

  window.addEventListener('message', event => {
    if (!playerIframe?.contentWindow || event.source !== playerIframe.contentWindow) return;
    let payload = event.data;
    try { if (typeof payload === 'string') payload = JSON.parse(payload); } catch (_) { return; }
    if (!payload || typeof payload !== 'object') return;
    const lessonId = playerLessonId;
    if (!lessonId || activeLessonId() !== lessonId) return;
    if (payload.event === 'onStateChange' && Number(payload.info) === 0) finishLesson(lessonId, 'message-ended');
    if (payload.event === 'infoDelivery' && Number(payload.info?.playerState) === 0) finishLesson(lessonId, 'message-state');
  });

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => {
    stopTracking();
    schedule();
  });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });

  const rescueInterval = setInterval(schedule, 1200);
  setTimeout(() => clearInterval(rescueInterval), 300000);

  window.ACADEMIA_AG_YOUTUBE_PROGRESS = {
    release: RELEASE,
    attach,
    finishLesson,
    advanceAfterCompletion
  };

  schedule();
})();
