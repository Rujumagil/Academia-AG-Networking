(() => {
  'use strict';

  const RELEASE = '20260823.81';
  let timer = null;
  let observer = null;

  function routeName() {
    const hash = location.hash.replace(/^#/, '');
    if (hash) return hash.split('/')[0];
    try { return typeof state !== 'undefined' && state?.session ? 'home' : 'catalog'; }
    catch (_) { return 'catalog'; }
  }

  function setText(node, value) {
    if (node && node.textContent !== String(value)) node.textContent = String(value);
  }

  function injectStyles() {
    if (document.querySelector('#academy-profile-support-mobile-v81-style')) return;
    const style = document.createElement('style');
    style.id = 'academy-profile-support-mobile-v81-style';
    style.textContent = `
      .ag-assurance81,.ag-support-summary81{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0 22px}
      .ag-assurance81 article,.ag-support-summary81 article{display:flex;align-items:flex-start;gap:11px;padding:14px 16px;border:1px solid rgba(30,41,59,.1);border-radius:15px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.05)}
      .ag-assurance81 article>span,.ag-support-summary81 article>span{display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:#eef7f3;color:#005134;font-size:.7rem;font-weight:900}
      .ag-assurance81 div,.ag-support-summary81 div{display:grid;gap:2px;min-width:0}
      .ag-assurance81 strong,.ag-support-summary81 strong{color:#1e293b;font-size:.82rem}
      .ag-assurance81 small,.ag-support-summary81 small{color:#64748b;font-size:.7rem;line-height:1.4;overflow-wrap:anywhere}
      .ag-note81{display:flex;align-items:flex-start;gap:9px;margin:0 0 16px;padding:11px 13px;border:1px solid rgba(0,81,52,.12);border-radius:13px;background:#f5faf7;color:#475569;font-size:.75rem;line-height:1.5}
      .ag-note81>span{display:flex;align-items:center;justify-content:center;width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:#005134;color:#fff;font-size:.62rem;font-weight:900}
      .ag-help-reset81{display:inline-flex;margin-top:10px;padding:7px 11px;border:1px solid rgba(30,41,59,.12);border-radius:999px;background:#fff;color:#475569;font:inherit;font-size:.72rem;font-weight:800;cursor:pointer}
      .ticket-list .status-pill[data-ag-status81="open"]{background:#fff7ed;color:#9a3412}
      .ticket-list .status-pill[data-ag-status81="pending"]{background:#eff6ff;color:#1d4ed8}
      .ticket-list .status-pill[data-ag-status81="resolved"],.ticket-list .status-pill[data-ag-status81="closed"]{background:#f0f8f4;color:#005134}
      @media(max-width:820px){
        html,body{max-width:100%;overflow-x:hidden}
        .content{padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}
        .page{max-width:100%;overflow-x:clip}
        .mobile-nav{min-height:68px;padding-bottom:env(safe-area-inset-bottom);border-top:1px solid rgba(30,41,59,.1);background:rgba(249,250,249,.95)!important;box-shadow:0 -10px 30px rgba(15,23,42,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .mobile-nav button{min-height:58px;min-width:0;padding:7px 3px!important;touch-action:manipulation}
        .mobile-nav button>span:last-child{font-size:.62rem;line-height:1.1;white-space:nowrap}
        .topbar{position:sticky;top:0;z-index:40;background:rgba(249,250,249,.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
        .hero-actions,.continue-learning-actions,.certificate-featured-actions,.certificate-actions{flex-wrap:wrap}
        .lesson-actions{grid-template-columns:1fr!important}
        .module-panel{max-height:none!important}
        .certificate-document-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch}
        .help-categories{overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:4px}
        .help-categories button{min-width:180px;scroll-snap-align:start}
      }
      @media(max-width:680px){.ag-assurance81,.ag-support-summary81{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function maskEmail(value = '') {
    const [name, domain] = String(value || '').split('@');
    if (!name || !domain) return 'Cuenta identificada';
    const visible = name.slice(0, Math.min(2, name.length));
    return `${visible}${'•'.repeat(Math.min(5, Math.max(2, name.length - visible.length)))}@${domain}`;
  }

  function normalizeStatus(value = '') {
    const raw = String(value || '').trim().toLowerCase();
    if (raw.includes('closed') || raw.includes('cerrad')) return 'closed';
    if (raw.includes('resolved') || raw.includes('resuelt') || raw.includes('done') || raw.includes('complete')) return 'resolved';
    if (raw.includes('pending') || raw.includes('waiting') || raw.includes('progress') || raw.includes('revisi') || raw.includes('pendient')) return 'pending';
    return 'open';
  }

  function polishProfile() {
    if (routeName() !== 'profile') return;
    const page = document.querySelector('#page');
    const heading = page?.querySelector('.profile-page-heading');
    if (!heading) return;

    setText(heading.querySelector('.page-subtitle'), 'Mantén actualizados tus datos y revisa el estado de tu recorrido dentro de Academia AG.');

    let block = page.querySelector('[data-ag-assurance81]');
    if (!block) {
      block = document.createElement('section');
      block.className = 'ag-assurance81';
      block.dataset.agAssurance81 = '1';
      heading.insertAdjacentElement('afterend', block);
    }

    let completed = 0;
    let fullName = '';
    try {
      completed = (state.progressRows || []).filter(row => row.completed).length;
      fullName = String(state.profile?.full_name || '').trim();
    } catch (_) {}

    const signature = `${completed}|${fullName}`;
    if (block.dataset.signature !== signature) {
      block.dataset.signature = signature;
      block.innerHTML = `
        <article><span>✓</span><div><strong>Cuenta activa</strong><small>Tu sesión y tus accesos están vinculados a este perfil.</small></div></article>
        <article><span>↻</span><div><strong>Progreso sincronizado</strong><small></small></div></article>
        <article><span>AG</span><div><strong>Datos para constancias</strong><small></small></div></article>`;
      setText(block.children[1].querySelector('small'), `${completed} ${completed === 1 ? 'lección completada registrada' : 'lecciones completadas registradas'}.`);
      setText(block.children[2].querySelector('small'), fullName ? `Se utilizará “${fullName}” en tus constancias.` : 'Completa tu nombre para usarlo en tus constancias.');
    }

    const form = page.querySelector('#profile-form');
    if (form && !page.querySelector('[data-ag-profile-note81]')) {
      const note = document.createElement('div');
      note.className = 'ag-note81';
      note.dataset.agProfileNote81 = '1';
      note.innerHTML = '<span>i</span><div>Verifica que tu nombre esté escrito como quieres que aparezca en tus constancias. El correo de acceso se mantiene protegido y no se cambia desde este formulario.</div>';
      form.insertAdjacentElement('beforebegin', note);
    }
  }

  function polishHelp() {
    if (routeName() !== 'help') return;
    const page = document.querySelector('#page');
    const hero = page?.querySelector('.help-hero');
    if (!hero) return;

    setText(hero.querySelector('p'), 'Busca una respuesta rápida o envía una solicitud para que el equipo pueda revisar tu cuenta.');

    let tickets = [];
    try { tickets = (state.supportTickets || []).filter(ticket => ticket.user_id === state.user?.id || (typeof isAdmin === 'function' && isAdmin())); }
    catch (_) {}
    const open = tickets.filter(ticket => normalizeStatus(ticket.status) === 'open').length;
    const pending = tickets.filter(ticket => normalizeStatus(ticket.status) === 'pending').length;
    const resolved = tickets.filter(ticket => ['resolved','closed'].includes(normalizeStatus(ticket.status))).length;
    let email = 'Cuenta identificada';
    try { email = maskEmail(state.user?.email); } catch (_) {}

    let summary = page.querySelector('[data-ag-support-summary81]');
    if (!summary) {
      summary = document.createElement('section');
      summary.className = 'ag-support-summary81';
      summary.dataset.agSupportSummary81 = '1';
      hero.insertAdjacentElement('afterend', summary);
    }
    const signature = `${open}|${pending}|${resolved}|${email}`;
    if (summary.dataset.signature !== signature) {
      summary.dataset.signature = signature;
      summary.innerHTML = `
        <article><span>?</span><div><strong></strong><small>Solicitudes pendientes de atención</small></div></article>
        <article><span>↻</span><div><strong></strong><small>Estado de tus solicitudes recientes</small></div></article>
        <article><span>@</span><div><strong>Cuenta de soporte</strong><small></small></div></article>`;
      setText(summary.children[0].querySelector('strong'), `${open} ${open === 1 ? 'ticket abierto' : 'tickets abiertos'}`);
      setText(summary.children[1].querySelector('strong'), `${pending} en revisión · ${resolved} resueltos`);
      setText(summary.children[2].querySelector('small'), email);
    }

    page.querySelectorAll('.ticket-list article .status-pill').forEach(pill => {
      const status = pill.dataset.agStatus81 || normalizeStatus(pill.textContent);
      pill.dataset.agStatus81 = status;
      const label = status === 'closed' ? 'Cerrado' : status === 'resolved' ? 'Resuelto' : status === 'pending' ? 'En revisión' : 'Abierto';
      setText(pill, label);
    });

    const form = page.querySelector('#support-ticket-form');
    if (form && !page.querySelector('[data-ag-support-note81]')) {
      const note = document.createElement('div');
      note.className = 'ag-note81';
      note.dataset.agSupportNote81 = '1';
      note.innerHTML = '<span>!</span><div><strong>Protege tu cuenta.</strong> Describe el problema sin incluir contraseñas, códigos de acceso ni información bancaria.</div>';
      form.insertAdjacentElement('beforebegin', note);
    }

    const input = page.querySelector('#help-search');
    if (input && !page.querySelector('[data-ag-help-reset81]')) {
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'ag-help-reset81';
      reset.dataset.agHelpReset81 = '1';
      reset.textContent = 'Ver todas las respuestas';
      input.closest('.help-search')?.insertAdjacentElement('afterend', reset);
      reset.addEventListener('click', () => {
        input.value = '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
        input.focus();
      });
    }

    const presets = ['contraseña','inscripción','curso','biblioteca'];
    page.querySelectorAll('.help-categories [data-help-scroll]').forEach((button, index) => {
      if (button.dataset.agBound81 === '1') return;
      button.dataset.agBound81 = '1';
      button.addEventListener('click', () => {
        const search = page.querySelector('#help-search');
        if (!search) return;
        search.value = presets[index] || '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function polishMobileNav() {
    const nav = document.querySelector('.mobile-nav');
    if (!nav) return;
    nav.setAttribute('aria-label', 'Navegación principal de Academia AG');
    nav.querySelectorAll('button').forEach(button => {
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', button.textContent.trim().replace(/\s+/g, ' '));
    });
  }

  function apply() {
    injectStyles();
    polishProfile();
    polishHelp();
    polishMobileNav();
    document.documentElement.dataset.agProfileSupportMobile = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(apply, 70);
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

  window.ACADEMIA_AG_PROFILE_SUPPORT_MOBILE = { release: RELEASE, apply };
})();