(() => {
  'use strict';

  const RELEASE = '20260824.83';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const EXAM_ONLY_CODES = new Set(['C6-25']);
  const COMPLETE_PERCENTAGE = 98;
  const COMPLETE_REMAINING_SECONDS = 3;
  let timer = null;
  let observer = null;
  let savingLessonId = null;
  let repairKey = '';

  function course() {
    try { return (state?.courses || []).find(item => item.id === COURSE_ID) || null; }
    catch (_) { return null; }
  }

  function context() {
    try {
      const parts = location.hash.replace(/^#/, '').split('/');
      if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
      const target = course();
      if (!target) return null;
      for (const module of target.modules || []) {
        const lesson = (module.lessons || []).find(item => item.id === parts[2]);
        if (lesson) return { course: target, module, lesson };
      }
    } catch (_) {}
    return null;
  }

  function orderedLessons(target = course()) {
    return [...(target?.modules || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .flatMap(module => [...(module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0)));
  }

  function lessonCode(lesson) {
    return String(lesson?.lesson_code || '').trim().toUpperCase();
  }

  function isOptional(lesson) {
    return String(lesson?.lesson_kind || '').toLowerCase() === 'promo' || EXAM_ONLY_CODES.has(lessonCode(lesson));
  }

  function isCloudflare(lesson) {
    return String(lesson?.stream_provider || '').toLowerCase() === 'cloudflare' && Boolean(String(lesson?.stream_uid || '').trim());
  }

  function completed(lessonId) {
    try { return Boolean((state?.progressRows || []).some(row => row.lesson_id === lessonId && row.completed)); }
    catch (_) { return false; }
  }

  function stats(target = course()) {
    const required = orderedLessons(target).filter(item => !isOptional(item));
    const done = required.filter(item => completed(item.id)).length;
    return {
      done,
      total: required.length,
      percentage: required.length ? Math.round((done / required.length) * 100) : 0
    };
  }

  function mergeProgress(row) {
    if (!row || typeof state === 'undefined') return;
    if (!Array.isArray(state.progressRows)) state.progressRows = [];
    const index = state.progressRows.findIndex(item => item.lesson_id === row.lesson_id);
    if (index >= 0) state.progressRows[index] = row;
    else state.progressRows.push(row);
  }

  function refreshProgressUi() {
    const currentCourse = course();
    if (!currentCourse) return;
    const progress = stats(currentCourse);

    document.querySelectorAll('.progress-line').forEach(line => {
      const label = line.querySelector(':scope > span');
      const bar = line.querySelector('.progress-track > span');
      const text = `${progress.percentage}% completado`;
      if (label && label.textContent !== text) label.textContent = text;
      if (bar && bar.style.width !== `${progress.percentage}%`) bar.style.width = `${progress.percentage}%`;
    });

    const panel = document.querySelector('[data-ag-utah-flow70]');
    if (panel) {
      const label = panel.querySelector('.ag-utah-flow70__percent');
      const bar = panel.querySelector('.ag-utah-flow70__track > span');
      const text = `${progress.percentage}% completado`;
      if (label && label.textContent !== text) label.textContent = text;
      if (bar && bar.style.width !== `${progress.percentage}%`) bar.style.width = `${progress.percentage}%`;
    }
  }

  async function markCompleted(ctx, player) {
    if (!ctx?.lesson?.id || isOptional(ctx.lesson) || completed(ctx.lesson.id) || savingLessonId === ctx.lesson.id) return;
    if (typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return;

    const duration = Number(player?.duration || ctx.lesson.stream_duration_seconds || 0);
    const current = Number(player?.currentTime || duration || 0);
    const now = new Date().toISOString();
    const previous = (state.progressRows || []).find(row => row.lesson_id === ctx.lesson.id) || null;

    savingLessonId = ctx.lesson.id;
    try {
      const payload = {
        user_id: state.user.id,
        lesson_id: ctx.lesson.id,
        completed: true,
        completed_at: previous?.completed_at || now,
        last_position_seconds: duration > 0 ? duration : current,
        watch_percentage: 100,
        last_watched_at: now,
        updated_at: now
      };
      const { data, error } = await db.from('lesson_progress')
        .upsert(payload, { onConflict: 'user_id,lesson_id' })
        .select()
        .single();
      if (error) throw error;
      mergeProgress(data || payload);
      refreshProgressUi();
      setTimeout(() => {
        try { window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK?.enhance?.(); } catch (_) {}
        try { window.ACADEMIA_AG_UTAH_STUDENT_FLOW?.apply?.(); } catch (_) {}
        schedule();
      }, 60);
      const status = document.querySelector('[data-utah-stream-status]');
      if (status) {
        status.textContent = 'Video completado. Avance guardado.';
        status.dataset.mode = 'complete';
      }
    } catch (error) {
      console.warn('Auditoría Utah: no se pudo confirmar el progreso.', error);
    } finally {
      savingLessonId = null;
    }
  }

  function nearEnd(player, lesson) {
    const duration = Number(player?.duration || lesson?.stream_duration_seconds || 0);
    const current = Number(player?.currentTime || 0);
    if (!(duration > 0) || current < 0) return false;
    const percentage = current / duration * 100;
    const remaining = Math.max(0, duration - current);
    return percentage >= COMPLETE_PERCENTAGE || remaining <= COMPLETE_REMAINING_SECONDS;
  }

  async function repairStoredProgress() {
    if (typeof db === 'undefined' || typeof state === 'undefined' || !state.user?.id) return;
    const target = course();
    if (!target) return;

    const rows = Array.isArray(state.progressRows) ? state.progressRows : [];
    const candidates = orderedLessons(target).filter(lesson => {
      if (isOptional(lesson)) return false;
      const row = rows.find(item => item.lesson_id === lesson.id);
      return Boolean(row && !row.completed && Number(row.watch_percentage || 0) >= COMPLETE_PERCENTAGE);
    });
    if (!candidates.length) return;
    const candidateKey = candidates.map(lesson => lesson.id).sort().join('|');
    if (candidateKey === repairKey) return;
    repairKey = candidateKey;

    let changed = false;
    for (const lesson of candidates) {
      const previous = rows.find(item => item.lesson_id === lesson.id);
      if (!previous) continue;
      const now = new Date().toISOString();
      const payload = {
        user_id: state.user.id,
        lesson_id: lesson.id,
        completed: true,
        completed_at: previous.completed_at || now,
        last_position_seconds: Math.max(Number(previous.last_position_seconds || 0), Number(lesson.stream_duration_seconds || 0)),
        watch_percentage: 100,
        last_watched_at: previous.last_watched_at || now,
        updated_at: now
      };
      try {
        const { data, error } = await db.from('lesson_progress')
          .upsert(payload, { onConflict: 'user_id,lesson_id' })
          .select()
          .single();
        if (error) throw error;
        mergeProgress(data || payload);
        changed = true;
      } catch (error) {
        console.warn(`Auditoría Utah: no se pudo reparar ${lessonCode(lesson) || lesson.id}.`, error);
      }
    }

    if (changed) {
      refreshProgressUi();
      setTimeout(() => {
        try { window.ACADEMIA_AG_UTAH_SEQUENTIAL_LOCK?.enhance?.(); } catch (_) {}
        try { window.ACADEMIA_AG_UTAH_STUDENT_FLOW?.apply?.(); } catch (_) {}
        schedule();
      }, 60);
    }
  }

  function formatMinutes(seconds) {
    const value = Number(seconds || 0);
    if (!(value > 0)) return '';
    const minutes = Math.max(1, Math.ceil(value / 60));
    return `${minutes} min`;
  }

  function updateDurationRows() {
    const target = course();
    if (!target) return;
    const byId = new Map(orderedLessons(target).map(item => [item.id, item]));
    document.querySelectorAll(`a[href^="#lesson/${COURSE_ID}/"]`).forEach(anchor => {
      const parts = String(anchor.getAttribute('href') || '').split('/');
      const id = parts[2];
      const lesson = byId.get(id);
      const row = anchor.closest('.lesson-item');
      if (!lesson || !row) return;
      const meta = row.querySelector(':scope > small:last-child');
      if (!meta) return;
      if (isOptional(lesson)) {
        if (meta.textContent.trim() === '0 min') meta.textContent = 'Opcional';
        return;
      }
      const duration = formatMinutes(lesson.stream_duration_seconds);
      if (duration && meta.textContent.trim() !== duration) meta.textContent = duration;
      else if (meta.textContent.trim() === '0 min') meta.textContent = 'Video';
    });
  }

  function updateCurrentDuration(player, ctx) {
    const duration = Number(player?.duration || 0);
    if (!(duration > 0) || !ctx?.lesson) return;
    ctx.lesson.stream_duration_seconds = duration;
    updateDurationRows();
  }

  function bindCurrentPlayer() {
    const ctx = context();
    if (!ctx || isOptional(ctx.lesson) || !isCloudflare(ctx.lesson) || completed(ctx.lesson.id) || !window.Stream) return;
    const frame = document.querySelector('[data-utah-stream-frame]');
    if (!frame || frame.dataset.agAuditorBound === ctx.lesson.id) return;
    frame.dataset.agAuditorBound = ctx.lesson.id;

    try {
      const player = window.Stream(frame);
      let finished = false;
      const verify = () => {
        if (finished || completed(ctx.lesson.id) || !nearEnd(player, ctx.lesson)) return;
        finished = true;
        markCompleted(ctx, player).finally(() => {
          if (!completed(ctx.lesson.id)) finished = false;
        });
      };
      player.addEventListener('loadedmetadata', () => updateCurrentDuration(player, ctx));
      player.addEventListener('timeupdate', verify);
      player.addEventListener('pause', verify);
      player.addEventListener('ended', verify);
      if (Number(player.duration || 0) > 0) updateCurrentDuration(player, ctx);
    } catch (error) {
      console.warn('Auditoría Utah: no se pudo añadir el respaldo de progreso.', error);
    }
  }

  function patchSavedLabel() {
    if (!course()) return;
    document.querySelectorAll('span,small,button').forEach(node => {
      const text = node.textContent?.trim();
      if (text === '✓ Progreso guardado') node.textContent = '✓ Lección guardada';
      else if (text === 'Progreso guardado') node.textContent = 'Lección guardada';
    });
  }

  function patchExamOnlyLesson() {
    const ctx = context();
    const examOnly = Boolean(ctx && EXAM_ONLY_CODES.has(lessonCode(ctx.lesson)));
    const root = document.documentElement;
    if (examOnly && !root.hasAttribute('data-ag-utah-exam-only')) root.setAttribute('data-ag-utah-exam-only', '');
    if (!examOnly && root.hasAttribute('data-ag-utah-exam-only')) root.removeAttribute('data-ag-utah-exam-only');
    if (!examOnly) return;

    const title = document.querySelector('.page-title, .lesson-layout h1, main h1');
    if (title && /^(extra|contenido especial del módulo)$/i.test(title.textContent.trim())) {
      title.textContent = 'Evaluación opcional';
    }

    const panel = document.querySelector('[data-ag-utah-flow70]');
    if (panel) {
      const content = panel.querySelector('.ag-utah-flow70__title > span:first-child');
      if (content && !/evaluación opcional/i.test(content.textContent)) content.textContent = 'Evaluación opcional';
      const hint = panel.querySelector('.ag-utah-flow70__hint');
      const message = 'Esta evaluación es opcional, no bloquea tu avance y puedes repetirla cuando quieras.';
      if (hint && hint.textContent !== message) hint.textContent = message;
    }
  }

  function installStyles() {
    if (document.querySelector('#utah-auditor-hotfix-v83-style')) return;
    const style = document.createElement('style');
    style.id = 'utah-auditor-hotfix-v83-style';
    style.textContent = `
      html[data-ag-utah-exam-only] .lesson-layout .video-shell{display:none!important}
      html[data-ag-utah-exam-only] [data-ag-utah-flow70]{margin-top:0!important}
    `;
    document.head.appendChild(style);
  }

  function installProgressOverride() {
    if (window.__AG_UTAH_AUDIT_PROGRESS_V83__) return;
    const previous = typeof window.courseProgress === 'function' ? window.courseProgress : null;
    window.courseProgress = target => target?.id === COURSE_ID ? stats(target).percentage : (previous ? previous(target) : 0);
    window.__AG_UTAH_AUDIT_PROGRESS_V83__ = true;
  }

  function apply() {
    installStyles();
    const target = course();
    if (!target) return;
    installProgressOverride();
    repairStoredProgress();
    updateDurationRows();
    patchSavedLabel();
    patchExamOnlyLesson();
    refreshProgressUi();
    bindCurrentPlayer();
    document.documentElement.dataset.agUtahAuditHotfix = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 80);
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();
  schedule();

  window.ACADEMIA_AG_UTAH_AUDITOR_HOTFIX = {
    release: RELEASE,
    stats,
    isOptional,
    apply
  };
})();
