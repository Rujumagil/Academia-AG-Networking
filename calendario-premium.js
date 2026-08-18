(() => {
  'use strict';

  const RELEASE = '20260817.21';
  let timer = null;

  const icons = {
    calendar: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>',
    clock: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
    pin: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></svg>',
    video: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3Z"/></svg>',
    timezone: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.4 2.4 3.5 5.4 3.5 9S14.4 18.6 12 21M12 3c-2.4 2.4-3.5 5.4-3.5 9S9.6 18.6 12 21"/></svg>',
    help: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M9.7 9.2a2.5 2.5 0 1 1 4.5 1.5c-.9.9-2.2 1.3-2.2 2.8M12 17h.01"/></svg>'
  };

  function onCalendar() {
    const route = location.hash.replace(/^#/, '');
    return route === 'calendar' || route === 'agenda';
  }

  function replaceMetaIcons(page) {
    page.querySelectorAll('.calendar-featured-meta span, .calendar-event-meta span').forEach(node => {
      if (node.dataset.premiumIcon) return;
      const text = node.textContent.trim();
      if (/60 minutos/i.test(text)) node.innerHTML = `${icons.clock}<span>60 minutos</span>`;
      else if (/zoom/i.test(text)) node.innerHTML = `${icons.video}<span>Zoom</span>`;
      else if (/en línea/i.test(text)) node.innerHTML = `${icons.pin}<span>En línea</span>`;
      else if (/utah/i.test(text) && /en línea/i.test(text)) node.innerHTML = `${icons.pin}<span>Utah · En línea</span>`;
      else if (/^▣/.test(text)) node.innerHTML = `${icons.calendar}<span>${text.replace(/^▣\s*/, '')}</span>`;
      else if (/^◷/.test(text)) node.innerHTML = `${icons.clock}<span>${text.replace(/^◷\s*/, '')}</span>`;
      else if (/^⌖/.test(text)) node.innerHTML = `${icons.pin}<span>${text.replace(/^⌖\s*/, '')}</span>`;
      node.dataset.premiumIcon = 'true';
    });
  }

  function replaceSupportIcons(page) {
    const info = page.querySelectorAll('.calendar-info-card .calendar-info-icon');
    if (info[0] && !info[0].dataset.premiumIcon) {
      info[0].innerHTML = icons.timezone;
      info[0].dataset.premiumIcon = 'true';
    }
    if (info[1] && !info[1].dataset.premiumIcon) {
      info[1].innerHTML = icons.help;
      info[1].dataset.premiumIcon = 'true';
    }

    const empty = page.querySelector('.calendar-empty-icon');
    if (empty && !empty.dataset.premiumIcon) {
      empty.innerHTML = icons.clock;
      empty.dataset.premiumIcon = 'true';
    }

    const emptyList = page.querySelector('.calendar-empty-list > span');
    if (emptyList && !emptyList.dataset.premiumIcon) {
      emptyList.innerHTML = icons.calendar;
      emptyList.dataset.premiumIcon = 'true';
    }
  }

  function enhance() {
    if (!onCalendar()) return;
    const page = document.querySelector('#page');
    if (!page) return;
    page.classList.add('calendar-premium-page');
    replaceMetaIcons(page);
    replaceSupportIcons(page);

    const today = page.querySelector('.calendar-day.is-today');
    if (today && !today.title) today.title = 'Hoy';
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(enhance, 40);
  }

  window.addEventListener('hashchange', schedule);
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body, { childList:true, subtree:true });
  window.ACADEMIA_AG_CALENDAR_PREMIUM = { release: RELEASE, enhance };
  schedule();
})();
