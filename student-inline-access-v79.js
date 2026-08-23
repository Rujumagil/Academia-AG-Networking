(() => {
  'use strict';

  const RELEASE = '20260823.79';
  let observer = null;
  let timer = null;
  let syncing = false;
  let pendingSubjects = new Set();

  function isStudentSession() {
    try {
      return Boolean(state?.session && state?.user && String(state?.profile?.role || 'student') === 'student');
    } catch (_) {
      return false;
    }
  }

  function injectStyles() {
    if (document.querySelector('#student-inline-access-v79-style')) return;
    const style = document.createElement('style');
    style.id = 'student-inline-access-v79-style';
    style.textContent = `
      .student-home-course-v77 .inline-request-state-v79,
      .student-home-course-v76 .inline-request-state-v79{
        margin-top:12px;padding:11px 12px;border-radius:13px;background:#fff7dc;
        color:#745b16;font-size:.74rem;line-height:1.45;font-weight:700;
        border:1px solid rgba(138,106,21,.14)
      }
      .student-home-course-v77 .inline-request-state-v79 strong,
      .student-home-course-v76 .inline-request-state-v79 strong{display:block;color:#5f4a12;margin-bottom:2px}
      .student-home-course-v77 button.inline-request-btn-v79,
      .student-home-course-v76 button.inline-request-btn-v79{width:100%;justify-content:center}
      .student-home-course-v77 button.inline-request-btn-v79[disabled],
      .student-home-course-v76 button.inline-request-btn-v79[disabled]{opacity:.72;cursor:not-allowed;transform:none}
    `;
    document.head.appendChild(style);
  }

  function requestInfo(card) {
    const title = String(card?.querySelector('h3')?.textContent || '').trim();
    const originalLink = card?.querySelector('a[href="#catalog/programs"]');
    const existingButton = card?.querySelector('[data-inline-course-request-v79]');
    const control = existingButton || originalLink;
    const text = String(control?.textContent || '').trim();
    const available = !/pre-registr/i.test(text) && !/próximamente/i.test(String(card?.querySelector('.badge')?.textContent || ''));
    return { title, available, control };
  }

  function subjectsFor(title) {
    return [
      `Solicitud de acceso · ${title}`,
      `Pre-registro · ${title}`
    ];
  }

  function hasPending(title) {
    return subjectsFor(title).some(subject => pendingSubjects.has(subject));
  }

  function renderPending(card, available) {
    if (!card) return;
    const actionArea = card.querySelector('.actions') || card.querySelector('.body') || card;
    let control = card.querySelector('[data-inline-course-request-v79]') || card.querySelector('a[href="#catalog/programs"]');
    if (control && control.tagName === 'A') {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = `${control.className || 'btn btn-primary'} inline-request-btn-v79`;
      button.dataset.inlineCourseRequestV79 = '1';
      control.replaceWith(button);
      control = button;
    }
    if (control) {
      control.disabled = true;
      control.textContent = available ? 'Solicitud en proceso' : 'Pre-registro en proceso';
    }
    if (!card.querySelector('.inline-request-state-v79')) {
      const note = document.createElement('div');
      note.className = 'inline-request-state-v79';
      note.innerHTML = available
        ? '<strong>Tu solicitud está en proceso.</strong>El equipo de AG revisará tu acceso. Permanecerás dentro de tu academia y te avisaremos cuando sea aprobado.'
        : '<strong>Tu pre-registro está en proceso.</strong>Quedaste en la lista de interesados. Te avisaremos cuando este programa abra su acceso.';
      actionArea.insertAdjacentElement('afterend', note);
    }
  }

  function turnLinkIntoButton(card) {
    const info = requestInfo(card);
    if (!info.title || !info.control) return;
    if (hasPending(info.title)) {
      renderPending(card, info.available);
      return;
    }
    if (info.control.tagName !== 'A') return;

    const button = document.createElement('button');
    button.type = 'button';
    button.className = `${info.control.className || 'btn btn-primary'} inline-request-btn-v79`;
    button.dataset.inlineCourseRequestV79 = '1';
    button.dataset.courseTitle = info.title;
    button.dataset.courseAvailable = info.available ? '1' : '0';
    button.textContent = info.available ? 'Solicitar acceso' : 'Pre-registrarme';
    info.control.replaceWith(button);
  }

  async function loadPendingSubjects() {
    if (!isStudentSession()) return;
    const { data, error } = await db
      .from('support_tickets')
      .select('subject,status')
      .eq('user_id', state.user.id)
      .eq('category', 'course')
      .in('status', ['open','in_progress'])
      .limit(100);
    if (error) throw error;
    pendingSubjects = new Set((data || []).map(row => row.subject));
  }

  async function dispatchPush(ticketId) {
    try {
      await window.ACADEMIA_AG_PUSH?.dispatchCourseRequest?.(ticketId, true);
    } catch (_) {}
  }

  async function createInlineRequest(button) {
    if (!isStudentSession() || !button || button.disabled) return;
    const card = button.closest('.student-home-course-v77,.student-home-course-v76');
    const title = String(button.dataset.courseTitle || card?.querySelector('h3')?.textContent || '').trim();
    const available = button.dataset.courseAvailable !== '0';
    if (!title) return;

    const subject = `${available ? 'Solicitud de acceso' : 'Pre-registro'} · ${title}`.slice(0, 140);
    const originalText = button.textContent;
    button.disabled = true;
    button.textContent = available ? 'Enviando solicitud…' : 'Enviando pre-registro…';

    try {
      const { data: existing, error: existingError } = await db
        .from('support_tickets')
        .select('id,subject,status')
        .eq('user_id', state.user.id)
        .eq('category', 'course')
        .in('subject', subjectsFor(title))
        .in('status', ['open','in_progress'])
        .limit(1);
      if (existingError) throw existingError;

      let ticketId = existing?.[0]?.id || '';
      if (!existing?.length) {
        const profileName = state.profile?.full_name || state.user?.user_metadata?.full_name || 'Alumno';
        const email = state.profile?.email || state.user?.email || '';
        const message = [
          available
            ? 'El alumno solicita acceso a un curso disponible desde el Inicio de Academia AG.'
            : 'El alumno realizó un pre-registro para un programa próximo desde el Inicio de Academia AG.',
          `Curso: ${title}`,
          `Alumno: ${profileName}`,
          email ? `Correo: ${email}` : '',
          `Tipo de solicitud: ${available ? 'Acceso a curso disponible' : 'Pre-registro para curso próximo'}`,
          'Origen: Inicio del alumno · Academia AG'
        ].filter(Boolean).join('\n');

        const { data: created, error } = await db.from('support_tickets').insert({
          user_id: state.user.id,
          category: 'course',
          subject,
          message
        }).select('id').single();
        if (error) throw error;
        ticketId = created?.id || '';
      }

      pendingSubjects.add(subject);
      renderPending(card, available);
      if (ticketId) dispatchPush(ticketId);
      if (typeof showToast === 'function') {
        showToast(
          available
            ? 'Solicitud enviada. Tu acceso está en proceso de revisión.'
            : 'Pre-registro enviado. Te avisaremos cuando el programa esté disponible.',
          'success'
        );
      }
    } catch (error) {
      console.error('INLINE_COURSE_ACCESS_REQUEST_FAILED', error);
      button.disabled = false;
      button.textContent = originalText;
      if (typeof showToast === 'function') showToast(error?.message || 'No se pudo enviar la solicitud.', 'error');
    }
  }

  async function apply() {
    if (syncing || !isStudentSession()) return;
    syncing = true;
    observer?.disconnect();
    try {
      injectStyles();
      await loadPendingSubjects();
      document.querySelectorAll('.student-home-course-v77,.student-home-course-v76').forEach(turnLinkIntoButton);
      document.documentElement.dataset.agInlineAccess = RELEASE;
    } catch (error) {
      console.warn('No se pudo sincronizar el estado de solicitudes en Inicio:', error);
    } finally {
      syncing = false;
      observe();
    }
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 140);
  }

  function observe() {
    if (!observer) observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  document.addEventListener('click', event => {
    const button = event.target.closest?.('[data-inline-course-request-v79]');
    if (!button) return;
    event.preventDefault();
    event.stopPropagation();
    createInlineRequest(button);
  }, true);

  document.addEventListener('click', event => {
    const link = event.target.closest?.('.student-home-course-v77 a[href="#catalog/programs"],.student-home-course-v76 a[href="#catalog/programs"]');
    if (!link) return;
    event.preventDefault();
    event.stopPropagation();
    const card = link.closest('.student-home-course-v77,.student-home-course-v76');
    turnLinkIntoButton(card);
    const button = card?.querySelector('[data-inline-course-request-v79]');
    if (button && !button.disabled) createInlineRequest(button);
  }, true);

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  observe();
  schedule();

  window.ACADEMIA_AG_INLINE_ACCESS = Object.freeze({ release: RELEASE, apply: schedule });
})();