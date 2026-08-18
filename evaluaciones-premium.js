(() => {
  'use strict';

  const RELEASE = '20260817.17';
  let timer = null;

  const icons = {
    assigned: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="4" width="14" height="16" rx="2"/><path d="M9 4.5V3h6v1.5M9 9h6M9 13h6M9 17h4"/></svg>',
    approved: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8.5 12 2.2 2.3 4.8-5"/></svg>',
    attempts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 12a8 8 0 1 1-2.3-5.7L20 8"/><path d="M20 4v4h-4"/><path d="M12 8v4l2.6 1.6"/></svg>'
  };

  function isEvaluationsRoute() {
    const hash = location.hash.replace(/^#/, '');
    return hash === 'evaluations' || hash.startsWith('evaluation/');
  }

  function parseAttempts(card) {
    const meta = card.querySelectorAll('.evaluation-meta strong');
    const value = meta?.[1]?.textContent || '0/0';
    const current = Number((value.match(/^\s*(\d+)/) || [])[1] || 0);
    return Number.isFinite(current) ? current : 0;
  }

  function enhanceList(page) {
    const grid = page.querySelector('.evaluation-grid');
    if (!grid) return;

    const cards = [...grid.querySelectorAll('.evaluation-card')];
    cards.forEach(card => {
      const status = card.querySelector('.status-pill')?.textContent.trim().toLowerCase() || '';
      card.dataset.evaluationState = status.includes('aprob') ? 'approved' : status.includes('intent') ? 'attempted' : 'pending';
    });

    if (!cards.length || page.querySelector('.evaluation-overview')) return;

    const approved = cards.filter(card => card.dataset.evaluationState === 'approved').length;
    const attempts = cards.reduce((sum, card) => sum + parseAttempts(card), 0);

    const overview = document.createElement('section');
    overview.className = 'evaluation-overview';
    overview.setAttribute('aria-label', 'Resumen de evaluaciones');
    overview.innerHTML = `
      <article>
        <span class="evaluation-overview-icon">${icons.assigned}</span>
        <div><strong>${cards.length}</strong><small>${cards.length === 1 ? 'Evaluación asignada' : 'Evaluaciones asignadas'}</small></div>
      </article>
      <article>
        <span class="evaluation-overview-icon">${icons.approved}</span>
        <div><strong>${approved}</strong><small>${approved === 1 ? 'Evaluación aprobada' : 'Evaluaciones aprobadas'}</small></div>
      </article>
      <article>
        <span class="evaluation-overview-icon">${icons.attempts}</span>
        <div><strong>${attempts}</strong><small>${attempts === 1 ? 'Intento realizado' : 'Intentos realizados'}</small></div>
      </article>`;

    const heading = page.querySelector('.courses-page-heading');
    if (heading?.nextSibling) heading.parentNode.insertBefore(overview, heading.nextSibling);
    else if (heading) heading.insertAdjacentElement('afterend', overview);
  }

  function enhance() {
    if (!isEvaluationsRoute()) return;
    const page = document.querySelector('#page');
    if (!page) return;
    page.classList.add('evaluations-premium-page');
    enhanceList(page);
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 50);
  }

  window.addEventListener('hashchange', schedule);
  const root = document.querySelector('#app') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
  window.ACADEMIA_AG_EVALUATIONS_PREMIUM = { release: RELEASE, enhance };
  schedule();
})();
