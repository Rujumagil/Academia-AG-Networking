(() => {
  'use strict';

  const RELEASE = '20260819.15';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const EXAM_MODULE_IDS = [
    '11111111-aaaa-4111-8111-111111111111',
    '11111111-bbbb-4111-8111-111111111111',
    '11111111-cccc-4111-8111-111111111111',
    '11111111-dddd-4111-8111-111111111111',
    '11111111-eeee-4111-8111-111111111111',
    '11111111-ffff-4111-8111-111111111111'
  ];
  const EXAM_MODULE_SET = new Set(EXAM_MODULE_IDS);

  let examPassed = new Map();
  let examBest = new Map();
  let statusesLoaded = false;
  let loadingStatuses = null;
  let timer = null;

  function addStyles() {
    if (document.querySelector('#ag-questionnaire-flow-styles')) return;
    const style = document.createElement('style');
    style.id = 'ag-questionnaire-flow-styles';
    style.textContent = `
      .utah-module-quiz.ag-questionnaire-locked{
        opacity:.5!important;
        filter:saturate(.7)!important;
      }
      .utah-module-quiz.ag-questionnaire-locked a{
        pointer-events:none!important;
        cursor:not-allowed!important;
      }
      .utah-module-quiz.ag-questionnaire-ready{
        border-color:rgba(120,199,166,.22)!important;
      }
      .utah-module-quiz.ag-questionnaire-passed .utah-quiz-dot{
        background:rgba(120,199,166,.18)!important;
        color:#0f6b4e!important;
        border-color:rgba(0,81,52,.24)!important;
      }
      .ag-questionnaire-state{
        display:inline-flex!important;
        align-items:center!important;
        gap:6px!important;
        margin-top:5px!important;
        font-size:.68rem!important;
        font-weight:800!important;
        color:#8fa49e!important;
      }
      .ag-questionnaire-ready .ag-questionnaire-state{color:#6fc9a4!important}
      .ag-questionnaire-passed .ag-questionnaire-state{color:#4dbb8e!important}
      .ag-questionnaire-state svg{
        width:12px!important;height:12px!important;fill:none!important;
        stroke:currentColor!important;stroke-width:1.8!important;
        stroke-linecap:round!important;stroke-linejoin:round!important;
      }
      .lesson-item.ag-exam-gate-locked{
        opacity:.48!important;
        filter:saturate(.65)!important;
      }
      .lesson-item.ag-exam-gate-locked a[href^="#lesson/"]{
        pointer-events:none!important;
        cursor:not-allowed!important;
      }
      .ag-exam-gate-note{
        display:inline-flex!important;align-items:center!important;gap:5px!important;
        margin-top:5px!important;font-size:.68rem!important;font-weight:800!important;
        color:#91a6a0!important;
      }
      .ag-exam-gate-note svg{
        width:12px!important;height:12px!important;fill:none!important;stroke:currentColor!important;
        stroke-width:1.8!important;stroke-linecap:round!important;stroke-linejoin:round!important;
      }
      .module-exam-card.ag-questionnaire-card-locked .module-exam-form{display:none!important}
      .ag-questionnaire-gate{
        margin-top:16px;padding:16px 17px;border-radius:16px;
        border:1px solid rgba(120,199,166,.16);
        background:rgba(120,199,166,.06);
        display:flex;align-items:flex-start;gap:12px;color:#dce8e3;
      }
      .ag-questionnaire-gate-icon{
        width:34px;height:34px;flex:0 0 34px;border-radius:11px;
        display:grid;place-items:center;background:rgba(120,199,166,.11);color:#8bd3b4;
      }
      .ag-questionnaire-gate-icon svg{
        width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:1.8;
        stroke-linecap:round;stroke-linejoin:round;
      }
      .ag-questionnaire-gate strong{display:block;color:#fff;font-size:.86rem;margin-bottom:4px}
      .ag-questionnaire-gate span{display:block;color:#9fb2aa;font-size:.76rem;line-height:1.45}
      #material-button.ag-questionnaire-manual-locked{opacity:.58!important;cursor:not-allowed!important}
      @media(max-width:700px){
        .ag-questionnaire-gate{padding:14px;border-radius:14px}
      }
    `;
    document.head.appendChild(style);
  }

  function lockIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg>';
  }

  function checkIcon() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 9"/></svg>';
  }

  function appReady() {
    return typeof state !== 'undefined'
      && Array.isArray(state.courses)
      && Array.isArray(state.progressRows)
      && typeof db !== 'undefined';
  }

  function course() {
    if (!appReady()) return null;
    return state.courses.find(item => item.id === COURSE_ID) || null;
  }

  function orderedModules() {
    const current = course();
    return [...(current?.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
  }

  function moduleById(moduleId) {
    return orderedModules().find(item => item.id === moduleId) || null;
  }

  function isLessonCompleted(lessonId) {
    return state.progressRows.some(row => row.lesson_id === lessonId && row.completed);
  }

  function moduleCompleted(moduleId) {
    const module = moduleById(moduleId);
    const lessons = module?.lessons || [];
    return lessons.length > 0 && lessons.every(lesson => isLessonCompleted(lesson.id));
  }

  function allCourseLessonsCompleted() {
    const lessons = orderedModules().flatMap(module => module.lessons || []);
    return lessons.length > 0 && lessons.every(lesson => isLessonCompleted(lesson.id));
  }

  function allModuleExamsPassed() {
    return EXAM_MODULE_IDS.every(moduleId => examPassed.get(moduleId) === true);
  }

  function normalizeTitle(value = '') {
    return String(value)
      .replace(/^Módulo\s+\d+:\s*/i, '')
      .trim();
  }

  function moduleFromDetails(details) {
    const title = normalizeTitle(details?.querySelector('summary strong')?.textContent || '');
    return orderedModules().find(module => module.title === title) || null;
  }

  function moduleForLesson(lessonId) {
    return orderedModules().find(module => (module.lessons || []).some(lesson => lesson.id === lessonId)) || null;
  }

  function previousUnpassedExam(targetModuleId) {
    if (!statusesLoaded) return null;
    const modules = orderedModules();
    const targetIndex = modules.findIndex(module => module.id === targetModuleId);
    if (targetIndex < 0) return null;
    for (let i = 0; i < targetIndex; i += 1) {
      const module = modules[i];
      if (EXAM_MODULE_SET.has(module.id) && examPassed.get(module.id) !== true) return module;
    }
    return null;
  }

  function triggerLesson(module) {
    const lessons = module?.lessons || [];
    return lessons.length ? lessons[lessons.length - 1] : null;
  }

  async function loadExamStatuses(force = false) {
    if (!appReady()) return;
    if (loadingStatuses && !force) return loadingStatuses;

    loadingStatuses = (async () => {
      for (const moduleId of EXAM_MODULE_IDS) {
        try {
          const { data, error } = await db.rpc('get_module_exam', { target_module: moduleId });
          if (error) throw error;
          examPassed.set(moduleId, Boolean(data?.passed));
          examBest.set(moduleId, Number(data?.best_percentage || 0));
        } catch (error) {
          console.error('No se pudo consultar el estado del cuestionario:', error);
          if (!examPassed.has(moduleId)) examPassed.set(moduleId, false);
        }
      }
      statusesLoaded = true;
      schedule();
    })().finally(() => { loadingStatuses = null; });

    return loadingStatuses;
  }

  function syncPassedCards() {
    document.querySelectorAll('.module-exam-card.passed[data-module-id]').forEach(card => {
      const moduleId = card.dataset.moduleId;
      if (EXAM_MODULE_SET.has(moduleId)) examPassed.set(moduleId, true);
    });
  }

  function decorateQuestionnaireRows() {
    document.querySelectorAll('.utah-module-quiz').forEach(row => {
      const module = moduleFromDetails(row.closest('.module'));
      if (!module || !EXAM_MODULE_SET.has(module.id)) return;

      const complete = moduleCompleted(module.id);
      const passed = examPassed.get(module.id) === true;
      const ready = complete && !passed;
      row.classList.toggle('ag-questionnaire-locked', !complete);
      row.classList.toggle('ag-questionnaire-ready', ready);
      row.classList.toggle('ag-questionnaire-passed', passed);

      const link = row.querySelector('a');
      if (link) {
        link.setAttribute('aria-disabled', complete ? 'false' : 'true');
        link.tabIndex = complete ? 0 : -1;
      }

      const dot = row.querySelector('.utah-quiz-dot');
      if (dot) dot.textContent = passed ? '✓' : '?';

      const status = row.querySelector(':scope > small');
      if (status) status.textContent = passed ? `Aprobado${examBest.get(module.id) ? ` · ${Math.round(examBest.get(module.id))}%` : ''}` : complete ? 'Disponible' : 'Bloqueado';

      let note = link?.querySelector('.ag-questionnaire-state');
      if (!note && link) {
        note = document.createElement('span');
        note.className = 'ag-questionnaire-state';
        link.appendChild(note);
      }
      if (note) {
        note.innerHTML = passed
          ? `${checkIcon()}<span>Evaluación aprobada</span>`
          : complete
            ? '<span>Lista para responder</span>'
            : `${lockIcon()}<span>Completa los videos del módulo</span>`;
      }
    });
  }

  function decorateLessonExamLocks() {
    if (!statusesLoaded) return;
    document.querySelectorAll(`a[href^="#lesson/${COURSE_ID}/"]`).forEach(anchor => {
      const parts = String(anchor.getAttribute('href') || '').split('/');
      const lessonId = parts[2] || '';
      const module = moduleForLesson(lessonId);
      const row = anchor.closest('.lesson-item');
      if (!module || !row) return;

      const blocker = previousUnpassedExam(module.id);
      row.classList.toggle('ag-exam-gate-locked', Boolean(blocker));
      anchor.setAttribute('aria-disabled', blocker ? 'true' : (anchor.getAttribute('aria-disabled') || 'false'));

      let note = anchor.querySelector('.ag-exam-gate-note');
      if (blocker && !note) {
        note = document.createElement('span');
        note.className = 'ag-exam-gate-note';
        note.innerHTML = `${lockIcon()}<span>Aprueba el cuestionario anterior</span>`;
        anchor.appendChild(note);
      }
      if (!blocker) note?.remove();
    });
  }

  function activeLessonContext() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    const module = moduleForLesson(parts[2]);
    const lesson = module?.lessons?.find(item => item.id === parts[2]) || null;
    return module && lesson ? { module, lesson } : null;
  }

  function enforceRouteGate() {
    if (!statusesLoaded) return false;
    const context = activeLessonContext();
    if (!context) return false;
    const blocker = previousUnpassedExam(context.module.id);
    if (!blocker) return false;

    const target = triggerLesson(blocker);
    if (!target) return false;
    try { sessionStorage.setItem('ag-scroll-module-exam', blocker.id); } catch {}
    try { showToast?.('Aprueba el cuestionario del módulo anterior para continuar.', 'info'); } catch {}
    location.replace(`#lesson/${COURSE_ID}/${target.id}`);
    return true;
  }

  function gateVisibleExamCard() {
    const context = activeLessonContext();
    if (!context || !EXAM_MODULE_SET.has(context.module.id)) return;
    const card = document.querySelector(`.module-exam-card[data-module-id="${context.module.id}"]`);
    if (!card) return;

    const passed = card.classList.contains('passed') || examPassed.get(context.module.id) === true;
    const complete = moduleCompleted(context.module.id);

    card.querySelectorAll('.module-exam-intro').forEach(node => {
      if (/una sola vez/i.test(node.textContent || '')) {
        node.textContent = 'Contesta este repaso al finalizar el módulo. Si lo necesitas, puedes volver a intentarlo.';
      }
    });

    let gate = card.querySelector('.ag-questionnaire-gate');
    if (!passed && !complete) {
      card.classList.add('ag-questionnaire-card-locked');
      if (!gate) {
        gate = document.createElement('div');
        gate.className = 'ag-questionnaire-gate';
        gate.innerHTML = `<span class="ag-questionnaire-gate-icon">${lockIcon()}</span><div><strong>Cuestionario bloqueado</strong><span>Termina el video actual y completa el módulo para abrir las preguntas.</span></div>`;
        card.appendChild(gate);
      }
    } else {
      card.classList.remove('ag-questionnaire-card-locked');
      gate?.remove();
    }
  }

  function gateManualUntilEverythingIsDone() {
    const button = document.querySelector('#material-button.ag-final-manual');
    if (!button) return;
    const unlocked = allCourseLessonsCompleted() && allModuleExamsPassed();
    button.classList.toggle('ag-questionnaire-manual-locked', !unlocked);
    button.disabled = !unlocked;
    const small = button.querySelector('small');
    if (!unlocked && small) small.textContent = 'Completa el mensaje final y todas las evaluaciones para habilitarlo.';
    if (unlocked && small) small.textContent = 'PDF · Material final del curso';
  }

  function apply() {
    addStyles();
    if (!appReady()) return;
    syncPassedCards();
    if (enforceRouteGate()) return;
    decorateQuestionnaireRows();
    decorateLessonExamLocks();
    gateVisibleExamCard();
    gateManualUntilEverythingIsDone();
    document.documentElement.dataset.agQuestionnaireFlow = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 45);
  }

  document.addEventListener('click', event => {
    const quizLink = event.target.closest('.utah-module-quiz a');
    if (quizLink) {
      const module = moduleFromDetails(quizLink.closest('.module'));
      if (module && !moduleCompleted(module.id)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        try { showToast?.('Completa todos los videos de este módulo para abrir el cuestionario.', 'info'); } catch {}
        return;
      }
    }

    const lessonLink = event.target.closest(`a[href^="#lesson/${COURSE_ID}/"]`);
    if (!lessonLink || !statusesLoaded) return;
    const lessonId = String(lessonLink.getAttribute('href') || '').split('/')[2] || '';
    const module = moduleForLesson(lessonId);
    const blocker = module ? previousUnpassedExam(module.id) : null;
    if (!blocker) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    const target = triggerLesson(blocker);
    if (target) {
      try { sessionStorage.setItem('ag-scroll-module-exam', blocker.id); } catch {}
      location.hash = `lesson/${COURSE_ID}/${target.id}`;
    }
    try { showToast?.('Aprueba el cuestionario del módulo anterior para continuar.', 'info'); } catch {}
  }, true);

  const observer = new MutationObserver(() => {
    const newlyPassed = [...document.querySelectorAll('.module-exam-card.passed[data-module-id]')]
      .some(card => EXAM_MODULE_SET.has(card.dataset.moduleId) && examPassed.get(card.dataset.moduleId) !== true);
    if (newlyPassed) syncPassedCards();
    schedule();
  });
  observer.observe(document.querySelector('#app') || document.body, { childList:true, subtree:true, attributes:true, attributeFilter:['class'] });

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', () => { loadExamStatuses(); schedule(); });
  document.addEventListener('DOMContentLoaded', () => { loadExamStatuses(); schedule(); }, { once:true });

  const readyInterval = setInterval(() => {
    if (!appReady()) return;
    loadExamStatuses();
    schedule();
    if (statusesLoaded) clearInterval(readyInterval);
  }, 500);
  setTimeout(() => clearInterval(readyInterval), 30000);

  window.ACADEMIA_AG_QUESTIONNAIRE_FLOW = {
    release: RELEASE,
    apply,
    refresh: () => loadExamStatuses(true)
  };
  schedule();
})();