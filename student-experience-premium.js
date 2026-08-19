(() => {
  'use strict';

  const RELEASE = '20260819.6';
  let queued = false;

  const icon = {
    home: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.5 21v-6h5v6"/></svg>',
    courses: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M8 7h8M8 11h8"/></svg>',
    evaluations: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h3v16H5V5h3z"/><path d="m8.5 13 2.2 2.2 4.8-5"/></svg>',
    resources: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h5v16H4zM10 4h5v16h-5z"/><path d="m16.5 5 3-1 3.5 14-3 1z"/></svg>',
    profile: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>',
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 17h2"/></svg>',
    check: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.7 2.7L16.5 9"/></svg>',
    progress: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 3a9 9 0 0 1 9 9"/><path d="M12 7v5l3 2"/></svg>',
    bell: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.3 1.7c-1 1-2 1.5-2 3"/><path d="M12 17h.01"/></svg>',
    refresh: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 7v5h-5"/><path d="M18.5 16a8 8 0 1 1 .7-8.8L20 12"/></svg>',
    install: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M5 20h14"/></svg>',
    location: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m10 8 6 4-6 4z"/></svg>'
  };

  function setIcon(node, key) {
    if (!node || !icon[key] || node.dataset.agPremiumIcon === key) return;
    node.innerHTML = icon[key];
    node.dataset.agPremiumIcon = key;
  }

  function setTopbarIcon(control, key) {
    if (!control || !icon[key] || control.dataset.agPremiumIcon === key) return;
    const count = control.querySelector('.notification-count')?.outerHTML || '';
    control.innerHTML = `${icon[key]}${count}`;
    control.dataset.agPremiumIcon = key;
  }

  function enhanceMobileNav() {
    document.querySelectorAll('.mobile-nav button').forEach(button => {
      const label = (button.querySelector('span:last-child')?.textContent || '').trim().toLowerCase();
      const slot = button.querySelector('span:first-child');
      if (label.includes('inicio')) setIcon(slot, 'home');
      else if (label.includes('curso')) setIcon(slot, 'courses');
      else if (label.includes('evalu')) setIcon(slot, 'evaluations');
      else if (label.includes('biblioteca')) setIcon(slot, 'resources');
      else if (label.includes('perfil')) setIcon(slot, 'profile');
    });
  }

  function enhanceTopbar() {
    document.querySelectorAll('.top-actions .icon-button').forEach(control => {
      const title = String(control.getAttribute('title') || '').toLowerCase();
      if (control.classList.contains('notification-button') || title.includes('notific')) setTopbarIcon(control, 'bell');
      else if (control.classList.contains('install-button') || title.includes('instalar')) setTopbarIcon(control, 'install');
      else if (title.includes('ayuda')) setTopbarIcon(control, 'help');
      else if (title.includes('actualizar')) setTopbarIcon(control, 'refresh');
    });
  }

  function enhanceSummaryIcons() {
    const summaryKeys = ['courses', 'check', 'resources', 'calendar'];
    document.querySelectorAll('.dashboard-summary article').forEach((article, index) => {
      setIcon(article.querySelector(':scope > span'), summaryKeys[index]);
    });

    const courseKeys = ['courses', 'progress', 'check'];
    document.querySelectorAll('.courses-overview article').forEach((article, index) => {
      setIcon(article.querySelector(':scope > span'), courseKeys[index]);
    });
  }

  function polishEventMeta() {
    document.querySelectorAll('.event-meta span').forEach(node => {
      const text = node.textContent.trim();
      if (text.startsWith('◷')) {
        node.textContent = text.replace(/^◷\s*/, '');
        node.classList.add('ag-event-meta-icon', 'ag-event-meta-time');
      }
      if (text.startsWith('⌖')) {
        node.textContent = text.replace(/^⌖\s*/, '');
        node.classList.add('ag-event-meta-icon', 'ag-event-meta-location');
      }
    });
  }

  function cleanLearnerCopy() {
    document.querySelectorAll('.announcement-panel a').forEach(link => {
      if (!link.textContent.includes('Webinar del libro')) return;
      const label = link.querySelector('span');
      const strong = link.querySelector('strong');
      const small = link.querySelector('small');
      if (label) label.textContent = 'Próxima sesión';
      if (strong) strong.textContent = 'Consulta las próximas actividades de Academia AG.';
      if (small) small.textContent = 'Revisa fecha, horario y detalles en tu calendario →';
      link.setAttribute('href', '#agenda');
    });

    document.querySelectorAll('.faq-item p, .help-layout p, .help-hero p').forEach(node => {
      if (node.textContent.includes('El resultado se calcula de forma segura en el servidor')) {
        node.textContent = node.textContent.replace(
          'El resultado se calcula de forma segura en el servidor y queda asociado a tu cuenta.',
          'Tu resultado se registra automáticamente en tu cuenta para que puedas consultar tu avance.'
        );
      }
    });

    document.querySelectorAll('.login-screen p').forEach(node => {
      if (/Supabase|configuraci[oó]n local|diagn[oó]stico|cach[eé]/i.test(node.textContent)) {
        node.textContent = 'Estamos preparando tu acceso. Intenta nuevamente en unos segundos.';
      }
    });
  }

  function addEventMetaStyles() {
    if (document.querySelector('#ag-student-premium-runtime-styles')) return;
    const style = document.createElement('style');
    style.id = 'ag-student-premium-runtime-styles';
    style.textContent = `
      .ag-event-meta-icon{display:inline-flex!important;align-items:center!important;gap:7px!important}
      .ag-event-meta-icon::before{content:'';width:15px;height:15px;display:inline-block;background-color:currentColor;opacity:.9;flex:0 0 15px}
      .ag-event-meta-time::before{mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M12 7v5l3 2' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center/contain no-repeat;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Ccircle cx='12' cy='12' r='9' fill='none' stroke='black' stroke-width='2'/%3E%3Cpath d='M12 7v5l3 2' fill='none' stroke='black' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E") center/contain no-repeat}
      .ag-event-meta-location::before{mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z' fill='none' stroke='black' stroke-width='2'/%3E%3Ccircle cx='12' cy='10' r='2.5' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E") center/contain no-repeat;-webkit-mask:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z' fill='none' stroke='black' stroke-width='2'/%3E%3Ccircle cx='12' cy='10' r='2.5' fill='none' stroke='black' stroke-width='2'/%3E%3C/svg%3E") center/contain no-repeat}
    `;
    document.head.appendChild(style);
  }

  function apply() {
    addEventMetaStyles();
    enhanceMobileNav();
    enhanceTopbar();
    enhanceSummaryIcons();
    polishEventMeta();
    cleanLearnerCopy();
    document.documentElement.dataset.agStudentExperience = RELEASE;
  }

  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  window.addEventListener('load', schedule);
  document.addEventListener('DOMContentLoaded', schedule, { once:true });

  window.ACADEMIA_AG_STUDENT_EXPERIENCE = { release:RELEASE, apply };
  schedule();
})();
