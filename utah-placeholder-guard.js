(() => {
  'use strict';

  const RELEASE = '20260819.24';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';

  function onUtahLesson() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID && Boolean(parts[2]);
  }

  function cleanFallback() {
    if (!onUtahLesson()) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    const hasYouTube = [...shell.querySelectorAll('iframe')].some(frame =>
      /youtube(?:-nocookie)?\.com/i.test(String(frame.getAttribute('src') || ''))
    );
    if (hasYouTube) return;

    shell.querySelectorAll('#video-placeholder,.video-center,.video-bar').forEach(node => node.remove());

    if (!shell.querySelector('.ag-utah-youtube-preload')) {
      const loading = document.createElement('div');
      loading.className = 'ag-utah-youtube-preload';
      loading.innerHTML = '<strong>Cargando video de YouTube…</strong><span>Preparando esta lección.</span>';
      shell.appendChild(loading);
    }
  }

  function addStyles() {
    if (document.querySelector('#ag-utah-placeholder-guard-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-utah-placeholder-guard-style';
    style.textContent = `
      .video-shell .ag-utah-youtube-preload{
        position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;
        gap:8px;padding:24px;text-align:center;background:#05080d;color:#fff;z-index:55
      }
      .video-shell .ag-utah-youtube-preload span{font-size:.8rem;color:#9fb2ac}
      .video-shell:has(iframe[src*="youtube.com"]) .ag-utah-youtube-preload,
      .video-shell:has(iframe[src*="youtube-nocookie.com"]) .ag-utah-youtube-preload{display:none!important}
    `;
    document.head.appendChild(style);
  }

  document.addEventListener('click', event => {
    if (!onUtahLesson()) return;
    const target = event.target.closest('#video-placeholder,.video-center,.video-bar');
    if (!target) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    cleanFallback();
    try { window.ACADEMIA_AG_YOUTUBE_UTAH?.apply?.(); } catch (_) {}
  }, true);

  const schedule = () => setTimeout(() => { addStyles(); cleanFallback(); }, 0);
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);

  window.ACADEMIA_AG_UTAH_PLACEHOLDER_GUARD = { release: RELEASE, apply: cleanFallback };
  schedule();
})();
