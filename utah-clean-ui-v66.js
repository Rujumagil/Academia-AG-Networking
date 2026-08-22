(() => {
  'use strict';

  const RELEASE = '20260822.66';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const INTRO_MODULE_ID = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001';
  let timer = null;
  let observer = null;

  function injectStyles() {
    if (document.querySelector('#utah-clean-ui-v66-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-clean-ui-v66-style';
    style.textContent = `
      html[data-ag-utah-clean-ui="1"] .ag-stream46-status[data-utah-stream-status]:not([data-mode="error"]) {
        display: none !important;
      }

      html[data-ag-utah-clean-ui="1"] .utah-v56-sequence-notice:not(.is-optional),
      html[data-ag-utah-clean-ui="1"] .utah-v55-sequence-notice:not(.is-optional) {
        display: none !important;
      }

      html[data-ag-utah-clean-ui="1"][data-ag-utah-intro="0"] #material-button {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }

  function currentContext() {
    try {
      if (typeof state === 'undefined') return null;
      const parts = location.hash.replace(/^#/, '').split('/');
      if (parts[0] !== 'lesson' || !parts[1] || !parts[2]) return null;
      const course = (state.courses || []).find(item => item.id === parts[1] || item.slug === parts[1]);
      if (!course || course.id !== COURSE_ID) return null;
      for (const module of course.modules || []) {
        const lesson = (module.lessons || []).find(item => item.id === parts[2]);
        if (lesson) return { course, module, lesson };
      }
    } catch (error) {
      console.warn('Utah clean UI context:', error);
    }
    return null;
  }

  function apply() {
    injectStyles();
    const ctx = currentContext();
    const root = document.documentElement;

    if (!ctx) {
      delete root.dataset.agUtahCleanUi;
      delete root.dataset.agUtahIntro;
      return;
    }

    root.dataset.agUtahCleanUi = '1';
    root.dataset.agUtahIntro = ctx.module.id === INTRO_MODULE_ID ? '1' : '0';

    const materialButton = document.querySelector('#material-button');
    if (materialButton) {
      const showMaterial = ctx.module.id === INTRO_MODULE_ID;
      materialButton.hidden = !showMaterial;
      materialButton.setAttribute('aria-hidden', showMaterial ? 'false' : 'true');
    }

    document.querySelectorAll('.ag-stream46-status[data-utah-stream-status]').forEach(node => {
      node.hidden = node.dataset.mode !== 'error';
    });

    document.querySelectorAll('.utah-v56-sequence-notice:not(.is-optional), .utah-v55-sequence-notice:not(.is-optional)').forEach(node => {
      node.hidden = true;
    });

    document.documentElement.dataset.agUtahCleanUiRelease = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 40);
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    observer.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['data-mode', 'class'] });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();
  schedule();

  window.ACADEMIA_AG_UTAH_CLEAN_UI = { release: RELEASE, apply };
})();
