(() => {
  'use strict';

  const icons = {
    '#home': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 10.8 12 3l9 7.8"/><path d="M5 9.8V21h14V9.8"/><path d="M9 21v-6h6v6"/></svg>',
    '#courses': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16"/><path d="M8 7h8"/><path d="M8 11h8"/></svg>',
    '#evaluations': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l1 2h3v16H5V5h3z"/><path d="m8.5 13 2.2 2.2 4.8-5"/></svg>',
    '#resources': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h5v16H4z"/><path d="M10 4h5v16h-5z"/><path d="m16.5 5 3-1 3.5 14-3 1z"/></svg>',
    '#agenda': '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/><path d="M8 14h2M14 14h2M8 17h2"/></svg>',
    '#certificates': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="9" r="5"/><path d="m9 13-2 8 5-3 5 3-2-8"/><path d="m10 9 1.3 1.3L14 7.7"/></svg>',
    '#help': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.7 9a2.5 2.5 0 1 1 4.3 1.7c-1 1-2 1.5-2 3"/><path d="M12 17h.01"/></svg>',
    '#profile': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/></svg>',
    '#catalog': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/></svg>',
    '#admin': '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21h-4v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H3v-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V3h4v.1a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1H21v4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>'
  };

  function iconFor(link) {
    if (link.classList.contains('admin-nav-link')) return icons['#admin'];
    if (link.classList.contains('nav-link-secondary')) return icons['#catalog'];
    const href = link.getAttribute('href') || '';
    return icons[href] || null;
  }

  function applyPremiumIcons(root = document) {
    root.querySelectorAll('.sidebar-nav .nav-link').forEach(link => {
      const slot = link.querySelector('.nav-icon');
      const svg = iconFor(link);
      if (!slot || !svg || slot.dataset.premiumIcon === 'true') return;
      slot.innerHTML = svg;
      slot.dataset.premiumIcon = 'true';
    });
  }

  let queued = false;
  function schedule() {
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      applyPremiumIcons();
    });
  }

  const observer = new MutationObserver(schedule);
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', schedule);
  window.addEventListener('DOMContentLoaded', schedule, { once: true });
  applyPremiumIcons();
})();
