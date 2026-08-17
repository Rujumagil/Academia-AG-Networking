(() => {
  'use strict';

  const RELEASE = '20260817.8';
  let timer = null;

  function isWixVideoUrl(src = '') {
    return /^https:\/\/video\.wixstatic\.com\/video\/11f124_[a-f0-9]+\/(?:file|(?:1080p|720p|480p|360p)\/mp4\/file\.mp4)(?:\?.*)?$/i.test(String(src).trim());
  }

  function addStyles() {
    if (document.querySelector('#academia-ag-video-fix-styles')) return;
    const style = document.createElement('style');
    style.id = 'academia-ag-video-fix-styles';
    style.textContent = `
      .video-shell.native-video-active{
        background:#05080d!important;
        min-height:0!important;
      }
      .video-shell.native-video-active::after{
        display:none!important;
        content:none!important;
        pointer-events:none!important;
      }
      .video-shell.native-video-active .lesson-native-video,
      .video-shell.native-video-active video{
        position:relative!important;
        z-index:10!important;
        width:100%!important;
        height:auto!important;
        min-height:360px!important;
        max-height:76vh!important;
        display:block!important;
        object-fit:contain!important;
        background:#05080d!important;
        pointer-events:auto!important;
      }
      .video-shell.native-video-active .video-center,
      .video-shell.native-video-active .video-bar{
        display:none!important;
        pointer-events:none!important;
      }
      @media(max-width:700px){
        .video-shell.native-video-active .lesson-native-video,
        .video-shell.native-video-active video{min-height:220px!important;max-height:68vh!important}
      }
    `;
    document.head.appendChild(style);
  }

  function createNativeVideo(src, title = 'Video de la lección') {
    const video = document.createElement('video');
    video.className = 'lesson-frame lesson-native-video';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-label', title);

    const source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    video.appendChild(source);

    video.appendChild(document.createTextNode('Tu navegador no puede reproducir este video.'));
    return video;
  }

  function activateShell(shell) {
    if (!shell) return;

    let video = shell.querySelector('video');
    if (!video) {
      const frame = shell.querySelector('iframe.lesson-frame, iframe');
      const src = frame?.getAttribute('src')?.trim() || '';
      if (frame && isWixVideoUrl(src)) {
        video = createNativeVideo(src, frame.getAttribute('title') || 'Video de la lección');
        frame.replaceWith(video);
        video.load();
      }
    }

    if (!video) return;
    shell.classList.add('native-video-active');
    video.controls = true;
    video.playsInline = true;
    video.style.pointerEvents = 'auto';

    const fallback = shell.parentElement?.querySelector('.lesson-video-fallback');
    const clearFallback = () => fallback?.classList.remove('show');
    video.addEventListener('loadedmetadata', clearFallback, { once: true });
    video.addEventListener('canplay', clearFallback, { once: true });
  }

  function fixCurrentVideo() {
    addStyles();
    document.querySelectorAll('.lesson-layout .video-shell').forEach(activateShell);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(fixCurrentVideo, 20);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('click', event => {
    if (event.target.closest('.video-shell')) schedule();
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_VIDEO_FIX = { release: RELEASE, apply: fixCurrentVideo };
  schedule();
})();
