(() => {
  'use strict';

  const RELEASE = '20260817.6';
  const quizState = new Map();
  let processingLesson = null;

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
    if (parts[0] !== 'lesson' || !parts[2]) return null;
    return { courseId: parts[1], lessonId: parts[2] };
  }

  function addStyles() {
    if (document.querySelector('#lesson-experience-styles')) return;
    const style = document.createElement('style');
    style.id = 'lesson-experience-styles';
    style.textContent = `
      .video-shell .lesson-native-video{width:100%;height:auto;min-height:260px;max-height:72vh;display:block;background:#060b13;border:0;border-radius:inherit;object-fit:contain}
      .lesson-video-fallback{display:none;padding:18px 20px;background:#fff4f1;color:#7f1d1d;border:1px solid #fecaca;border-radius:16px;margin-top:12px}
      .lesson-video-fallback.show{display:block}.lesson-video-fallback a{font-weight:700;color:inherit;text-decoration:underline}
      .lesson-quiz-card{margin:22px 0;padding:24px;border:1px solid rgba(30,41,59,.13);border-radius:22px;background:rgba(255,255,255,.94);box-shadow:0 16px 42px rgba(15,23,42,.08)}
      .lesson-quiz-card.passed{border-color:rgba(0,81,52,.35);background:linear-gradient(180deg,#fff,#f4fbf7)}
      .lesson-quiz-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}.lesson-quiz-head h2{margin:4px 0 0;font-size:1.25rem}.lesson-quiz-kicker{font-size:.75rem;letter-spacing:.1em;text-transform:uppercase;font-weight:800;color:#005134}
      .lesson-quiz-status{white-space:nowrap;padding:7px 10px;border-radius:999px;background:#eef2f7;color:#475569;font-size:.78rem;font-weight:800}.lesson-quiz-card.passed .lesson-quiz-status{background:#e5f7ed;color:#005134}
      .lesson-quiz-question{font-size:1.05rem;font-weight:750;color:#1e293b;margin:0 0 14px}.lesson-quiz-options{display:grid;gap:10px}.lesson-quiz-option{display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border:1px solid #dbe3ea;border-radius:14px;cursor:pointer;background:#fff;transition:.15s}.lesson-quiz-option:hover{border-color:#005134;background:#f8fcfa}.lesson-quiz-option input{margin-top:3px;accent-color:#005134}.lesson-quiz-option span{line-height:1.4;color:#334155}
      .lesson-quiz-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:16px}.lesson-quiz-feedback{margin:0;font-size:.92rem;font-weight:650;color:#64748b}.lesson-quiz-feedback.success{color:#005134}.lesson-quiz-feedback.error{color:#b42318}.lesson-quiz-explanation{margin:12px 0 0;padding:12px 14px;border-left:3px solid #005134;background:#f4fbf7;border-radius:8px;color:#334155;line-height:1.5}
      .lesson-quiz-loading{margin:20px 0;padding:18px;border:1px dashed #cbd5e1;border-radius:18px;color:#64748b;background:#f8fafc}
      @media(max-width:700px){.video-shell .lesson-native-video{min-height:210px}.lesson-quiz-card{padding:18px;border-radius:18px}.lesson-quiz-head{display:block}.lesson-quiz-status{display:inline-block;margin-top:10px}}
    `;
    document.head.appendChild(style);
  }

  function isWixMp4(src = '') {
    return /https:\/\/video\.wixstatic\.com\/video\//i.test(src) && /\/mp4\/file\.mp4(?:$|\?)/i.test(src);
  }

  function replaceWixFrameWithVideo() {
    const frame = document.querySelector('.video-shell iframe.lesson-frame');
    if (!frame) return;
    const src = String(frame.getAttribute('src') || '').trim();
    if (!isWixMp4(src)) return;

    const wrapper = document.createDocumentFragment();
    const video = document.createElement('video');
    video.className = 'lesson-frame lesson-native-video';
    video.controls = true;
    video.playsInline = true;
    video.preload = 'metadata';
    video.setAttribute('playsinline', '');
    video.setAttribute('webkit-playsinline', '');
    video.setAttribute('aria-label', frame.getAttribute('title') || 'Video de la lección');

    const source = document.createElement('source');
    source.src = src;
    source.type = 'video/mp4';
    video.appendChild(source);

    const fallback = document.createElement('div');
    fallback.className = 'lesson-video-fallback';
    fallback.innerHTML = `No pudimos reproducir este video dentro del aula. <a href="${escapeText(src)}" target="_blank" rel="noopener">Abrir video en una pestaña nueva</a>.`;

    video.addEventListener('error', () => fallback.classList.add('show'));
    video.addEventListener('loadedmetadata', () => fallback.classList.remove('show'));

    wrapper.append(video, fallback);
    frame.replaceWith(wrapper);
    video.load();
  }

  function quizApiAvailable() {
    try {
      return typeof db !== 'undefined' && db?.rpc && typeof state !== 'undefined' && state?.user?.id;
    } catch {
      return false;
    }
  }

  function renderQuizCard(quiz, lessonId) {
    const videoShell = document.querySelector('.lesson-layout .video-shell');
    if (!videoShell || document.querySelector(`.lesson-quiz-card[data-lesson-id="${lessonId}"]`)) return;

    const passed = Boolean(quiz.passed);
    quizState.set(lessonId, { required: Boolean(quiz.required), passed, quizId: quiz.id });

    const card = document.createElement('section');
    card.className = `lesson-quiz-card${passed ? ' passed' : ''}`;
    card.dataset.lessonId = lessonId;
    card.dataset.quizId = quiz.id;
    card.dataset.passed = passed ? 'true' : 'false';
    card.innerHTML = `
      <div class="lesson-quiz-head">
        <div><span class="lesson-quiz-kicker">Evaluación rápida</span><h2>Comprueba lo aprendido antes de continuar</h2></div>
        <span class="lesson-quiz-status">${passed ? '✓ Aprobada' : 'Pendiente'}</span>
      </div>
      <p class="lesson-quiz-question">${escapeText(quiz.question || '')}</p>
      ${passed ? `
        <p class="lesson-quiz-feedback success">Esta evaluación ya fue contestada correctamente.</p>
      ` : `
        <form class="lesson-quiz-form">
          <div class="lesson-quiz-options">
            ${(quiz.options || []).map(option => `
              <label class="lesson-quiz-option">
                <input type="radio" name="lesson-answer" value="${escapeText(option.key)}" required>
                <span>${escapeText(option.text)}</span>
              </label>`).join('')}
          </div>
          <div class="lesson-quiz-actions">
            <button class="btn btn-primary lesson-quiz-submit" type="submit">Comprobar respuesta</button>
            <p class="lesson-quiz-feedback">Debes responder correctamente para completar esta lección.</p>
          </div>
        </form>
      `}`;
    videoShell.insertAdjacentElement('afterend', card);

    card.querySelector('.lesson-quiz-form')?.addEventListener('submit', event => submitQuiz(event, quiz, lessonId));
  }

  async function submitQuiz(event, quiz, lessonId) {
    event.preventDefault();
    const form = event.currentTarget;
    const selected = new FormData(form).get('lesson-answer');
    const button = form.querySelector('.lesson-quiz-submit');
    const feedback = form.querySelector('.lesson-quiz-feedback');
    if (!selected) return;

    button.disabled = true;
    button.textContent = 'Comprobando…';
    feedback.className = 'lesson-quiz-feedback';
    feedback.textContent = 'Guardando tu respuesta…';

    try {
      const { data, error } = await db.rpc('submit_lesson_quiz', {
        target_quiz: quiz.id,
        answer_key: selected
      });
      if (error) throw error;

      const result = data || {};
      if (result.passed) {
        quizState.set(lessonId, { required: true, passed: true, quizId: quiz.id });
        const card = form.closest('.lesson-quiz-card');
        card.classList.add('passed');
        card.dataset.passed = 'true';
        card.querySelector('.lesson-quiz-status').textContent = '✓ Aprobada';
        feedback.className = 'lesson-quiz-feedback success';
        feedback.textContent = result.message || '¡Correcto!';
        if (result.explanation) {
          const explanation = document.createElement('p');
          explanation.className = 'lesson-quiz-explanation';
          explanation.textContent = result.explanation;
          form.appendChild(explanation);
        }
        button.remove();
        try { showToast?.('Evaluación aprobada. Ya puedes completar la lección.', 'success'); } catch {}
      } else {
        feedback.className = 'lesson-quiz-feedback error';
        feedback.textContent = result.message || 'Respuesta incorrecta. Revisa el video y vuelve a intentarlo.';
        button.disabled = false;
        button.textContent = 'Intentar de nuevo';
      }
    } catch (error) {
      console.error('Lesson quiz error:', error);
      feedback.className = 'lesson-quiz-feedback error';
      feedback.textContent = 'No pudimos guardar la evaluación. Actualiza la página e inténtalo nuevamente.';
      button.disabled = false;
      button.textContent = 'Comprobar respuesta';
    }
  }

  async function loadLessonQuiz(lessonId) {
    if (!quizApiAvailable()) return;
    if (document.querySelector(`.lesson-quiz-card[data-lesson-id="${lessonId}"]`)) return;
    if (processingLesson === lessonId) return;
    processingLesson = lessonId;

    const videoShell = document.querySelector('.lesson-layout .video-shell');
    let loading = null;
    if (videoShell) {
      loading = document.createElement('div');
      loading.className = 'lesson-quiz-loading';
      loading.dataset.lessonId = lessonId;
      loading.textContent = 'Preparando la evaluación de esta lección…';
      videoShell.insertAdjacentElement('afterend', loading);
    }

    try {
      const { data, error } = await db.rpc('get_lesson_quiz', { target_lesson: lessonId });
      loading?.remove();
      if (error) {
        console.error('Get lesson quiz error:', error);
        return;
      }
      if (!data) {
        quizState.set(lessonId, { required: false, passed: true, quizId: null });
        return;
      }
      renderQuizCard(data, lessonId);
    } catch (error) {
      loading?.remove();
      console.error('Quiz load error:', error);
    } finally {
      processingLesson = null;
    }
  }

  async function enhanceCurrentLesson() {
    addStyles();
    const route = currentLessonRoute();
    if (!route || !document.querySelector('.lesson-layout')) return;
    replaceWixFrameWithVideo();
    await loadLessonQuiz(route.lessonId);
  }

  document.addEventListener('click', event => {
    const route = currentLessonRoute();
    if (!route) return;
    const button = event.target.closest('#complete-current, [data-complete]');
    if (!button) return;

    const targetLesson = button.id === 'complete-current' ? route.lessonId : button.dataset.complete;
    if (targetLesson !== route.lessonId) return;
    const status = quizState.get(route.lessonId);
    if (!status?.required || status.passed) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    document.querySelector(`.lesson-quiz-card[data-lesson-id="${route.lessonId}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    try { showToast?.('Primero responde correctamente la evaluación de esta lección.', 'info'); } catch {}
  }, true);

  window.addEventListener('hashchange', () => setTimeout(enhanceCurrentLesson, 60));
  const observer = new MutationObserver(() => {
    if (currentLessonRoute() && document.querySelector('.lesson-layout')) setTimeout(enhanceCurrentLesson, 20);
  });
  observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });

  window.ACADEMIA_AG_LESSON_EXPERIENCE = { release: RELEASE, enhance: enhanceCurrentLesson };
  setTimeout(enhanceCurrentLesson, 80);
})();
