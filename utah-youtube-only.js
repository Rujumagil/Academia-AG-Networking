(() => {
  'use strict';

  const RELEASE = '20260819.22';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const LEGACY_VIDEO_RE = /(?:drive|docs)\.google\.com|video\.wixstatic\.com|wixstatic\.com\/video/i;
  let timer = null;

  function onUtahLessonRoute() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID && Boolean(parts[2]);
  }

  function scrubCourseState() {
    try {
      if (typeof state === 'undefined' || !Array.isArray(state.courses)) return;
      const course = state.courses.find(item => item.id === COURSE_ID);
      if (!course?.modules?.length) return;

      for (const module of course.modules) {
        for (const lesson of module.lessons || []) {
          const currentUrl = String(lesson.video_url || '').trim();
          if (currentUrl && !/youtube(?:-nocookie)?\.com|youtu\.be/i.test(currentUrl)) {
            lesson.video_url = '';
          }
          if (LEGACY_VIDEO_RE.test(currentUrl) || !currentUrl) {
            lesson.video_provider = 'youtube';
          }
        }
      }
    } catch (error) {
      console.warn('Utah YouTube-only state scrub:', error);
    }
  }

  function removeLegacyDom() {
    if (!onUtahLessonRoute()) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    shell.querySelectorAll('video, .lesson-native-video, .drive-video-open, .drive-popout-shield, .drive-player-loading, .lesson-video-fallback').forEach(node => node.remove());

    shell.querySelectorAll('iframe').forEach(frame => {
      const src = String(frame.getAttribute('src') || '').trim();
      const isYouTube = /youtube(?:-nocookie)?\.com/i.test(src);
      const isExclusive = frame.classList.contains('ag-youtube-frame') || frame.dataset.agYoutubeExclusive === 'true';
      if (!isYouTube || !isExclusive) frame.remove();
    });

    shell.querySelectorAll('a[href]').forEach(link => {
      const href = String(link.getAttribute('href') || '');
      if (LEGACY_VIDEO_RE.test(href)) link.remove();
    });
  }

  function apply() {
    scrubCourseState();
    removeLegacyDom();
    document.documentElement.dataset.agUtahVideoSource = 'youtube-only';
    document.documentElement.dataset.agUtahVideoSourceRelease = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 10);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'href']
  });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);

  const interval = setInterval(apply, 100);
  setTimeout(() => clearInterval(interval), 60000);

  window.ACADEMIA_AG_UTAH_YOUTUBE_ONLY = { release: RELEASE, apply };
  schedule();
})();
