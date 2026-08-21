(() => {
  'use strict';

  const RELEASE = '20260821.55';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  let timer = null;
  let redirecting = false;

  function isManager() {
    try { return Boolean(isAdmin?.() || isInstructor?.()); }
    catch (_) { return ['admin', 'instructor'].includes(String(state?.profile?.role || '').toLowerCase()); }
  }

  // Por defecto TODOS quedan sujetos al bloqueo, incluso admin/instructor,
  // para que las pruebas reales reproduzcan exactamente la experiencia del alumno.
  // Un manager puede revisar libremente agregando ?ag_admin_bypass=1 a la URL.
  function bypassEnabled() {
    if (!isManager()) return false;
    try { return new URLSearchParams(location.search).get('ag_admin_bypass') === '1'; }
    catch (_) { return false; }
  }

  function targetCourse() {
    try { return (state?.courses || []).find(course => course.id === COURSE_ID) || null; }
    catch (_) { return null; }
  }

  function orderedLessons() {
    const course = targetCourse();
    if (!course) return [];
    return [...(course.modules || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .flatMap(module => [...(module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0)));
  }

  function completed(lessonId) {
    try { return Boolean((state?.progressRows || []).some(row => row.lesson_id === lessonId && row.completed)); }
    catch (_) { return false; }
  }

  function firstIncomplete() {
    return orderedLessons().find(lesson => !completed(lesson.id)) || null;
  }

  function canOpen(lessonId) {
    if (bypassEnabled()) return true;
    if (completed(lessonId)) return true;
    const current = firstIncomplete();
    return Boolean(current && current.id === lessonId);
  }

  function lessonFromHash() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    return orderedLessons().find(lesson => lesson.id === parts[2]) || null;
  }

  function lessonIdFromHref(href = '') {
    const normalized = String(href || '').replace(/^#/, '').split('/');
    if (normalized[0] !== 'lesson' || normalized[1] !== COURSE_ID || !normalized[2]) return null;
    return normalized[2];
  }

  function message(text, type = 'info') {
    if (typeof showToast === 'function') showToast(text, type);
  }

  function injectStyles() {
    if (document.querySelector('#utah-sequential-lock-v55-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-sequential-lock-v55-style';
    style.textContent = `
      .utah-v55-locked{opacity:.46;filter:saturate(.45)}
      .utah-v55-locked>a,.utah-v55-locked>button{cursor:not-allowed!important;pointer-events:auto}
      .utah-v55-lock-label{display:inline-flex;align-items:center;gap:.35rem;margin-top:.18rem;font-size:.72rem;font-weight:800;letter-spacing:.02em;opacity:.9}
      .utah-v55-lock-label::before{content:'🔒';font-size:.76rem}
      .utah-v55-current{outline:1px solid rgba(212,167,74,.45);outline-offset:-1px}
      .utah-v55-sequence-notice{margin:0 0 1rem;padding:.9rem 1rem;border-radius:14px;background:rgba(15,23,42,.06);border:1px solid rgba(15,23,42,.1);font-size:.9rem;line-height:1.45}
      .utah-v55-sequence-notice strong{display:block;margin-bottom:.16rem}
      .utah-v55-sequence-notice.is-complete{background:rgba(22,101,52,.07);border-color:rgba(22,101,52,.16)}
      #complete-current.utah-v55-auto-complete{cursor:default;opacity:.86}
    `;
    document.head.appendChild(style);
  }

  function decorateSidebar() {
    const course = targetCourse();
    if (!course || bypassEnabled()) return;
    const current = firstIncomplete();

    document.querySelectorAll(`a[href^="#lesson/${COURSE_ID}/"]`).forEach(anchor => {
      const lessonId = lessonIdFromHref(anchor.getAttribute('href'));
      if (!lessonId) return;
      const row = anchor.closest('.lesson-item');
      if (!row) return;

      row.classList.remove('utah-v55-locked', 'utah-v55-current');
      row.querySelector('.utah-v55-lock-label')?.remove();

      const done = completed(lessonId);
      const allowed = canOpen(lessonId);
      row.classList.toggle('utah-v55-current', Boolean(current && current.id === lessonId && !done));
      row.classList.toggle('utah-v55-locked', !allowed);
      anchor.setAttribute('aria-disabled', allowed ? 'false' : 'true');
      anchor.tabIndex = allowed ? 0 : -1;
      anchor.title = allowed ? '' : 'Termina el tema anterior para desbloquear esta lección.';

      if (!allowed) {
        const label = document.createElement('span');
        label.className = 'utah-v55-lock-label';
        label.textContent = 'Bloqueado hasta terminar el tema anterior';
        anchor.appendChild(label);
      }

      const button = row.querySelector('[data-complete]');
      if (button) {
        button.disabled = true;
        button.title = done ? 'Tema completado' : 'El progreso se registra al terminar el video.';
        button.textContent = done ? '✓' : allowed ? '▶' : '🔒';
      }
    });
  }

  function decorateCurrentLesson() {
    const lesson = lessonFromHash();
    if (!lesson || bypassEnabled()) return;

    const completeButton = document.querySelector('#complete-current');
    if (completeButton) {
      completeButton.disabled = true;
      completeButton.classList.add('utah-v55-auto-complete');
      const strong = completeButton.querySelector('strong');
      const small = completeButton.querySelector('small');
      if (strong) strong.textContent = completed(lesson.id) ? '✓ Tema completado' : '○ Se completa al terminar el video';
      if (small) small.textContent = completed(lesson.id)
        ? 'Tu progreso quedó guardado en tu cuenta.'
        : 'No necesitas marcarlo manualmente.';
    }

    const host = document.querySelector('.lesson-layout > div:first-child');
    const shell = host?.querySelector('.video-shell');
    if (!host || !shell) return;
    let notice = host.querySelector('.utah-v55-sequence-notice');
    if (!notice) {
      notice = document.createElement('div');
      notice.className = 'utah-v55-sequence-notice';
      shell.insertAdjacentElement('afterend', notice);
    }

    const done = completed(lesson.id);
    notice.classList.toggle('is-complete', done);
    notice.innerHTML = done
      ? '<strong>✓ Tema completado</strong>Puedes repasar esta lección y continuar con el siguiente contenido desbloqueado.'
      : '<strong>🔒 Avance secuencial obligatorio</strong>Termina este video para desbloquear el siguiente tema. No puedes avanzar manualmente.';
  }

  function guardRoute() {
    if (bypassEnabled() || redirecting) return false;
    const lesson = lessonFromHash();
    if (!lesson || canOpen(lesson.id)) return false;

    const current = firstIncomplete();
    if (!current) return false;
    redirecting = true;
    message('Este tema sigue bloqueado. Termina primero el video anterior.', 'info');
    const target = `#lesson/${COURSE_ID}/${current.id}`;
    if (location.hash !== target) history.replaceState(null, '', target);
    try {
      if (typeof route === 'function') route();
      else location.hash = target;
    } finally {
      setTimeout(() => { redirecting = false; schedule(); }, 180);
    }
    return true;
  }

  function enhance() {
    injectStyles();
    if (!targetCourse()) return;
    if (guardRoute()) return;
    decorateSidebar();
    decorateCurrentLesson();
    document.documentElement.dataset.agUtahSequentialLock = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 55);
  }

  document.addEventListener('click', event => {
    if (bypassEnabled()) return;

    const completeControl = event.target.closest('[data-complete], #complete-current');
    if (completeControl) {
      const currentLesson = lessonFromHash();
      const buttonLessonId = completeControl.dataset?.complete;
      const belongsToUtah = Boolean(currentLesson || (buttonLessonId && orderedLessons().some(item => item.id === buttonLessonId)));
      if (belongsToUtah) {
        event.preventDefault();
        event.stopImmediatePropagation();
        message('El tema se completa automáticamente al terminar el video.', 'info');
        return;
      }
    }

    const anchor = event.target.closest('a[href^="#lesson/"]');
    if (!anchor) return;
    const lessonId = lessonIdFromHref(anchor.getAttribute('href'));
    if (!lessonId || canOpen(lessonId)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    message('Este tema está bloqueado. Termina primero el video anterior.', 'info');
  }, true);

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK = { release: RELEASE, canOpen, firstIncomplete, bypassEnabled, enhance };
  schedule();
})();
