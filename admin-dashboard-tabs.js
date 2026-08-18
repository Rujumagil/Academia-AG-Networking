(() => {
  'use strict';

  const RELEASE = '20260818.2';
  const STORAGE_KEY = 'ag-adminexec-active-tab';
  const TABS = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'alumnos', label: 'Alumnos' },
    { id: 'compras', label: 'Compras' },
    { id: 'accesos', label: 'Accesos' },
    { id: 'registros', label: 'Registros' },
    { id: 'academia', label: 'Academia' }
  ];

  let scheduled = false;

  function routeIsAdmin() {
    return location.hash.replace(/^#/, '') === 'admin';
  }

  function validTab(value) {
    return TABS.some(tab => tab.id === value) ? value : 'resumen';
  }

  function panelMap(shell) {
    return {
      resumen: [
        shell.querySelector('.adminexec-metrics'),
        shell.querySelector('.adminexec-secondary-metrics'),
        shell.querySelector('.adminexec-insights')
      ].filter(Boolean),
      alumnos: [shell.querySelector('#adminexec-students')].filter(Boolean),
      compras: [shell.querySelector('#adminexec-orders')].filter(Boolean),
      accesos: [shell.querySelector('#adminexec-access')].filter(Boolean),
      registros: [shell.querySelector('#adminexec-records')].filter(Boolean),
      academia: [shell.querySelector('#adminexec-academy')].filter(Boolean)
    };
  }

  function activateTab(shell, tabId, options = {}) {
    const id = validTab(tabId);
    const nav = shell.querySelector('.adminexec-nav');
    if (!nav) return;

    const panels = panelMap(shell);
    const buttons = [...nav.querySelectorAll('[data-adminexec-tab]')];

    buttons.forEach(button => {
      const active = button.dataset.adminexecTab === id;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', active ? 'true' : 'false');
      button.setAttribute('tabindex', active ? '0' : '-1');
    });

    Object.entries(panels).forEach(([panelId, nodes]) => {
      nodes.forEach(node => {
        node.hidden = panelId !== id;
        node.classList.toggle('is-adminexec-tab-active', panelId === id);
        node.dataset.adminexecTabPanel = panelId;
      });
    });

    const twoTables = shell.querySelector('.adminexec-two-tables');
    if (twoTables) {
      twoTables.hidden = !['compras', 'accesos'].includes(id);
      twoTables.dataset.adminexecSingle = 'true';
      twoTables.dataset.adminexecActiveGroup = id;
    }

    const bottomGrid = shell.querySelector('.adminexec-bottom-grid');
    if (bottomGrid) {
      bottomGrid.hidden = !['registros', 'academia'].includes(id);
      bottomGrid.dataset.adminexecSingle = 'true';
      bottomGrid.dataset.adminexecActiveGroup = id;
    }

    shell.dataset.adminexecActiveTab = id;
    try { sessionStorage.setItem(STORAGE_KEY, id); } catch (_) {}

    if (options.focus) {
      nav.querySelector(`[data-adminexec-tab="${id}"]`)?.focus({ preventScroll: true });
    }
  }

  function bindKeyboard(nav, shell) {
    nav.addEventListener('keydown', event => {
      const buttons = [...nav.querySelectorAll('[data-adminexec-tab]')];
      if (!buttons.length) return;
      const currentIndex = buttons.findIndex(button => button === document.activeElement);
      if (currentIndex < 0) return;

      let nextIndex = currentIndex;
      if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % buttons.length;
      else if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + buttons.length) % buttons.length;
      else if (event.key === 'Home') nextIndex = 0;
      else if (event.key === 'End') nextIndex = buttons.length - 1;
      else return;

      event.preventDefault();
      activateTab(shell, buttons[nextIndex].dataset.adminexecTab, { focus: true });
    });
  }

  function upgradeNavigation(shell) {
    const nav = shell.querySelector('.adminexec-nav');
    if (!nav) return false;
    if (nav.dataset.adminexecTabsRelease === RELEASE) return true;

    nav.dataset.adminexecTabsRelease = RELEASE;
    nav.classList.add('adminexec-tabs');
    nav.setAttribute('role', 'tablist');
    nav.setAttribute('aria-label', 'Áreas del panel administrativo');

    nav.innerHTML = TABS.map((tab, index) => `
      <button
        type="button"
        class="adminexec-tab${index === 0 ? ' is-active' : ''}"
        role="tab"
        aria-selected="${index === 0 ? 'true' : 'false'}"
        tabindex="${index === 0 ? '0' : '-1'}"
        data-adminexec-tab="${tab.id}">${tab.label}</button>`).join('');

    nav.querySelectorAll('[data-adminexec-tab]').forEach(button => {
      button.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        activateTab(shell, button.dataset.adminexecTab);
      });
    });

    bindKeyboard(nav, shell);

    let initial = 'resumen';
    try { initial = validTab(sessionStorage.getItem(STORAGE_KEY) || 'resumen'); } catch (_) {}
    activateTab(shell, initial);
    return true;
  }

  function apply() {
    scheduled = false;
    if (!routeIsAdmin()) return;
    const shell = document.querySelector('.adminexec-shell');
    if (!shell) return;
    upgradeNavigation(shell);
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);

  const root = document.querySelector('#app') || document.body;
  new MutationObserver(schedule).observe(root, { childList: true, subtree: true });

  window.ACADEMIA_AG_ADMIN_TABS = {
    release: RELEASE,
    activate(tabId) {
      const shell = document.querySelector('.adminexec-shell');
      if (shell) activateTab(shell, tabId);
    }
  };

  schedule();
})();
