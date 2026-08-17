(() => {
  'use strict';

  const RELEASE = '20260817.12';
  const UTAH_COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const EXAM_MODULES = new Set([
    'Licencias, permisos y documentación',
    'Salud, exámenes y preparación del vehículo',
    'Manejo básico',
    'Reglas del camino y señales',
    'Alcohol, drogas y retos al manejar',
    'Emergencias, compartir el camino y tu récord'
  ]);
  let timer = null;

  function escapeText(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function currentLessonRoute() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || !parts[1] || !parts[2]) return null;
    return { courseId: parts[1], lessonId: parts[2] };
  }

  function currentModule(route) {
    try {
      const course = state?.courses?.find(item => item.id === route.courseId);
      if (!course) return null;
      const module = course.modules?.find(item => item.lessons?.some(lesson => lesson.id === route.lessonId));
      return module ? { course, module } : null;
    } catch {
      return null;
    }
  }

  function moduleExamTriggerLesson(module) {
    const lessons = module?.lessons || [];
    if (!lessons.length) return null;
    const extraIndex = lessons.findIndex(item => item.title?.trim().toLowerCase() === 'extra');
    if (extraIndex > 0) return lessons[extraIndex - 1];
    return lessons[lessons.length - 1];
  }

  function nextLessonAfterExam(course, module) {
    const moduleIndex = course.modules.findIndex(item => item.id === module.id);
    const extra = module.lessons?.find(item => item.title?.trim().toLowerCase() === 'extra');
    if (extra) return { lesson: extra, label: 'Continuar con Extra' };
    const nextModule = course.modules[moduleIndex + 1];
    const nextLesson = nextModule?.lessons?.[0];
    return nextLesson ? { lesson: nextLesson, label: 'Continuar al siguiente módulo' } : null;
  }

  function addStyles() {
    if (document.querySelector('#module-exam-styles')) return;
    const style = document.createElement('style');
    style.id = 'module-exam-styles';
    style.textContent = `
      .module-exam-card{
        margin:20px 0 16px;padding:26px;border-radius:24px;
        border:1px solid rgba(120,199,166,.20);
        background:linear-gradient(145deg,rgba(16,34,44,.98),rgba(9,24,33,.96));
        box-shadow:0 22px 60px rgba(0,0,0,.24);color:#eef6f2
      }
      .module-exam-card.passed{border-color:rgba(120,199,166,.42);background:linear-gradient(145deg,rgba(13,47,37,.97),rgba(8,29,27,.96))}
      .module-exam-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}
      .module-exam-kicker{display:block;color:#89d6b7;font-size:.7rem;font-weight:850;letter-spacing:.15em;text-transform:uppercase;margin-bottom:7px}
      .module-exam-card h2{margin:0;color:#fff;font:720 1.35rem/1.15 -apple-system,BlinkMacSystemFont,"SF Pro Display","Segoe UI",sans-serif;letter-spacing:-.025em}
      .module-exam-card .module-exam-intro{margin:7px 0 0;color:#9eb1ba;font-size:.85rem;line-height:1.5}
      .module-exam-badge{white-space:nowrap;padding:8px 11px;border-radius:999px;background:rgba(120,199,166,.11);border:1px solid rgba(120,199,166,.18);color:#b9ead5;font-size:.72rem;font-weight:800}
      .module-exam-questions{display:grid;gap:14px}
      .module-exam-question{margin:0;padding:17px;border:1px solid rgba(255,255,255,.075);border-radius:17px;background:rgba(255,255,255,.035)}
      .module-exam-question legend{display:flex;gap:10px;align-items:flex-start;padding:0 4px;color:#f3f7f5;font-size:.9rem;font-weight:720;line-height:1.45}
      .module-exam-number{display:grid;place-items:center;flex:0 0 25px;width:25px;height:25px;border-radius:50%;background:rgba(120,199,166,.13);color:#9ee0c4;font-size:.7rem;font-weight:850}
      .module-exam-options{display:grid;gap:8px;margin-top:13px}
      .module-exam-option{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);color:#dce7e2;cursor:pointer;transition:.16s ease}
      .module-exam-option:hover{background:rgba(120,199,166,.075);border-color:rgba(120,199,166,.24)}
      .module-exam-option:has(input:checked){background:rgba(120,199,166,.11);border-color:rgba(120,199,166,.38)}
      .module-exam-option input{margin-top:3px;accent-color:#78c7a6}
      .module-exam-option span{font-size:.82rem;line-height:1.4}
      .module-exam-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:18px;padding-top:17px;border-top:1px solid rgba(255,255,255,.07)}
      .module-exam-footer small{color:#8297a1;line-height:1.4}
      .module-exam-result{margin:0;color:#dce8e3;font-size:.9rem;font-weight:700}
      .module-exam-result.success{color:#9be1c2}.module-exam-result.error{color:#f7b4aa}
      .module-exam-loading{display:flex;align-items:center;gap:12px;color:#9fb1ba}
      .module-exam-loading::before{content:'';width:18px;height:18px;border:2px solid rgba(255,255,255,.16);border-top-color:#78c7a6;border-radius:50%;animation:moduleExamSpin .8s linear infinite}
      @keyframes moduleExamSpin{to{transform:rotate(360deg)}}
      .module-exam-success-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
      .utah-module-quiz.module-exam-passed .utah-quiz-dot{background:rgba(120,199,166,.22)!important;color:#0a5a3d!important;border-color:rgba(0,81,52,.24)!important}
      @media(max-width:700px){.module-exam-card{padding:19px;border-radius:19px}.module-exam-top{display:block}.module-exam-badge{display:inline-flex;margin-top:12px}.module-exam-footer{align-items:stretch}.module-exam-footer .btn{width:100%}}
    `;
    document.head.appendChild(style);
  }

  function markSidebarExam(module, passed) {
    const activeDetails = [...document.querySelectorAll('.module-panel .module')].find(details => {
      const heading = details.querySelector('summary strong')?.textContent?.trim();
      return heading === module.title || heading?.endsWith(`: ${module.title}`);
    });
    const row = activeDetails?.querySelector('.utah-module-quiz');
    if (!row) return;
    row.classList.toggle('module-exam-passed', Boolean(passed));
    const dot = row.querySelector('.utah-quiz-dot');
    if (dot && passed) dot.textContent = '✓';
    if (dot && !passed) dot.textContent = '?';
    const status = row.querySelector(':scope > small');
    if (status) status.textContent = passed ? 'Aprobado' : 'Repaso';
  }

  function successMarkup(exam, course, module) {
    const next = nextLessonAfterExam(course, module);
    return `
      <div class="module-exam-top">
        <div>
          <span class="module-exam-kicker">Módulo completado</span>
          <h2>Reforzar lo aprendido</h2>
          <p class="module-exam-intro">Ya aprobaste el examen de <strong>${escapeText(module.title)}</strong>.</p>
        </div>
        <span class="module-exam-badge">✓ Aprobado · ${Math.round(Number(exam.best_percentage || 0))}%</span>
      </div>
      <p class="module-exam-result success">Excelente. El repaso quedó registrado en tu cuenta.</p>
      ${next ? `<div class="module-exam-success-actions"><a class="btn btn-primary" href="#lesson/${escapeText(course.id)}/${escapeText(next.lesson.id)}">${escapeText(next.label)}</a></div>` : ''}`;
  }

  function examMarkup(exam, course, module) {
    const questions = exam.questions || [];
    return `
      <div class="module-exam-top">
        <div>
          <span class="module-exam-kicker">Fin del módulo</span>
          <h2>Reforzar lo aprendido</h2>
          <p class="module-exam-intro">Contesta este examen breve una sola vez al terminar el módulo. Ya no tendrás preguntas entre cada video.</p>
        </div>
        <span class="module-exam-badge">${questions.length} preguntas · ${Number(exam.pass_score || 80)}% para aprobar</span>
      </div>
      <form class="module-exam-form">
        <div class="module-exam-questions">
          ${questions.map((question, index) => `
            <fieldset class="module-exam-question" data-quiz-id="${escapeText(question.id)}">
              <legend><span class="module-exam-number">${index + 1}</span><span>${escapeText(question.question)}</span></legend>
              <div class="module-exam-options">
                ${(question.options || []).map(option => `
                  <label class="module-exam-option">
                    <input type="radio" name="module-q-${escapeText(question.id)}" value="${escapeText(option.key)}" required>
                    <span>${escapeText(option.text)}</span>
                  </label>`).join('')}
              </div>
            </fieldset>`).join('')}
        </div>
        <div class="module-exam-footer">
          <small>Este repaso reúne los puntos principales del módulo y puedes volver a intentarlo si lo necesitas.</small>
          <button class="btn btn-primary module-exam-submit" type="submit">Enviar examen</button>
        </div>
        <p class="module-exam-result" aria-live="polite"></p>
      </form>`;
  }

  async function submitExam(event, exam, course, module) {
    event.preventDefault();
    const form = event.currentTarget;
    const button = form.querySelector('.module-exam-submit');
    const resultNode = form.querySelector('.module-exam-result');
    const answers = {};

    for (const question of exam.questions || []) {
      const value = new FormData(form).get(`module-q-${question.id}`);
      if (!value) {
        resultNode.className = 'module-exam-result error';
        resultNode.textContent = 'Responde todas las preguntas antes de enviar.';
        return;
      }
      answers[question.id] = value;
    }

    button.disabled = true;
    button.textContent = 'Revisando…';
    resultNode.className = 'module-exam-result';
    resultNode.textContent = 'Guardando tu resultado…';

    try {
      const { data, error } = await db.rpc('submit_module_exam', {
        target_module: module.id,
        submitted_answers: answers
      });
      if (error) throw error;

      const result = data || {};
      if (result.passed) {
        const card = form.closest('.module-exam-card');
        card.classList.add('passed');
        markSidebarExam(module, true);
        card.innerHTML = successMarkup({ ...exam, best_percentage: result.percentage }, course, module);
        try { showToast?.(`Módulo aprobado con ${Math.round(Number(result.percentage || 0))}%.`, 'success'); } catch {}
      } else {
        resultNode.className = 'module-exam-result error';
        resultNode.textContent = `${result.message || 'Repasa el módulo y vuelve a intentarlo.'} Resultado: ${Math.round(Number(result.percentage || 0))}%.`;
        button.disabled = false;
        button.textContent = 'Intentar de nuevo';
      }
    } catch (error) {
      console.error('Module exam error:', error);
      resultNode.className = 'module-exam-result error';
      resultNode.textContent = 'No pudimos guardar el examen. Recarga la página e inténtalo nuevamente.';
      button.disabled = false;
      button.textContent = 'Enviar examen';
    }
  }

  async function renderExamIfNeeded() {
    addStyles();
    const route = currentLessonRoute();
    if (!route || route.courseId !== UTAH_COURSE_ID || !document.querySelector('.lesson-layout')) return;

    const context = currentModule(route);
    if (!context || !EXAM_MODULES.has(context.module.title)) return;
    const trigger = moduleExamTriggerLesson(context.module);
    if (!trigger || trigger.id !== route.lessonId) return;

    const videoShell = document.querySelector('.lesson-layout .video-shell');
    if (!videoShell) return;
    if (document.querySelector(`.module-exam-card[data-module-id="${context.module.id}"]`)) return;

    const card = document.createElement('section');
    card.className = 'module-exam-card';
    card.dataset.moduleId = context.module.id;
    card.innerHTML = '<div class="module-exam-loading">Preparando el examen del módulo…</div>';
    videoShell.insertAdjacentElement('afterend', card);

    try {
      const { data, error } = await db.rpc('get_module_exam', { target_module: context.module.id });
      if (error) throw error;
      const exam = data || {};
      if (!exam.questions?.length) {
        card.remove();
        return;
      }

      markSidebarExam(context.module, Boolean(exam.passed));
      if (exam.passed) {
        card.classList.add('passed');
        card.innerHTML = successMarkup(exam, context.course, context.module);
      } else {
        card.innerHTML = examMarkup(exam, context.course, context.module);
        card.querySelector('.module-exam-form')?.addEventListener('submit', event => submitExam(event, exam, context.course, context.module));
      }

      if (sessionStorage.getItem('ag-scroll-module-exam') === context.module.id) {
        sessionStorage.removeItem('ag-scroll-module-exam');
        setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      }
    } catch (error) {
      console.error('Get module exam error:', error);
      card.innerHTML = '<p class="module-exam-result error">No pudimos cargar el examen del módulo. Recarga la página e inténtalo nuevamente.</p>';
    }
  }

  function reviewTargetFromRow(row) {
    const details = row.closest('.module');
    if (!details) return null;
    const lessonRows = [...details.querySelectorAll('.lesson-item:not(.utah-module-quiz)')];
    if (!lessonRows.length) return null;
    const extraIndex = lessonRows.findIndex(item => item.querySelector('a strong')?.textContent.trim().toLowerCase() === 'extra');
    const targetRow = extraIndex > 0 ? lessonRows[extraIndex - 1] : lessonRows[lessonRows.length - 1];
    return targetRow?.querySelector('a[href^="#lesson/"]') || null;
  }

  document.addEventListener('click', event => {
    const reviewLink = event.target.closest('.utah-module-quiz a');
    if (!reviewLink) return;
    const row = reviewLink.closest('.utah-module-quiz');
    const target = reviewTargetFromRow(row);
    if (!target) return;

    event.preventDefault();
    const details = row.closest('.module');
    const heading = details?.querySelector('summary strong')?.textContent?.trim() || '';
    const cleanTitle = heading.replace(/^Módulo\s+\d+:\s*/i, '');
    try {
      const course = state?.courses?.find(item => item.id === UTAH_COURSE_ID);
      const module = course?.modules?.find(item => item.title === cleanTitle);
      if (module) sessionStorage.setItem('ag-scroll-module-exam', module.id);
    } catch {}

    const targetHash = target.getAttribute('href');
    if (location.hash === targetHash) {
      schedule();
      setTimeout(() => document.querySelector('.module-exam-card')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
    } else {
      location.hash = targetHash.replace(/^#/, '');
    }
  }, true);

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(renderExamIfNeeded, 75);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  const observer = new MutationObserver(() => {
    if (currentLessonRoute() && document.querySelector('.lesson-layout')) schedule();
  });
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_MODULE_EXAM = { release: RELEASE, enhance: renderExamIfNeeded };
  schedule();
})();
