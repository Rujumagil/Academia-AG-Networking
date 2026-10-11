(() => {
  const app = document.querySelector('#app');

  function publicSiteUrl() {
    const configured = String(window.SUPABASE_CONFIG?.publicSiteUrl || '').trim();
    return /^https?:\/\//i.test(configured) ? configured : 'https://www.agbusinessnetworking.com/';
  }

  function renderStatus(title, message, showActions = false) {
    app.innerHTML = `
      <main class="login-screen">
        <section class="login-card glass loading-card">
          <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
          <h1>${title}</h1>
          <p>${message}</p>
          ${showActions ? `
            <div class="bootstrap-actions">
              <button class="btn btn-primary" id="retry-app">Volver a intentar</button>
              <a class="btn btn-secondary" href="${publicSiteUrl()}">Ir a AG Business Networking</a>
            </div>` : '<div class="spinner" aria-label="Cargando"></div>'}
        </section>
      </main>`;
    document.querySelector('#retry-app')?.addEventListener('click', () => location.reload());
  }

  function loadScript(src, timeout = 15000) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timer = setTimeout(() => {
        script.remove();
        reject(new Error(`Tiempo agotado al cargar ${src}`));
      }, timeout);
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => { clearTimeout(timer); resolve(); };
      script.onerror = () => { clearTimeout(timer); script.remove(); reject(new Error(`No se pudo cargar ${src}`)); };
      document.head.appendChild(script);
    });
  }

  async function loadSupabaseLibrary() {
    if (window.supabase?.createClient) return;
    const sources = [
      'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
      'https://unpkg.com/@supabase/supabase-js@2'
    ];
    let lastError;
    for (const src of sources) {
      try {
        await loadScript(src);
        if (window.supabase?.createClient) return;
        throw new Error('La librería cargó, pero no creó window.supabase.');
      } catch (error) {
        console.warn(error);
        lastError = error;
      }
    }
    throw lastError || new Error('No fue posible cargar la biblioteca de datos.');
  }

  function installAcademyDataAdapter() {
    if (window.__AG_ACADEMY_DATA_ADAPTER__) return;
    if (!window.supabase?.createClient) return;

    const cfg = window.SUPABASE_CONFIG || {};
    const masterHost = (() => {
      try { return new URL(String(cfg.url || '')).host; } catch (_) { return ''; }
    })();

    const tableMap = Object.freeze({
      profiles: 'academy_profiles',
      courses: 'academy_courses',
      modules: 'academy_modules',
      lessons: 'academy_lessons',
      enrollments: 'academy_enrollments',
      lesson_progress: 'academy_lesson_progress',
      lesson_notes: 'academy_lesson_notes',
      resources: 'academy_resources',
      lesson_blocks: 'academy_lesson_blocks',
      block_responses: 'academy_block_responses',
      course_versions: 'academy_course_versions',
      assessments: 'academy_assessments',
      assessment_questions: 'academy_assessment_questions',
      assessment_options: 'academy_assessment_options',
      assessment_attempts: 'academy_assessment_attempts',
      assessment_answers: 'academy_assessment_answers',
      certificates: 'academy_certificates',
      products: 'academy_products',
      product_contents: 'academy_product_contents',
      student_access: 'academy_student_access',
      access_history: 'academy_access_history',
      orders: 'academy_orders',
      resource_access: 'academy_resource_access',
      notifications: 'academy_notifications',
      notification_reads: 'academy_notification_reads',
      support_tickets: 'academy_support_tickets',
      user_consents: 'academy_user_consents',
      course_instructors: 'academy_course_instructors',
      lesson_quizzes: 'academy_lesson_quizzes',
      module_exam_attempts: 'academy_module_exam_attempts'
    });

    const originalCreateClient = window.supabase.createClient.bind(window.supabase);

    window.supabase.createClient = function academyCreateClient(url, key, options) {
      const client = originalCreateClient(url, key, options);
      let sameProject = false;
      try { sameProject = new URL(String(url || '')).host === masterHost; } catch (_) {}
      if (!sameProject || !cfg.academyTableAdapter) return client;

      const originalFrom = client.from.bind(client);
      client.from = function academyFrom(name) {
        return originalFrom(tableMap[name] || name);
      };

      client.__academyTableMap = tableMap;
      return client;
    };

    window.__AG_ACADEMY_DATA_ADAPTER__ = { tableMap, masterHost };
  }

  async function start() {
    const crmAdminEmbed = new URLSearchParams(location.search).get('crm_admin') === '1';
    renderStatus('Academia AG', 'Preparando tu acceso…');
    try {
      const cfg = window.SUPABASE_CONFIG;
      const placeholder = !cfg?.url || !cfg?.publishableKey || cfg.url.includes('TU-PROYECTO') || cfg.publishableKey.includes('TU_SUPABASE');
      if (placeholder) {
        renderStatus('Estamos actualizando tu aula','La plataforma está terminando de preparar tu acceso. Intenta nuevamente en unos segundos.',true);
        return;
      }

      await loadSupabaseLibrary();
      installAcademyDataAdapter();
      await loadScript('app.js?v=20261011.65');
      await loadScript('utah-course-runtime.js?v=20260822.65');
      await loadScript('utah-module-exam-v2.js?v=20260820.48');
      await loadScript('utah-module2-exam-v2.js?v=20260820.49');
      await loadScript('utah-module3-exam-v2.js?v=20260820.50');
      await loadScript('utah-module4-exam-v2.js?v=20260820.51');
      await loadScript('utah-module5-exam-v2.js?v=20260820.52');
      await loadScript('utah-module6-exam-v2.js?v=20260821.53');
      await loadScript('utah-sequential-lock-v57.js?v=20260823.57');
      await loadScript('certificate-auto-pdf-v91.js?v=20260825.91');
      await loadScript('utah-clean-ui-v66.js?v=20260822.66');
      await loadScript('utah-student-flow-v70.js?v=20260823.70');
      await loadScript('utah-auditor-hotfix-v83.js?v=20260824.83');
      await loadScript('utah-c3-promo-force-v85.js?v=20260824.85');
      await loadScript('academy-student-polish-v71.js?v=20260823.71');
      await loadScript('academy-academic-polish-v72.js?v=20260823.72');
      await loadScript('utah-course-images-v67.js?v=20260822.67');
      await loadScript('utah-official-cover-v73.js?v=20260823.73');
      await loadScript('course-access-request-v75.js?v=20260823.75');
      await loadScript('student-home-catalog-v77.js?v=20260823.77');
      await loadScript('student-sales-discovery-v89.js?v=20260825.89');
      await loadScript('manual-cover-hotfix-v90.js?v=20260825.90');
      await loadScript('student-inline-access-v79.js?v=20260823.79');
      if (crmAdminEmbed) {
        await loadScript('admin-course-requests-v78.js?v=20260823.78');
        await loadScript('admin-course-request-delivery-v86.js?v=20260824.86');
        await loadScript('admin-access-queue-v92.js?v=20260828.92');
      }
      await loadScript('push-notifications-v80.js?v=20260823.80');
      await loadScript('academy-profile-support-mobile-v81.js?v=20260823.81');
      await loadScript('quiz-randomizer.js?v=20260824.83');
      await loadScript('premium-learning.js?v=20260817.12');
      await loadScript('sidebar-icons-premium.js?v=20260817.15');
      await loadScript('evaluaciones-premium.js?v=20260817.17');
      await loadScript('perfil-premium.js?v=20260817.20');
      await loadScript('calendario-premium.js?v=20260817.22');
      if (crmAdminEmbed) {
        await loadScript('admin-dashboard-ejecutivo.js?v=20260818.1');
        await loadScript('admin-dashboard-tabs.js?v=20260818.2');
        await loadScript('admin-import-link.js?v=20260818.5');
      }
      await loadScript('first-login-password.js?v=20260818.4');
      await loadScript('push-profile-panel-v81.js?v=20260824.81');
    } catch (error) {
      console.error('Error de inicio de Academia AG:', error);
      renderStatus('No pudimos abrir tu aula','Revisa tu conexión a internet y vuelve a intentarlo. Tu avance permanece guardado.',true);
    }
  }

  window.addEventListener('error', event => console.error('Error global:', event.error || event.message));
  window.addEventListener('unhandledrejection', event => console.error('Promesa rechazada:', event.reason));
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();
