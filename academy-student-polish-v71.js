(() => {
  'use strict';

  const RELEASE = '20260823.71';
  let timer = null;
  let observer = null;

  function currentHash() {
    const hash = location.hash.replace(/^#/, '');
    if (hash) return hash;
    return hasSession() ? 'home' : 'catalog';
  }

  function hasSession() {
    try { return Boolean(typeof state !== 'undefined' && state?.session); }
    catch (_) { return false; }
  }

  function availableEvents() {
    try {
      if (typeof ACADEMY_EVENTS === 'undefined' || !Array.isArray(ACADEMY_EVENTS)) return [];
      const now = Date.now();
      return ACADEMY_EVENTS
        .map(item => ({ ...item, timestamp: new Date(item.date).getTime() }))
        .filter(item => Number.isFinite(item.timestamp) && item.timestamp >= now - 3600000)
        .sort((a, b) => a.timestamp - b.timestamp);
    } catch (_) {
      return [];
    }
  }

  function nextEvent() {
    return availableEvents()[0] || null;
  }

  function formatEvent(event) {
    if (!event) return null;
    const date = new Date(event.date);
    return {
      day: new Intl.DateTimeFormat('es-MX', { day: '2-digit' }).format(date),
      month: new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date).replace('.', '').toUpperCase(),
      full: new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(date),
      time: new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: '2-digit' }).format(date)
    };
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function injectStyles() {
    if (document.querySelector('#academy-student-polish-v71-style')) return;
    const style = document.createElement('style');
    style.id = 'academy-student-polish-v71-style';
    style.textContent = `
      .ag-home-next-step-v71{display:flex;align-items:flex-start;gap:10px;margin-top:14px;padding:11px 13px;border:1px solid rgba(255,255,255,.22);border-radius:12px;background:rgba(15,23,42,.22);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px)}
      .ag-home-next-step-v71>span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:0 0 24px;border-radius:50%;background:rgba(255,255,255,.16);font-size:.72rem;font-weight:900}
      .ag-home-next-step-v71 div{display:grid;gap:2px;min-width:0}
      .ag-home-next-step-v71 small{font-size:.68rem;font-weight:800;letter-spacing:.07em;text-transform:uppercase;opacity:.75}
      .ag-home-next-step-v71 strong{font-size:.82rem;line-height:1.35}
      .public-shell[data-ag-catalog-polish="1"] .catalog-filters{display:none!important}
      .public-shell[data-ag-catalog-polish="1"] .catalog-card[data-ag-hidden-program="1"]{display:none!important}
      .public-shell[data-ag-catalog-polish="1"] .catalog-grid{grid-template-columns:minmax(0,520px)!important;justify-content:center}
      .public-shell[data-ag-catalog-polish="1"] .catalog-trust{grid-template-columns:repeat(3,minmax(0,1fr))}
      .ag-catalog-note-v71{max-width:760px;margin:20px auto 0;padding:14px 18px;border:1px solid rgba(30,41,59,.1);border-radius:14px;background:#f8fafc;color:#475569;font-size:.86rem;line-height:1.55;text-align:center}
      @media(max-width:720px){
        .public-shell[data-ag-catalog-polish="1"] .catalog-trust{grid-template-columns:1fr}
        .ag-home-next-step-v71{padding:10px 11px}
      }
    `;
    document.head.appendChild(style);
  }

  function polishHome() {
    if (!hasSession() || currentHash().split('/')[0] !== 'home') return;
    const page = document.querySelector('#page');
    if (!page) return;

    const event = nextEvent();
    const formatted = formatEvent(event);
    const eventCard = page.querySelector('.next-event-card');

    if (eventCard && event && formatted) {
      setText(eventCard.querySelector('.event-date-block strong'), formatted.day);
      setText(eventCard.querySelector('.event-date-block span'), formatted.month);
      setText(eventCard.querySelector('h2'), event.title || 'Próxima actividad');
      setText(eventCard.querySelector('p'), event.description || 'Consulta los detalles en tu calendario.');
      const meta = eventCard.querySelectorAll('.event-meta span');
      setText(meta[0], `◷ ${formatted.time}`);
      setText(meta[1], '⌖ Actividad de Academia AG');
    }

    const summary = page.querySelectorAll('.dashboard-summary article');
    if (summary[3] && event && formatted) {
      setText(summary[3].querySelector('strong'), `${formatted.day} ${formatted.month}`);
      setText(summary[3].querySelector('small'), 'Próxima actividad');
    }

    const announcements = page.querySelectorAll('.announcement-panel > a');
    if (announcements[1] && event && formatted) {
      const label = announcements[1].querySelector('span');
      const strong = announcements[1].querySelector('strong');
      const small = announcements[1].querySelector('small');
      setText(label, 'Próxima actividad');
      setText(strong, event.title || 'Actividad de Academia AG');
      setText(small, `${formatted.full} · ${formatted.time} · Ver detalles →`);
      if (announcements[1].getAttribute('href') !== '#agenda') announcements[1].setAttribute('href', '#agenda');
    }

    try {
      const featured = state.courses.find(course => course.featured) || state.courses[0];
      const nextLesson = featured && typeof firstIncompleteLesson === 'function' ? firstIncompleteLesson(featured) : null;
      const heroContent = page.querySelector('.hero .hero-content');
      const progressLine = heroContent?.querySelector('.progress-line');
      let nextStep = heroContent?.querySelector('.ag-home-next-step-v71');
      if (heroContent && progressLine) {
        const text = nextLesson ? nextLesson.title : 'Programa completado. Puedes volver a cualquier tema cuando lo necesites.';
        if (!nextStep) {
          nextStep = document.createElement('div');
          nextStep.className = 'ag-home-next-step-v71';
          progressLine.insertAdjacentElement('afterend', nextStep);
        }
        const signature = `${featured?.id || ''}|${nextLesson?.id || 'complete'}|${text}`;
        if (nextStep.dataset.signature !== signature) {
          nextStep.dataset.signature = signature;
          nextStep.innerHTML = `<span>${nextLesson ? '→' : '✓'}</span><div><small>${nextLesson ? 'Siguiente paso' : 'Estado'}</small><strong></strong></div>`;
          setText(nextStep.querySelector('strong'), text);
        }
      }
    } catch (_) {}

    document.documentElement.dataset.agHomePolish = RELEASE;
  }

  function polishCourses() {
    if (!hasSession() || currentHash().split('/')[0] !== 'courses') return;
    const page = document.querySelector('#page');
    if (!page) return;

    const catalogButton = page.querySelector('.courses-page-heading > a[href="#catalog"]');
    setText(catalogButton, 'Ver catálogo');

    const listHeading = page.querySelector('.courses-list-heading');
    if (listHeading) {
      setText(listHeading.querySelector('.eyebrow'), 'Programas asignados');
      setText(listHeading.querySelector('h2'), 'Todos mis cursos');
    }

    const continuePanel = page.querySelector('.continue-learning-panel');
    if (continuePanel) {
      const eyebrow = continuePanel.querySelector('.eyebrow');
      setText(eyebrow, 'Tu ruta activa');
    }

    document.documentElement.dataset.agCoursesPolish = RELEASE;
  }

  function replaceButtonWithLink(button, text, href) {
    if (!button || button.dataset.agReplacedV71 === '1') return;
    const link = document.createElement('a');
    link.className = button.className;
    link.href = href;
    link.textContent = text;
    link.dataset.agReplacedV71 = '1';
    button.replaceWith(link);
  }

  function polishPublicCatalog() {
    if (currentHash().split('/')[0] !== 'catalog') return;
    const shell = document.querySelector('.public-shell');
    if (!shell) return;
    shell.dataset.agCatalogPolish = '1';

    const cards = [...shell.querySelectorAll('.catalog-card')];
    cards.forEach(card => {
      const status = (card.querySelector('.status-pill')?.textContent || '').trim().toLowerCase();
      if (status !== 'disponible') card.dataset.agHiddenProgram = '1';
      else card.removeAttribute('data-ag-hidden-program');
    });

    const visibleCount = cards.filter(card => card.dataset.agHiddenProgram !== '1').length;
    const programsSection = shell.querySelector('#programs');
    let note = shell.querySelector('.ag-catalog-note-v71');
    if (programsSection && visibleCount && !note) {
      note = document.createElement('p');
      note.className = 'ag-catalog-note-v71';
      note.textContent = 'Mostramos únicamente los programas disponibles para inscripción. Los nuevos cursos aparecerán aquí cuando estén listos para el alumno.';
      programsSection.appendChild(note);
    }

    const trust = shell.querySelector('.catalog-trust');
    if (trust && trust.dataset.agPolishedV71 !== '1') {
      trust.dataset.agPolishedV71 = '1';
      trust.innerHTML = `
        <span><strong>PRIVADO</strong> Acceso personal por alumno</span>
        <span><strong>PROGRESO</strong> Avance guardado automáticamente</span>
        <span><strong>FLEXIBLE</strong> Celular, tableta y computadora</span>`;
    }

    const benefitList = shell.querySelector('.public-book-section ul');
    if (benefitList && benefitList.dataset.agPolishedV71 !== '1') {
      benefitList.dataset.agPolishedV71 = '1';
      benefitList.innerHTML = `
        <li>Acceso personal a los programas asignados a tu cuenta</li>
        <li>Videos, lecciones y avance organizado por módulos</li>
        <li>Evaluaciones y seguimiento de resultados en un mismo espacio</li>
        <li>Biblioteca privada con manuales y materiales de apoyo</li>
        <li>Calendario, avisos, certificados y centro de ayuda</li>`;
    }

    const instructor = shell.querySelector('.instructor-section article');
    if (instructor && instructor.dataset.agPolishedV71 !== '1') {
      instructor.dataset.agPolishedV71 = '1';
      setText(instructor.querySelector('.eyebrow'), 'Acompañamiento académico');
      setText(instructor.querySelector('h2'), 'Aprende con una ruta clara');
      const paragraphs = instructor.querySelectorAll('p');
      setText(paragraphs[0], 'Cada programa está organizado para que el alumno identifique qué estudiar, qué ha completado y cuál es su siguiente paso.');
      setText(paragraphs[1], 'Academia AG reúne formación, recursos y soporte en una sola experiencia, con acceso personal desde cualquier dispositivo compatible.');
    }

    if (hasSession()) {
      const topLogin = shell.querySelector('[data-public-login]');
      replaceButtonWithLink(topLogin, 'Volver a mi academia', '#home');
      shell.querySelectorAll('[data-public-signup]').forEach(button => replaceButtonWithLink(button, 'Ir a mis cursos', '#courses'));

      const contactHeading = shell.querySelector('#contact .public-section-heading');
      if (contactHeading) {
        setText(contactHeading.querySelector('.eyebrow'), 'Programas');
        setText(contactHeading.querySelector('h2'), '¿Quieres acceso a otro programa?');
        setText(contactHeading.querySelector('p'), 'Consulta con el equipo de AG Business Networking qué programas están disponibles para tu cuenta.');
      }
    }

    document.documentElement.dataset.agCatalogPolish = RELEASE;
  }

  function apply() {
    injectStyles();
    polishHome();
    polishCourses();
    polishPublicCatalog();
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 60);
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    const root = document.querySelector('#app') || document.body;
    if (root) observer.observe(root, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once: true });
  observe();
  schedule();

  window.ACADEMIA_AG_STUDENT_POLISH = { release: RELEASE, apply };
})();
