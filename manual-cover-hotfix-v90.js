(() => {
  'use strict';

  const RELEASE = '20260825.90';
  const MANUAL_COVER = 'https://static.wixstatic.com/media/11f124_1f698a3515504ee192fa6396c4d5c143~mv2.png';
  let timer = null;
  let observer = null;

  function isManualCard(node) {
    const text = String(node?.textContent || '').toLowerCase();
    return text.includes('manual del alumno academia ag')
      || text.includes('manual de actividades del alumno')
      || (text.includes('manual del alumno') && text.includes('academia ag'));
  }

  function applyCover() {
    const candidates = document.querySelectorAll([
      '.library-material-card',
      '.library-book-card',
      '.admin-resource-card',
      '.resource-card',
      '.course-resource-card',
      '.material-card',
      'article'
    ].join(','));

    candidates.forEach(card => {
      if (!isManualCard(card)) return;
      const image = card.querySelector('img');
      if (!image) return;
      if (image.src === MANUAL_COVER) return;
      image.src = MANUAL_COVER;
      image.alt = 'Portada del Manual de Actividades del Alumno · Utah Driver Success Program';
      image.dataset.manualCoverV90 = 'true';
      image.style.objectFit = 'contain';
      image.style.objectPosition = 'center';
      image.style.background = '#071426';
    });

    document.documentElement.dataset.agManualCover = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      observer?.disconnect();
      try { applyCover(); } finally { observe(); }
    }, 80);
  }

  function observe() {
    if (!observer) observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();
  schedule();

  window.ACADEMIA_AG_MANUAL_COVER = Object.freeze({ release: RELEASE, url: MANUAL_COVER, apply: schedule });
})();
