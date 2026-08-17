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
    document.body.classList.toggle('executive-lesson', current.type === 'lesson' && Boolean(current.lessonId));
    document.body.classList.toggle('executive-course', current.type === 'course' && Boolean(current.courseId));
    if (current.type !== 'lesson') document.body.classList.remove('focus-cinema');
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
      row.classList.toggle('lesson-current', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'page');
      else link?.removeAttribute('aria-current');
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
    const heading = panel?.querySelector(':scope > h2');
    if (!panel || !heading) return;

    const progress = progressData();
    let card = panel.querySelector('.lesson-progress-premium');
    if (!card) {
      card = document.createElement('div');
      card.className = 'lesson-progress-premium';
      heading.insertAdjacentElement('afterend', card);
    }
    card.innerHTML = `
      <div class="lesson-progress-premium-top">
        <span>Tu avance</span>
        <strong>${progress.percent}%</strong>
      </div>
      <div class="lesson-progress-premium-track" aria-label="Progreso ${progress.percent}%">
        <span style="width:${progress.percent}%"></span>
      </div>`;
  }

  function addExecutiveMeta(lessonId) {
    const title = document.querySelector('.page-title');
    const subtitle = document.querySelector('.page-subtitle');
    if (!title || !subtitle) return;

    let meta = document.querySelector('.lesson-executive-meta');
    if (!meta) {
      meta = document.createElement('div');
      meta.className = 'lesson-executive-meta';
      subtitle.insertAdjacentElement('afterend', meta);
    }

    const links = lessonLinks();
    const activeIndex = links.findIndex(link => link.getAttribute('href')?.endsWith(`/${lessonId}`));
    const activeRow = activeIndex >= 0 ? links[activeIndex].closest('.lesson-item') : null;
    const duration = activeRow?.querySelector(':scope > small')?.textContent?.trim() || 'Video';
    const positionLabel = activeIndex >= 0 ? `Lección ${activeIndex + 1} de ${links.length}` : 'Ruta guiada';

    if (!meta.querySelector('.lesson-focus-toggle')) {
      meta.innerHTML = `
        <span class="lesson-executive-chip"><strong>${positionLabel}</strong></span>
        <span class="lesson-executive-chip">▶ ${duration}</span>
        <span class="lesson-executive-chip">✓ Progreso guardado</span>
        <button type="button" class="lesson-focus-toggle" aria-pressed="false">▣ Modo cine</button>`;
      meta.querySelector('.lesson-focus-toggle')?.addEventListener('click', event => {
        const active = document.body.classList.toggle('focus-cinema');
        event.currentTarget.setAttribute('aria-pressed', active ? 'true' : 'false');
        event.currentTarget.textContent = active ? '◧ Mostrar navegación' : '▣ Modo cine';
      });
    } else {
      const chips = meta.querySelectorAll('.lesson-executive-chip');
      if (chips[0]) chips[0].innerHTML = `<strong>${positionLabel}</strong>`;
      if (chips[1]) chips[1].textContent = `▶ ${duration}`;
    }
  }

  function addPrevNext(lessonId) {
    const leftColumn = document.querySelector('.lesson-layout > div:first-child');
    if (!leftColumn) return;
    const links = lessonLinks();
    const currentIndex = links.findIndex(link => link.getAttribute('href')?.endsWith(`/${lessonId}`));
    if (currentIndex < 0) return;

    const prev = links[currentIndex - 1] || null;
    const next = links[currentIndex + 1] || null;
    let nav = leftColumn.querySelector('.lesson-nav-premium');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'lesson-nav-premium';
      nav.setAttribute('aria-label', 'Navegación entre lecciones');
      leftColumn.appendChild(nav);
    }

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
    timer = setTimeout(enhance, 55);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });

  window.ACADEMIA_AG_PREMIUM_LEARNING = { release: RELEASE, enhance };
  schedule();
})();
