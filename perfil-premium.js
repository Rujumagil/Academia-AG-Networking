(() => {
  'use strict';

  const RELEASE = '20260817.20';
  let timer = null;

  const icons = {
    edit: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>',
    install: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.8 9a2.5 2.5 0 1 1 4.4 1.7c-.9.8-2.2 1.2-2.2 2.8"/><path d="M12 17h.01"/></svg>',
    settings: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4v-.2a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3 1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/></svg>',
    logout: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M10 17l5-5-5-5"/><path d="M15 12H3"/><path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5"/></svg>'
  };

  function onProfile() {
    return location.hash.replace(/^#/, '') === 'profile';
  }

  function enhance() {
    if (!onProfile()) return;
    const page = document.querySelector('#page');
    if (!page) return;
    page.classList.add('profile-premium-page');

    const sectionIcon = page.querySelector('.profile-section-icon');
    if (sectionIcon && !sectionIcon.dataset.premiumIcon) {
      sectionIcon.innerHTML = icons.edit;
      sectionIcon.dataset.premiumIcon = 'true';
    }

    const optionIcons = [...page.querySelectorAll('.profile-option-icon')];
    const order = ['install', 'help', 'settings', 'logout'];
    optionIcons.forEach((node, index) => {
      const key = order[Math.min(index, order.length - 1)];
      if (!node.dataset.premiumIcon) {
        node.innerHTML = icons[key];
        node.dataset.premiumIcon = 'true';
      }
    });
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 40);
  }

  window.addEventListener('hashchange', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  window.ACADEMIA_AG_PROFILE_PREMIUM = { release: RELEASE, enhance };
  schedule();
})();
