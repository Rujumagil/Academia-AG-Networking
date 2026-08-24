(() => {
  'use strict';

  const RELEASE = '20260823.73';
  let observer = null;
  let timer = null;

  function routeName() {
    const hash = location.hash.replace(/^#/, '');
    if (hash) return hash.split('/')[0];
    try { return typeof state !== 'undefined' && state?.session ? 'home' : 'catalog'; }
    catch (_) { return 'catalog'; }
  }

  function injectStyles() {
    if (document.querySelector('#academy-profile-support-mobile-v73-style')) return;
    const style = document.createElement('style');
    style.id = 'academy-profile-support-mobile-v73-style';
    style.textContent = `
      .ag-account-assurance73{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:16px 0 22px}
      .ag-account-assurance73 article{display:flex;align-items:flex-start;gap:11px;padding:14px 16px;border:1px solid rgba(30,41,59,.1);border-radius:15px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.05)}
      .ag-account-assurance73>article>span{display:flex;align-items:center;justify-content:center;width:32px;height:32px;flex:0 0 32px;border-radius:10px;background:#eef7f3;color:#005134;font-size:.74rem;font-weight:900}
      .ag-account-assurance73 div{display:grid;gap:2px;min-width:0}
      .ag-account-assurance73 strong{color:#1e293b;font-size:.82rem}
      .ag-account-assurance73 small{color:#64748b;font-size:.71rem;line-height:1.4;overflow-wrap:anywhere}
      .ag-profile-note73{display:flex;align-items:flex-start;gap:10px;margin:0 0 16px;padding:11px 13px;border-radius:13px;background:#f8fafc;color:#475569;font-size:.76rem;line-height:1.5}
      .ag-profile-note73>span{display:flex;align-items:center;justify-content:center;width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:#1e293b;color:#fff;font-size:.64rem;font-weight:900}

      .ag-support-summary73{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0 22px}
      .ag-support-summary73 article{display:flex;align-items:center;gap:12px;min-height:78px;padding:14px 16px;border:1px solid rgba(30,41,59,.1);border-radius:15px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.05)}
      .ag-support-summary73 span{display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:#f1f5f9;color:#1e293b;font-size:.72rem;font-weight:900}
      .ag-support-summary73 div{display:grid;gap:2px;min-width:0}
      .ag-support-summary73 strong{color:#1e293b;font-size:.88rem}
      .ag-support-summary73 small{color:#64748b;font-size:.7rem;line-height:1.4;overflow-wrap:anywhere}
      .ag-support-safety73{display:flex;align-items:flex-start;gap:9px;margin:0 0 16px;padding:11px 13px;border:1px solid rgba(0,81,52,.12);border-radius:13px;background:#f5faf7;color:#475569;font-size:.75rem;line-height:1.5}
      .ag-support-safety73>span{display:flex;align-items:center;justify-content:center;width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:#005134;color:#fff;font-size:.62rem;font-weight:900}
      .ag-help-reset73{display:inline-flex;align-items:center;justify-content:center;margin-top:10px;padding:7px 11px;border:1px solid rgba(30,41,59,.12);border-radius:999px;background:#fff;color:#475569;font:inherit;font-size:.72rem;font-weight:800;cursor:pointer}
      .ticket-list article .status-pill[data-ag-ticket-status="open"]{background:#fff7ed;color:#9a3412}
      .ticket-list article .status-pill[data-ag-ticket-status="pending"]{background:#eff6ff;color:#1d4ed8}
      .ticket-list article .status-pill[data-ag-ticket-status="resolved"],.ticket-list article .status-pill[data-ag-ticket-status="closed"]{background:#f0f8f4;color:#005134}

      @media(max-width:820px){
        html,body{max-width:100%;overflow-x:hidden}
        .content{padding-bottom:calc(92px + env(safe-area-inset-bottom))!important}
        .page{max-width:100%;overflow-x:clip}
        .mobile-nav{min-height:68px;padding-bottom:env(safe-area-inset-bottom);border-top:1px solid rgba(30,41,59,.1);background:rgba(249,250,249,.94)!important;box-shadow:0 -10px 30px rgba(15,23,42,.08);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px)}
        .mobile-nav button{min-height:58px;min-width:0;padding:7px 3px!important;touch-action:manipulation}
        .mobile-nav button>span:first-child{font-size:1.05rem}
        .mobile-nav button>span:last-child{font-size:.62rem;line-height:1.1;white-space:nowrap}
        .topbar{position:sticky;top:0;z-index:40;background:rgba(249,250,249,.94);backdrop-filter:blur(16px);-webkit-backdrop-filter:blur(16px)}
        .topbar .search-box{min-width:0}
        .hero-actions,.continue-learning-actions,.certificate-featured-actions,.certificate-actions{flex-wrap:wrap}
        .hero-actions .btn,.continue-learning-actions .btn,.certificate-featured-actions .btn{min-height:44px}
        .lesson-actions{grid-template-columns:1fr!important}
        .module-panel{max-height:none!important}
        .certificate-document-wrap{overflow-x:auto;-webkit-overflow-scrolling:touch;padding-bottom:8px}
        .help-categories{overflow-x:auto;scroll-snap-type:x proximity;padding-bottom:4px}
        .help-categories button{min-width:180px;scroll-snap-align:start}
        .profile-professional-layout,.help-layout,.support-ticket-layout{min-width:0}
      }

      @media(max-width:680px){
        .ag-account-assurance73,.ag-support-summary73{grid-template-columns:1fr}
        .ag-account-assurance73 article,.ag-support-summary73 article{min-height:68px}
        .profile-page-heading,.courses-page-heading,.certificates-page-heading,.library-page-heading{gap:12px}
        .profile-status-pill{align-self:flex-start}
      }
    `;
    document.head.appendChild(style);
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function maskEmail(value = '') {
    const email = String(value || '');
    const [name, domain] = email.split('@');
    if (!name || !domain) return 'Cuenta identificada';
    const visible = name.length <= 2 ? name.charAt(0) : name.slice(0, 2);
    return `${visible}${'•'.repeat(Math.min(5, Math.max(2, name.length - visible.length)))}@${domain}`;
  }

  function ownTickets() {
    try {
      return (state.supportTickets || []).filter(ticket => ticket.user_id === state.user?.id || (typeof isAdmin === 'function' && isAdmin()));
    } catch (_) { return []; }
  }

  function normalizeTicketStatus(value = '') {
    const raw = String(value || 'open').toLowerCase();
    if (['resolved','closed','done','complete','completed'].includes(raw)) return 'resolved';
    if (['pending','waiting','in_progress','progress'].includes(raw)) return 'pending';
    return 'open';
  }

  function polishProfile() {
    if (routeName() !== 'profile') return;
    const page = document.querySelector('#page');
    const heading = page?.querySelector('.profile-page-heading');
    if (!page || !heading) return;

    setText(heading.querySelector('.page-subtitle'), 'Mantén actualizados tus datos personales y revisa el estado de tu recorrido dentro de Academia AG.');

    let assurance = page.querySelector('[data-ag-account-assurance73]');
    if (!assurance) {
      assurance = document.createElement('section');
      assurance.className = 'ag-account-assurance73';
      assurance.dataset.agAccountAssurance73 = '1';
      heading.insertAdjacentElement('afterend', assurance);
    }

    let accountStatus = 'Cuenta activa';
    let accountDetail = 'Tu sesión está vinculada a este perfil.';
    try {
      const status = String(state.profile?.account_status || 'active').toLowerCase();
      if (status !== 'active') {
        accountStatus = 'Cuenta con revisión';
        accountDetail = 'Consulta con soporte si necesitas revisar tu acceso.';
      }
    } catch (_) {}

    let progressDetail = 'Tu avance se guarda en tu cuenta.';
    let certificateDetail = 'Completa tu nombre para usarlo en constancias.';
    try {
      const completed = (state.progressRows || []).filter(row => row.completed).length;
      progressDetail = `${completed} ${completed === 1 ? 'lección completada' : 'lecciones completadas'} registradas.`;
      if (state.profile?.full_name?.trim()) certificateDetail = `Se usará “${state.profile.full_name.trim()}” en tus constancias.`;
    } catch (_) {}

    const signature = `${accountStatus}|${progressDetail}|${certificateDetail}`;
    if (assurance.dataset.signature !== signature) {
      assurance.dataset.signature = signature;
      assurance.innerHTML = `
        <article><span>✓</span><div><strong>${accountStatus}</strong><small></small></div></article>
        <article><span>↻</span><div><strong>Progreso sincronizado</strong><small></small></div></article>
        <article><span>AG</span><div><strong>Datos para constancias</strong><small></small></div></article>`;
      setText(assurance.children[0].querySelector('small'), accountDetail);
      setText(assurance.children[1].querySelector('small'), progressDetail);
      setText(assurance.children[2].querySelector('small'), certificateDetail);
    }

    const form = page.querySelector('#profile-form');
    if (form && !page.querySelector('[data-ag-profile-note73]')) {
      const note = document.createElement('div');
      note.className = 'ag-profile-note73';
      note.dataset.agProfileNote73 = '1';
      note.innerHTML = '<span>i</span><div>Verifica que tu nombre esté escrito como quieres que aparezca en tus constancias. Tu correo de acceso no puede modificarse desde este formulario.</div>';
      form.insertAdjacentElement('beforebegin', note);
    }

    document.documentElement.dataset.agProfilePolish = RELEASE;
  }

  function translateTicketPills(page) {
    const labels = {
      open: 'Abierto',
      pending: 'En revisión',
      resolved: 'Resuelto',
      closed: 'Cerrado'
    };
    page.querySelectorAll('.ticket-list article .status-pill').forEach(pill => {
      const status = normalizeTicketStatus(pill.textContent);
      pill.dataset.agTicketStatus = status;
      const next = status === 'resolved' && String(pill.textContent || '').toLowerCase().includes('closed') ? 'Cerrado' : labels[status];
      setText(pill, next);
    });
  }

  function bindHelpCategoryPresets(page) {
    const presets = ['contraseña', 'inscripción', 'curso', 'biblioteca'];
    const buttons = page.querySelectorAll('.help-categories [data-help-scroll]');
    buttons.forEach((button, index) => {
      if (button.dataset.agBound73 === '1') return;
      button.dataset.agBound73 = '1';
      button.addEventListener('click', () => {
        const input = page.querySelector('#help-search');
        if (!input) return;
        input.value = presets[index] || '';
        input.dispatchEvent(new Event('input', { bubbles: true }));
      });
    });
  }

  function polishHelp() {
    if (routeName() !== 'help') return;
    const page = document.querySelector('#page');
    const hero = page?.querySelector('.help-hero');
    if (!page || !hero) return;

    setText(hero.querySelector('p'), 'Busca una respuesta rápida o envía una solicitud para que el equipo pueda revisar tu cuenta.');

    const tickets = ownTickets();
    const open = tickets.filter(ticket => normalizeTicketStatus(ticket.status) === 'open').length;
    const pending = tickets.filter(ticket => normalizeTicketStatus(ticket.status) === 'pending').length;
    const resolved = tickets.filter(ticket => normalizeTicketStatus(ticket.status) === 'resolved').length;

    let summary = page.querySelector('[data-ag-support-summary73]');
    if (!summary) {
      summary = document.createElement('section');
      summary.className = 'ag-support-summary73';
      summary.dataset.agSupportSummary73 = '1';
      hero.insertAdjacentElement('afterend', summary);
    }

    let email = 'Cuenta identificada';
    try { email = maskEmail(state.user?.email); } catch (_) {}
    const signature = `${open}|${pending}|${resolved}|${email}`;
    if (summary.dataset.signature !== signature) {
      summary.dataset.signature = signature;
      summary.innerHTML = `
        <article><span>?</span><div><strong>${open} ${open === 1 ? 'ticket abierto' : 'tickets abiertos'}</strong><small>Solicitudes pendientes de atención</small></div></article>
        <article><span>↻</span><div><strong>${pending} en revisión · ${resolved} resueltos</strong><small>Estado de tus solicitudes recientes</small></div></article>
        <article><span>@</span><div><strong>Cuenta de soporte</strong><small></small></div></article>`;
      setText(summary.children[2].querySelector('small'), email);
    }

    const form = page.querySelector('#support-ticket-form');
    if (form && !page.querySelector('[data-ag-support-safety73]')) {
      const note = document.createElement('div');
      note.className = 'ag-support-safety73';
      note.dataset.agSupportSafety73 = '1';
      note.innerHTML = '<span>!</span><div><strong>Protege tu cuenta.</strong> Describe el problema sin incluir contraseñas, códigos de acceso ni información bancaria.</div>';
      form.insertAdjacentElement('beforebegin', note);
    }

    const search = page.querySelector('#help-search');
    if (search && !page.querySelector('[data-ag-help-reset73]')) {
      const reset = document.createElement('button');
      reset.type = 'button';
      reset.className = 'ag-help-reset73';
      reset.dataset.agHelpReset73 = '1';
      reset.textContent = 'Ver todas las respuestas';
      search.closest('.help-search')?.insertAdjacentElement('afterend', reset);
      reset.addEventListener('click', () => {
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles: true }));
        search.focus();
      });
    }

    translateTicketPills(page);
    bindHelpCategoryPresets(page);
    document.documentElement.dataset.agHelpPolish = RELEASE;
  }

  function polishMobileNavigation() {
    const mobileNav = document.querySelector('.mobile-nav');
    if (!mobileNav) return;
    mobileNav.setAttribute('aria-label', 'Navegación principal de Academia AG');
    mobileNav.querySelectorAll('button').forEach(button => {
      const text = button.textContent.trim().replace(/\s+/g, ' ');
      if (!button.getAttribute('aria-label')) button.setAttribute('aria-label', text || 'Navegar');
    });
    document.documentElement.dataset.agMobilePolish = RELEASE;
  }

  function apply() {
    injectStyles();
    polishProfile();
    polishHelp();
    polishMobileNavigation();
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