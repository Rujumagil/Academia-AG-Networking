(() => {
  'use strict';

  const RELEASE = '20260819.2';
  const DRIVE_PREVIEW_RE = /^https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/preview(?:[?#].*)?$/i;
  let timer = null;

  function addStyles() {
    if (document.querySelector('#academia-ag-drive-player-fix')) return;
    const style = document.createElement('style');
    style.id = 'academia-ag-drive-player-fix';
    style.textContent = `
      .video-shell.drive-video-active{
        position:relative!important;
        width:100%!important;
        aspect-ratio:16 / 9!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        background:#05080d!important;
        overflow:hidden!important;
        isolation:isolate!important;
      }
      .video-shell.drive-video-active::after{
        display:none!important;
        content:none!important;
        pointer-events:none!important;
      }
      .video-shell.drive-video-active>.video-center,
      .video-shell.drive-video-active>.video-bar,
      .video-shell.drive-video-active>img{
        display:none!important;
        pointer-events:none!important;
      }
      .video-shell.drive-video-active iframe.drive-video-frame{
        position:absolute!important;
        inset:0!important;
        z-index:50!important;
        display:block!important;
        width:100%!important;
        height:100%!important;
        min-height:0!important;
        max-height:none!important;
        border:0!important;
        background:#05080d!important;
        pointer-events:auto!important;
      }
      .drive-video-open{
        display:flex;
        justify-content:flex-end;
        margin-top:8px;
        font-size:.75rem;
      }
      .drive-video-open a{
        color:#78c7a6;
        font-weight:800;
        text-decoration:none;
      }
      .drive-video-open a:hover{text-decoration:underline}
    `;
    document.head.appendChild(style);
  }

  function currentDriveFrame(shell) {
    const frame = shell?.querySelector('iframe.lesson-frame, iframe');
    if (!frame) return null;
    const src = String(frame.getAttribute('src') || '').trim();
    const match = src.match(DRIVE_PREVIEW_RE);
    return match ? { frame, src, fileId: match[1] } : null;
  }

  function ensureFallbackLink(shell, fileId) {
    const parent = shell.parentElement;
    if (!parent) return;
    let row = parent.querySelector(':scope > .drive-video-open');
    if (!row) {
      row = document.createElement('div');
      row.className = 'drive-video-open';
      shell.insertAdjacentElement('afterend', row);
    }
    row.innerHTML = `<a href="https://drive.google.com/file/d/${fileId}/view" target="_blank" rel="noopener">Abrir video en otra pestaña ↗</a>`;
  }

  function fixShell(shell) {
    const current = currentDriveFrame(shell);
    if (!current) {
      shell?.classList.remove('drive-video-active');
      return;
    }

    addStyles();
    const { frame, fileId } = current;
    shell.classList.remove('native-video-active');
    shell.classList.add('drive-video-active');

    frame.classList.add('lesson-frame', 'drive-video-frame');
    frame.setAttribute('allow', 'autoplay; encrypted-media; fullscreen; picture-in-picture');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('loading', 'eager');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.removeAttribute('sandbox');

    shell.querySelectorAll(':scope > .video-center, :scope > .video-bar, :scope > img').forEach(node => node.remove());
    ensureFallbackLink(shell, fileId);
  }

  function fixAll() {
    addStyles();
    document.querySelectorAll('.lesson-layout .video-shell').forEach(fixShell);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(fixAll, 40);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'class']
  });

  const interval = setInterval(fixAll, 750);
  setTimeout(() => clearInterval(interval), 45000);

  window.ACADEMIA_AG_DRIVE_PLAYER_FIX = { release: RELEASE, apply: fixAll };
  schedule();
})();
