(() => {
  'use strict';

  const RELEASE = '20260820.48';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const MODULE_ID = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001';
  const PROMO_CODE = 'C1-PROMO';
  const SCROLL_KEY = 'academia-ag:utah-v2:m1-exam-scroll';
  let timer = null;

  function escapeText(value = '') {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function currentCourse() {
    try {
      return (state?.courses || []).find(item => item.id === COURSE_ID) || null;
    } catch (_) {
      return null;
    }
  }

  function targetModule() {
    return currentCourse()?.modules?.find(item => item.id === MODULE_ID) || null;
  }

  function promoLesson() {
    return targetModule()?.lessons?.find(item => item.lesson_code === PROMO_CODE)
      || targetModule()?.lessons?.find(item => item.lesson_kind === 'promo')
      || null;
  }

  function currentLesson() {
    const parts = location.hash.replace(/^#/, '').split('/');
    if (parts[0] !== 'lesson' || parts[1] !== COURSE_ID || !parts[2]) return null;
    const module = targetModule();
    const lesson = module?.lessons?.find(item => item.id === parts[2]);
    return lesson ? { module, lesson } : null;
  }

  function isUtahRoute() {
    const hash = location.hash.replace(/^#/, '');
    return hash === `course/${COURSE_ID}` || hash.startsWith(`lesson/${COURSE_ID}/`);
  }

  function addStyles() {
    if (document.querySelector('#utah-module-exam-v2-styles')) return;
    const style = document.createElement('style');
    style.id = 'utah-module-exam-v2-styles';
    style.textContent = `
      .utah-v2-exam-row .utah-v2-exam-dot{width:32px;height:32px;border-radius:50%;display:grid;place-items:center;flex:0 0 32px;background:rgba(120,199,166,.12);color:#78c7a6;font-weight:900;border:1px solid rgba(120,199,166,.28)}
      .utah-v2-exam-row a{min-width:0}.utah-v2-exam-row a small{color:#78c7a6!important;font-weight:800}.utah-v2-exam-row>a+small{white-space:nowrap}
      .utah-v2-exam-row.is-recommended .utah-v2-exam-dot{background:rgba(120,199,166,.24);color:#dff9ed;border-color:rgba(120,199,166,.45)}
      .utah-v2-exam-card{margin:24px 0 18px;padding:26px;border-radius:24px;border:1px solid rgba(120,199,166,.24);background:linear-gradient(145deg,rgba(16,34,44,.98),rgba(8,24,32,.98));box-shadow:0 22px 60px rgba(0,0,0,.22);color:#eef6f2}
      .utah-v2-exam-top{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:20px}.utah-v2-exam-kicker{display:block;color:#8ed8ba;font-size:.7rem;font-weight:850;letter-spacing:.14em;text-transform:uppercase;margin-bottom:7px}
      .utah-v2-exam-card h2{margin:0;color:#fff;font:720 1.38rem/1.18 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;letter-spacing:-.025em}.utah-v2-exam-intro{margin:8px 0 0;color:#a4b7b0;font-size:.86rem;line-height:1.55;max-width:690px}.utah-v2-exam-badge{white-space:nowrap;padding:8px 11px;border-radius:999px;background:rgba(120,199,166,.11);border:1px solid rgba(120,199,166,.20);color:#c0ecd9;font-size:.72rem;font-weight:800}
      .utah-v2-exam-best{margin:0 0 16px;padding:11px 13px;border-radius:13px;background:rgba(120,199,166,.07);color:#bdd9cd;font-size:.8rem;line-height:1.45}.utah-v2-exam-questions{display:grid;gap:14px}.utah-v2-exam-question{margin:0;padding:17px;border:1px solid rgba(255,255,255,.075);border-radius:17px;background:rgba(255,255,255,.035)}.utah-v2-exam-question.is-wrong{border-color:rgba(244,129,117,.45);background:rgba(244,129,117,.055)}.utah-v2-exam-question.is-correct{border-color:rgba(120,199,166,.30)}
      .utah-v2-exam-question legend{display:flex;gap:10px;align-items:flex-start;padding:0 4px;color:#f3f7f5;font-size:.9rem;font-weight:720;line-height:1.45}.utah-v2-exam-number{display:grid;place-items:center;flex:0 0 25px;width:25px;height:25px;border-radius:50%;background:rgba(120,199,166,.13);color:#9ee0c4;font-size:.7rem;font-weight:850}.utah-v2-exam-options{display:grid;gap:8px;margin-top:13px}.utah-v2-exam-option{display:flex;align-items:flex-start;gap:10px;padding:11px 12px;border-radius:12px;border:1px solid rgba(255,255,255,.07);background:rgba(255,255,255,.025);color:#dce7e2;cursor:pointer;transition:.16s ease}.utah-v2-exam-option:hover{background:rgba(120,199,166,.075);border-color:rgba(120,199,166,.24)}.utah-v2-exam-option:has(input:checked){background:rgba(120,199,166,.11);border-color:rgba(120,199,166,.38)}.utah-v2-exam-option.is-selected-wrong{border-color:rgba(244,129,117,.52)!important;background:rgba(244,129,117,.10)!important}.utah-v2-exam-option.is-correct-answer{border-color:rgba(120,199,166,.60)!important;background:rgba(120,199,166,.13)!important}.utah-v2-exam-option input{margin-top:3px;accent-color:#78c7a6}.utah-v2-exam-option span{font-size:.82rem;line-height:1.42}
      .utah-v2-exam-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:18px;padding-top:17px;border-top:1px solid rgba(255,255,255,.07)}.utah-v2-exam-footer small{color:#8ca09a;line-height:1.45;max-width:600px}.utah-v2-exam-result{margin:16px 0 0;padding:13px 14px;border-radius:13px;background:rgba(120,199,166,.08);color:#c7eadb;font-size:.88rem;font-weight:750;line-height:1.45}.utah-v2-exam-result.is-low{background:rgba(244,187,117,.08);color:#f3d5ad}.utah-v2-exam-error{margin-top:12px;color:#f7b4aa;font-size:.82rem;font-weight:700}.utah-v2-exam-loading{display:flex;align-items:center;gap:12px;color:#a0b4ac}.utah-v2-exam-loading::before{content:'';width:18px;height:18px;border:2px solid rgba(255,255,255,.16);border-top-color:#78c7a6;border-radius:50%;animation:utahV2ExamSpin .8s linear infinite}@keyframes utahV2ExamSpin{to{transform:rotate(360deg)}}
      .utah-v2-exam-feedback{margin-top:20px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08)}.utah-v2-exam-feedback>h3{margin:0 0 6px;color:#fff;font-size:1rem}.utah-v2-exam-feedback>p{margin:0 0 14px;color:#9eb1ba;font-size:.82rem;line-height:1.45}.utah-v2-exam-feedback-list{display:grid;gap:12px}.utah-v2-exam-feedback-item{padding:15px;border-radius:15px;border:1px solid rgba(244,129,117,.28);background:rgba(244,129,117,.055)}.utah-v2-exam-feedback-item strong{display:block;color:#fff;font-size:.86rem;line-height:1.42;margin-bottom:9px}.utah-v2-exam-feedback-line{display:grid;grid-template-columns:130px 1fr;gap:8px;margin-top:6px;color:#cbd9d4;font-size:.78rem;line-height:1.42}.utah-v2-exam-feedback-line span:first-child{color:#8fa49e;font-weight:800}.utah-v2-exam-feedback-line.correct span:last-child{color:#9be1c2;font-weight:700}.utah-v2-exam-explanation{margin:11px 0 0;padding:11px 12px;border-radius:11px;background:rgba(120,199,166,.07);color:#cce4da;font-size:.78rem;line-height:1.48}.utah-v2-exam-perfect{margin-top:18px;padding:14px 15px;border-radius:14px;border:1px solid rgba(120,199,166,.27);background:rgba(120,199,166,.08);color:#bcebd7;font-size:.84rem;font-weight:750}
      @media(max-width:700px){.utah-v2-exam-card{padding:19px;border-radius:19px}.utah-v2-exam-top{display:block}.utah-v2-exam-badge{display:inline-flex;margin-top:12px}.utah-v2-exam-footer{align-items:stretch}.utah-v2-exam-footer .btn{width:100%}.utah-v2-exam-feedback-line{grid-template-columns:1fr;gap:2px}}
    `;
    document.head.appendChild(style);
  }

  function moduleDetailsNode() {
    const course = currentCourse();
    if (!course) return null;
    const ordered = [...(course.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    const index = ordered.findIndex(item => item.id === MODULE_ID);
    const details = [...document.querySelectorAll('.module-panel .module')];
    if (index >= 0 && details[index]) return details[index];
    return details.find(node => /^Módulo\s+1\b/i.test(node.querySelector('summary strong')?.textContent?.trim() || '')) || null;
  }

  function ensureSidebarStep() {
    if (!isUtahRoute()) return;
    const promo = promoLesson();
    const details = moduleDetailsNode();
    const list = details?.querySelector('.lesson-list');
    if (!promo || !list || list.querySelector('.utah-v2-exam-row')) return;

    const row = document.createElement('div');
    row.className = 'lesson-item utah-v2-exam-row';
    row.innerHTML = `
      <span class="utah-v2-exam-dot" aria-hidden="true">?</span>
      <a href="#lesson/${COURSE_ID}/${escapeText(promo.id)}" data-utah-v2-exam-link>
        <strong>Evaluación opcional</strong>
        <small>Repaso del Módulo 1 · 10 preguntas</small>
      </a>
      <small>Opcional</small>`;
    row.querySelector('[data-utah-v2-exam-link]')?.addEventListener('click', () => {
      try { sessionStorage.setItem(SCROLL_KEY, '1'); } catch (_) {}
      setTimeout(schedule, 60);
    });
    list.appendChild(row);
  }

  function markSidebarExam(bestPercentage = 0) {
    const row = moduleDetailsNode()?.querySelector('.utah-v2-exam-row');
    if (!row) return;
    const reached = Number(bestPercentage || 0) >= 80;
    row.classList.toggle('is-recommended', reached);
    const dot = row.querySelector('.utah-v2-exam-dot');
    if (dot) dot.textContent = reached ? '✓' : '?';
    const status = row.querySelector(':scope > small');
    if (status) status.textContent = reached ? 'Repaso 80%+' : 'Opcional';
  }

  function feedbackMarkup(review = []) {
    const wrong = (review || []).filter(item => item && item.correct === false);
    if (!wrong.length) {
      return '<div class="utah-v2-exam-perfect">✓ Todas tus respuestas fueron correctas en este intento.</div>';
    }
    return `
      <section class="utah-v2-exam-feedback">
        <h3>Respuestas para reforzar</h3>
        <p>Te mostramos lo que contestaste, la respuesta correcta y la explicación correspondiente.</p>
        <div class="utah-v2-exam-feedback-list">
          ${wrong.map(item => `
            <article class="utah-v2-exam-feedback-item">
              <strong>${Number(item.position || 0) ? `${Number(item.position)}. ` : ''}${escapeText(item.question || '')}</strong>
              <div class="utah-v2-exam-feedback-line"><span>Tu respuesta</span><span>${escapeText(String(item.selected_key || '').toUpperCase())}${item.selected_text ? ` · ${escapeText(item.selected_text)}` : ' · Sin respuesta'}</span></div>
              <div class="utah-v2-exam-feedback-line correct"><span>Respuesta correcta</span><span>${escapeText(String(item.correct_key || '').toUpperCase())}${item.correct_text ? ` · ${escapeText(item.correct_text)}` : ''}</span></div>
              ${item.explanation ? `<p class="utah-v2-exam-explanation"><strong>Para reforzar:</strong> ${escapeText(item.explanation)}</p>` : ''}
            </article>`).join('')}
        </div>
      </section>`;
  }

  function applyReview(form, review = []) {
    form.querySelectorAll('.utah-v2-exam-question').forEach(node => node.classList.remove('is-wrong', 'is-correct'));
    form.querySelectorAll('.utah-v2-exam-option').forEach(node => node.classList.remove('is-selected-wrong', 'is-correct-answer'));

    for (const item of review || []) {
      const fieldset = form.querySelector(`.utah-v2-exam-question[data-quiz-id="${CSS.escape(String(item.question_id || ''))}"]`);
      if (!fieldset) continue;
      fieldset.classList.toggle('is-wrong', item.correct === false);
      fieldset.classList.toggle('is-correct', item.correct === true);
      if (item.correct === false) {
        fieldset.querySelectorAll('.utah-v2-exam-option').forEach(label => {
          const input = label.querySelector('input');
          if (!input) return;
          if (String(input.value).toLowerCase() === String(item.selected_key || '').toLowerCase()) label.classList.add('is-selected-wrong');
          if (String(input.value).toLowerCase() === String(item.correct_key || '').toLowerCase()) label.classList.add('is-correct-answer');
        });
      }
    }

    let host = form.querySelector('.utah-v2-exam-feedback-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'utah-v2-exam-feedback-host';
      form.appendChild(host);
    }
    host.innerHTML = feedbackMarkup(review);
  }

  function examMarkup(exam) {
    const questions = exam?.questions || [];
    const best = Number(exam?.best_percentage || 0);
    return `
      <div class="utah-v2-exam-top">
        <div>
          <span class="utah-v2-exam-kicker">Evaluación opcional · Módulo 1</span>
          <h2>Reforzar lo aprendido</h2>
          <p class="utah-v2-exam-intro">Este repaso no bloquea tu avance. Puedes realizarlo las veces que quieras y recibirás retroalimentación después de cada intento.</p>
        </div>
        <span class="utah-v2-exam-badge">${questions.length} preguntas · 80% recomendado</span>
      </div>
      ${best > 0 ? `<p class="utah-v2-exam-best">Mejor resultado registrado: <strong>${Math.round(best)}%</strong>. Puedes volver a intentarlo para reforzar los temas.</p>` : ''}
      <form class="utah-v2-exam-form">
        <div class="utah-v2-exam-questions">
          ${questions.map((question, index) => `
            <fieldset class="utah-v2-exam-question" data-quiz-id="${escapeText(question.id)}">
              <legend><span class="utah-v2-exam-number">${index + 1}</span><span>${escapeText(question.question)}</span></legend>
              <div class="utah-v2-exam-options">
                ${(question.options || []).map(option => `
                  <label class="utah-v2-exam-option">
                    <input type="radio" name="module-q-${escapeText(question.id)}" value="${escapeText(option.key)}" required>
                    <span>${escapeText(option.text)}</span>
                  </label>`).join('')}
              </div>
            </fieldset>`).join('')}
        </div>
        <div class="utah-v2-exam-footer">
          <small>La evaluación es opcional y tiene intentos ilimitados. Un 80% o más se marca como nivel recomendado de repaso, pero no impide continuar el curso.</small>
          <button class="btn btn-primary utah-v2-exam-submit" type="submit">Enviar respuestas</button>
        </div>
        <p class="utah-v2-exam-error" hidden></p>
        <div class="utah-v2-exam-result-host"></div>
        <div class="utah-v2-exam-feedback-host"></div>
      </form>`;
  }

  async function loadExam(card) {
    if (!card || card.dataset.loading === '1' || card.dataset.loaded === '1') return;
    card.dataset.loading = '1';
    card.innerHTML = '<div class="utah-v2-exam-loading">Cargando evaluación opcional…</div>';

    try {
      const { data, error } = await db.rpc('get_module_exam', { target_module: MODULE_ID });
      if (error) throw error;
      if (!data || !Array.isArray(data.questions) || !data.questions.length) {
        card.innerHTML = '<p class="utah-v2-exam-intro">La evaluación todavía no está activada en Supabase.</p>';
        return;
      }
      card.dataset.loaded = '1';
      card.innerHTML = examMarkup(data);
      markSidebarExam(data.best_percentage);
      bindForm(card, data);
      maybeScrollToExam(card);
    } catch (error) {
      card.innerHTML = `<p class="utah-v2-exam-error">No se pudo cargar la evaluación. ${escapeText(error?.message || '')}</p>`;
    } finally {
      card.dataset.loading = '0';
    }
  }

  function bindForm(card, exam) {
    const form = card.querySelector('.utah-v2-exam-form');
    if (!form) return;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      const button = form.querySelector('.utah-v2-exam-submit');
      const errorNode = form.querySelector('.utah-v2-exam-error');
      const resultHost = form.querySelector('.utah-v2-exam-result-host');
      const answers = {};

      for (const question of exam.questions || []) {
        const checked = form.querySelector(`input[name="module-q-${CSS.escape(String(question.id))}"]:checked`);
        if (!checked) {
          errorNode.hidden = false;
          errorNode.textContent = 'Responde las 10 preguntas antes de enviar este intento.';
          return;
        }
        answers[String(question.id)] = checked.value;
      }

      errorNode.hidden = true;
      errorNode.textContent = '';
      button.disabled = true;
      const previous = button.textContent;
      button.textContent = 'Revisando…';

      try {
        const { data, error } = await db.rpc('submit_module_exam', {
          target_module: MODULE_ID,
          submitted_answers: answers
        });
        if (error) throw error;
        const percentage = Math.round(Number(data?.percentage || 0));
        resultHost.innerHTML = `<p class="utah-v2-exam-result ${percentage < 80 ? 'is-low' : ''}">${escapeText(data?.message || '')} Resultado: ${Number(data?.score || 0)}/${Number(data?.total || 0)} · ${percentage}%.</p>`;
        applyReview(form, data?.review || []);
        markSidebarExam(percentage);
        resultHost.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } catch (error) {
        errorNode.hidden = false;
        errorNode.textContent = `No se pudo registrar el intento. ${error?.message || ''}`;
      } finally {
        button.disabled = false;
        button.textContent = previous;
      }
    });
  }

  function ensureExamCard() {
    const context = currentLesson();
    if (!context || context.lesson.lesson_code !== PROMO_CODE) return;
    if (document.querySelector(`.utah-v2-exam-card[data-module-id="${MODULE_ID}"]`)) return;
    const host = document.querySelector('.lesson-layout > div:first-child');
    if (!host) return;
    const card = document.createElement('section');
    card.className = 'utah-v2-exam-card';
    card.dataset.moduleId = MODULE_ID;
    card.setAttribute('aria-label', 'Evaluación opcional del Módulo 1');
    host.appendChild(card);
    loadExam(card);
  }

  function maybeScrollToExam(card = document.querySelector('.utah-v2-exam-card')) {
    if (!card) return;
    let shouldScroll = false;
    try {
      shouldScroll = sessionStorage.getItem(SCROLL_KEY) === '1';
      if (shouldScroll) sessionStorage.removeItem(SCROLL_KEY);
    } catch (_) {}
    if (shouldScroll) setTimeout(() => card.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120);
  }

  function enhance() {
    if (!isUtahRoute()) return;
    addStyles();
    ensureSidebarStep();
    ensureExamCard();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 90);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_UTAH_MODULE_EXAM_V2 = { release: RELEASE, enhance };
  schedule();
})();
