(() => {
  'use strict';

  const RELEASE = '20260817.12';

  function currentLessonRoute() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || !parts[2]) return null;
    return { courseId: parts[1], lessonId: parts[2] };
  }

  function addStyles() {
    if (document.querySelector('#lesson-experience-styles')) return;
    const style = document.createElement('style');
    style.id = 'lesson-experience-styles';
    style.textContent = `
      .video-shell .lesson-native-video{width:100%;height:auto;min-height:260px;max-height:72vh;display:block;background:#060b13;border:0;border-radius:inherit;object-fit:contain}
      .lesson-video-fallback{display:none;padding:18px 20px;background:rgba(127,29,29,.10);color:#fecaca;border:1px solid rgba(254,202,202,.18);border-radius:16px;margin-top:12px}
      .lesson-video-fallback.show{display:block}
      @media(max-width:700px){.video-shell .lesson-native-video{min-height:210px}}
    `;
    document.head.appendChild(style);
  }

  function isWixMp4(src = '') {
    return /https:\/\/video\.wixstatic\.com\/video\//i.test(src) && /\/mp4\/file\.mp4(?:$|\?)/i.test(src);
  }

  function replaceWixFrameWithVideo() {
    const frame = document.querySelector('.video-shell iframe.lesson-frame');
    if (!frame) return;
    const src = String(frame.getAttribute('src') || '').trim();
    if (!isWixMp4(src)) return;

    const wrapper = document.createDocumentFragment();
    const video = document.createElement('video');
    video.className = 'lesson-frame lesson-native-video';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-label', frame.getAttribute('title') || 'Video de la lección');

    const source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    video.appendChild(source);

    const fallback = document.createElement('div');
    fallback.className = 'lesson-video-fallback';
    fallback.textContent = 'No pudimos reproducir este video. Recarga la lección o contacta a soporte si el problema continúa.';

    video.addEventListener('error', () => fallback.classList.add('show'));
    video.addEventListener('loadedmetadata', () => fallback.classList.remove('show'));

    wrapper.append(video, fallback);
    frame.replaceWith(wrapper);
    video.load();
  }

  function enhanceCurrentLesson() {
    addStyles();
    const route = currentLessonRoute();
    if (!route || !document.querySelector('.lesson-layout')) return;
    replaceWixFrameWithVideo();
  }

  window.addEventListener('hashchange', () => setTimeout(enhanceCurrentLesson, 60));
  const observer = new MutationObserver(() => {
    if (currentLessonRoute() && document.querySelector('.lesson-layout')) setTimeout(enhanceCurrentLesson, 20);
  });
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_LESSON_EXPERIENCE = { release: RELEASE, enhance: enhanceCurrentLesson };
  setTimeout(enhanceCurrentLesson, 80);
})();
