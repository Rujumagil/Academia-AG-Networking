(() => {
  'use strict';

  const RELEASE = '20260823.72';
  let observer = null;
  let timer = null;

  function routeName() {
    const hash = location.hash.replace(/^#/, '');
    if (!hash) {
      try { return typeof state !== 'undefined' && state?.session ? 'home' : 'catalog'; }
      catch (_) { return 'catalog'; }
    }
    return hash.split('/')[0];
  }

  function injectStyles() {
    if (document.querySelector('#academy-academic-polish-v72-style')) return;
    const style = document.createElement('style');
    style.id = 'academy-academic-polish-v72-style';
    style.textContent = `
      .ag-academic-summary72{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin:18px 0 22px}
      .ag-academic-summary72 article{display:flex;align-items:center;gap:12px;min-height:86px;padding:16px 18px;border:1px solid rgba(30,41,59,.1);border-radius:16px;background:#fff;box-shadow:0 10px 26px rgba(15,23,42,.055)}
      .ag-academic-summary72 span{display:flex;align-items:center;justify-content:center;width:38px;height:38px;flex:0 0 38px;border-radius:12px;background:#f1f5f9;color:#1e293b;font-weight:900}
      .ag-academic-summary72 div{display:grid;gap:2px}
      .ag-academic-summary72 strong{color:#1e293b;font-size:1.25rem;line-height:1}
      .ag-academic-summary72 small{color:#64748b;font-size:.76rem;font-weight:700}

      .evaluation-card[data-ag-eval72="1"]{position:relative;overflow:hidden}
      .evaluation-card[data-ag-eval72="1"]::before{content:'';position:absolute;inset:0 auto 0 0;width:4px;background:#cbd5e1}
      .evaluation-card[data-ag-eval-status="passed"]::before{background:#005134}
      .evaluation-card[data-ag-eval-status="attempted"]::before{background:#6b7280}
      .ag-eval-guidance72{display:flex;align-items:flex-start;gap:8px;margin-top:14px;padding:10px 12px;border-radius:12px;background:#f8fafc;color:#475569;font-size:.78rem;line-height:1.45}
      .ag-eval-guidance72>span{display:flex;align-items:center;justify-content:center;width:20px;height:20px;flex:0 0 20px;border-radius:50%;background:#e2e8f0;color:#334155;font-size:.68rem;font-weight:900}
      .evaluation-card[data-ag-eval-status="passed"] .ag-eval-guidance72{background:#f0f8f4;color:#005134}

      .ag-library-trust72{display:flex;align-items:flex-start;gap:12px;margin:16px 0 22px;padding:14px 16px;border:1px solid rgba(0,81,52,.12);border-radius:15px;background:#f5faf7;color:#334155}
      .ag-library-trust72>span{display:flex;align-items:center;justify-content:center;width:34px;height:34px;flex:0 0 34px;border-radius:11px;background:#005134;color:#fff;font-size:.82rem;font-weight:900}
      .ag-library-trust72 div{display:grid;gap:3px}
      .ag-library-trust72 strong{color:#1e293b;font-size:.88rem}
      .ag-library-trust72 small{color:#64748b;font-size:.76rem;line-height:1.45}
      .ag-resource-access72{display:inline-flex;align-items:center;gap:6px;margin-top:9px;padding:5px 9px;border-radius:999px;background:#f1f5f9;color:#475569;font-size:.68rem;font-weight:800}
      .ag-resource-access72::before{content:'✓';display:inline-flex;align-items:center;justify-content:center;width:15px;height:15px;border-radius:50%;background:#005134;color:#fff;font-size:.58rem}

      .ag-certificate-trust72{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin:18px 0 22px}
      .ag-certificate-trust72 article{display:flex;align-items:flex-start;gap:10px;padding:14px;border:1px solid rgba(30,41,59,.1);border-radius:15px;background:#fff}
      .ag-certificate-trust72 span{display:flex;align-items:center;justify-content:center;width:30px;height:30px;flex:0 0 30px;border-radius:10px;background:#eef7f3;color:#005134;font-size:.75rem;font-weight:900}
      .ag-certificate-trust72 div{display:grid;gap:2px}
      .ag-certificate-trust72 strong{color:#1e293b;font-size:.8rem}
      .ag-certificate-trust72 small{color:#64748b;font-size:.7rem;line-height:1.4}
      .ag-certificate-disclaimer72{display:flex;align-items:flex-start;gap:11px;margin:18px 0 0;padding:13px 15px;border:1px solid rgba(30,41,59,.1);border-radius:14px;background:#f8fafc;color:#475569;font-size:.76rem;line-height:1.5}
      .ag-certificate-disclaimer72>span{display:flex;align-items:center;justify-content:center;width:24px;height:24px;flex:0 0 24px;border-radius:50%;background:#1e293b;color:#fff;font-size:.68rem;font-weight:900}
      .certificate-document .ag-certificate-document-note72{max-width:78%;margin:12px auto 0;color:#64748b;font-size:.62rem;line-height:1.4;text-align:center}

      @media(max-width:760px){
        .ag-academic-summary72,.ag-certificate-trust72{grid-template-columns:1fr}
        .ag-academic-summary72 article{min-height:72px}
        .ag-library-trust72{padding:12px}
        .certificate-document .ag-certificate-document-note72{max-width:92%;font-size:.58rem}
      }
    `;
    document.head.appendChild(style);
  }

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function assessmentStats() {
    const cards = [...document.querySelectorAll('.evaluation-grid .evaluation-card')];
    let passed = 0;
    let attempted = 0;
    let pending = 0;

    cards.forEach(card => {
      const status = (card.querySelector('.status-pill')?.textContent || '').trim().toLowerCase();
      if (status.includes('aprob')) passed += 1;
      else if (status.includes('intent')) attempted += 1;
      else pending += 1;
    });

    return { cards, passed, attempted, pending };
  }

  function polishEvaluations() {
    if (routeName() !== 'evaluations') return;
    const page = document.querySelector('#page');
    const grid = page?.querySelector('.evaluation-grid');
    if (!page || !grid) return;

    const stats = assessmentStats();
    let summary = page.querySelector('[data-ag-evaluation-summary72]');
    if (!summary) {
      summary = document.createElement('section');
      summary.className = 'ag-academic-summary72';
      summary.dataset.agEvaluationSummary72 = '1';
      grid.insertAdjacentElement('beforebegin', summary);
    }

    const signature = `${stats.cards.length}|${stats.passed}|${stats.attempted}|${stats.pending}`;
    if (summary.dataset.signature !== signature) {
      summary.dataset.signature = signature;
      summary.innerHTML = `
        <article><span>✓</span><div><strong>${stats.passed}</strong><small>Aprobadas</small></div></article>
        <article><span>↻</span><div><strong>${stats.attempted}</strong><small>Con intento registrado</small></div></article>
        <article><span>→</span><div><strong>${stats.pending}</strong><small>Pendientes</small></div></article>`;
    }

    stats.cards.forEach(card => {
      const statusText = (card.querySelector('.status-pill')?.textContent || '').trim().toLowerCase();
      const status = statusText.includes('aprob') ? 'passed' : statusText.includes('intent') ? 'attempted' : 'pending';
      card.dataset.agEval72 = '1';
      card.dataset.agEvalStatus = status;

      let guidance = card.querySelector('.ag-eval-guidance72');
      if (!guidance) {
        guidance = document.createElement('div');
        guidance.className = 'ag-eval-guidance72';
        card.appendChild(guidance);
      }
      const text = status === 'passed'
        ? 'Resultado registrado correctamente. Puedes consultar tu avance cuando lo necesites.'
        : status === 'attempted'
          ? 'Ya existe un intento registrado. Revisa tu resultado antes de realizar un nuevo intento.'
          : 'Esta evaluación está disponible en tu cuenta. Revisa las indicaciones antes de comenzar.';
      const guideSignature = `${status}|${text}`;
      if (guidance.dataset.signature !== guideSignature) {
        guidance.dataset.signature = guideSignature;
        guidance.innerHTML = '<span>i</span><div></div>';
        setText(guidance.querySelector('div'), text);
      }
    });

    document.documentElement.dataset.agEvaluationsPolish = RELEASE;
  }

  function polishLibrary() {
    if (routeName() !== 'resources') return;
    const page = document.querySelector('#page');
    const toolbar = page?.querySelector('.library-toolbar');
    if (!page || !toolbar) return;

    let note = page.querySelector('[data-ag-library-trust72]');
    if (!note) {
      note = document.createElement('section');
      note.className = 'ag-library-trust72';
      note.dataset.agLibraryTrust72 = '1';
      toolbar.insertAdjacentElement('afterend', note);
      note.innerHTML = `
        <span>AG</span>
        <div><strong>Biblioteca privada vinculada a tu cuenta</strong><small>Tus libros, manuales y materiales aparecen aquí según los programas que tengas asignados. Los accesos protegidos se generan para tu sesión.</small></div>`;
    }

    page.querySelectorAll('.library-book-card, .library-material-card').forEach(card => {
      if (card.querySelector('.ag-resource-access72')) return;
      const body = card.querySelector('.library-book-info, .library-material-body');
      if (!body) return;
      const badge = document.createElement('span');
      badge.className = 'ag-resource-access72';
      badge.textContent = 'Incluido en tu acceso';
      body.appendChild(badge);
    });

    const heading = page.querySelector('.library-page-heading');
    if (heading) {
      setText(heading.querySelector('.eyebrow'), 'Tus materiales');
      setText(heading.querySelector('.page-subtitle'), 'Consulta los libros, manuales y recursos asociados a tus programas. Tu acceso permanece vinculado a tu cuenta de Academia AG.');
    }

    document.documentElement.dataset.agLibraryPolish = RELEASE;
  }

  function certificateTrustMarkup() {
    return `
      <article><span>✓</span><div><strong>Finalización registrada</strong><small>Se habilita al cumplir los requisitos definidos para el programa.</small></div></article>
      <article><span>#</span><div><strong>Folio verificable</strong><small>El código puede consultarse desde la herramienta pública de verificación.</small></div></article>
      <article><span>PDF</span><div><strong>Documento imprimible</strong><small>Puedes imprimirlo o guardarlo como PDF desde tu dispositivo.</small></div></article>`;
  }

  function ensureCertificateDisclaimer(anchor, mode = 'page') {
    if (!anchor) return;
    const parent = anchor.parentElement;
    if (!parent || parent.querySelector(`.ag-certificate-disclaimer72[data-mode="${mode}"]`)) return;
    const note = document.createElement('div');
    note.className = 'ag-certificate-disclaimer72';
    note.dataset.mode = mode;
    note.innerHTML = '<span>i</span><div>Las constancias de Academia AG reconocen la finalización académica del programa. No sustituyen licencias, permisos ni certificaciones emitidas por autoridades gubernamentales o regulatorias.</div>';
    anchor.insertAdjacentElement('afterend', note);
  }

  function polishCertificatesList() {
    if (routeName() !== 'certificates') return;
    const page = document.querySelector('#page');
    const heading = page?.querySelector('.certificates-page-heading');
    if (!page || !heading) return;

    let trust = page.querySelector('[data-ag-certificate-trust72]');
    if (!trust) {
      trust = document.createElement('section');
      trust.className = 'ag-certificate-trust72';
      trust.dataset.agCertificateTrust72 = '1';
      trust.innerHTML = certificateTrustMarkup();
      heading.insertAdjacentElement('afterend', trust);
    }

    const info = page.querySelector('.certificate-info-note');
    ensureCertificateDisclaimer(info || trust, 'list');

    document.documentElement.dataset.agCertificatesPolish = RELEASE;
  }

  function polishCertificateView() {
    if (routeName() !== 'certificate') return;
    const page = document.querySelector('#page');
    const documentNode = page?.querySelector('.certificate-document');
    if (!page || !documentNode) return;

    let note = documentNode.querySelector('.ag-certificate-document-note72');
    if (!note) {
      note = document.createElement('p');
      note.className = 'ag-certificate-document-note72';
      note.textContent = 'Constancia de finalización académica. No sustituye licencias, permisos ni certificaciones oficiales emitidas por autoridades.';
      documentNode.appendChild(note);
    }

    const help = page.querySelector('.certificate-download-help') || page.querySelector('.certificate-document-wrap');
    ensureCertificateDisclaimer(help, 'document');

    const heading = page.querySelector('.certificate-view-heading');
    if (heading) {
      const subtitle = heading.querySelector('.page-subtitle');
      setText(subtitle, 'Consulta tu constancia, verifica su folio y guárdala como PDF desde cualquier dispositivo compatible.');
    }

    document.documentElement.dataset.agCertificateViewPolish = RELEASE;
  }

  function apply() {
    injectStyles();
    polishEvaluations();
    polishLibrary();
    polishCertificatesList();
    polishCertificateView();
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

  window.ACADEMIA_AG_ACADEMIC_POLISH = { release: RELEASE, apply };
})();
