(() => {
  'use strict';

  function upgradeWixVideoFrames(root = document) {
    root.querySelectorAll?.('iframe.lesson-frame').forEach(frame => {
      const src = String(frame.getAttribute('src') || '');
      if (!/video\.wixstatic\.com\/video\//i.test(src) || !/\/mp4\/file\.mp4(?:$|\?)/i.test(src)) return;
      if (frame.dataset.nativeVideoUpgraded === 'true') return;

      const video = document.createElement('video');
      video.className = frame.className;
      video.src = src;
      video.controls = true;
      video.playsInline = true;
      video.preload = 'metadata';
      video.setAttribute('controlsList', 'nodownload');
      video.setAttribute('disablePictureInPicture', '');
      video.setAttribute('aria-label', frame.getAttribute('title') || 'Video de la lección');
      video.dataset.nativeVideoUpgraded = 'true';
      frame.replaceWith(video);
    });
  }

  const app = document.querySelector('#app');
  if (!app) return;

  upgradeWixVideoFrames(app);
  const observer = new MutationObserver(() => upgradeWixVideoFrames(app));
  observer.observe(app, { childList: true, subtree: true });
})();
