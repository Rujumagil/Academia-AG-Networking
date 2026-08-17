(() => {
  'use strict';

  const RELEASE = '20260817.10';
  let timer = null;

  function route() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return { type: parts[0] || '', courseId: parts[1] || '', lessonId: parts[2] || '' };
  }

  function applyRouteClass() {
    const current = route();
    const lessonMode = current.type === 'lesson' && Boolean(current.lessonId);
    const courseMode = current.type === 'course' && Boolean(current.courseId);
    if (document.body.classList.contains('executive-lesson') !== lessonMode) document.body.classList.toggle('executive-lesson', lessonMode);
    if (document.body.classList.contains('executive-course') !== courseMode) document.body.classList.toggle('executive-course', courseMode);
    if (!lessonMode && document.body.classList.contains('focus-cinema')) document.body.classList.remove('focus-cinema');
  }

  function lessonRows() {
    return [...document.querySelectorAll('.module-panel .lesson-item')]
      .filter(row => !row.classList.contains('utah-module-quiz'));
  }

  function lessonLinks() {
    const seen = new Set();
    return lessonRows()
      .map(row => row.querySelector('a[href^="#lesson/"]'))
      .filter(Boolean)
      .filter(link => {
        const href = link.getAttribute('href');
        if (!href || seen.has(href)) return false;
        seen.add(href);
        return true;
      });
  }

  function markCurrentLesson(lessonId) {
    lessonRows().forEach(row => {
      const link = row.querySelector('a[href^="#lesson/"]');
      const isCurrent = Boolean(link && link.getAttribute('href')?.endsWith(`/${lessonId}`));
      if (row.classList.contains('lesson-current') !== isCurrent) row.classList.toggle('lesson-current', isCurrent);
      if (isCurrent && link.getAttribute('aria-current') !== 'page') link.setAttribute('aria-current', 'page');
      if (!isCurrent && link?.hasAttribute('aria-current')) link.removeAttribute('aria-current');
    });
  }

  function progressData() {
    const rows = lessonRows();
    const total = rows.length;
    const completed = rows.filter(row => row.classList.contains('completed')).length;
    const percent = total ? Math.round((completed / total) * 100) : 0;
    return { total, completed, percent };
  }

  function addProgressCard() {
    const panel = document.querySelector('.module-panel');
    const heading = panel?.querySelector('h2');
    if (!panel || !heading) return;

    const progress = progressData();
    let card = panel.querySelector('.lesson-progress-premium');
    if (!card) {
      card = document.createElement('div');
      card.className = 'lesson-progress-premium';
      card.innerHTML = `
        <div class="lesson-progress-premium-top"><span>Tu avance</span><strong>0%</strong></div>
        <div class="lesson-progress-premium-track" aria-label="Progreso 0%"><span style="width:0%"></span></div>`;
      heading.insertAdjacentElement('afterend', card);
    }

    if (card.dataset.percent === String(progress.percent)) return;
    card.dataset.percent = String(progress.percent);
    const value = card.querySelector('.lesson-progress-premium-top strong');
    const track = card.querySelector('.lesson-progress-premium-track');
    const bar = track?.querySelector('span');
    if (value) value.textContent = `${progress.percent}%`;
    if (track) track.setAttribute('aria-label', `Progreso ${progress.percent}%`);
    if (bar) bar.style.width = `${progress.percent}%`;
  }

  function addExecutiveMeta(lessonId) {
    const subtitle = document.querySelector('.page-subtitle');
    if (!subtitle) return;

    let meta = document.querySelector('.lesson-executive-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'lesson-executive-meta';
      meta.innerHTML = `
        <span class="lesson-executive-chip lesson-position-chip"><strong>Ruta guiada</strong></span>
        <span class="lesson-executive-chip lesson-duration-chip">▶ Video</span>
        <span class="lesson-executive-chip">✓ Progreso guardado</span>
        <button type="button" class="lesson-focus-toggle" aria-pressed="false">▣ Modo cine</button>`;
      subtitle.insertAdjacentElement('afterend', meta);
      meta.querySelector('.lesson-focus-toggle')?.addEventListener('click', event => {
        const active = document.body.classList.toggle('focus-cinema');
        event.currentTarget.setAttribute('aria-pressed', active ? 'true' : 'false');
        event.currentTarget.textContent = active ? '◧ Mostrar navegación' : '▣ Modo cine';
      });
    }

    const links = lessonLinks();
    const activeIndex = links.findIndex(link => link.getAttribute('href')?.endsWith(`/${lessonId}`));
    const activeRow = activeIndex >= 0 ? links[activeIndex].closest('.lesson-item') : null;
    const duration = activeRow?.querySelector(':scope > small')?.textContent?.trim() || 'Video';
    const positionLabel = activeIndex >= 0 ? `Lección ${activeIndex + 1} de ${links.length}` : 'Ruta guiada';
    const positionNode = meta.querySelector('.lesson-position-chip strong');
    const durationNode = meta.querySelector('.lesson-duration-chip');
    if (positionNode && positionNode.textContent !== positionLabel) positionNode.textContent = positionLabel;
    if (durationNode && durationNode.textContent !== `▶ ${duration}`) durationNode.textContent = `▶ ${duration}`;
  }

  function addPrevNext(lessonId) {
    const leftColumn = document.querySelector('.lesson-layout > div:first-child');
    if (!leftColumn) return;
    const links = lessonLinks();
    const currentIndex = links.findIndex(link => link.getAttribute('href')?.endsWith(`/${lessonId}`));
    if (currentIndex < 0) return;

    const prev = links[currentIndex - 1] || null;
    const next = links[currentIndex + 1] || null;
    const signature = `${prev?.getAttribute('href') || 'none'}|${next?.getAttribute('href') || 'none'}`;
    let nav = leftColumn.querySelector('.lesson-nav-premium');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'lesson-nav-premium';
      nav.setAttribute('aria-label', 'Navegación entre lecciones');
      leftColumn.appendChild(nav);
    }
    if (nav.dataset.signature === signature) return;
    nav.dataset.signature = signature;

    const card = (link, direction, fallback) => {
      if (!link) return `<a class="disabled" aria-disabled="true"><small>${direction}</small><strong>${fallback}</strong></a>`;
      const label = link.querySelector('strong')?.textContent?.trim() || fallback;
      return `<a href="${link.getAttribute('href')}"><small>${direction}</small><strong>${label}</strong></a>`;
    };

    nav.innerHTML = `${card(prev, '← Anterior', 'Inicio del curso')}${card(next, 'Siguiente →', 'Fin del curso')}`;
  }

  function enhanceLesson() {
    const current = route();
    if (current.type !== 'lesson' || !current.lessonId || !document.querySelector('.lesson-layout')) return;
    markCurrentLesson(current.lessonId);
    addProgressCard();
    addExecutiveMeta(current.lessonId);
    addPrevNext(current.lessonId);
  }

  function enhance() {
    applyRouteClass();
    enhanceLesson();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 70);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  const observer = new MutationObserver(mutations => {
    const meaningful = mutations.some(mutation => {
      if (mutation.type === 'childList') return mutation.addedNodes.length > 0 || mutation.removedNodes.length > 0;
      if (mutation.type === 'attributes') return mutation.target.classList?.contains('lesson-item');
      return false;
    });
    if (meaningful) schedule();
  });
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  window.ACADEMIA_AG_PREMIUM_LEARNING = { release: RELEASE, enhance };
  schedule();
})();
