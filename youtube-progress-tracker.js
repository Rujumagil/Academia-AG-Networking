(() => {
  'use strict';

  const RELEASE = '20260819.31';
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
  let playerIframe = null;
  let playerLessonId = '';
  let timer = null;
  let attaching = false;
  const handlingEnded = new Set();

  function appReady() {
    return typeof state !== 'undefined' && Array.isArray(state.courses) && Array.isArray(state.progressRows);
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
        lessons: [...(module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
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
        script.dataset.agYoutubeProgressApi = '1';
        script.onerror = () => reject(new Error('youtube-api-load-failed'));
        document.head.appendChild(script);
      }
    });

    return apiPromise;
  }

  function youtubeIframe() {
    const iframe = document.querySelector('.lesson-layout .video-shell iframe.lesson-frame');
    if (!iframe) return null;
    const src = String(iframe.getAttribute('src') || '');
    return /youtube(?:-nocookie)?\.com\/embed\//i.test(src) ? iframe : null;
  }

  function ensureApiParams(iframe) {
    try {
      const url = new URL(iframe.src, location.href);
      let changed = false;
      if (url.searchParams.get('enablejsapi') !== '1') {
        url.searchParams.set('enablejsapi', '1');
        changed = true;
      }
      if (!url.searchParams.get('origin')) {
        url.searchParams.set('origin', location.origin);
        changed = true;
      }
      if (changed) iframe.src = url.toString();
    } catch (_) {}
  }

  function destroyPlayer() {
    try { player?.destroy?.(); } catch (_) {}
    player = null;
    playerIframe = null;
    playerLessonId = '';
  }

  function endedSignal(lessonId) {
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell || shell.querySelector(`.ag-youtube-ended-signal[data-lesson-id="${lessonId}"]`)) return;
    const signal = document.createElement('span');
    signal.className = 'youtube-lesson-ended ag-youtube-ended-signal';
    signal.dataset.lessonId = lessonId;
    signal.hidden = true;
    signal.style.display = 'none';
    shell.appendChild(signal);
  }

  async function waitForCompletion(lessonId, timeoutMs = 10000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      if (isCompleted(lessonId)) return true;
      try { window.ACADEMIA_AG_STUDENT_COURSE_FLOW?.apply?.(); } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 220));
    }
    return isCompleted(lessonId);
  }

  async function advanceAfterCompletion(lessonId) {
    const context = contextForLesson(lessonId);
    if (!context) return;

    const { module, lessonIndex } = context;
    const nextInsideModule = module.lessons[lessonIndex + 1];
    if (nextInsideModule) {
      await new Promise(resolve => setTimeout(resolve, 650));
      location.hash = `lesson/${COURSE_ID}/${nextInsideModule.id}`;
      return;
    }

    if (EXAM_MODULE_IDS.has(module.id)) {
      try { sessionStorage.setItem('ag-scroll-module-exam', module.id); } catch (_) {}
      try { showToast?.('Módulo completado. Continúa con “Reforzar lo aprendido”.', 'success'); } catch (_) {}
      await new Promise(resolve => setTimeout(resolve, 850));
      location.hash = 'evaluations';
      return;
    }

    const modules = orderedModules();
    const moduleIndex = modules.findIndex(item => item.id === module.id);
    const nextModule = modules[moduleIndex + 1];
    const nextLesson = nextModule?.lessons?.[0];
    if (nextLesson) {
      await new Promise(resolve => setTimeout(resolve, 650));
      location.hash = `lesson/${COURSE_ID}/${nextLesson.id}`;
      return;
    }

    try { showToast?.('Curso completado. Tu progreso quedó guardado.', 'success'); } catch (_) {}
  }

  async function handleEnded(lessonId) {
    if (!lessonId || handlingEnded.has(lessonId)) return;
    if (activeLessonId() !== lessonId) return;

    handlingEnded.add(lessonId);
    try {
      endedSignal(lessonId);
      try { window.ACADEMIA_AG_STUDENT_COURSE_FLOW?.apply?.(); } catch (_) {}
      const saved = await waitForCompletion(lessonId);
      if (!saved) {
        console.warn('YouTube terminó, pero la lección no pudo confirmarse como completada:', lessonId);
        return;
      }
      await advanceAfterCompletion(lessonId);
    } finally {
      handlingEnded.delete(lessonId);
    }
  }

  async function attach() {
    if (attaching || !appReady()) return;
    const lessonId = activeLessonId();
    if (!lessonId) {
      destroyPlayer();
      return;
    }

    const iframe = youtubeIframe();
    if (!iframe) return;
    if (player && playerIframe === iframe && playerLessonId === lessonId) return;

    attaching = true;
    try {
      destroyPlayer();
      ensureApiParams(iframe);
      if (!iframe.id) iframe.id = `ag-youtube-${lessonId}`;
      iframe.dataset.agYoutubeProgress = RELEASE;

      await loadYouTubeApi();
      if (!iframe.isConnected || activeLessonId() !== lessonId) return;

      playerIframe = iframe;
      playerLessonId = lessonId;
      player = new window.YT.Player(iframe.id, {
        events: {
          onReady() {
            document.documentElement.dataset.agYoutubeProgress = RELEASE;
          },
          onStateChange(event) {
            if (event.data === window.YT.PlayerState.ENDED || event.data === 0) {
              handleEnded(lessonId);
            }
          },
          onError(event) {
            console.error('Error del reproductor de YouTube:', event.data);
          }
        }
      });
    } catch (error) {
      console.error('No se pudo conectar el progreso automático de YouTube:', error);
      destroyPlayer();
    } finally {
      attaching = false;
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(attach, 80);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => {
    destroyPlayer();
    schedule();
  });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });

  const interval = setInterval(schedule, 1200);
  setTimeout(() => clearInterval(interval), 180000);

  window.ACADEMIA_AG_YOUTUBE_PROGRESS = { release: RELEASE, attach };
  schedule();
})();
