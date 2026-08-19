(() => {
  'use strict';

  const RELEASE = '20260819.5';
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
        display:block!important;
        width:100%!important;
        height:auto!important;
        min-height:0!important;
        max-height:none!important;
        aspect-ratio:16/9!important;
        padding:0!important;
        margin:0!important;
        border-radius:22px!important;
        border:1px solid rgba(120,199,166,.22)!important;
        background:#05080d!important;
        overflow:hidden!important;
        isolation:isolate!important;
        box-shadow:0 18px 44px rgba(0,0,0,.24),inset 0 0 0 1px rgba(255,255,255,.035)!important;
        contain:layout paint!important;
      }

      .video-shell.drive-video-active::before,
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
        z-index:40!important;
        display:block!important;
        width:100%!important;
        height:100%!important;
        min-width:100%!important;
        min-height:100%!important;
        max-width:none!important;
        max-height:none!important;
        border:0!important;
        border-radius:inherit!important;
        background:#05080d!important;
        pointer-events:auto!important;
        touch-action:manipulation!important;
        transform:translateZ(0)!important;
      }

      .video-shell.drive-video-active>.drive-player-loading{
        position:absolute!important;
        inset:0!important;
        z-index:45!important;
        display:flex!important;
        flex-direction:column!important;
        align-items:center!important;
        justify-content:center!important;
        gap:10px!important;
        background:linear-gradient(145deg,#07141a,#05080d)!important;
        color:#b7c6c1!important;
        font:700 .76rem/1.2 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif!important;
        letter-spacing:.04em!important;
        pointer-events:none!important;
        opacity:1!important;
        transition:opacity .28s ease!important;
      }

      .video-shell.drive-video-active.drive-frame-ready>.drive-player-loading{
        opacity:0!important;
        visibility:hidden!important;
      }

      .video-shell.drive-video-active>.drive-player-loading::before{
        content:''!important;
        width:24px!important;
        height:24px!important;
        border-radius:50%!important;
        border:2px solid rgba(255,255,255,.15)!important;
        border-top-color:#78c7a6!important;
        animation:agDriveSpin .8s linear infinite!important;
      }

      @keyframes agDriveSpin{to{transform:rotate(360deg)}}

      /* El control de abrir en Drive vive dentro del iframe, por lo que
         no puede eliminarse desde nuestra página. Esta máscara pequeña
         cubre únicamente ese control sin tocar Play ni la barra inferior. */
      .video-shell.drive-video-active>.drive-popout-shield{
        position:absolute!important;
        z-index:80!important;
        top:5px!important;
        right:5px!important;
        width:40px!important;
        height:40px!important;
        display:block!important;
        border-radius:10px!important;
        background:rgba(5,8,13,.96)!important;
        box-shadow:-7px 7px 18px rgba(0,0,0,.10)!important;
        pointer-events:auto!important;
        user-select:none!important;
        -webkit-user-select:none!important;
      }

      @media(max-width:720px){
        .video-shell.drive-video-active{
          border-radius:18px!important;
          box-shadow:0 14px 32px rgba(0,0,0,.22)!important;
        }
        .video-shell.drive-video-active>.drive-popout-shield{
          top:4px!important;
          right:4px!important;
          width:36px!important;
          height:36px!important;
          border-radius:9px!important;
        }
      }

      @media(max-width:420px){
        .video-shell.drive-video-active{
          border-radius:16px!important;
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
      shield.setAttribute('title', 'Contenido protegido');
      shell.appendChild(shield);
    }
  }

  function ensureLoadingState(shell, frame) {
    let loading = shell.querySelector(':scope > .drive-player-loading');
    if (!loading) {
      loading = document.createElement('div');
      loading.className = 'drive-player-loading';
      loading.textContent = 'Preparando video…';
      shell.appendChild(loading);
    }

    if (frame.dataset.agDriveReady === '1') {
      shell.classList.add('drive-frame-ready');
      return;
    }

    shell.classList.remove('drive-frame-ready');
    if (frame.dataset.agDriveLoadBound === '1') return;
    frame.dataset.agDriveLoadBound = '1';
    frame.addEventListener('load', () => {
      frame.dataset.agDriveReady = '1';
      window.setTimeout(() => shell.classList.add('drive-frame-ready'), 180);
    }, { once:true });

    window.setTimeout(() => shell.classList.add('drive-frame-ready'), 3500);
  }

  function fixShell(shell) {
    const current = currentDriveFrame(shell);
    removeExternalAccess(shell);

    if (!current) {
      shell?.classList.remove('drive-video-active', 'drive-frame-ready');
      shell?.querySelector(':scope > .drive-popout-shield')?.remove();
      shell?.querySelector(':scope > .drive-player-loading')?.remove();
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
    ensureLoadingState(shell, frame);
    ensurePopoutShield(shell);
  }

  function fixAll() {
    addStyles();
    document.querySelectorAll('.drive-video-open').forEach(node => node.remove());
    document.querySelectorAll('.lesson-layout .video-shell').forEach(fixShell);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(fixAll, 45);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  window.addEventListener('resize', schedule, { passive:true });
  window.addEventListener('orientationchange', schedule, { passive:true });

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['src','class']
  });

  const interval = setInterval(fixAll, 700);
  setTimeout(() => clearInterval(interval), 60000);

  window.ACADEMIA_AG_DRIVE_PLAYER_FIX = { release:RELEASE, apply:fixAll };
  schedule();
})();
