(() => {
  'use strict';

  const RELEASE = '20260819.9';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const YOUTUBE_READY_MODULES = new Set([
    '11111111-0000-4111-8111-000000000001',
    '11111111-aaaa-4111-8111-111111111111'
  ]);
  const DRIVE_RE = /(?:drive|docs)\.google\.com/i;
  let timer = null;

  function addStyles() {
    if (document.querySelector('#ag-video-source-guard-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-video-source-guard-style';
    style.textContent = `
      .drive-video-open,
      .drive-popout-shield,
      .drive-player-loading{display:none!important}

      .video-shell.ag-video-migrating,
      .video-shell.ag-video-pending{
        position:relative!important;
        display:grid!important;
        place-items:center!important;
        width:100%!important;
        min-height:0!important;
        aspect-ratio:16/9!important;
        padding:0!important;
        overflow:hidden!important;
        border-radius:22px!important;
        border:1px solid rgba(120,199,166,.18)!important;
        background:linear-gradient(145deg,#07141a,#05080d)!important;
        box-shadow:0 18px 44px rgba(0,0,0,.18)!important;
      }
      .video-shell.ag-video-migrating::before,
      .video-shell.ag-video-migrating::after,
      .video-shell.ag-video-pending::before,
      .video-shell.ag-video-pending::after{display:none!important;content:none!important}

      .ag-video-status{
        max-width:440px;
        padding:26px 28px;
        display:grid;
        justify-items:center;
        gap:10px;
        text-align:center;
        color:#d7e2df;
      }
      .ag-video-status-spinner{
        width:28px;
        height:28px;
        border-radius:50%;
        border:2px solid rgba(255,255,255,.13);
        border-top-color:#78c7a6;
        animation:agVideoGuardSpin .8s linear infinite;
      }
      .ag-video-status-mark{
        width:42px;
        height:42px;
        display:grid;
        place-items:center;
        border-radius:14px;
        background:rgba(120,199,166,.10);
        color:#78c7a6;
        font-size:1.2rem;
        font-weight:800;
      }
      .ag-video-status strong{font-size:1rem;color:#fff}
      .ag-video-status span{font-size:.78rem;line-height:1.55;color:#9fb2ac}
      @keyframes agVideoGuardSpin{to{transform:rotate(360deg)}}
      @media(max-width:720px){
        .video-shell.ag-video-migrating,
        .video-shell.ag-video-pending{border-radius:18px!important}
        .ag-video-status{padding:20px 22px}
      }
    `;
    document.head.appendChild(style);
  }

  function course() {
    if (typeof state === 'undefined' || !Array.isArray(state.courses)) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function activeContext() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    const current = course();
    if (!current) return null;
    for (const module of current.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === parts[2]);
      if (lesson) return { module, lesson };
    }
    return null;
  }

  function scrubState() {
    const current = course();
    if (current?.modules?.length) {
      for (const module of current.modules) {
        for (const lesson of module.lessons || []) {
          if (DRIVE_RE.test(String(lesson.video_url || ''))) {
            lesson.video_url = '';
            lesson.video_provider = YOUTUBE_READY_MODULES.has(module.id) ? 'youtube' : 'pending';
          }
        }
      }
    }

    if (typeof state !== 'undefined' && Array.isArray(state.resources)) {
      state.resources = state.resources.filter(resource => {
        const urls = [resource.external_url, resource.file_url, resource.url, resource.video_url]
          .map(value => String(value || ''));
        return !urls.some(value => DRIVE_RE.test(value));
      });
    }
  }

  function removeDriveDom() {
    document.querySelectorAll('iframe[src*="drive.google.com"],iframe[src*="docs.google.com"],a[href*="drive.google.com"],a[href*="docs.google.com"],.drive-video-open,.drive-popout-shield,.drive-player-loading')
      .forEach(node => node.remove());
  }

  function renderSafeState() {
    const context = activeContext();
    if (!context) return;
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell || shell.classList.contains('youtube-video-active') || shell.querySelector('iframe.youtube-lesson-frame')) return;

    const hasDrive = [...shell.querySelectorAll('iframe,a')].some(node => DRIVE_RE.test(String(node.getAttribute('src') || node.getAttribute('href') || '')));
    const sourceWasDrive = DRIVE_RE.test(String(context.lesson.video_url || '')) || hasDrive || context.lesson.video_provider === 'pending';
    const youtubeReady = YOUTUBE_READY_MODULES.has(context.module.id);

    if (!sourceWasDrive && !youtubeReady) return;

    shell.classList.remove('drive-video-active', 'drive-frame-ready', 'native-video-active');
    shell.classList.toggle('ag-video-migrating', youtubeReady);
    shell.classList.toggle('ag-video-pending', !youtubeReady);
    shell.querySelectorAll(':scope > *').forEach(node => node.remove());

    const status = document.createElement('div');
    status.className = 'ag-video-status';
    if (youtubeReady) {
      status.innerHTML = '<div class="ag-video-status-spinner"></div><strong>Preparando video…</strong><span>Estamos cargando esta lección en el nuevo reproductor.</span>';
    } else {
      status.innerHTML = '<div class="ag-video-status-mark">▶</div><strong>Video en actualización</strong><span>Esta lección se habilitará aquí en cuanto termine su migración al nuevo reproductor.</span>';
    }
    shell.appendChild(status);
  }

  function apply() {
    addStyles();
    removeDriveDom();
    scrubState();
    renderSafeState();
    document.documentElement.dataset.agVideoSourceGuard = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 25);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, {
    childList:true,
    subtree:true,
    attributes:true,
    attributeFilter:['src','href','class']
  });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once:true });

  const interval = setInterval(apply, 350);
  setTimeout(() => clearInterval(interval), 180000);

  window.ACADEMIA_AG_VIDEO_SOURCE_GUARD = { release: RELEASE, apply };
  schedule();
})();