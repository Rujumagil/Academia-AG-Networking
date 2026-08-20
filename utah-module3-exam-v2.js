(() => {
  'use strict';

  const RELEASE = '20260820.50';
  const COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const MODULE_ID = '7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001';
  const PROMO_CODE = 'C3-PROMO';
  const MODULE_LABEL = 'Módulo 3';
  const SCROLL_KEY = 'academia-ag:utah-v2:m3-exam-scroll';
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
    try { return (state?.courses || []).find(item => item.id === COURSE_ID) || null; }
    catch (_) { return null; }
  }

  function targetModule() {
    return currentCourse()?.modules?.find(item => item.id === MODULE_ID) || null;
  }

  function promoLesson() {
    const module = targetModule();
    return module?.lessons?.find(item => item.lesson_code === PROMO_CODE)
      || module?.lessons?.find(item => item.lesson_kind === 'promo')
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

  function moduleDetailsNode() {
    const course = currentCourse();
    if (!course) return null;
    const ordered = [...(course.modules || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0));
    const index = ordered.findIndex(item => item.id === MODULE_ID);
    const details = [...document.querySelectorAll('.module-panel .module')];
    if (index >= 0 && details[index]) return details[index];
    return details.find(node => /^Módulo\s+3\b/i.test(node.querySelector('summary strong')?.textContent?.trim() || '')) || null;
  }

  function ensureSidebarStep() {
    if (!isUtahRoute()) return;
    const promo = promoLesson();
    const list = moduleDetailsNode()?.querySelector('.lesson-list');
    if (!promo || !list || list.querySelector('.utah-v2-exam-row-m3')) return;

    const row = document.createElement('div');
    row.className = 'lesson-item utah-v2-exam-row utah-v2-exam-row-m3';
    row.innerHTML = `
      <span class="utah-v2-exam-dot" aria-hidden="true">?</span>
      <a href="#lesson/${COURSE_ID}/${escapeText(promo.id)}" data-utah-v2-m3-exam-link>
        <strong>Evaluación opcional</strong>
        <small>Repaso del Módulo 3 · 10 preguntas</small>
      </a>
      <small>Opcional</small>`;

    row.querySelector('[data-utah-v2-m3-exam-link]')?.addEventListener('click', () => {
      try { sessionStorage.setItem(SCROLL_KEY, '1'); } catch (_) {}
      setTimeout(schedule, 60);
    });
    list.appendChild(row);
  }

  function markSidebarExam(bestPercentage = 0) {
    const row = moduleDetailsNode()?.querySelector('.utah-v2-exam-row-m3');
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
        <p>Revisa lo que contestaste, la respuesta correcta y la explicación correspondiente.</p>
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

    const host = form.querySelector('.utah-v2-exam-feedback-host');
    if (host) host.innerHTML = feedbackMarkup(review);
  }

  function examMarkup(exam) {
    const questions = exam?.questions || [];
    const best = Number(exam?.best_percentage || 0);
    return `
      <div class="utah-v2-exam-top">
        <div>
          <span class="utah-v2-exam-kicker">Evaluación opcional · ${MODULE_LABEL}</span>
          <h2>Manejo básico</h2>
          <p class="utah-v2-exam-intro">Este repaso refuerza arranque, reversa, cambios de carril, incorporación, observación, altos y estacionamiento. No bloquea tu avance y puedes repetirlo cuantas veces quieras.</p>
        </div>
        <span class="utah-v2-exam-badge">${questions.length} preguntas · 80% recomendado</span>
      </div>
      ${best > 0 ? `<p class="utah-v2-exam-best">Mejor resultado registrado: <strong>${Math.round(best)}%</strong>.</p>` : ''}
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
          <small>Evaluación opcional con intentos ilimitados. Después de enviar verás las respuestas que necesitas reforzar.</small>
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
    card.setAttribute('aria-label', 'Evaluación opcional del Módulo 3');
    host.appendChild(card);
    loadExam(card);
  }

  function maybeScrollToExam(card = document.querySelector(`.utah-v2-exam-card[data-module-id="${MODULE_ID}"]`)) {
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

  window.ACADEMIA_AG_UTAH_MODULE3_EXAM_V2 = { release: RELEASE, enhance };
  schedule();
})();
