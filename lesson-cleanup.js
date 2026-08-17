(() => {
  'use strict';

  const RELEASE = '20260817.11';
  let timer = null;

  function isLessonRoute() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && Boolean(parts[2]);
  }

  function addStyles() {
    if (document.querySelector('#lesson-cleanup-styles')) return;
    const style = document.createElement('style');
    style.id = 'lesson-cleanup-styles';
    style.textContent = `
      body.executive-lesson .lesson-actions.lesson-actions-minimal{
        display:block!important;
        margin:16px 0 0!important;
      }
      body.executive-lesson .lesson-actions.lesson-actions-minimal .action-card{
        width:100%!important;
        min-height:64px!important;
        display:flex!important;
        align-items:center!important;
        justify-content:space-between!important;
        gap:18px!important;
        padding:15px 18px!important;
        text-align:left!important;
        border-radius:18px!important;
        background:linear-gradient(135deg,rgba(255,255,255,.055),rgba(120,199,166,.055))!important;
        border:1px solid rgba(120,199,166,.16)!important;
      }
      body.executive-lesson .lesson-actions.lesson-actions-minimal .action-card strong{
        display:block!important;
        color:#f4faf7!important;
        font-size:.92rem!important;
        font-weight:760!important;
      }
      body.executive-lesson .lesson-actions.lesson-actions-minimal .action-card small{
        display:block!important;
        margin-top:4px!important;
        color:#8fa4ad!important;
        font-size:.72rem!important;
      }
      body.executive-lesson .lesson-actions.lesson-actions-minimal .action-card::after{
        content:'→';
        flex:0 0 auto;
        width:34px;height:34px;border-radius:50%;display:grid;place-items:center;
        color:#b7ead2;background:rgba(120,199,166,.10);border:1px solid rgba(120,199,166,.18);
      }
      body.executive-lesson .lesson-actions.lesson-actions-minimal .action-card:hover:not(:disabled){
        transform:translateY(-1px)!important;
        background:linear-gradient(135deg,rgba(255,255,255,.075),rgba(120,199,166,.09))!important;
      }
      body.executive-lesson .lesson-source-hidden,
      body.executive-lesson #lesson-notes,
      body.executive-lesson .autosave-note{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function removeRedundantProgressChip() {
    document.querySelectorAll('.lesson-executive-meta .lesson-executive-chip').forEach(chip => {
      const text = chip.textContent.trim().toLowerCase();
      if (text.includes('progreso guardado') || text.includes('lección completada')) chip.remove();
    });
  }

  function cleanHostingReferences() {
    document.querySelectorAll('.lesson-content').forEach(block => {
      const text = block.textContent.trim().toLowerCase();
      if (text.includes('alojado en wix') || text.includes('wix media') || text.includes('wixstatic')) {
        block.remove();
      }
    });

    document.querySelectorAll('.lesson-video-fallback').forEach(fallback => {
      fallback.textContent = 'No pudimos reproducir este video. Recarga la lección o contacta a soporte si el problema continúa.';
    });
  }

  function simplifyActions() {
    const actions = document.querySelector('.lesson-actions');
    if (!actions) return;

    actions.querySelector('#complete-current')?.remove();
    actions.querySelector('#focus-notes')?.remove();
    document.querySelector('#lesson-notes')?.remove();
    document.querySelector('.autosave-note')?.remove();

    const material = actions.querySelector('#material-button');
    if (material) {
      if (material.disabled) {
        material.remove();
      } else {
        material.innerHTML = '<span><strong>Material del curso</strong><small>Abre el manual, guía y recursos disponibles</small></span>';
      }
    }

    const remaining = actions.querySelectorAll('.action-card').length;
    if (!remaining) actions.remove();
    else actions.classList.add('lesson-actions-minimal');
  }

  function cleanLesson() {
    if (!isLessonRoute()) return;
    addStyles();
    removeRedundantProgressChip();
    cleanHostingReferences();
    simplifyActions();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(cleanLesson, 45);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList:true, subtree:true });

  window.ACADEMIA_AG_LESSON_CLEANUP = { release: RELEASE, apply: cleanLesson };
  schedule();
})();
