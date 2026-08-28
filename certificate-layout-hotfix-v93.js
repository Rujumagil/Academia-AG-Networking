(() => {
  'use strict';

  const RELEASE = '20260828.93';
  const UTAH_COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const NAVY = '#061b35';
  const NAVY_SOFT = '#1E293B';
  const GOLD = '#B7862C';
  const GOLD_LIGHT = '#E1BD61';
  const CREAM = '#FBFAF6';
  const JS_PDF_SOURCES = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js'
  ];
  const QR_SOURCES = [
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js'
  ];

  let jsPdfPromise = null;
  let qrPromise = null;
  let busy = false;

  function appState() {
    try { return typeof state !== 'undefined' ? state : null; }
    catch (_) { return null; }
  }

  function routeParts() {
    return location.hash.replace(/^#/, '').split('/');
  }

  function isCertificateRoute() {
    return routeParts()[0] === 'certificate';
  }

  function courseIdFromRoute() {
    return isCertificateRoute() ? routeParts()[1] || '' : '';
  }

  function findCourse(courseId) {
    return (appState()?.courses || []).find(course => course.id === courseId || course.slug === courseId) || null;
  }

  function certificateFor(course) {
    const s = appState();
    if (!s?.user || !course) return null;
    return (s.certificates || []).find(item => item.user_id === s.user.id && item.course_id === course.id) || null;
  }

  function studentName() {
    const s = appState();
    return String(
      s?.profile?.full_name
      || s?.user?.user_metadata?.full_name
      || s?.user?.email?.split('@')?.[0]
      || 'Alumno de Academia AG'
    ).trim();
  }

  function formatLongDate(value) {
    const date = value ? new Date(value) : new Date();
    if (!Number.isFinite(date.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
  }

  function displayProgramTitle(course) {
    if (course?.id === UTAH_COURSE_ID) return 'PROGRAMA DE FORMACIÓN EN CONDUCCIÓN Y EDUCACIÓN VIAL';
    return String(course?.title || 'PROGRAMA DE FORMACIÓN').toUpperCase();
  }

  function verificationUrl(code) {
    try {
      const configured = String(window.SUPABASE_CONFIG?.academyUrl || '').trim();
      const url = configured ? new URL(configured) : new URL('academia.html', location.href);
      url.hash = `verify/${encodeURIComponent(code)}`;
      return url.href;
    } catch (_) {
      return `${location.origin}${location.pathname}#verify/${encodeURIComponent(code)}`;
    }
  }

  function fallbackCode(course) {
    const s = appState();
    const coursePart = String(course?.id || 'CURSO').replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase();
    const userPart = String(s?.user?.id || 'ALUMNO').replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase();
    return `AG-${new Date().getFullYear()}-${coursePart}-${userPart}`;
  }

  function certificateData(course) {
    const certificate = certificateFor(course);
    const code = certificate?.credential_code || fallbackCode(course);
    const completedAt = certificate?.completed_at || certificate?.issued_at || new Date().toISOString();
    return {
      studentName: certificate?.student_name_snapshot || studentName(),
      courseTitle: certificate?.course_title_snapshot || course?.title || 'Programa de Academia AG',
      programTitle: displayProgramTitle(course),
      credentialCode: code,
      completedDateLabel: formatLongDate(completedAt),
      verificationUrl: verificationUrl(code)
    };
  }

  function safeFilename(value) {
    return String(value || 'certificado')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'certificado';
  }

  function loadExternalScript(sources, ready) {
    if (ready()) return Promise.resolve();
    return new Promise(async (resolve, reject) => {
      let lastError = null;
      for (const src of sources) {
        try {
          await new Promise((ok, fail) => {
            const existing = [...document.scripts].find(script => script.src === src);
            if (existing) {
              if (ready()) return ok();
              existing.addEventListener('load', ok, { once: true });
              existing.addEventListener('error', fail, { once: true });
              return;
            }
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.crossOrigin = 'anonymous';
            script.onload = ok;
            script.onerror = () => fail(new Error(`No se pudo cargar ${src}`));
            document.head.appendChild(script);
          });
          if (ready()) return resolve();
        } catch (error) {
          lastError = error;
        }
      }
      reject(lastError || new Error('No se pudo cargar la dependencia.'));
    });
  }

  function ensureJsPdf() {
    if (!jsPdfPromise) jsPdfPromise = loadExternalScript(JS_PDF_SOURCES, () => Boolean(window.jspdf?.jsPDF));
    return jsPdfPromise;
  }

  function ensureQr() {
    if (!qrPromise) qrPromise = loadExternalScript(QR_SOURCES, () => typeof window.QRCode === 'function');
    return qrPromise;
  }

  async function createQrCanvas(text, size = 220) {
    await ensureQr();
    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:-9999px;width:1px;height:1px;overflow:hidden';
    document.body.appendChild(host);
    try {
      new window.QRCode(host, {
        text,
        width: size,
        height: size,
        colorDark: NAVY,
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel?.M
      });
      await new Promise(resolve => setTimeout(resolve, 80));
      const source = host.querySelector('canvas,img');
      if (!source) return null;
      if (source.tagName === 'IMG' && !source.complete) {
        await new Promise(resolve => { source.onload = resolve; source.onerror = resolve; });
      }
      const copy = document.createElement('canvas');
      copy.width = size;
      copy.height = size;
      copy.getContext('2d').drawImage(source, 0, 0, size, size);
      return copy;
    } finally {
      host.remove();
    }
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = src;
    });
  }

  function centered(ctx, text, y, { font = '40px Arial', color = NAVY, x = 1100, maxWidth = 1800 } = {}) {
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  function fitText(ctx, text, y, { family = 'Arial, sans-serif', weight = '400', startSize = 76, minSize = 36, maxWidth = 1320, color = NAVY, x = 1060 } = {}) {
    let size = startSize;
    ctx.save();
    while (size > minSize) {
      ctx.font = `${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    ctx.font = `${weight} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawMedal(ctx) {
    ctx.save();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(1835, 0); ctx.lineTo(2030, 0); ctx.lineTo(2030, 650); ctx.lineTo(1932, 575); ctx.lineTo(1835, 650); ctx.closePath(); ctx.fill();
    const gradient = ctx.createRadialGradient(1932, 350, 20, 1932, 350, 165);
    gradient.addColorStop(0, '#F7DE91'); gradient.addColorStop(.62, GOLD_LIGHT); gradient.addColorStop(1, '#A8731E');
    ctx.fillStyle = gradient;
    ctx.beginPath(); ctx.arc(1932, 350, 158, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8F651A'; ctx.lineWidth = 9; ctx.stroke();
    ctx.strokeStyle = NAVY; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(1932, 350, 112, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = NAVY; ctx.textAlign = 'center'; ctx.font = '700 68px Georgia, serif'; ctx.fillText('AG', 1932, 375);
    ctx.font = '700 23px Arial, sans-serif'; ctx.fillText('★', 1932, 438);
    ctx.restore();
  }

  function drawSafeWaves(ctx) {
    ctx.save();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(0, 1515);
    ctx.bezierCurveTo(520, 1660, 1190, 1655, 1680, 1555);
    ctx.bezierCurveTo(1910, 1510, 2080, 1485, 2200, 1460);
    ctx.lineTo(2200, 1700); ctx.lineTo(0, 1700); ctx.closePath(); ctx.fill();

    const goldGradient = ctx.createLinearGradient(0, 0, 2200, 0);
    goldGradient.addColorStop(0, '#C69232'); goldGradient.addColorStop(.55, '#F0D17A'); goldGradient.addColorStop(1, '#B37B1D');
    ctx.strokeStyle = goldGradient; ctx.lineWidth = 36;
    ctx.beginPath(); ctx.moveTo(-20, 1500); ctx.bezierCurveTo(560, 1628, 1180, 1615, 1680, 1530); ctx.bezierCurveTo(1920, 1490, 2080, 1470, 2220, 1445); ctx.stroke();

    ctx.strokeStyle = CREAM; ctx.lineWidth = 22;
    ctx.beginPath(); ctx.moveTo(-20, 1465); ctx.bezierCurveTo(560, 1595, 1180, 1582, 1680, 1500); ctx.bezierCurveTo(1920, 1465, 2080, 1445, 2220, 1422); ctx.stroke();
    ctx.restore();
  }

  async function createCertificateCanvas(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 2200;
    canvas.height = 1700;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = CREAM; ctx.fillRect(0, 0, 2200, 1700);
    const bg = ctx.createRadialGradient(500, 450, 10, 500, 450, 950);
    bg.addColorStop(0, 'rgba(255,255,255,.96)'); bg.addColorStop(1, 'rgba(235,232,224,.16)');
    ctx.fillStyle = bg; ctx.fillRect(0, 0, 2200, 1700);

    ctx.strokeStyle = GOLD; ctx.lineWidth = 5; ctx.strokeRect(45, 45, 2110, 1610);
    ctx.strokeStyle = '#D6AE56'; ctx.lineWidth = 2; ctx.strokeRect(65, 65, 2070, 1570);

    drawMedal(ctx);
    drawSafeWaves(ctx);

    try {
      const logo = await loadImage('icono-oficial.png');
      const ratio = logo.naturalWidth / logo.naturalHeight || 1;
      const h = 112;
      const w = Math.min(170, h * ratio);
      ctx.drawImage(logo, 1060 - w / 2, 90, w, h);
    } catch (_) {
      centered(ctx, 'AG', 195, { font: '700 92px Georgia, serif', x: 1060 });
    }

    centered(ctx, 'CERTIFICADO', 365, { font: '700 108px Georgia, serif', x: 1060, maxWidth: 1350 });
    ctx.strokeStyle = GOLD; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(565, 430); ctx.lineTo(770, 430); ctx.moveTo(1350, 430); ctx.lineTo(1555, 430); ctx.stroke();
    centered(ctx, 'DE FINALIZACIÓN', 448, { font: '700 44px Georgia, serif', color: GOLD, x: 1060 });
    centered(ctx, 'SE OTORGA EL PRESENTE CERTIFICADO A:', 545, { font: '600 28px Arial, sans-serif', color: NAVY_SOFT, x: 1060 });

    fitText(ctx, data.studentName, 650, { family: 'Arial, sans-serif', startSize: 76, minSize: 38, maxWidth: 1320, x: 1060 });
    ctx.strokeStyle = NAVY; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(400, 682); ctx.lineTo(1720, 682); ctx.stroke();

    centered(ctx, 'por haber completado satisfactoriamente el', 770, { font: '400 34px Arial, sans-serif', color: NAVY_SOFT, x: 1060 });
    fitText(ctx, data.programTitle, 830, { family: 'Arial, sans-serif', weight: '700', startSize: 38, minSize: 26, maxWidth: 1400, color: GOLD, x: 1060 });
    centered(ctx, 'demostrando compromiso, responsabilidad y dedicación.', 890, { font: '400 32px Arial, sans-serif', color: NAVY_SOFT, x: 1060 });

    ctx.strokeStyle = GOLD; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(910, 950); ctx.lineTo(1010, 950); ctx.moveTo(1110, 950); ctx.lineTo(1210, 950); ctx.stroke();
    ctx.save(); ctx.translate(1060, 950); ctx.rotate(Math.PI / 4); ctx.fillStyle = GOLD; ctx.fillRect(-9, -9, 18, 18); ctx.restore();

    centered(ctx, 'Este certificado corresponde a un programa de formación privada', 1018, { font: '400 24px Arial, sans-serif', color: NAVY_SOFT, x: 1060 });
    centered(ctx, 'y no constituye una certificación oficial emitida por', 1054, { font: '400 24px Arial, sans-serif', color: NAVY_SOFT, x: 1060 });
    centered(ctx, 'entidades gubernamentales o reglamentadas.', 1090, { font: '400 24px Arial, sans-serif', color: NAVY_SOFT, x: 1060 });

    ctx.textAlign = 'center';
    ctx.fillStyle = '#8A641F'; ctx.font = '700 21px Arial, sans-serif'; ctx.fillText('FECHA DE FINALIZACIÓN', 1060, 1155);
    ctx.fillStyle = NAVY; ctx.font = '500 29px Arial, sans-serif'; ctx.fillText(data.completedDateLabel, 1060, 1196);
    ctx.font = '500 19px Arial, sans-serif'; ctx.fillText(`Folio: ${data.credentialCode}`, 1060, 1232);

    ctx.fillStyle = NAVY; ctx.font = 'italic 48px Georgia, serif'; ctx.fillText('Eva Velasco', 565, 1322);
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(390, 1344); ctx.lineTo(740, 1344); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = '700 19px Arial, sans-serif'; ctx.fillText('INSTRUCTORA PRINCIPAL', 565, 1381);

    ctx.fillStyle = NAVY; ctx.font = 'italic 46px Georgia, serif'; ctx.fillText('Angélica Gallardo', 1415, 1322);
    ctx.strokeStyle = GOLD; ctx.beginPath(); ctx.moveTo(1215, 1344); ctx.lineTo(1615, 1344); ctx.stroke();
    ctx.fillStyle = GOLD; ctx.font = '700 19px Arial, sans-serif'; ctx.fillText('PATROCINADORA DEL PROGRAMA', 1415, 1381);

    try {
      const qr = await createQrCanvas(data.verificationUrl, 180);
      if (qr) {
        ctx.fillStyle = '#fff'; ctx.fillRect(1828, 1178, 216, 226);
        ctx.drawImage(qr, 1846, 1190, 180, 180);
        ctx.fillStyle = NAVY; ctx.font = '700 16px Arial, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('VERIFICAR CERTIFICADO', 1936, 1390);
      }
    } catch (_) {}

    return canvas;
  }

  async function createPdf(course) {
    await ensureJsPdf();
    const data = certificateData(course);
    const canvas = await createCertificateCanvas(data);
    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter', compress: true });
    const width = pdf.internal.pageSize.getWidth();
    const height = pdf.internal.pageSize.getHeight();
    pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, width, height, undefined, 'FAST');
    while (pdf.getNumberOfPages() > 1) pdf.deletePage(pdf.getNumberOfPages());
    pdf.setProperties({
      title: `Certificado - ${data.studentName}`,
      subject: data.courseTitle,
      author: 'AG Business Networking',
      creator: `Academia AG · ${RELEASE}`
    });
    return {
      blob: pdf.output('blob'),
      filename: `${safeFilename(`Certificado-${data.studentName}-${data.credentialCode}`)}.pdf`,
      data
    };
  }

  function toast(message, type = 'success') {
    try { if (typeof showToast === 'function') showToast(message, type); }
    catch (_) {}
  }

  async function download(course, button) {
    if (busy) return;
    busy = true;
    const oldText = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Generando PDF…'; }
    try {
      const { blob, filename } = await createPdf(course);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.rel = 'noopener';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      toast('Certificado generado en una sola página.', 'success');
    } catch (error) {
      console.error('CERT_V93_DOWNLOAD_FAILED', error);
      toast('No se pudo generar el certificado. Intenta nuevamente.', 'error');
    } finally {
      if (button) { button.disabled = false; button.textContent = oldText || 'Descargar PDF'; }
      busy = false;
    }
  }

  async function share(course, button) {
    if (busy) return;
    busy = true;
    const oldText = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Preparando…'; }
    try {
      const { blob, filename, data } = await createPdf(course);
      const file = new File([blob], filename, { type: 'application/pdf' });
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) {
        await navigator.share({ title: `Certificado de ${data.studentName}`, text: 'Certificado de finalización · Academia AG', files: [file] });
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        toast('Tu navegador no permite compartir archivos; el PDF se descargó.', 'info');
      }
    } catch (error) {
      if (error?.name !== 'AbortError') {
        console.error('CERT_V93_SHARE_FAILED', error);
        toast('No se pudo compartir el certificado.', 'error');
      }
    } finally {
      if (button) { button.disabled = false; button.textContent = oldText || 'Compartir PDF'; }
      busy = false;
    }
  }

  async function openPrintablePdf(course, button) {
    if (busy) return;
    const target = window.open('', '_blank');
    busy = true;
    const oldText = button?.textContent;
    if (button) { button.disabled = true; button.textContent = 'Preparando…'; }
    try {
      const { blob } = await createPdf(course);
      const url = URL.createObjectURL(blob);
      if (target) target.location.href = url;
      else window.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 180000);
    } catch (error) {
      try { target?.close(); } catch (_) {}
      console.error('CERT_V93_PRINT_FAILED', error);
      toast('No se pudo preparar el PDF para imprimir.', 'error');
    } finally {
      if (button) { button.disabled = false; button.textContent = oldText || 'Ver / imprimir'; }
      busy = false;
    }
  }

  function injectStyles() {
    if (document.querySelector('#ag-certificate-v93-hotfix-style')) return;
    const style = document.createElement('style');
    style.id = 'ag-certificate-v93-hotfix-style';
    style.textContent = `
      html.ag-cert-v93-route #ag-admin-request-inbox-v86,
      html.ag-cert-v93-route .ag-agent-launcher,
      html.ag-cert-v93-route .ag-agent-panel:not(.is-open){display:none!important}

      html.ag-cert-v93-route .certificate-document-wrap{
        width:100%!important;max-width:1180px!important;margin:0 auto!important;
        overflow:visible!important;padding:clamp(8px,1.5vw,18px)!important;
        box-sizing:border-box!important;
      }
      html.ag-cert-v93-route .certificate-document.ag-cert-v91{
        width:100%!important;max-width:1100px!important;height:auto!important;min-height:0!important;
        margin:0 auto!important;transform:none!important;transform-origin:center!important;
        aspect-ratio:11/8.5!important;box-sizing:border-box!important;
      }
      html.ag-cert-v93-route .ag-cert-v91__signatures{left:16%!important;right:23%!important;bottom:15.5%!important;gap:13%!important;z-index:6!important}
      html.ag-cert-v93-route .ag-cert-v91__qr{right:5.2%!important;bottom:15.8%!important;width:9.2%!important;z-index:7!important}
      html.ag-cert-v93-route .ag-cert-v91__qr-label{right:4.7%!important;bottom:13.1%!important;width:10.2%!important;z-index:7!important}
      html.ag-cert-v93-route .ag-cert-v91__wave{bottom:-15%!important;height:20%!important;z-index:0!important}
      html.ag-cert-v93-route .ag-cert-v91__wave:before{top:-13%!important;height:13%!important;border-top-width:12px!important}
      html.ag-cert-v93-route .ag-cert-v91__wave:after{top:-24%!important;height:12%!important;border-top-width:7px!important}
      html.ag-cert-v93-route .certificate-view-heading{align-items:flex-start!important;gap:14px!important}
      html.ag-cert-v93-route .certificate-actions{display:flex!important;flex-wrap:wrap!important;gap:8px!important}
      html.ag-cert-v93-route .certificate-actions .btn{min-height:42px!important}
      .ag-cert-v93-share{white-space:nowrap}

      @media(max-width:760px){
        html.ag-cert-v93-route .page-content,html.ag-cert-v93-route .main-content{overflow-x:hidden!important}
        html.ag-cert-v93-route .certificate-document-wrap{padding:6px!important;overflow:hidden!important}
        html.ag-cert-v93-route .certificate-document.ag-cert-v91{width:100%!important;max-width:100%!important;box-shadow:0 10px 26px rgba(6,27,53,.14)!important}
        html.ag-cert-v93-route .certificate-view-heading{display:grid!important;grid-template-columns:1fr!important}
        html.ag-cert-v93-route .certificate-actions{width:100%!important;display:grid!important;grid-template-columns:1fr 1fr!important}
        html.ag-cert-v93-route .certificate-actions .btn{width:100%!important;min-width:0!important;padding-inline:10px!important;font-size:.75rem!important}
        html.ag-cert-v93-route .ag-cert-v91__signatures{bottom:15.8%!important}
        html.ag-cert-v93-route .ag-cert-v91__wave{bottom:-16%!important;height:19%!important}
      }

      @media print{
        @page{size:letter landscape;margin:0}
        html.ag-cert-v93-route body>*:not(#app){display:none!important}
        html.ag-cert-v93-route .certificate-document-wrap{position:fixed!important;inset:0!important;width:100vw!important;max-width:none!important;padding:0!important;margin:0!important;overflow:hidden!important;background:#fff!important}
        html.ag-cert-v93-route .certificate-document.ag-cert-v91{width:100vw!important;max-width:none!important;height:100vh!important;aspect-ratio:auto!important;box-shadow:none!important;border:0!important}
      }
    `;
    document.head.appendChild(style);
  }

  function syncRouteClass() {
    document.documentElement.classList.toggle('ag-cert-v93-route', isCertificateRoute());
  }

  function ensureActions() {
    if (!isCertificateRoute()) return;
    const actions = document.querySelector('.certificate-actions');
    if (!actions) return;

    const downloadButton = actions.querySelector('#download-certificate-pdf-v91, #print-certificate');
    if (downloadButton) downloadButton.textContent = 'Descargar PDF';

    const legacyPrint = actions.querySelector('.ag-cert-print-v91');
    if (legacyPrint) legacyPrint.textContent = 'Ver / imprimir';

    if (!actions.querySelector('#share-certificate-pdf-v93')) {
      const shareButton = document.createElement('button');
      shareButton.type = 'button';
      shareButton.id = 'share-certificate-pdf-v93';
      shareButton.className = 'btn btn-secondary ag-cert-v93-share';
      shareButton.textContent = 'Compartir PDF';
      actions.appendChild(shareButton);
    }
  }

  function courseForCurrentRoute() {
    return findCourse(courseIdFromRoute());
  }

  document.addEventListener('click', event => {
    const button = event.target?.closest?.('button');
    if (!button || !isCertificateRoute()) return;
    const course = courseForCurrentRoute();
    if (!course) return;

    if (button.id === 'download-certificate-pdf-v91' || button.id === 'print-certificate') {
      event.preventDefault(); event.stopImmediatePropagation();
      download(course, button);
      return;
    }
    if (button.id === 'share-certificate-pdf-v93') {
      event.preventDefault(); event.stopImmediatePropagation();
      share(course, button);
      return;
    }
    if (button.classList.contains('ag-cert-print-v91')) {
      event.preventDefault(); event.stopImmediatePropagation();
      openPrintablePdf(course, button);
    }
  }, true);

  function refresh() {
    syncRouteClass();
    if (isCertificateRoute()) {
      injectStyles();
      ensureActions();
      const documentNode = document.querySelector('#certificate-document');
      if (documentNode) documentNode.dataset.agCertV93 = RELEASE;
    }
  }

  window.addEventListener('hashchange', () => setTimeout(refresh, 80));
  window.addEventListener('resize', () => { if (isCertificateRoute()) ensureActions(); });
  const observer = new MutationObserver(() => {
    if (!isCertificateRoute()) return;
    clearTimeout(observer._timer);
    observer._timer = setTimeout(refresh, 50);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', refresh, { once: true });
  else refresh();

  window.ACADEMIA_AG_CERTIFICATE_V93 = { release: RELEASE, refresh };
})();
