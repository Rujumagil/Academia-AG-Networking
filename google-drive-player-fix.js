(() => {
  'use strict';

  const RELEASE = '20260819.4';
  const DRIVE_PREVIEW_RE = /^https:\/\/drive\.google\.com\/file\/d\/([^/]+)\/preview(?:[?#].*)?$/i;
  let timer = null;

  function addStyles() {
    let style = document.querySelector('#academia-ag-drive-player-fix');
    if (!style) {
      style = document.createElement('style');
      style.id = 'academia-ag-drive-player-fix';
      document.head.appendChild(style);
    }

    style.textContent = `
      .drive-video-open{display:none!important}

      .video-shell.drive-video-active{
        position:relative!important;
        width:100%!important;
        aspect-ratio:16 / 9!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        border-radius:22px!important;
        border:1px solid rgba(120,199,166,.24)!important;
        background:#05080d!important;
        overflow:hidden!important;
        isolation:isolate!important;
        box-shadow:0 18px 42px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.035)!important;
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
        border-radius:inherit!important;
        background:#05080d!important;
        pointer-events:auto!important;
        touch-action:manipulation!important;
      }

      /* Google Drive dibuja su botón “abrir en una ventana nueva” dentro
         del iframe y, por ser de otro dominio, no podemos editarlo.
         Esta pequeña máscara impide verlo y pulsarlo sin bloquear Play,
         volumen, subtítulos, velocidad o pantalla completa. */
      .video-shell.drive-video-active>.drive-popout-shield{
        position:absolute!important;
        z-index:80!important;
        top:6px!important;
        right:6px!important;
        width:54px!important;
        height:48px!important;
        display:block!important;
        border-radius:0 15px 0 15px!important;
        background:linear-gradient(135deg,rgba(5,8,13,.96),rgba(7,18,23,.92))!important;
        box-shadow:-8px 8px 20px rgba(0,0,0,.12)!important;
        pointer-events:auto!important;
        user-select:none!important;
        -webkit-user-select:none!important;
      }

      .video-shell.drive-video-active>.drive-popout-shield::after{
        content:'🔒';
        position:absolute;
        inset:0;
        display:grid;
        place-items:center;
        font-size:15px;
        line-height:1;
        opacity:.68;
        filter:grayscale(1);
      }

      @media(max-width:720px){
        .video-shell.drive-video-active{
          border-radius:18px!important;
          box-shadow:0 14px 32px rgba(0,0,0,.22)!important;
        }
        .video-shell.drive-video-active>.drive-popout-shield{
          top:5px!important;
          right:5px!important;
          width:48px!important;
          height:43px!important;
          border-radius:0 13px 0 13px!important;
        }
        .video-shell.drive-video-active>.drive-popout-shield::after{
          font-size:13px;
        }
      }
    `;
  }

  function currentDriveFrame(shell) {
    const frame = shell?.querySelector('iframe.lesson-frame, iframe');
    if (!frame) return null;
    const src = String(frame.getAttribute('src') || '').trim();
    const match = src.match(DRIVE_PREVIEW_RE);
    return match ? { frame, src } : null;
  }

  function removeExternalAccess(shell) {
    document.querySelectorAll('.drive-video-open').forEach(node => node.remove());
    const parent = shell?.parentElement;
    if (!parent) return;
    parent.querySelectorAll(':scope > .drive-video-open').forEach(node => node.remove());
  }

  function ensurePopoutShield(shell) {
    let shield = shell.querySelector(':scope > .drive-popout-shield');
    if (!shield) {
      shield = document.createElement('div');
      shield.className = 'drive-popout-shield';
      shield.setAttribute('aria-hidden', 'true');
      shield.setAttribute('title', 'Reproducción protegida');
      shell.appendChild(shield);
    }
  }

  function fixShell(shell) {
    const current = currentDriveFrame(shell);
    removeExternalAccess(shell);

    if (!current) {
      shell?.classList.remove('drive-video-active');
      shell?.querySelector(':scope > .drive-popout-shield')?.remove();
      return;
    }

    addStyles();
    const { frame } = current;
    shell.classList.remove('native-video-active');
    shell.classList.add('drive-video-active');

    frame.classList.add('lesson-frame', 'drive-video-frame');
    frame.setAttribute('allow', 'autoplay; encrypted-media; fullscreen');
    frame.setAttribute('allowfullscreen', '');
    frame.setAttribute('loading', 'eager');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    frame.removeAttribute('sandbox');

    shell.querySelectorAll(':scope > .video-center, :scope > .video-bar, :scope > img').forEach(node => node.remove());
    ensurePopoutShield(shell);
  }

  function fixAll() {
    addStyles();
    document.querySelectorAll('.drive-video-open').forEach(node => node.remove());
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

  const interval = setInterval(fixAll, 650);
  setTimeout(() => clearInterval(interval), 60000);

  window.ACADEMIA_AG_DRIVE_PLAYER_FIX = { release: RELEASE, apply: fixAll };
  schedule();
})();
