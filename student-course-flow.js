(() => {
  'use strict';

  const RELEASE = '20260819.14';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const MANUAL_TITLE_RE = /manual\s+de\s+actividades\s+del\s+alumno|manual.*alumno/i;
  let timer = null;
  let marking = false;
  let lastEndedLesson = '';

  function addStyles() {
    if (document.querySelector('#ag-student-course-flow-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-student-course-flow-style';
    style.textContent = `
      #material-button{display:none!important}
      #material-button.ag-final-manual{display:flex!important}

      .lesson-item.ag-lesson-locked{opacity:.48!important;filter:saturate(.65)!important}
      .lesson-item.ag-lesson-locked a{pointer-events:none!important;cursor:not-allowed!important}
      .lesson-item.ag-lesson-locked>small:last-child{opacity:.5!important}
      .ag-lock-badge{
        display:inline-flex!important;align-items:center!important;gap:5px!important;margin-top:5px!important;
        font-size:.68rem!important;font-weight:700!important;letter-spacing:.02em!important;color:#91a6a0!important
      }
      .ag-lock-badge svg{
        width:12px!important;height:12px!important;fill:none!important;stroke:currentColor!important;stroke-width:1.8!important;
        stroke-linecap:round!important;stroke-linejoin:round!important
      }
      .lesson-item button[data-complete].ag-video-status-control{cursor:default!important;pointer-events:none!important}
      #complete-current.ag-video-progress-status{cursor:default!important;pointer-events:none!important;opacity:.95!important}
      .library-material-card.ag-manual-locked,.library-book-card.ag-manual-locked,[data-resource-title].ag-manual-locked{display:none!important}
      .ag-final-manual strong{display:flex!important;align-items:center!important;gap:8px!important}
      .ag-final-manual strong::before{
        content:'';width:18px;height:18px;flex:0 0 18px;background:currentColor;
        mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3v11M8 10l4 4 4-4M5 20h14' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat;
        -webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M12 3v11M8 10l4 4 4-4M5 20h14' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") center/contain no-repeat
      }
    `;
    document.head.appendChild(style);
  }

  function appReady() {
    return typeof state !== 'undefined' && Array.isArray(state.courses) && Array.isArray(state.progressRows);
  }

  function course() {
    if (!appReady()) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function lessons() {
    const current = course();
    if (!current?.modules?.length) return [];
    return current.modules.flatMap(module => module.lessons || []);
  }

  function isCompleted(lessonId) {
    if (!appReady()) return false;
    return state.progressRows.some(row => row.lesson_id === lessonId && row.completed);
  }

  function firstIncompleteIndex() {
    const items = lessons();
    return items.findIndex(item => !isCompleted(item.id));
  }

  function activeLessonId() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'lesson' && parts[1] === COURSE_ID ? (parts[2] || '') : '';
  }

  function activeLesson() {
    const id = activeLessonId();
    return lessons().find(item => item.id === id) || null;
  }

  function activeLessonIndex() {
    const id = activeLessonId();
    return lessons().findIndex(item => item.id === id);
  }

  function isVideoLesson(lesson) {
    if (!lesson) return false;
    return lesson.lesson_type === 'video'
      || lesson.video_provider === 'youtube'
      || lesson.video_provider === 'pending'
      || Boolean(String(lesson.video_url || '').trim());
  }

  function manualResource() {
    if (!appReady()) return null;
    return state.resources.find(resource =>
      resource.course_id === COURSE_ID && MANUAL_TITLE_RE.test(String(resource.title || ''))
    ) || null;
  }

  function manualIsUnlocked() {
    const items = lessons();
    if (!items.length) return false;
    return items.every(item => isCompleted(item.id));
  }

  function lockIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  }

  function decorateLockedRow(row, locked) {
    if (!row) return;
    row.classList.toggle('ag-lesson-locked', locked);
    const anchor = row.querySelector('a[href^="#lesson/"]');
    if (!anchor) return;
    anchor.setAttribute('aria-disabled', locked ? 'true' : 'false');
    anchor.tabIndex = locked ? -1 : 0;

    let badge = anchor.querySelector('.ag-lock-badge');
    if (locked && !badge) {
      badge = document.createElement('span');
      badge.className = 'ag-lock-badge';
      badge.innerHTML = `${lockIcon()}<span>Completa el video anterior</span>`;
      anchor.appendChild(badge);
    }
    if (!locked) badge?.remove();
  }

  function applySequentialLocks() {
    if (!appReady()) return;
    const items = lessons();
    if (!items.length) return;
    const firstIncomplete = firstIncompleteIndex();

    document.querySelectorAll(`.module-panel .lesson-item a[href^="#lesson/${COURSE_ID}/"], .lesson-list .lesson-item a[href^="#lesson/${COURSE_ID}/"]`).forEach(anchor => {
      const lessonId = anchor.getAttribute('href')?.split('/')[2] || '';
      const index = items.findIndex(item => item.id === lessonId);
      if (index < 0) return;
      const alreadyDone = isCompleted(lessonId);
      const locked = firstIncomplete >= 0 && index > firstIncomplete && !alreadyDone;
      decorateLockedRow(anchor.closest('.lesson-item'), locked);

      const statusButton = anchor.closest('.lesson-item')?.querySelector('button[data-complete]');
      const lesson = items[index];
      if (statusButton && isVideoLesson(lesson)) {
        statusButton.disabled = true;
        statusButton.classList.add('ag-video-status-control');
        statusButton.setAttribute('aria-label', alreadyDone ? 'Video completado' : 'Progreso automático');
      }
    });
  }

  function enforceRouteLock() {
    if (!appReady()) return false;
    const targetId = activeLessonId();
    if (!targetId) return false;
    const items = lessons();
    const targetIndex = items.findIndex(item => item.id === targetId);
    const firstIncomplete = firstIncompleteIndex();
    if (targetIndex < 0 || firstIncomplete < 0) return false;

    if (targetIndex > firstIncomplete && !isCompleted(targetId)) {
      const allowed = items[firstIncomplete];
      if (allowed) {
        if (typeof showToast === 'function') showToast('Termina el video actual para desbloquear el siguiente tema.', 'info');
        location.replace(`#lesson/${COURSE_ID}/${allowed.id}`);
        return true;
      }
    }
    return false;
  }

  function configureCurrentProgressCard() {
    const lesson = activeLesson();
    const button = document.querySelector('#complete-current');
    if (!button || !lesson) return;

    if (!isVideoLesson(lesson)) {
      button.classList.remove('ag-video-progress-status');
      button.disabled = false;
      return;
    }

    let target = button;
    if (!button.classList.contains('ag-video-progress-status')) {
      target = button.cloneNode(true);
      target.id = 'complete-current';
      target.disabled = true;
      target.classList.add('ag-video-progress-status');
      button.replaceWith(target);
    }

    const strong = target.querySelector('strong');
    const small = target.querySelector('small');
    const done = isCompleted(lesson.id);
    if (strong) strong.textContent = done ? '✓ Video completado' : 'Progreso automático';
    if (small) small.textContent = done
      ? 'Este tema ya está registrado en tu progreso.'
      : 'Se completa automáticamente al terminar el video.';
  }

  function configureMaterialButton() {
    const button = document.querySelector('#material-button');
    if (!button) return;

    const items = lessons();
    const index = activeLessonIndex();
    const isFinalLesson = items.length > 0 && index === items.length - 1;

    if (!isFinalLesson) {
      button.remove();
      return;
    }

    const manual = manualResource();
    let target = button;
    if (!button.classList.contains('ag-final-manual')) {
      target = button.cloneNode(true);
      target.id = 'material-button';
      target.classList.add('ag-final-manual');
      button.replaceWith(target);
    }

    const strong = target.querySelector('strong');
    const small = target.querySelector('small');
    if (strong) strong.textContent = 'Descargar manual del alumno';

    if (!manual || !manualIsUnlocked()) {
      target.disabled = true;
      target.onclick = null;
      if (small) small.textContent = manual
        ? 'Termina el mensaje final para habilitar tu manual.'
        : 'Manual en preparación';
      return;
    }

    target.disabled = false;
    if (small) small.textContent = 'PDF · Material final del curso';
    target.onclick = event => {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (typeof openResource === 'function') openResource(manual.id);
    };
  }

  function hideManualFromLibraryUntilFinal() {
    const unlocked = manualIsUnlocked();
    document.querySelectorAll('[data-resource-title], .library-material-card, .library-book-card').forEach(card => {
      const text = `${card.getAttribute('data-resource-title') || ''} ${card.textContent || ''}`;
      if (!MANUAL_TITLE_RE.test(text)) return;
      card.classList.toggle('ag-manual-locked', !unlocked);
    });
  }

  async function markVideoCompleted(lessonId) {
    if (!appReady() || marking || !lessonId || isCompleted(lessonId)) return;
    if (typeof db === 'undefined' || !state.user?.id) return;

    marking = true;
    const now = new Date().toISOString();
    const payload = {
      user_id: state.user.id,
      lesson_id: lessonId,
      completed: true,
      completed_at: now,
      updated_at: now
    };

    try {
      const { data, error } = await db
        .from('lesson_progress')
        .upsert(payload, { onConflict: 'user_id,lesson_id' })
        .select()
        .single();

      if (error) throw error;
      const index = state.progressRows.findIndex(row => row.lesson_id === lessonId);
      if (index >= 0) state.progressRows[index] = data;
      else state.progressRows.push(data);

      if (typeof showToast === 'function') showToast('Video completado. Ya puedes continuar al siguiente tema.', 'success');
      applySequentialLocks();
      configureCurrentProgressCard();
      configureMaterialButton();
      hideManualFromLibraryUntilFinal();
    } catch (error) {
      console.error('No se pudo guardar la finalización automática del video:', error);
      if (typeof showToast === 'function') showToast('No pudimos guardar tu avance. Intenta nuevamente.', 'error');
    } finally {
      marking = false;
    }
  }

  function watchForVideoEnd() {
    const overlay = document.querySelector('.lesson-layout .youtube-lesson-ended');
    const lesson = activeLesson();
    if (!overlay || !lesson || !isVideoLesson(lesson)) return;
    if (lastEndedLesson === lesson.id && isCompleted(lesson.id)) return;
    lastEndedLesson = lesson.id;
    markVideoCompleted(lesson.id);
  }

  function apply() {
    addStyles();
    if (!appReady()) return;
    if (enforceRouteLock()) return;
    applySequentialLocks();
    configureCurrentProgressCard();
    configureMaterialButton();
    hideManualFromLibraryUntilFinal();
    watchForVideoEnd();
    document.documentElement.dataset.agCourseFlow = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 40);
  }

  document.addEventListener('click', event => {
    const anchor = event.target.closest(`a[href^="#lesson/${COURSE_ID}/"]`);
    if (!anchor || !appReady()) return;
    const targetId = anchor.getAttribute('href')?.split('/')[2] || '';
    const items = lessons();
    const index = items.findIndex(item => item.id === targetId);
    const firstIncomplete = firstIncompleteIndex();
    if (index >= 0 && firstIncomplete >= 0 && index > firstIncomplete && !isCompleted(targetId)) {
      event.preventDefault();
      event.stopPropagation();
      if (typeof showToast === 'function') showToast('Termina el video actual para desbloquear el siguiente tema.', 'info');
    }
  }, true);

  const observer = new MutationObserver(schedule);
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.addEventListener('hashchange', () => {
    lastEndedLesson = '';
    schedule();
  });
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });

  const interval = setInterval(apply, 500);
  setTimeout(() => clearInterval(interval), 180000);

  window.ACADEMIA_AG_STUDENT_COURSE_FLOW = { release: RELEASE, apply };
  schedule();
})();
