(() => {
  'use strict';

  const RELEASE = '20260820.43';
  const LEGACY_TITLE = 'utah driver success program';
  let timer = null;

  function hasLegacyTitle(node) {
    return String(node?.textContent || '').toLowerCase().includes(LEGACY_TITLE);
  }

  function cleanLegacyCatalog() {
    document.querySelectorAll('#public-program-grid .catalog-card').forEach(card => {
      if (hasLegacyTitle(card)) card.remove();
    });
  }

  function cleanLegacyEvents() {
    document.querySelectorAll('.calendar-event,.agenda-event,.event-card,.academy-event').forEach(card => {
      if (hasLegacyTitle(card)) card.remove();
    });
  }

  function apply() {
    cleanLegacyCatalog();
    cleanLegacyEvents();
    document.documentElement.dataset.agAcademyRebuildState = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 60);
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  schedule();
})();
