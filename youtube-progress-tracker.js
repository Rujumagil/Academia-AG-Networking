(() => {
  'use strict';

  const RELEASE = '20260819.35';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';

  let apiPromise = null;
  let player = null;
  let playerLessonId = '';
  let playerIframe = null;
  let timer = null;
  let heartbeat = null;
  let bridgeTimer = null;
  let attaching = false;
  let hasPlayed = false;
  let maxCurrentTime = 0;
  let lastDuration = 0;
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

  function updateProgressCard(text) {
    const card = document.querySelector('#complete-current');
    const small = card?.querySelector('small');
    if (small) small.textContent = text;
    document.documentElement.dataset.agYoutubeTrackerStatus = text;
  }

  function navigate(hash) {
    const clean = String(hash || '').replace(/^#/, '');
    if (!clean) return;
    if (location.hash.replace(/^#/, '') !== clean) {
      location.hash = clean;
      return;
    }
    try { if (typeof route === 'function') route(); } catch (_) {}
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
      updateProgressCard('No se pudo guardar el avance.');
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
      updateProgressCard('Video completado. Abriendo el siguiente tema…');
      show('Video completado. Abriendo el siguiente tema…', 'success');
      await new Promise(resolve => setTimeout(resolve, 350));
      if (activeLessonId() === lessonId) navigate(`lesson/${COURSE_ID}/${nextInsideModule.id}`);
      return;
    }

    try { sessionStorage.setItem('ag-scroll-module-exam', module.id); } catch (_) {}
    updateProgressCard('Módulo completado. Abriendo “Reforzar lo aprendido”…');
    show('Módulo completado. Continúa con “Reforzar lo aprendido”.', 'success');
    try { window.ACADEMIA_AG_MODULE_EXAM?.enhance?.(); } catch (_) {}
    try { window.ACADEMIA_AG_QUESTIONNAIRE_FLOW?.apply?.(); } catch (_) {}
    setTimeout(() => {
      const card = document.querySelector(`.module-exam-card[data-module-id="${module.id}"]`) || document.querySelector('.module-exam-card');
      if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 450);
  }

  async function finishLesson(lessonId, source = 'ended') {
    if (!lessonId || finishing.has(lessonId) || activeLessonId() !== lessonId) return;
    finishing.add(lessonId);
    document.documentElement.dataset.agYoutubeFinishSource = source;
    updateProgressCard('Final detectado. Guardando avance…');
    try {
      const saved = await saveCompleted(lessonId);
      if (saved) await advanceAfterCompletion(lessonId);
    } finally {
      finishing.delete(lessonId);
    }
  }

  function atEnd(current, duration, stateValue) {
    const currentValue = Number(current || 0);
    const durationValue = Number(duration || 0);
    if (durationValue > 0) lastDuration = durationValue;
    if (currentValue > 0) maxCurrentTime = Math.max(maxCurrentTime, currentValue);
    if (Number(stateValue) === 1) hasPlayed = true;

    const finalDuration = durationValue || lastDuration;
    return Number(stateValue) === 0 || (
      finalDuration > 0
      && currentValue >= Math.max(0, finalDuration - 0.85)
      && (hasPlayed || maxCurrentTime > 2)
    );
  }

  function setPlaybackStatus(stateValue, current = 0, duration = 0, source = '') {
    const stateNumber = Number(stateValue);
    document.documentElement.dataset.agYoutubeState = String(stateNumber);
    document.documentElement.dataset.agYoutubeCurrent = String(Math.round(Number(current || 0) * 10) / 10);
    document.documentElement.dataset.agYoutubeDuration = String(Math.round(Number(duration || 0) * 10) / 10);
    document.documentElement.dataset.agYoutubeSignal = source;

    if (stateNumber === 1) updateProgressCard('Seguimiento conectado · video en reproducción.');
    else if (stateNumber === 2) updateProgressCard('Seguimiento conectado · video en pausa.');
    else if (stateNumber === 3) updateProgressCard('Seguimiento conectado · cargando video…');
    else if (stateNumber === 0) updateProgressCard('Video finalizado. Guardando avance…');
  }

  function stopTimers() {
    if (heartbeat) clearInterval(heartbeat);
    if (bridgeTimer) clearInterval(bridgeTimer);
    heartbeat = null;
    bridgeTimer = null;
  }

  function stopTracking() {
    stopTimers();
    player = null;
    playerIframe = null;
    playerLessonId = '';
    hasPlayed = false;
    maxCurrentTime = 0;
    lastDuration = 0;
  }

  function startHeartbeat(lessonId) {
    if (heartbeat) clearInterval(heartbeat);
    heartbeat = setInterval(() => {
      if (!player || activeLessonId() !== lessonId) return;
      try {
        const stateValue = Number(player.getPlayerState?.());
        const current = Number(player.getCurrentTime?.() || 0);
        const duration = Number(player.getDuration?.() || 0);
        setPlaybackStatus(stateValue, current, duration, 'yt-api');
        if (atEnd(current, duration, stateValue)) finishLesson(lessonId, stateValue === 0 ? 'yt-ended' : 'yt-time');
      } catch (_) {}
    }, 450);
  }

  function bridgeTargetOrigin() {
    try { return new URL(playerIframe?.src || '').origin; } catch (_) { return '*'; }
  }

  function postBridgeMessage(message) {
    if (!playerIframe?.contentWindow) return;
    try {
      playerIframe.contentWindow.postMessage(JSON.stringify(message), bridgeTargetOrigin());
    } catch (_) {
      try { playerIframe.contentWindow.postMessage(JSON.stringify(message), '*'); } catch (_) {}
    }
  }

  function startMessageBridge(lessonId) {
    if (bridgeTimer) clearInterval(bridgeTimer);
    const ping = () => {
      if (!playerIframe?.contentWindow || activeLessonId() !== lessonId) return;
      postBridgeMessage({ event: 'listening', id: playerIframe.id });
      postBridgeMessage({ event: 'command', func: 'addEventListener', args: ['onStateChange'], id: playerIframe.id });
    };
    ping();
    bridgeTimer = setInterval(ping, 900);
  }

  function loadYouTubeApi() {
    if (window.YT?.Player) return Promise.resolve(window.YT);
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const previous = window.onYouTubeIframeAPIReady;
      const timeout = setTimeout(() => window.YT?.Player ? resolve(window.YT) : reject(new Error('youtube-api-timeout')), 15000);
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

  async function attachApiPlayer(lessonId, iframe) {
    try {
      await loadYouTubeApi();
      if (!iframe.isConnected || activeLessonId() !== lessonId) return;
      player = new window.YT.Player(iframe.id, {
        events: {
          onReady(event) {
            if (activeLessonId() !== lessonId) return;
            player = event.target;
            playerIframe = event.target.getIframe?.() || iframe;
            document.documentElement.dataset.agYoutubeProgress = RELEASE;
            document.documentElement.dataset.agYoutubePlayer = 'ready';
            updateProgressCard('Seguimiento automático conectado.');
            startHeartbeat(lessonId);
          },
          onStateChange(event) {
            if (activeLessonId() !== lessonId) return;
            setPlaybackStatus(event.data, 0, 0, 'yt-event');
            if (Number(event.data) === 1) hasPlayed = true;
            if (Number(event.data) === 0) finishLesson(lessonId, 'yt-event-ended');
          },
          onError(event) {
            console.error('Error del reproductor de YouTube:', event.data);
            document.documentElement.dataset.agYoutubePlayer = `error-${event.data}`;
          }
        }
      });
    } catch (error) {
      console.warn('Canal YT.Player no disponible; continúa el puente de mensajes:', error);
      document.documentElement.dataset.agYoutubePlayer = 'bridge-only';
      updateProgressCard('Seguimiento automático conectado.');
    }
  }

  async function attach() {
    if (attaching || !appReady()) return;
    const lessonId = activeLessonId();
    if (!lessonId) {
      stopTracking();
      return;
    }

    const iframe = nativeIframe();
    if (!iframe) return;
    if (playerIframe === iframe && playerLessonId === lessonId) return;

    attaching = true;
    try {
      stopTracking();
      if (!iframe.id) iframe.id = `ag-youtube-native-${String(lessonId).replace(/[^a-z0-9_-]/gi, '')}`;
      iframe.dataset.agYoutubeProgress = RELEASE;
      playerIframe = iframe;
      playerLessonId = lessonId;
      document.documentElement.dataset.agYoutubeProgress = RELEASE;
      document.documentElement.dataset.agYoutubePlayer = 'connecting';
      updateProgressCard('Conectando seguimiento automático…');
      startMessageBridge(lessonId);
      await attachApiPlayer(lessonId, iframe);
    } finally {
      attaching = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(attach, 90);
  }

  window.addEventListener('message', event => {
    if (!playerIframe?.contentWindow || event.source !== playerIframe.contentWindow) return;
    let payload = event.data;
    try { if (typeof payload === 'string') payload = JSON.parse(payload); } catch (_) { return; }
    if (!payload || typeof payload !== 'object') return;

    const lessonId = playerLessonId;
    if (!lessonId || activeLessonId() !== lessonId) return;

    if (payload.event === 'onReady') {
      updateProgressCard('Seguimiento automático conectado.');
      return;
    }

    if (payload.event === 'onStateChange') {
      const stateValue = Number(payload.info);
      setPlaybackStatus(stateValue, 0, 0, 'postmessage-state');
      if (stateValue === 1) hasPlayed = true;
      if (stateValue === 0) finishLesson(lessonId, 'postmessage-ended');
      return;
    }

    if (payload.event === 'infoDelivery' && payload.info) {
      const stateValue = Number(payload.info.playerState);
      const current = Number(payload.info.currentTime || 0);
      const duration = Number(payload.info.duration || lastDuration || 0);
      setPlaybackStatus(stateValue, current, duration, 'postmessage-info');
      if (atEnd(current, duration, stateValue)) finishLesson(lessonId, stateValue === 0 ? 'postmessage-state-ended' : 'postmessage-time');
    }
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

  const rescueInterval = setInterval(schedule, 1000);
  setTimeout(() => clearInterval(rescueInterval), 600000);

  window.ACADEMIA_AG_YOUTUBE_PROGRESS = {
    release: RELEASE,
    attach,
    finishLesson,
    advanceAfterCompletion,
    status: () => ({
      lessonId: playerLessonId,
      player: document.documentElement.dataset.agYoutubePlayer || '',
      state: document.documentElement.dataset.agYoutubeState || '',
      current: document.documentElement.dataset.agYoutubeCurrent || '',
      duration: document.documentElement.dataset.agYoutubeDuration || '',
      signal: document.documentElement.dataset.agYoutubeSignal || ''
    })
  };

  schedule();
})();
