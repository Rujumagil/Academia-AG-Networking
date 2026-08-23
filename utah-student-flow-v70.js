(() => {
  'use strict';

  const RELEASE = '20260823.70';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  let timer = null;
  let observer = null;

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
      console.warn('Utah student flow context:', error);
    }
    return null;
  }

  function orderedModules(course) {
    return [...(course?.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  }

  function orderedLessons(course) {
    return orderedModules(course).flatMap(module =>
      [...(module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
    );
  }

  function isOptional(lesson) {
    return String(lesson?.lesson_kind || '').toLowerCase() === 'promo';
  }

  function isCompleted(lessonId) {
    try {
      return Boolean((state.progressRows || []).some(row => row.lesson_id === lessonId && row.completed));
    } catch (_) {
      return false;
    }
  }

  function progressStats(course) {
    const required = orderedLessons(course).filter(lesson => !isOptional(lesson));
    const completed = required.filter(lesson => isCompleted(lesson.id)).length;
    return {
      completed,
      total: required.length,
      percentage: required.length ? Math.round((completed / required.length) * 100) : 0
    };
  }

  function escapeHtml(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  function injectStyles() {
    if (document.querySelector('#utah-student-flow-v70-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-student-flow-v70-style';
    style.textContent = `
      html[data-ag-utah-flow="1"] .ag-utah-flow70{margin:18px 0 26px;padding:18px;border:1px solid rgba(30,41,59,.12);border-radius:18px;background:#fff;box-shadow:0 12px 30px rgba(15,23,42,.08)}
      .ag-utah-flow70__top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}
      .ag-utah-flow70__eyebrow{display:block;margin:0 0 4px;color:#64748b;font-size:.74rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
      .ag-utah-flow70__title{display:flex;align-items:center;gap:9px;flex-wrap:wrap;color:#1e293b;font-size:1rem;font-weight:800}
      .ag-utah-flow70__badge{display:inline-flex;align-items:center;min-height:26px;padding:4px 9px;border-radius:999px;background:#edf7f2;color:#005134;font-size:.72rem;font-weight:800}
      .ag-utah-flow70__percent{color:#1e293b;font-size:.92rem;font-weight:800;white-space:nowrap}
      .ag-utah-flow70__track{height:8px;margin:13px 0 16px;border-radius:999px;background:#e8edf2;overflow:hidden}
      .ag-utah-flow70__track>span{display:block;height:100%;border-radius:inherit;background:#005134;transition:width .25s ease}
      .ag-utah-flow70__actions{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);gap:10px;align-items:center}
      .ag-utah-flow70__btn{display:flex;align-items:center;justify-content:center;min-height:44px;padding:10px 14px;border:1px solid #d8dee6;border-radius:12px;background:#fff;color:#1e293b;text-decoration:none;font-size:.88rem;font-weight:750;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease}
      .ag-utah-flow70__btn:hover{transform:translateY(-1px);border-color:#9ca8b6;box-shadow:0 8px 18px rgba(15,23,42,.08)}
      .ag-utah-flow70__btn.is-primary{background:#1e293b;border-color:#1e293b;color:#fff}
      .ag-utah-flow70__btn.is-disabled{opacity:.42;pointer-events:none}
      .ag-utah-flow70__hint{margin:13px 0 0;color:#64748b;font-size:.78rem;line-height:1.5;text-align:center}
      .lesson-item.ag-utah-current70{position:relative;background:rgba(0,81,52,.055)!important;border-color:rgba(0,81,52,.18)!important}
      .lesson-item.ag-utah-current70>a{color:#005134!important}
      .ag-utah-current70-label{display:inline-flex;margin-left:7px;padding:2px 7px;border-radius:999px;background:#005134;color:#fff;font-size:.62rem;font-weight:800;vertical-align:middle}
      html[data-ag-utah-flow="1"][data-ag-utah-auto-track="1"] #complete-current{display:none!important}
      @media(max-width:720px){
        html[data-ag-utah-flow="1"] .ag-utah-flow70{margin:14px 0 20px;padding:15px;border-radius:15px}
        .ag-utah-flow70__top{gap:10px}
        .ag-utah-flow70__title{font-size:.92rem}
        .ag-utah-flow70__percent{font-size:.82rem}
        .ag-utah-flow70__actions{grid-template-columns:1fr 1fr}
        .ag-utah-flow70__btn.is-course{grid-column:1/-1;grid-row:2}
        .ag-utah-flow70__btn{min-height:42px;padding:9px 10px;font-size:.82rem}
      }
    `;
    document.head.appendChild(style);
  }

  function clearSidebarState() {
    document.querySelectorAll('.lesson-item.ag-utah-current70').forEach(row => row.classList.remove('ag-utah-current70'));
    document.querySelectorAll('.ag-utah-current70-label').forEach(node => node.remove());
    document.querySelectorAll(`a[href^="#lesson/${COURSE_ID}/"]`).forEach(anchor => anchor.removeAttribute('aria-current'));
  }

  function markCurrentLesson(ctx) {
    clearSidebarState();
    const href = `#lesson/${ctx.course.id}/${ctx.lesson.id}`;
    const anchor = [...document.querySelectorAll(`a[href^="#lesson/${COURSE_ID}/"]`)]
      .find(node => node.getAttribute('href') === href);
    if (!anchor) return;
    anchor.setAttribute('aria-current', 'page');
    const row = anchor.closest('.lesson-item');
    if (!row) return;
    row.classList.add('ag-utah-current70');
    const strong = anchor.querySelector('strong');
    if (strong && !strong.querySelector('.ag-utah-current70-label')) {
      const badge = document.createElement('span');
      badge.className = 'ag-utah-current70-label';
      badge.textContent = 'Actual';
      strong.appendChild(badge);
    }
  }

  function isAutoTrackedVideo(lesson) {
    return String(lesson?.stream_provider || '').toLowerCase() === 'cloudflare'
      && Boolean(String(lesson?.stream_uid || '').trim());
  }

  function renderPanel(ctx) {
    const lessons = orderedLessons(ctx.course);
    if (!lessons.length) return;
    const index = lessons.findIndex(item => item.id === ctx.lesson.id);
    const previous = index > 0 ? lessons[index - 1] : null;
    const next = index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null;
    const stats = progressStats(ctx.course);
    const currentDone = isCompleted(ctx.lesson.id);
    const optional = isOptional(ctx.lesson);
    const shell = document.querySelector('.lesson-layout .video-shell');
    if (!shell) return;

    let panel = document.querySelector('[data-ag-utah-flow70]');
    if (!panel) {
      panel = document.createElement('section');
      panel.className = 'ag-utah-flow70';
      panel.dataset.agUtahFlow70 = '1';
      shell.insertAdjacentElement('afterend', panel);
    } else if (panel.previousElementSibling !== shell) {
      shell.insertAdjacentElement('afterend', panel);
    }

    const contentLabel = optional ? 'Evaluación opcional' : `Tema ${Math.max(index + 1, 1)} de ${lessons.length}`;
    panel.innerHTML = `
      <div class="ag-utah-flow70__top">
        <div>
          <span class="ag-utah-flow70__eyebrow">Tu avance en el programa</span>
          <div class="ag-utah-flow70__title">
            <span>${escapeHtml(contentLabel)}</span>
            ${currentDone ? '<span class="ag-utah-flow70__badge">Completado</span>' : ''}
          </div>
        </div>
        <span class="ag-utah-flow70__percent">${stats.percentage}% completado</span>
      </div>
      <div class="ag-utah-flow70__track" aria-label="Progreso del curso"><span style="width:${stats.percentage}%"></span></div>
      <div class="ag-utah-flow70__actions">
        ${previous
          ? `<a class="ag-utah-flow70__btn" href="#lesson/${ctx.course.id}/${previous.id}" aria-label="Tema anterior">← Anterior</a>`
          : '<span class="ag-utah-flow70__btn is-disabled" aria-disabled="true">← Anterior</span>'}
        <a class="ag-utah-flow70__btn is-course" href="#course/${ctx.course.id}">Ver programa</a>
        ${next
          ? `<a class="ag-utah-flow70__btn is-primary" href="#lesson/${ctx.course.id}/${next.id}" aria-label="Siguiente tema">Siguiente →</a>`
          : `<a class="ag-utah-flow70__btn is-primary" href="#course/${ctx.course.id}">Finalizar revisión</a>`}
      </div>
      <p class="ag-utah-flow70__hint">${isAutoTrackedVideo(ctx.lesson)
        ? 'Tu avance se registra automáticamente al terminar el video. Puedes revisar cualquier tema cuando lo necesites.'
        : 'Puedes avanzar libremente por el programa y volver a cualquier tema cuando lo necesites.'}</p>`;
  }

  function clear() {
    document.documentElement.removeAttribute('data-ag-utah-flow');
    document.documentElement.removeAttribute('data-ag-utah-auto-track');
    document.querySelector('[data-ag-utah-flow70]')?.remove();
    clearSidebarState();
  }

  function apply() {
    injectStyles();
    const ctx = currentContext();
    if (!ctx) {
      clear();
      return;
    }

    document.documentElement.dataset.agUtahFlow = '1';
    document.documentElement.dataset.agUtahAutoTrack = isAutoTrackedVideo(ctx.lesson) ? '1' : '0';
    markCurrentLesson(ctx);
    renderPanel(ctx);
    document.documentElement.dataset.agUtahFlowRelease = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 55);
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();
  schedule();

  window.ACADEMIA_AG_UTAH_STUDENT_FLOW = { release: RELEASE, apply };
})();
