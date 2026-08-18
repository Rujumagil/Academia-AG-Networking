(() => {
  'use strict';

  function attachImportButton() {
    const route = location.hash.replace(/^#/, '');
    if (route !== 'admin') return;
    if (document.querySelector('[data-ag-import-students]')) return;

    const candidates = [...document.querySelectorAll('a,button')];
    const manageStudents = candidates.find(el => /gestionar alumnos/i.test(el.textContent || ''));
    if (!manageStudents?.parentElement) return;

    const link = document.createElement('a');
    link.href = 'importar-alumnos.html';
    link.setAttribute('data-ag-import-students', 'true');
    link.textContent = 'Importar alumnos';
    link.style.cssText = [
      'display:inline-flex',
      'align-items:center',
      'justify-content:center',
      'min-height:42px',
      'padding:0 16px',
      'border-radius:12px',
      'text-decoration:none',
      'font-weight:800',
      'font-size:13px',
      'background:#ffffff',
      'color:#17324a',
      'border:1px solid rgba(255,255,255,.28)',
      'box-shadow:0 10px 24px rgba(15,23,42,.12)'
    ].join(';');
    link.title = 'Alta masiva de alumnos desde CSV';
    manageStudents.parentElement.appendChild(link);
  }

  const observer = new MutationObserver(() => attachImportButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener('hashchange', () => setTimeout(attachImportButton, 80));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => setTimeout(attachImportButton, 100));
  else setTimeout(attachImportButton, 100);
})();
