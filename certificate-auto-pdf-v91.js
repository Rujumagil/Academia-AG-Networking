(() => {
  'use strict';

  const RELEASE = '20260825.91';
  const UTAH_COURSE_ID = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01';
  const JS_PDF_SOURCES = [
    'https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js',
    'https://unpkg.com/jspdf@2.5.2/dist/jspdf.umd.min.js'
  ];
  const QR_SOURCES = [
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://unpkg.com/qrcodejs@1.0.0/qrcode.min.js'
  ];

  let observer = null;
  let timer = null;
  let jsPdfPromise = null;
  let qrPromise = null;
  const issueAttempts = new Map();

  const NAVY = '#061b35';
  const NAVY_SOFT = '#1E293B';
  const GOLD = '#B7862C';
  const GOLD_LIGHT = '#E1BD61';
  const CREAM = '#FBFAF6';

  function escapeHtml(value = '') {
    return String(value ?? '').replace(/[&<>"']/g, char => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    })[char]);
  }

  function appState() {
    try { return typeof state !== 'undefined' ? state : null; }
    catch (_) { return null; }
  }

  function supabaseClient() {
    try { return typeof db !== 'undefined' ? db : null; }
    catch (_) { return null; }
  }

  function currentCourseId() {
    const parts = location.hash.replace(/^#/, '').split('/');
    return parts[0] === 'certificate' ? parts[1] || '' : '';
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

  function orderedLessons(course) {
    return [...(course?.modules || [])]
      .sort((a, b) => Number(a.position || 0) - Number(b.position || 0))
      .flatMap(module => [...(module.lessons || [])].sort((a, b) => Number(a.position || 0) - Number(b.position || 0)));
  }

  function isOptionalLesson(lesson) {
    return String(lesson?.lesson_kind || '').toLowerCase() === 'promo';
  }

  function requiredLessons(course) {
    if (course?.id === UTAH_COURSE_ID) {
      try {
        const runtimeLessons = window.ACADEMIA_AG_UTAH_RUNTIME?.requiredLessons?.(course);
        if (Array.isArray(runtimeLessons) && runtimeLessons.length) return runtimeLessons;
      } catch (_) {}
    }
    return orderedLessons(course).filter(lesson => !isOptionalLesson(lesson));
  }

  function requiredAssessments(course) {
    const s = appState();
    return (s?.assessments || []).filter(item => item.course_id === course?.id && item.status === 'published');
  }

  function passedAttemptFor(assessment) {
    const s = appState();
    return (s?.assessmentAttempts || [])
      .filter(item => item.user_id === s?.user?.id && item.assessment_id === assessment.id && item.passed)
      .sort((a, b) => new Date(b.submitted_at || 0) - new Date(a.submitted_at || 0))[0] || null;
  }

  function courseIsComplete(course) {
    const s = appState();
    if (!s?.user || !course) return false;
    const lessons = requiredLessons(course);
    if (!lessons.length) return false;
    const rows = s.progressRows || [];
    const lessonsDone = lessons.every(lesson => rows.some(row => row.lesson_id === lesson.id && row.completed));
    if (!lessonsDone) return false;
    const assessments = requiredAssessments(course);
    return assessments.every(assessment => Boolean(passedAttemptFor(assessment)));
  }

  function completionDateIso(course, certificate = certificateFor(course)) {
    const s = appState();
    const lessonIds = new Set(requiredLessons(course).map(item => item.id));
    const timestamps = (s?.progressRows || [])
      .filter(row => lessonIds.has(row.lesson_id) && row.completed && row.completed_at)
      .map(row => new Date(row.completed_at).getTime())
      .filter(Number.isFinite);

    requiredAssessments(course).forEach(assessment => {
      const attempt = passedAttemptFor(assessment);
      const time = attempt?.submitted_at ? new Date(attempt.submitted_at).getTime() : NaN;
      if (Number.isFinite(time)) timestamps.push(time);
    });

    if (timestamps.length) return new Date(Math.max(...timestamps)).toISOString();
    if (certificate?.completed_at) return certificate.completed_at;
    if (certificate?.issued_at) return certificate.issued_at;
    return new Date().toISOString();
  }

  function formatLongDate(value) {
    const date = value instanceof Date ? value : new Date(value);
    if (!Number.isFinite(date.getTime())) return 'Fecha no disponible';
    return new Intl.DateTimeFormat('es-MX', {
      day: 'numeric', month: 'long', year: 'numeric'
    }).format(date);
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
    const completedAt = completionDateIso(course, certificate);
    return {
      course,
      certificate,
      studentName: certificate?.student_name_snapshot || studentName(),
      courseTitle: certificate?.course_title_snapshot || course?.title || 'Programa de Academia AG',
      programTitle: displayProgramTitle(course),
      credentialCode: code,
      completedAt,
      completedDateLabel: formatLongDate(completedAt),
      verificationUrl: verificationUrl(code)
    };
  }

  async function maybeIssueCertificate(course, silent = true) {
    const s = appState();
    const client = supabaseClient();
    if (!s?.user || !client || !course || !courseIsComplete(course) || certificateFor(course)) return null;

    const lastAttempt = Number(issueAttempts.get(course.id) || 0);
    if (Date.now() - lastAttempt < 15000) return null;
    issueAttempts.set(course.id, Date.now());

    try {
      const { data, error } = await client.rpc('issue_my_certificate', { target_course: course.id });
      if (error) throw error;
      const record = Array.isArray(data) ? data[0] : data;
      if (!record) return null;

      record.completed_at = record.completed_at || completionDateIso(course, record);
      record.student_name_snapshot = record.student_name_snapshot || studentName();
      record.course_title_snapshot = record.course_title_snapshot || course.title;
      s.certificates = [record, ...(s.certificates || []).filter(item => item.id !== record.id)];

      try {
        if (!silent && typeof showToast === 'function') showToast('¡Curso completado! Tu certificado ya está disponible.', 'success');
      } catch (_) {}
      return record;
    } catch (error) {
      if (!silent) console.warn('Emisión automática del certificado:', error?.message || error);
      return null;
    }
  }

  async function checkAutomaticIssuance() {
    const s = appState();
    if (!s?.user || !Array.isArray(s.courses) || !s.courses.length) return;
    for (const course of s.courses) {
      if (certificateFor(course) || !courseIsComplete(course)) continue;
      await maybeIssueCertificate(course, false);
    }
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
      await new Promise(resolve => setTimeout(resolve, 60));
      const canvas = host.querySelector('canvas');
      if (canvas) {
        const copy = document.createElement('canvas');
        copy.width = size;
        copy.height = size;
        copy.getContext('2d').drawImage(canvas, 0, 0, size, size);
        return copy;
      }
      const image = host.querySelector('img');
      if (image) {
        await new Promise(resolve => {
          if (image.complete) resolve();
          else image.onload = resolve;
        });
        const copy = document.createElement('canvas');
        copy.width = size;
        copy.height = size;
        copy.getContext('2d').drawImage(image, 0, 0, size, size);
        return copy;
      }
      return null;
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

  function fillTextCentered(ctx, text, y, options = {}) {
    const {
      font = '40px Arial', color = NAVY, maxWidth = 1800,
      x = 1100, baseline = 'alphabetic'
    } = options;
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = baseline;
    ctx.fillText(text, x, y, maxWidth);
    ctx.restore();
  }

  function fitCenteredText(ctx, text, y, options = {}) {
    const {
      family = 'Arial, sans-serif', weight = '400', style = 'normal',
      startSize = 76, minSize = 38, maxWidth = 1380, color = NAVY, x = 1060
    } = options;
    let size = startSize;
    ctx.save();
    while (size > minSize) {
      ctx.font = `${style} ${weight} ${size}px ${family}`;
      if (ctx.measureText(text).width <= maxWidth) break;
      size -= 2;
    }
    ctx.font = `${style} ${weight} ${size}px ${family}`;
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function drawRibbonAndMedal(ctx) {
    ctx.save();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(1830, 0);
    ctx.lineTo(2035, 0);
    ctx.lineTo(2035, 730);
    ctx.lineTo(1932, 640);
    ctx.lineTo(1830, 730);
    ctx.closePath();
    ctx.fill();

    const gradient = ctx.createRadialGradient(1932, 390, 30, 1932, 390, 190);
    gradient.addColorStop(0, '#F4D67C');
    gradient.addColorStop(0.65, GOLD_LIGHT);
    gradient.addColorStop(1, GOLD);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(1932, 390, 178, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#8F651A';
    ctx.lineWidth = 10;
    ctx.stroke();

    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(1932, 390, 128, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = NAVY;
    ctx.font = '700 74px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.fillText('AG', 1932, 418);
    ctx.font = '700 26px Arial, sans-serif';
    ctx.fillText('★', 1932, 490);
    ctx.restore();
  }

  function drawBottomWaves(ctx) {
    ctx.save();
    ctx.fillStyle = NAVY;
    ctx.beginPath();
    ctx.moveTo(0, 1420);
    ctx.bezierCurveTo(520, 1790, 1170, 1675, 1650, 1490);
    ctx.bezierCurveTo(1900, 1395, 2080, 1280, 2200, 1210);
    ctx.lineTo(2200, 1700);
    ctx.lineTo(0, 1700);
    ctx.closePath();
    ctx.fill();

    const goldGradient = ctx.createLinearGradient(0, 0, 2200, 0);
    goldGradient.addColorStop(0, '#C69232');
    goldGradient.addColorStop(0.55, '#F0D17A');
    goldGradient.addColorStop(1, '#B37B1D');
    ctx.strokeStyle = goldGradient;
    ctx.lineWidth = 44;
    ctx.beginPath();
    ctx.moveTo(-30, 1450);
    ctx.bezierCurveTo(520, 1740, 1120, 1650, 1630, 1470);
    ctx.bezierCurveTo(1870, 1385, 2070, 1260, 2230, 1160);
    ctx.stroke();

    ctx.strokeStyle = CREAM;
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.moveTo(-20, 1390);
    ctx.bezierCurveTo(520, 1700, 1120, 1600, 1620, 1430);
    ctx.bezierCurveTo(1870, 1340, 2070, 1220, 2220, 1130);
    ctx.stroke();
    ctx.restore();
  }

  async function createCertificateCanvas(data) {
    const canvas = document.createElement('canvas');
    canvas.width = 2200;
    canvas.height = 1700;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = CREAM;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const bg = ctx.createRadialGradient(520, 520, 10, 520, 520, 900);
    bg.addColorStop(0, 'rgba(255,255,255,.92)');
    bg.addColorStop(1, 'rgba(235,232,224,.18)');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 5;
    ctx.strokeRect(45, 45, 2110, 1610);
    ctx.strokeStyle = '#D6AE56';
    ctx.lineWidth = 2;
    ctx.strokeRect(65, 65, 2070, 1570);

    drawRibbonAndMedal(ctx);
    drawBottomWaves(ctx);

    try {
      const logo = await loadImage('icono-oficial.png');
      const ratio = logo.naturalWidth / logo.naturalHeight || 1;
      const h = 125;
      const w = Math.min(180, h * ratio);
      ctx.drawImage(logo, 1060 - w / 2, 105, w, h);
    } catch (_) {
      fillTextCentered(ctx, 'AG', 220, { font: '700 105px Georgia, serif', color: NAVY, x: 1060 });
    }

    fillTextCentered(ctx, 'CERTIFICADO', 395, {
      font: '700 112px Georgia, serif', color: NAVY, x: 1060, maxWidth: 1350
    });

    ctx.save();
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(560, 465); ctx.lineTo(770, 465);
    ctx.moveTo(1350, 465); ctx.lineTo(1560, 465);
    ctx.stroke();
    ctx.restore();
    fillTextCentered(ctx, 'DE FINALIZACIÓN', 482, {
      font: '700 47px Georgia, serif', color: GOLD, x: 1060
    });

    fillTextCentered(ctx, 'SE OTORGA EL PRESENTE CERTIFICADO A:', 585, {
      font: '600 30px Arial, sans-serif', color: NAVY_SOFT, x: 1060
    });

    fitCenteredText(ctx, data.studentName, 690, {
      family: 'Arial, sans-serif', startSize: 78, minSize: 40,
      maxWidth: 1330, color: NAVY, x: 1060
    });
    ctx.strokeStyle = NAVY;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(390, 720); ctx.lineTo(1730, 720); ctx.stroke();

    fillTextCentered(ctx, 'por haber completado satisfactoriamente el', 815, {
      font: '400 35px Arial, sans-serif', color: NAVY_SOFT, x: 1060
    });
    fitCenteredText(ctx, data.programTitle, 875, {
      family: 'Arial, sans-serif', weight: '700', startSize: 39, minSize: 27,
      maxWidth: 1420, color: GOLD, x: 1060
    });
    fillTextCentered(ctx, 'demostrando compromiso, responsabilidad y dedicación.', 935, {
      font: '400 34px Arial, sans-serif', color: NAVY_SOFT, x: 1060
    });

    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(900, 995); ctx.lineTo(1010, 995);
    ctx.moveTo(1110, 995); ctx.lineTo(1220, 995);
    ctx.stroke();
    ctx.save();
    ctx.translate(1060, 995);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = GOLD;
    ctx.fillRect(-10, -10, 20, 20);
    ctx.restore();

    fillTextCentered(ctx, 'Este certificado corresponde a un programa de formación privada', 1065, {
      font: '400 25px Arial, sans-serif', color: NAVY_SOFT, x: 1050
    });
    fillTextCentered(ctx, 'y no constituye una certificación oficial emitida por', 1102, {
      font: '400 25px Arial, sans-serif', color: NAVY_SOFT, x: 1050
    });
    fillTextCentered(ctx, 'entidades gubernamentales o reglamentadas.', 1139, {
      font: '400 25px Arial, sans-serif', color: NAVY_SOFT, x: 1050
    });

    ctx.fillStyle = '#8A641F';
    ctx.font = '700 22px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('FECHA DE FINALIZACIÓN', 1060, 1208);
    ctx.fillStyle = NAVY;
    ctx.font = '500 31px Arial, sans-serif';
    ctx.fillText(data.completedDateLabel, 1060, 1250);
    ctx.font = '500 20px Arial, sans-serif';
    ctx.fillText(`Folio: ${data.credentialCode}`, 1060, 1285);

    ctx.fillStyle = NAVY;
    ctx.font = 'italic 52px Georgia, serif';
    ctx.fillText('Eva Velasco', 600, 1328);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(420, 1350); ctx.lineTo(780, 1350); ctx.stroke();
    ctx.font = '700 21px Arial, sans-serif';
    ctx.fillStyle = GOLD;
    ctx.fillText('INSTRUCTORA PRINCIPAL', 600, 1390);

    ctx.fillStyle = NAVY;
    ctx.font = 'italic 50px Georgia, serif';
    ctx.fillText('Angélica Gallardo', 1450, 1328);
    ctx.strokeStyle = GOLD;
    ctx.beginPath(); ctx.moveTo(1245, 1350); ctx.lineTo(1655, 1350); ctx.stroke();
    ctx.font = '700 21px Arial, sans-serif';
    ctx.fillStyle = GOLD;
    ctx.fillText('PATROCINADORA DEL PROGRAMA', 1450, 1390);

    try {
      const qr = await createQrCanvas(data.verificationUrl, 190);
      if (qr) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(1830, 1180, 220, 240);
        ctx.drawImage(qr, 1845, 1190, 190, 190);
        ctx.fillStyle = NAVY;
        ctx.font = '700 17px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('VERIFICAR', 1940, 1402);
      }
    } catch (_) {}

    return canvas;
  }

  function safeFilename(value) {
    return String(value || 'certificado')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/gi, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'certificado';
  }

  async function downloadCertificatePdf(courseId, button = null) {
    const course = findCourse(courseId);
    if (!course) return;

    const original = button?.textContent || 'Descargar PDF';
    if (button) {
      button.disabled = true;
      button.textContent = 'Generando PDF…';
    }

    try {
      let certificate = certificateFor(course);
      if (!certificate && courseIsComplete(course)) certificate = await maybeIssueCertificate(course, false);
      const data = certificateData(course);
      await ensureJsPdf();
      const canvas = await createCertificateCanvas(data);
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter', compress: true });
      const width = pdf.internal.pageSize.getWidth();
      const height = pdf.internal.pageSize.getHeight();
      pdf.addImage(canvas.toDataURL('image/jpeg', 0.96), 'JPEG', 0, 0, width, height, undefined, 'FAST');
      pdf.setProperties({
        title: `Certificado - ${data.studentName}`,
        subject: data.courseTitle,
        author: 'AG Business Networking',
        creator: 'Academia AG'
      });
      pdf.save(`${safeFilename(`Certificado-${data.studentName}-${data.credentialCode}`)}.pdf`);
      try { if (typeof showToast === 'function') showToast('Certificado PDF generado correctamente.', 'success'); } catch (_) {}
    } catch (error) {
      console.error('Certificate PDF:', error);
      try {
        if (typeof showToast === 'function') showToast('No se pudo generar el PDF. Puedes usar la opción Imprimir.', 'error');
      } catch (_) {}
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  function injectStyles() {
    if (document.querySelector('#ag-certificate-v91-styles')) return;
    const style = document.createElement('style');
    style.id = 'ag-certificate-v91-styles';
    style.textContent = `
      .certificate-document.ag-cert-v91{position:relative;overflow:hidden;aspect-ratio:11/8.5;min-height:0;background:#fbfaf6;color:${NAVY};border:2px solid ${GOLD};box-shadow:0 24px 60px rgba(6,27,53,.16);font-family:Montserrat,Arial,sans-serif;padding:4.5% 8% 6%;isolation:isolate}
      .certificate-document.ag-cert-v91:before{content:"";position:absolute;inset:1.2%;border:1px solid #d5b15c;pointer-events:none;z-index:4}
      .ag-cert-v91 .certificate-border,.ag-cert-v91 .certificate-corner,.ag-cert-v91>.certificate-logo,.ag-cert-v91>.certificate-kicker,.ag-cert-v91>.certificate-intro,.ag-cert-v91>.certificate-name-line,.ag-cert-v91>.certificate-course-intro,.ag-cert-v91>.certificate-description,.ag-cert-v91>.certificate-footer-data,.ag-cert-v91>.certificate-code{display:none!important}
      .ag-cert-v91__logo{position:absolute;top:5.5%;left:50%;transform:translateX(-50%);width:8%;height:9%;object-fit:contain;z-index:3}
      .ag-cert-v91__ribbon{position:absolute;right:6.5%;top:0;width:10.5%;height:48%;background:${NAVY};clip-path:polygon(0 0,100% 0,100% 100%,50% 83%,0 100%);z-index:1}
      .ag-cert-v91__medal{position:absolute;right:3.8%;top:15%;width:15%;aspect-ratio:1;border-radius:50%;background:radial-gradient(circle at 38% 30%,#f7df95 0,#e2bd60 52%,#a87520 100%);border:3px solid #9d6d1b;box-shadow:0 8px 18px rgba(0,0,0,.22);z-index:3;display:grid;place-items:center}
      .ag-cert-v91__medal:before{content:"";position:absolute;inset:13%;border:2px solid ${NAVY};border-radius:50%}
      .ag-cert-v91__medal strong{font:700 clamp(18px,2.7vw,40px) Georgia,serif;color:${NAVY};z-index:2}
      .ag-cert-v91__content{position:relative;z-index:2;text-align:center;max-width:78%;margin:10% auto 0 -1%}
      .ag-cert-v91__title{font:700 clamp(34px,6.3vw,86px)/.95 Georgia,serif;letter-spacing:.08em;color:${NAVY};margin:0;text-transform:uppercase}
      .ag-cert-v91__subtitle{display:flex;align-items:center;justify-content:center;gap:2.2%;margin:1.7% auto 4%;font:700 clamp(16px,2.2vw,32px)/1 Georgia,serif;letter-spacing:.18em;color:${GOLD};white-space:nowrap}
      .ag-cert-v91__subtitle:before,.ag-cert-v91__subtitle:after{content:"";height:2px;background:${GOLD};width:17%}
      .ag-cert-v91__recipient-label{font-size:clamp(9px,1.15vw,16px);font-weight:700;letter-spacing:.08em;margin:0 0 1.4%;color:${NAVY_SOFT}}
      .ag-cert-v91__name{font-size:clamp(20px,3.3vw,49px);font-weight:400;line-height:1.08;margin:0 auto;width:90%;white-space:nowrap;color:${NAVY};padding-bottom:1.4%;border-bottom:2px solid ${NAVY}}
      .ag-cert-v91__body{font-size:clamp(10px,1.45vw,20px);line-height:1.35;margin:3.8% auto 0;color:${NAVY_SOFT}}
      .ag-cert-v91__program{display:block;color:${GOLD};font-weight:800;font-size:clamp(10px,1.5vw,21px);margin:.35em auto;max-width:96%}
      .ag-cert-v91__ornament{width:19%;height:1px;background:${GOLD};margin:2.6% auto;position:relative}
      .ag-cert-v91__ornament:after{content:"";position:absolute;left:50%;top:50%;width:8px;height:8px;background:${GOLD};transform:translate(-50%,-50%) rotate(45deg);box-shadow:0 0 0 9px ${CREAM}}
      .ag-cert-v91__notice{font-size:clamp(7px,.9vw,12px);line-height:1.45;max-width:76%;margin:auto;color:${NAVY_SOFT}}
      .ag-cert-v91__meta{display:flex;justify-content:center;gap:8%;margin-top:2.7%;font-size:clamp(7px,.9vw,12px);color:${NAVY_SOFT}}
      .ag-cert-v91__meta strong{display:block;color:${GOLD};font-size:.92em;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.25em}
      .ag-cert-v91__signatures{position:absolute;z-index:3;left:18%;right:18%;bottom:10.7%;display:grid;grid-template-columns:1fr 1fr;gap:16%;text-align:center}
      .ag-cert-v91__signature-name{font:italic clamp(18px,2.8vw,39px)/1 Georgia,serif;color:${NAVY};padding-bottom:1.5%;border-bottom:1px solid ${GOLD}}
      .ag-cert-v91__signature-role{font-size:clamp(7px,.88vw,12px);font-weight:700;letter-spacing:.08em;color:${GOLD};margin-top:2%}
      .ag-cert-v91__qr{position:absolute;right:5.5%;bottom:11.5%;width:9.5%;aspect-ratio:1;background:#fff;padding:.45%;z-index:5;box-shadow:0 4px 12px rgba(0,0,0,.08)}
      .ag-cert-v91__qr canvas,.ag-cert-v91__qr img{width:100%!important;height:100%!important;display:block}
      .ag-cert-v91__qr-label{position:absolute;right:5.5%;bottom:8.8%;width:9.5%;text-align:center;font-size:clamp(6px,.65vw,9px);font-weight:800;letter-spacing:.08em;color:${NAVY};z-index:5}
      .ag-cert-v91__wave{position:absolute;left:-7%;right:-7%;bottom:-13%;height:29%;background:${NAVY};border-radius:50% 50% 0 0/36% 38% 0 0;transform:rotate(-1.6deg);z-index:0}
      .ag-cert-v91__wave:before{content:"";position:absolute;left:-2%;right:-2%;top:-17%;height:17%;border-top:16px solid ${GOLD_LIGHT};border-radius:50% 50% 0 0/100% 100% 0 0}
      .ag-cert-v91__wave:after{content:"";position:absolute;left:-2%;right:-2%;top:-30%;height:15%;border-top:9px solid ${NAVY};border-radius:50% 50% 0 0/100% 100% 0 0}
      .certificate-actions .ag-cert-print-v91{white-space:nowrap}
      @media(max-width:760px){.certificate-document.ag-cert-v91{width:900px;max-width:none;transform-origin:top left}.certificate-document-wrap{overflow:auto}.ag-cert-v91__content{max-width:77%}.certificate-view-heading .certificate-actions{gap:8px;flex-wrap:wrap}}
      @media print{body *{visibility:hidden!important}.certificate-document-wrap,.certificate-document-wrap *{visibility:visible!important}.certificate-document-wrap{position:fixed!important;inset:0!important;background:white!important;padding:0!important}.certificate-document.ag-cert-v91{width:100vw!important;height:auto!important;box-shadow:none!important;transform:none!important}}
    `;
    document.head.appendChild(style);
  }

  function fitScreenName(node) {
    if (!node) return;
    let size = parseFloat(getComputedStyle(node).fontSize) || 46;
    const min = 22;
    while (node.scrollWidth > node.clientWidth && size > min) {
      size -= 1;
      node.style.fontSize = `${size}px`;
    }
  }

  async function renderScreenQr(data) {
    const host = document.querySelector('.ag-cert-v91__qr');
    if (!host || host.dataset.ready === '1') return;
    try {
      await ensureQr();
      host.innerHTML = '';
      new window.QRCode(host, {
        text: data.verificationUrl,
        width: 180,
        height: 180,
        colorDark: NAVY,
        colorLight: '#ffffff',
        correctLevel: window.QRCode.CorrectLevel?.M
      });
      host.dataset.ready = '1';
    } catch (_) {
      host.innerHTML = '<strong style="display:grid;place-items:center;height:100%;font:700 18px Arial;color:#061b35">AG</strong>';
    }
  }

  function certificateMarkup(data) {
    return `
      <img class="ag-cert-v91__logo" src="icono-oficial.png" alt="AG">
      <div class="ag-cert-v91__ribbon" aria-hidden="true"></div>
      <div class="ag-cert-v91__medal" aria-hidden="true"><strong>AG</strong></div>
      <div class="ag-cert-v91__content">
        <h1 class="ag-cert-v91__title">CERTIFICADO</h1>
        <div class="ag-cert-v91__subtitle">DE FINALIZACIÓN</div>
        <p class="ag-cert-v91__recipient-label">SE OTORGA EL PRESENTE CERTIFICADO A:</p>
        <div class="ag-cert-v91__name">${escapeHtml(data.studentName)}</div>
        <p class="ag-cert-v91__body">por haber completado satisfactoriamente el
          <span class="ag-cert-v91__program">${escapeHtml(data.programTitle)},</span>
          demostrando compromiso, responsabilidad y dedicación.
        </p>
        <div class="ag-cert-v91__ornament"></div>
        <p class="ag-cert-v91__notice">Este certificado corresponde a un programa de formación privada<br>y no constituye una certificación oficial emitida por<br>entidades gubernamentales o reglamentadas.</p>
        <div class="ag-cert-v91__meta">
          <div><strong>Fecha de finalización</strong>${escapeHtml(data.completedDateLabel)}</div>
          <div><strong>Folio</strong>${escapeHtml(data.credentialCode)}</div>
        </div>
      </div>
      <div class="ag-cert-v91__signatures">
        <div><div class="ag-cert-v91__signature-name">Eva Velasco</div><div class="ag-cert-v91__signature-role">INSTRUCTORA PRINCIPAL</div></div>
        <div><div class="ag-cert-v91__signature-name">Angélica Gallardo</div><div class="ag-cert-v91__signature-role">PATROCINADORA DEL PROGRAMA</div></div>
      </div>
      <div class="ag-cert-v91__qr" aria-label="Código QR de verificación"></div>
      <div class="ag-cert-v91__qr-label">VERIFICAR CERTIFICADO</div>
      <div class="ag-cert-v91__wave" aria-hidden="true"></div>`;
  }

  function enhanceCertificatePage() {
    injectStyles();
    const courseId = currentCourseId();
    if (!courseId) return;
    const course = findCourse(courseId);
    const documentNode = document.querySelector('#certificate-document');
    if (!course || !documentNode) return;

    const data = certificateData(course);
    const token = `${course.id}:${data.credentialCode}:${data.completedAt}`;
    if (documentNode.dataset.agCertV91 === token) return;
    documentNode.dataset.agCertV91 = token;
    documentNode.classList.add('ag-cert-v91');
    documentNode.innerHTML = certificateMarkup(data);
    fitScreenName(documentNode.querySelector('.ag-cert-v91__name'));
    renderScreenQr(data);

    const oldPrint = document.querySelector('#print-certificate');
    if (oldPrint) {
      const download = oldPrint.cloneNode(true);
      download.id = 'download-certificate-pdf-v91';
      download.textContent = 'Descargar PDF';
      oldPrint.replaceWith(download);
      download.addEventListener('click', () => downloadCertificatePdf(course.id, download));

      const print = document.createElement('button');
      print.type = 'button';
      print.className = 'btn btn-secondary ag-cert-print-v91';
      print.textContent = 'Imprimir';
      print.addEventListener('click', () => window.print());
      download.parentElement?.insertBefore(print, download);
    }

    const help = document.querySelector('.certificate-download-help');
    if (help) {
      const strong = help.querySelector('strong');
      const paragraph = help.querySelector('p');
      if (strong) strong.textContent = 'PDF listo para descargar';
      if (paragraph) paragraph.textContent = 'Usa “Descargar PDF” para crear el certificado con tu nombre, fecha de finalización, folio y QR de verificación.';
    }
  }

  function patchVerificationFunction() {
    if (window.__AG_CERT_VERIFY_V91__) return;
    const original = window.verifyCertificateCode;
    if (typeof original !== 'function') return;

    window.verifyCertificateCode = async function verifyCertificateCodeV91(code, mount = document) {
      const result = mount.querySelector('#verification-result');
      if (!result) return;
      result.innerHTML = '<div class="verification-loading">Verificando folio…</div>';
      try {
        const client = supabaseClient();
        const { data, error } = await client.rpc('verify_certificate', { target_code: code });
        if (error) throw error;
        const record = Array.isArray(data) ? data[0] : data;
        if (!record) {
          result.innerHTML = '<article class="verification-result-card invalid"><span>×</span><div><strong>Folio no encontrado</strong><p>Revisa que el código esté escrito exactamente como aparece en el certificado.</p></div></article>';
          return;
        }
        const valid = record.status === 'valid';
        const completion = record.completed_at || record.issued_at;
        const date = completion ? formatLongDate(completion) : 'Fecha no disponible';
        result.innerHTML = `<article class="verification-result-card ${valid ? 'valid' : 'invalid'}">
          <span>${valid ? '✓' : '!'}</span>
          <div>
            <strong>${valid ? 'Certificado válido' : 'Certificado revocado'}</strong>
            <h2>${escapeHtml(record.course_title || 'Programa de Academia AG')}</h2>
            <p><b>Alumno:</b> ${escapeHtml(record.student_name || 'Sin nombre')}</p>
            <p><b>Finalización:</b> ${escapeHtml(date)}</p>
            <small>Folio: ${escapeHtml(record.credential_code || code)}</small>
          </div>
        </article>`;
      } catch (error) {
        console.error(error);
        result.innerHTML = `<article class="verification-result-card invalid"><span>!</span><div><strong>No fue posible verificar</strong><p>${escapeHtml(error?.message || 'Intenta nuevamente más tarde.')}</p></div></article>`;
      }
    };
    window.__AG_CERT_VERIFY_V91__ = true;
  }

  function run() {
    patchVerificationFunction();
    enhanceCertificatePage();
    checkAutomaticIssuance();
    document.documentElement.dataset.agCertificateRelease = RELEASE;
  }

  function schedule() {
    clearTimeout(timer);
    timer = setTimeout(run, 120);
  }

  function observe() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.querySelector('#app') || document.body, { childList: true, subtree: true });
  }

  window.addEventListener('hashchange', schedule);
  window.addEventListener('pageshow', schedule);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) schedule(); });
  setInterval(checkAutomaticIssuance, 5000);
  observe();
  schedule();

  window.ACADEMIA_AG_CERTIFICATES = {
    release: RELEASE,
    download: downloadCertificatePdf,
    completionDateIso,
    courseIsComplete,
    issue: maybeIssueCertificate,
    enhance: enhanceCertificatePage
  };
})();
