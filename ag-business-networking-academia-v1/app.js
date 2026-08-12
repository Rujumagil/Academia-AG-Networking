const app = document.querySelector('#app');
const toast = document.querySelector('#toast');
const CONFIG = window.SUPABASE_CONFIG;

if (!window.supabase?.createClient || !CONFIG?.url || !CONFIG?.publishableKey) {
  app.innerHTML = `
    <main class="login-screen">
      <section class="login-card glass">
        <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
        <h1>Error de conexión</h1>
        <p>No se pudo iniciar Supabase.</p>
        <div class="bootstrap-actions">
          <a class="btn btn-primary" href="diagnostico.html">Abrir diagnóstico</a>
          <a class="btn btn-secondary" href="limpiar-cache.html">Limpiar caché</a>
        </div>
      </section>
    </main>`;
  throw new Error('Supabase configuration missing');
}

const db = window.supabase.createClient(CONFIG.url, CONFIG.publishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});

let deferredPrompt = null;
let notesTimer = null;
const WHATSAPP_NUMBER = String(CONFIG.whatsappNumber || '').replace(/\D/g, '');

function whatsappUrl(message = 'Hola, necesito información sobre Academia AG.') {
  return WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}` : '#help';
}

const state = {
  session: null,
  user: null,
  profile: null,
  courses: [],
  resources: [],
  progressRows: [],
  profiles: [],
  enrollments: [],
  workspaces: [],
  workspaceMembers: [],
  products: [],
  productContents: [],
  studentAccess: [],
  accessHistory: [],
  orders: [],
  resourceAccess: [],
  assessments: [],
  assessmentAttempts: [],
  supportTickets: [],
  consents: [],
  certificates: [],
  courseInstructors: [],
  notifications: [],
  notificationReads: [],
  activeWorkspaceId: null,
  recoveryMode: false,
  loading: true
};

const navItems = [
  ['home', '⌂', 'Inicio'],
  ['courses', '▤', 'Mis cursos'],
  ['evaluations', '✓', 'Evaluaciones'],
  ['resources', '▧', 'Mi biblioteca'],
  ['agenda', '◷', 'Calendario'],
  ['certificates', '◇', 'Certificados'],
  ['help', '?', 'Ayuda y soporte'],
  ['profile', '♡', 'Mi perfil']
];

const mobileNavItems = navItems.filter(([id]) =>
  ['home', 'courses', 'evaluations', 'resources', 'profile'].includes(id)
);

const PUBLIC_PROGRAMS = [
  {
    title: 'Utah Driver Success Program™',
    category: 'Vida en Utah',
    image: 'curso-utah-driver.webp',
    status: 'Disponible',
    description: 'Preparación guiada para conocer reglas de tránsito, señales, seguridad vial y avanzar con mayor confianza hacia tu licencia en Utah.',
    meta: 'Curso en línea · Manuales · Evaluaciones · Certificado',
    price: 'Consultar',
    salePrice: 'Inscripción abierta',
    paymentUrl: '#catalog/contact'
  },
  {
    title: 'Emprende en Utah',
    category: 'Negocios',
    image: 'curso-emprende-utah.webp',
    status: 'Próximamente',
    description: 'Bases prácticas para ordenar una idea de negocio, estructurar procesos y conectar con proveedores especializados.',
    meta: 'Emprendimiento · Operación · Networking'
  },
  {
    title: 'Finanzas para Emprendedores',
    category: 'Finanzas',
    image: 'curso-finanzas.webp',
    status: 'Próximamente',
    description: 'Herramientas sencillas para presupuesto, costos, control financiero y toma de decisiones.',
    meta: 'Finanzas básicas · Plantillas · Ejercicios'
  },
  {
    title: 'Marketing y Presencia Digital',
    category: 'Marketing',
    image: 'curso-marketing.webp',
    status: 'Próximamente',
    description: 'Construye una presencia profesional y aprende a comunicar mejor el valor de tu negocio.',
    meta: 'Marca · Contenido · Presencia digital'
  },
  {
    title: 'Inglés Práctico para la Vida y el Trabajo',
    category: 'Vida en Utah',
    image: 'curso-ingles.webp',
    status: 'Próximamente',
    description: 'Comunicación cotidiana y vocabulario útil para desenvolverte con mayor seguridad.',
    meta: 'Inglés práctico · Vida diaria · Trabajo'
  }
];

const ACADEMY_EVENTS = [
  {
    id: 'welcome',
    date: '2026-09-01T19:00:00-06:00',
    day: '01',
    month: 'SEP',
    title: 'Sesión de bienvenida · Academia AG',
    description: 'Recorrido por la plataforma, reglas académicas, soporte y recursos del alumno.',
    type: 'Orientación'
  },
  {
    id: 'webinar',
    date: '2026-09-05T19:00:00-06:00',
    day: '05',
    month: 'SEP',
    title: 'Sesión informativa · Utah Driver Success Program™',
    description: 'Encuentro de orientación para conocer la ruta del curso, evaluaciones y materiales de apoyo.',
    type: 'Evento en vivo'
  }
];

const HELP_TOPICS = [
  ['¿Cómo entro a un curso?', 'Crea tu cuenta con el correo registrado. Cuando un administrador active tu inscripción, el curso aparecerá en “Mis cursos”.'],
  ['¿Cómo funcionan las evaluaciones?', 'Las evaluaciones asignadas aparecen en “Evaluaciones”. El resultado se calcula de forma segura en el servidor y queda asociado a tu cuenta.'],
  ['¿Dónde encuentro mis manuales y recursos?', 'Abre “Mi biblioteca”. Los archivos privados se entregan mediante enlaces temporales para proteger el contenido.'],
  ['¿Cómo recupero mi contraseña?', 'Cierra tu sesión, selecciona “Olvidé mi contraseña” y revisa el enlace enviado a tu correo.'],
  ['¿Puedo usar la academia desde mi celular?', 'Sí. Academia AG es adaptable y puede instalarse como aplicación desde navegadores compatibles.'],
  ['¿Cómo obtengo mi certificado?', 'Completa las lecciones requeridas y, cuando el curso lo solicite, aprueba sus evaluaciones. El certificado aparecerá en “Certificados”.'],
  ['¿Cómo pido soporte?', 'Puedes crear un ticket desde el Centro de ayuda. Incluye tu nombre, correo y una descripción clara del problema.']
];

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  document.querySelectorAll('[data-install]').forEach(button => button.classList.remove('hide'));
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  showToast('Academia AG quedó instalada.');
});

function showToast(message, type = 'info') {
  toast.textContent = message;
  toast.dataset.type = type;
  toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
}

function repairTextEncoding(value = '') {
  const original = String(value ?? '');
  if (!/[ÃÂ]/.test(original)) return original;

  try {
    const characters = [...original];
    if (characters.every(char => char.codePointAt(0) <= 255)) {
      const bytes = Uint8Array.from(characters, char => char.codePointAt(0));
      const decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
      if (decoded && !decoded.includes('�')) return decoded;
    }
  } catch (error) {
    console.warn('No se pudo reparar la codificación del texto:', error);
  }

  return original
    .replaceAll('Ã¡', 'á')
    .replaceAll('Ã©', 'é')
    .replaceAll('Ã­', 'í')
    .replaceAll('Ã³', 'ó')
    .replaceAll('Ãº', 'ú')
    .replaceAll('Ã±', 'ñ')
    .replaceAll('Ã¼', 'ü')
    .replaceAll('Â¿', '¿')
    .replaceAll('Â¡', '¡')
    .replaceAll('Â', '');
}

function escapeHtml(value = '') {
  return repairTextEncoding(value).replace(/[&<>"']/g, char => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'
  })[char]);
}


function normalizeMediaUrl(value, fallback = 'curso-utah-driver.webp') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;

  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  // Compatible con registros anteriores guardados como assets/archivo.webp.
  return raw
    .replace(/^\.?\/?assets\//i, '')
    .replace(/^\.?\//, '');
}

function imageErrorFallback(event, fallback = 'curso-utah-driver.webp') {
  const image = event?.currentTarget;
  if (!image || image.dataset.fallbackApplied === 'true') return;
  image.dataset.fallbackApplied = 'true';
  image.src = fallback;
}

window.imageErrorFallback = imageErrorFallback;

function slugify(text = '') {
  return text
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function loadingScreen(message = 'Preparando tu aula...') {
  app.innerHTML = `
    <main class="login-screen">
      <section class="login-card glass loading-card">
        <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
        <div class="spinner"></div>
        <p>${escapeHtml(message)}</p>
      </section>
    </main>`;
}

async function init() {
  loadingScreen();
  const recoveryRequested =
    new URLSearchParams(location.search).get('type') === 'recovery'
    || new URLSearchParams(location.hash.replace(/^#/, '')).get('type') === 'recovery';
  state.recoveryMode = recoveryRequested;

  const { data, error } = await db.auth.getSession();
  if (error) console.error(error);

  state.session = data?.session || null;
  state.user = state.session?.user || null;

  db.auth.onAuthStateChange((event, session) => {
    state.session = session;
    state.user = session?.user || null;

    // Evita llamar a otras funciones de Supabase dentro del callback inmediato.
    setTimeout(async () => {
      if (event === 'PASSWORD_RECOVERY' || state.recoveryMode) {
        state.recoveryMode = true;
        renderPasswordUpdate();
        return;
      }

      if (session) {
        await loadApplicationData();
        route();
      } else {
        clearUserData();
        route();
      }
    }, 0);
  });

  if (state.session) {
    if (state.recoveryMode) {
      renderPasswordUpdate();
    } else {
      await loadApplicationData();
      route();
    }
  } else {
    route();
  }

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js?v=1.0.0', { updateViaCache: 'none' })
      .then(registration => registration.update())
      .catch(console.error);
  }
}

function clearUserData() {
  state.profile = null;
  state.courses = [];
  state.resources = [];
  state.progressRows = [];
  state.profiles = [];
  state.enrollments = [];
  state.workspaces = [];
  state.workspaceMembers = [];
  state.products = [];
  state.productContents = [];
  state.studentAccess = [];
  state.accessHistory = [];
  state.orders = [];
  state.resourceAccess = [];
  state.assessments = [];
  state.assessmentAttempts = [];
  state.supportTickets = [];
  state.consents = [];
  state.certificates = [];
  state.courseInstructors = [];
  state.notifications = [];
  state.notificationReads = [];
  state.activeWorkspaceId = null;
}

async function loadApplicationData() {
  if (!state.user) return;

  state.loading = true;

  const profileResult = await db
    .from('profiles')
    .select('*')
    .eq('id', state.user.id)
    .maybeSingle();

  if (profileResult.error) {
    console.error('Profile error:', profileResult.error);
    showToast('No se pudo cargar tu perfil.', 'error');
  }

  state.profile = profileResult.data || {
    id: state.user.id,
    email: state.user.email,
    full_name: state.user.user_metadata?.full_name || '',
    role: 'student'
  };

  state.workspaces = [];
  state.workspaceMembers = [];
  if (isAdmin() || isInstructor()) {
    const [workspacesResult, workspaceMembersResult] = await Promise.all([
      db.from('workspaces').select('*').order('name', { ascending: true }),
      db.from('workspace_members').select('*')
    ]);
    if (workspacesResult.error) console.error('Workspaces error:', workspacesResult.error);
    if (workspaceMembersResult.error) console.error('Workspace members error:', workspaceMembersResult.error);
    state.workspaces = workspacesResult.data || [];
    state.workspaceMembers = workspaceMembersResult.data || [];
  }

  const coursesResult = await db
    .from('courses')
    .select('*')
    .neq('status', 'archived')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: true });

  if (coursesResult.error) {
    console.error('Courses error:', coursesResult.error);
    showToast('No se pudieron cargar los cursos.', 'error');
  }

  const rawCourses = coursesResult.data || [];
  const courseIds = rawCourses.map(course => course.id);

  let modules = [];
  if (courseIds.length) {
    const modulesResult = await db
      .from('modules')
      .select('*')
      .in('course_id', courseIds)
      .order('position', { ascending: true });
    if (modulesResult.error) console.error('Modules error:', modulesResult.error);
    modules = modulesResult.data || [];
  }

  const moduleIds = modules.map(module => module.id);
  let lessons = [];
  if (moduleIds.length) {
    const lessonsResult = await db
      .from('lessons')
      .select('*')
      .in('module_id', moduleIds)
      .order('position', { ascending: true });
    if (lessonsResult.error) console.error('Lessons error:', lessonsResult.error);
    lessons = lessonsResult.data || [];
  }

  const progressResult = await db
    .from('lesson_progress')
    .select('*')
    .eq('user_id', state.user.id);

  if (progressResult.error) console.error('Progress error:', progressResult.error);
  state.progressRows = progressResult.data || [];

  state.courses = rawCourses.map(course => ({
    ...course,
    modules: modules
      .filter(module => module.course_id === course.id)
      .map(module => ({
        ...module,
        lessons: lessons.filter(lesson => lesson.module_id === module.id)
      }))
  }));

  const resourcesResult = await db
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false });

  if (resourcesResult.error) console.error('Resources error:', resourcesResult.error);
  state.resources = resourcesResult.data || [];

  const [assessmentsResult, attemptsResult, ticketsResult, consentsResult, certificatesResult, courseInstructorsResult, notificationsResult, notificationReadsResult] = await Promise.all([
    db.from('assessments').select('*').order('created_at', { ascending: true }),
    db.from('assessment_attempts').select('*').order('submitted_at', { ascending: false }),
    db.from('support_tickets').select('*').order('created_at', { ascending: false }),
    db.from('user_consents').select('*').order('accepted_at', { ascending: false }),
    db.from('certificates').select('*').order('issued_at', { ascending: false }),
    db.from('course_instructors').select('*').order('created_at', { ascending: true }),
    db.from('notifications').select('*').order('created_at', { ascending: false }),
    db.from('notification_reads').select('*').eq('user_id', state.user.id).order('read_at', { ascending: false })
  ]);
  if (assessmentsResult.error && !String(assessmentsResult.error.message || '').includes('does not exist')) console.error('Assessments error:', assessmentsResult.error);
  if (attemptsResult.error && !String(attemptsResult.error.message || '').includes('does not exist')) console.error('Assessment attempts error:', attemptsResult.error);
  if (ticketsResult.error && !String(ticketsResult.error.message || '').includes('does not exist')) console.error('Support tickets error:', ticketsResult.error);
  if (consentsResult.error && !String(consentsResult.error.message || '').includes('does not exist')) console.error('Consents error:', consentsResult.error);
  if (certificatesResult.error && !String(certificatesResult.error.message || '').includes('does not exist')) console.error('Certificates error:', certificatesResult.error);
  if (courseInstructorsResult.error && !String(courseInstructorsResult.error.message || '').includes('does not exist')) console.error('Course instructors error:', courseInstructorsResult.error);
  if (notificationsResult.error && !String(notificationsResult.error.message || '').includes('does not exist')) console.error('Notifications error:', notificationsResult.error);
  if (notificationReadsResult.error && !String(notificationReadsResult.error.message || '').includes('does not exist')) console.error('Notification reads error:', notificationReadsResult.error);
  state.assessments = assessmentsResult.data || [];
  state.assessmentAttempts = attemptsResult.data || [];
  state.supportTickets = ticketsResult.data || [];
  state.consents = consentsResult.data || [];
  state.certificates = certificatesResult.data || [];
  state.courseInstructors = courseInstructorsResult.data || [];
  state.notifications = notificationsResult.data || [];
  state.notificationReads = notificationReadsResult.data || [];

  if (state.profile?.account_status && state.profile.account_status !== 'active') {
    renderAccountRestricted(state.profile.account_status);
    state.loading = false;
    return;
  }

  if (isAdmin()) {
    const [
      profilesResult, enrollmentsResult, productsResult, productContentsResult,
      studentAccessResult, accessHistoryResult, ordersResult, resourceAccessResult
    ] = await Promise.all([
      db.from('profiles').select('*').order('created_at', { ascending: false }),
      db.from('enrollments').select('*').order('enrolled_at', { ascending: false }),
      db.from('products').select('*').order('created_at', { ascending: false }),
      db.from('product_contents').select('*').order('created_at', { ascending: true }),
      db.from('student_access').select('*').order('granted_at', { ascending: false }),
      db.from('access_history').select('*').order('created_at', { ascending: false }).limit(250),
      db.from('orders').select('*').order('created_at', { ascending: false }).limit(250),
      db.from('resource_access').select('*').order('granted_at', { ascending: false })
    ]);

    [
      ['Profiles', profilesResult], ['Enrollments', enrollmentsResult],
      ['Products', productsResult], ['Product contents', productContentsResult],
      ['Student access', studentAccessResult], ['Access history', accessHistoryResult],
      ['Orders', ordersResult], ['Resource access', resourceAccessResult]
    ].forEach(([label, result]) => {
      if (result.error) console.error(`${label} error:`, result.error);
    });

    state.profiles = profilesResult.data || [];
    state.enrollments = enrollmentsResult.data || [];
    state.products = productsResult.data || [];
    state.productContents = productContentsResult.data || [];
    state.studentAccess = studentAccessResult.data || [];
    state.accessHistory = accessHistoryResult.data || [];
    state.orders = ordersResult.data || [];
    state.resourceAccess = resourceAccessResult.data || [];
  }

  state.loading = false;
}

function renderAccountRestricted(status = 'suspended') {
  app.innerHTML = `
    <main class="login-screen">
      <section class="login-card glass auth-card">
        <div class="login-brand">
          <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
          <h1>Acceso temporalmente restringido</h1>
          <p>El estado actual de tu cuenta es: ${escapeHtml(status)}.</p>
        </div>
        <p>Contacta al equipo de soporte para revisar tu inscripción o el estado de tu cuenta.</p>
        <div class="bootstrap-actions">
          <a class="btn btn-primary" href="#help">Centro de ayuda</a>
          <button class="btn btn-secondary" id="restricted-signout" type="button">Cerrar sesión</button>
        </div>
      </section>
    </main>`;
  document.querySelector('#restricted-signout')?.addEventListener('click', async () => {
    await db.auth.signOut();
    renderAuth('login');
  });
}

function isAdmin() {
  return state.profile?.role === 'admin';
}

function isInstructor() {
  return state.profile?.role === 'instructor';
}

function canManageContent() {
  return isAdmin() || isInstructor();
}

function canManageCourseClient(course) {
  if (!course || !state.user) return false;
  if (isAdmin()) return true;
  if (!isInstructor()) return false;
  if (course.created_by === state.user.id) return true;
  if ((state.courseInstructors || []).some(item => item.course_id === course.id && item.user_id === state.user.id)) return true;
  return (state.workspaceMembers || []).some(item =>
    item.workspace_id === course.workspace_id
    && item.user_id === state.user.id
    && ['owner','admin'].includes(item.role)
  );
}

function displayName() {
  return state.profile?.full_name?.trim()
    || state.user?.user_metadata?.full_name
    || state.user?.email?.split('@')[0]
    || 'Alumno';
}

function avatarUrl() {
  return normalizeMediaUrl(state.profile?.avatar_url, 'icono-oficial.png');
}

function allLessons(course) {
  return course.modules.flatMap(module => module.lessons || []);
}

function isLessonCompleted(lessonId) {
  return state.progressRows.some(row => row.lesson_id === lessonId && row.completed);
}

function courseProgress(course) {
  const lessons = allLessons(course);
  if (!lessons.length) return 0;
  const completed = lessons.filter(lesson => isLessonCompleted(lesson.id)).length;
  return Math.round((completed / lessons.length) * 100);
}

function findCourse(id) {
  return state.courses.find(course => course.id === id || course.slug === id);
}

function findLesson(course, lessonId) {
  for (const module of course.modules) {
    const lesson = module.lessons.find(item => item.id === lessonId);
    if (lesson) return { lesson, module };
  }
  return null;
}

function firstIncompleteLesson(course) {
  const lessons = allLessons(course);
  return lessons.find(lesson => !isLessonCompleted(lesson.id)) || lessons[0] || null;
}

function cover(course) {
  return normalizeMediaUrl(course.cover_url, 'curso-utah-driver.webp');
}

const COURSE_MEDIA_BUCKET = 'course-media';
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_COVER_SIZE = 5 * 1024 * 1024;

function validateCoverImage(file) {
  if (!file || !file.size) return null;
  if (!IMAGE_TYPES.includes(file.type)) {
    throw new Error('La imagen debe estar en formato JPG, PNG o WebP.');
  }
  if (file.size > MAX_COVER_SIZE) {
    throw new Error('La imagen no debe superar los 5 MB.');
  }
  return file;
}

function mediaExtension(file) {
  if (file.type === 'image/png') return 'png';
  if (file.type === 'image/webp') return 'webp';
  return 'jpg';
}

async function uploadCourseMedia(file, folder, ownerId) {
  validateCoverImage(file);
  const path = `${folder}/${ownerId}/${Date.now()}-portada.${mediaExtension(file)}`;
  const { error } = await db.storage
    .from(COURSE_MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type, upsert: false });
  if (error) throw error;
  const { data } = db.storage.from(COURSE_MEDIA_BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

async function removeCourseMedia(path) {
  if (!path) return;
  const { error } = await db.storage.from(COURSE_MEDIA_BUCKET).remove([path]);
  if (error) throw error;
}

function sanitizeLessonHtml(value = '') {
  const template = document.createElement('template');
  template.innerHTML = String(value || '');
  const allowedTags = new Set(['H2', 'H3', 'H4', 'P', 'UL', 'OL', 'LI', 'STRONG', 'EM', 'BLOCKQUOTE', 'A', 'BR']);
  const elements = [...template.content.querySelectorAll('*')];

  elements.forEach(element => {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      return;
    }

    [...element.attributes].forEach(attribute => {
      const name = attribute.name.toLowerCase();
      if (element.tagName === 'A' && name === 'href') {
        const href = attribute.value.trim();
        if (!/^(https?:|mailto:)/i.test(href)) element.removeAttribute(attribute.name);
        return;
      }
      if (element.tagName === 'A' && ['target', 'rel'].includes(name)) return;
      element.removeAttribute(attribute.name);
    });

    if (element.tagName === 'A' && element.hasAttribute('href')) {
      element.target = '_blank';
      element.rel = 'noopener noreferrer';
    }
  });

  return template.innerHTML;
}

function renderAuth(mode = 'login') {
  const signup = mode === 'signup';
  const recover = mode === 'recover';

  app.innerHTML = `
    <main class="login-screen auth-screen">
      <section class="auth-layout">
        <aside class="auth-story">
          <a class="auth-story-brand" href="${escapeHtml(CONFIG.publicSiteUrl || '#catalog')}">
            <img src="logo-texto-oficial.png" alt="AG Business Networking">
          </a>
          <span class="eyebrow">Academia y biblioteca digital</span>
          <h2>Aprende, avanza y construye nuevas oportunidades.</h2>
          <p>Cursos, manuales y herramientas prácticas para la vida, el trabajo y el crecimiento empresarial en Estados Unidos.</p>
          <div class="auth-benefits">
            <span>✓ Cursos y progreso en un solo lugar</span>
            <span>✓ Biblioteca privada para manuales y recursos</span>
            <span>✓ Acceso desde computadora o celular</span>
          </div>
          <div class="auth-story-actions">
            <a class="btn btn-primary" href="#catalog">Explorar programas</a>
            <a class="btn btn-secondary" href="${escapeHtml(CONFIG.publicSiteUrl || '#catalog')}" target="_blank" rel="noopener">Conocer AG Business Networking</a>
          </div>
        </aside>

        <section class="login-card glass auth-card">
        <div class="login-brand">
          <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
          <h1>${recover ? 'Recupera tu acceso' : signup ? 'Crea tu cuenta' : 'Bienvenido de nuevo'}</h1>
          <p>${recover ? 'Te enviaremos un enlace seguro.' : signup ? 'Comienza tu recorrido en Academia AG.' : 'Continúa tu formación desde donde te quedaste.'}</p>
        </div>

        ${recover ? `
          <form id="recover-form">
            <div class="field">
              <label for="recover-email">Correo electrónico</label>
              <input id="recover-email" name="email" type="email" placeholder="tu-correo@ejemplo.com" required>
            </div>
            <button class="btn btn-primary" type="submit">Enviar enlace de recuperación</button>
          </form>
          <button class="auth-link" type="button" data-mode="login">← Regresar al acceso</button>
        ` : `
          <form id="auth-form">
            ${signup ? `
              <div class="field">
                <label for="full-name">Nombre completo</label>
                <input id="full-name" name="fullName" autocomplete="name" required>
              </div>
            ` : ''}
            <div class="field">
              <label for="email">Correo electrónico</label>
              <input id="email" name="email" type="email" autocomplete="email" required>
            </div>
            <div class="field">
              <label for="password">Contraseña</label>
              <div class="password-control">
                <input id="password" name="password" type="password" minlength="8" autocomplete="${signup ? 'new-password' : 'current-password'}" required>
                <button type="button" data-toggle-password aria-label="Mostrar contraseña">Ver</button>
              </div>
            </div>
            ${signup ? `
              <div class="field">
                <label for="confirm-password">Confirmar contraseña</label>
                <input id="confirm-password" name="confirmPassword" type="password" minlength="8" autocomplete="new-password" required>
              </div>
              <label class="legal-check">
                <input name="legalAcceptance" type="checkbox" required>
                <span>Acepto el <a href="#legal/privacidad">aviso de privacidad</a>, los <a href="#legal/terminos">términos de uso</a> y la <a href="#legal/reembolsos">política de cancelación y reembolso</a>.</span>
              </label>
            ` : '<label class="remember-check"><input type="checkbox" checked><span>Mantener mi sesión en este dispositivo</span></label>'}
            <button class="btn btn-primary" type="submit">${signup ? 'Crear mi cuenta' : 'Entrar al aula'}</button>
          </form>

          <div class="auth-options">
            <button class="auth-link" type="button" data-mode="${signup ? 'login' : 'signup'}">
              ${signup ? 'Ya tengo cuenta' : 'Crear una cuenta'}
            </button>
            ${signup ? '' : '<button class="auth-link" type="button" data-mode="recover">Olvidé mi contraseña</button>'}
          </div>

          ${signup ? '<div class="demo-note">Después de registrarte, tu cuenta quedará lista para que un administrador active los cursos correspondientes.</div>' : ''}
        `}
        </section>
      </section>
    </main>`;

  document.querySelectorAll('[data-mode]').forEach(button => {
    button.addEventListener('click', () => renderAuth(button.dataset.mode));
  });
  document.querySelector('[data-toggle-password]')?.addEventListener('click', event => {
    const input = document.querySelector('#password');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    event.currentTarget.textContent = show ? 'Ocultar' : 'Ver';
    event.currentTarget.setAttribute('aria-label', show ? 'Ocultar contraseña' : 'Mostrar contraseña');
  });

  if (recover) {
    document.querySelector('#recover-form').addEventListener('submit', handleRecovery);
  } else {
    document.querySelector('#auth-form').addEventListener('submit', event => handleAuth(event, signup));
  }
}

function renderPasswordUpdate() {
  app.innerHTML = `
    <main class="login-screen">
      <section class="login-card glass auth-card">
        <div class="login-brand">
          <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
          <h1>Crear nueva contraseña</h1>
          <p>Elige una contraseña segura para volver al aula.</p>
        </div>
        <form id="password-update-form">
          <div class="field">
            <label for="new-password">Nueva contraseña</label>
            <input id="new-password" name="password" type="password" minlength="8" autocomplete="new-password" required>
          </div>
          <div class="field">
            <label for="new-password-confirmation">Confirmar contraseña</label>
            <input id="new-password-confirmation" name="confirmation" type="password" minlength="8" autocomplete="new-password" required>
          </div>
          <button class="btn btn-primary" type="submit">Guardar contraseña</button>
        </form>
      </section>
    </main>`;

  document.querySelector('#password-update-form').addEventListener('submit', handlePasswordUpdate);
}

async function handlePasswordUpdate(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const password = String(form.get('password'));
  const confirmation = String(form.get('confirmation'));

  if (password !== confirmation) {
    showToast('Las contraseñas no coinciden.', 'error');
    return;
  }

  setFormBusy(event.currentTarget, true);
  const { error } = await db.auth.updateUser({ password });
  setFormBusy(event.currentTarget, false);

  if (error) {
    showToast(translateAuthError(error.message), 'error');
    return;
  }

  state.recoveryMode = false;
  showToast('Contraseña actualizada. Inicia sesión nuevamente.', 'success');
  await db.auth.signOut();
  renderAuth('login');
}

async function handleAuth(event, signup) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const email = String(form.get('email')).trim();
  const password = String(form.get('password'));

  setFormBusy(event.currentTarget, true);

  try {
    if (signup) {
      const fullName = String(form.get('fullName')).trim();
      if (password !== String(form.get('confirmPassword'))) {
        throw new Error('Las contraseñas no coinciden.');
      }
      const { data, error } = await db.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            legal_version: CONFIG.legalVersion || '2026-08',
            legal_accepted_at: new Date().toISOString(),
            privacy_accepted: true,
            terms_accepted: true,
            refund_policy_accepted: true
          },
          emailRedirectTo: `${location.origin}${location.pathname}`
        }
      });

      if (error) throw error;

      if (!data.session) {
        showToast('Revisa tu correo para confirmar la cuenta.', 'success');
        renderAuth('login');
      } else {
        showToast('Cuenta creada correctamente.', 'success');
      }
    } else {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showToast('Bienvenido a Academia AG.', 'success');
    }
  } catch (error) {
    console.error(error);
    showToast(translateAuthError(error.message), 'error');
  } finally {
    setFormBusy(event.currentTarget, false);
  }
}

async function handleRecovery(event) {
  event.preventDefault();
  const email = new FormData(event.currentTarget).get('email');
  setFormBusy(event.currentTarget, true);

  try {
    const { error } = await db.auth.resetPasswordForEmail(email, {
      redirectTo: `${location.origin}${location.pathname}`
    });
    if (error) throw error;
    showToast('Te enviamos un enlace de recuperación.', 'success');
    renderAuth('login');
  } catch (error) {
    showToast(translateAuthError(error.message), 'error');
  } finally {
    setFormBusy(event.currentTarget, false);
  }
}

function setFormBusy(form, busy) {
  const button = form?.querySelector('button[type="submit"]');
  if (!button) return;
  button.disabled = busy;
  button.dataset.originalText ||= button.textContent;
  button.textContent = busy ? 'Procesando...' : button.dataset.originalText;
}

function translateAuthError(message = '') {
  const text = message.toLowerCase();
  if (text.includes('invalid login credentials')) return 'El correo o la contraseña no son correctos.';
  if (text.includes('email not confirmed')) return 'Debes confirmar tu correo antes de entrar.';
  if (text.includes('user already registered')) return 'Este correo ya tiene una cuenta.';
  if (text.includes('password should be')) return 'La contraseña debe tener al menos ocho caracteres.';
  if (text.includes('contraseñas no coinciden')) return 'Las contraseñas no coinciden.';
  if (text.includes('rate limit')) return 'Espera un momento antes de volver a intentarlo.';
  return message || 'Ocurrió un problema. Intenta nuevamente.';
}

function publicProgramCard(program) {
  const available = program.status === 'Disponible';
  return `
    <article class="catalog-card">
      <div class="catalog-card-media">
        <img src="${escapeHtml(program.image)}" alt="${escapeHtml(program.title)}" onerror="imageErrorFallback(event)">
        <span class="status-pill ${available ? 'available' : ''}">${escapeHtml(program.status)}</span>
      </div>
      <div class="catalog-card-body">
        <span class="eyebrow">${escapeHtml(program.category)}</span>
        <h3>${escapeHtml(program.title)}</h3>
        <p>${escapeHtml(program.description)}</p>
        <small>${escapeHtml(program.meta)}</small>
        ${available ? `
          <div class="catalog-price"><span><strong>${escapeHtml(program.salePrice || 'Inscripción disponible')}</strong></span><small>${escapeHtml(program.price || '')}</small></div>
          <div class="catalog-actions">
            <a class="btn btn-primary" href="#catalog/contact">Solicitar inscripción</a>
            <button class="btn btn-secondary" type="button" data-public-signup>Crear cuenta</button>
          </div>
          ${WHATSAPP_NUMBER ? `<a class="catalog-whatsapp" href="${escapeHtml(whatsappUrl(`Hola, quiero información sobre ${program.title} en Academia AG.`))}" target="_blank" rel="noopener">Preguntar por WhatsApp</a>` : ''}
        ` : '<div class="coming-note">Estamos preparando esta experiencia.</div>'}
      </div>
    </article>`;
}

function renderPublicCatalog(section = '') {
  app.innerHTML = `
    <div class="public-shell">
      <header class="public-header">
        <a class="public-brand" href="#catalog"><img src="logo-texto-oficial.png" alt="AG Business Networking"></a>
        <nav>
          <a href="#catalog/programs">Programas</a>
          <a href="#catalog/benefits">Beneficios</a>
          <a href="#catalog/contact">Inscripciones</a>
          <a href="#legal/privacidad">Privacidad</a>
        </nav>
        <button class="btn btn-primary" type="button" data-public-login>Entrar a la academia</button>
      </header>

      <main>
        <section class="catalog-hero">
          <div class="catalog-hero-copy">
            <span class="eyebrow">Academia AG Business Networking</span>
            <h1>Formación práctica para avanzar en Estados Unidos.</h1>
            <p>Una plataforma de aprendizaje para personas, emprendedores y pequeños negocios que buscan herramientas claras, acompañamiento humano y conexiones confiables.</p>
            <div class="hero-actions">
              <a class="btn btn-primary" href="#catalog/programs">Explorar programas</a>
              <button class="btn btn-secondary" type="button" data-public-signup>Crear mi cuenta</button>
            </div>
            <div class="catalog-trust">
              <span><strong>100%</strong> Acceso privado</span>
              <span><strong>3 ROLES</strong> Alumno · Instructor · Admin</span>
              <span><strong>PWA</strong> Computadora y celular</span>
            </div>
          </div>
          <div class="catalog-hero-visual">
            <img src="hero-academia.webp" alt="Academia AG Business Networking">
            <div class="floating-event">
              <span>Tu espacio de formación</span>
              <strong>Cursos, evaluaciones, biblioteca y certificados</strong>
              <small>Sueña, conéctate y triunfa.</small>
            </div>
          </div>
        </section>

        <section class="public-section" id="programs">
          <div class="public-section-heading">
            <div><span class="eyebrow">Aprendizaje aplicable</span><h2>Programas de Academia AG</h2></div>
            <p>Rutas pensadas para la vida cotidiana, el trabajo y el crecimiento empresarial en Utah y Estados Unidos.</p>
          </div>
          <div class="catalog-filters">
            ${['Todos', 'Vida en Utah', 'Negocios', 'Finanzas', 'Marketing'].map((label, index) => `<button class="${index === 0 ? 'active' : ''}" data-public-filter="${label}">${label}</button>`).join('')}
          </div>
          <section class="catalog-grid" id="public-program-grid">${PUBLIC_PROGRAMS.map(publicProgramCard).join('')}</section>
        </section>

        <section class="public-book-section" id="benefits">
          <img src="recurso-manual-ag.webp" alt="Manual del alumno de Academia AG">
          <div>
            <span class="eyebrow">Una academia organizada</span>
            <h2>Todo el recorrido del alumno en un solo lugar</h2>
            <p>La plataforma integra formación, materiales privados, seguimiento y soporte para que cada alumno sepa qué debe hacer y qué ha completado.</p>
            <ul>
              <li>Registro, recuperación de contraseña y perfil personal</li>
              <li>Cursos, módulos, lecciones, notas y progreso sincronizado</li>
              <li>Evaluaciones con intentos y calificación protegida en servidor</li>
              <li>Biblioteca privada, calendario, notificaciones y certificados</li>
              <li>Centro de ayuda, tickets y documentos legales</li>
            </ul>
            <button class="btn btn-primary" type="button" data-public-signup>Crear cuenta de alumno</button>
          </div>
        </section>

        <section class="instructor-section">
          <div><img src="icono-oficial.png" alt="AG Business Networking"></div>
          <article>
            <span class="eyebrow">Equipo académico</span>
            <h2>AG Business Networking</h2>
            <p>La academia está preparada para integrar distintos instructores, asignarles cursos específicos y mantener separados los permisos de administración, contenido y aprendizaje.</p>
            <p class="instructor-future">Cada instructor administra únicamente el contenido autorizado; el administrador conserva control de usuarios, accesos, productos y operación general.</p>
          </article>
        </section>

        <section class="public-section" id="contact">
          <div class="public-section-heading"><div><span class="eyebrow">Inscripciones</span><h2>Solicita acceso a un programa</h2></div><p>Crea tu cuenta y el equipo de AG Business Networking podrá asignarte el curso o producto correspondiente.</p></div>
          <div class="catalog-actions">
            <button class="btn btn-primary" type="button" data-public-signup>Crear mi cuenta</button>
            ${WHATSAPP_NUMBER ? `<a class="btn btn-secondary" href="${whatsappUrl('Hola, quiero información para inscribirme en Academia AG.')}" target="_blank" rel="noopener">Hablar por WhatsApp</a>` : '<a class="btn btn-secondary" href="#legal/terminos">Consultar reglas de acceso</a>'}
          </div>
        </section>
      </main>

      <footer class="public-footer">
        <img src="logo-texto-oficial.png" alt="AG Business Networking">
        <p>Sueña, conéctate y triunfa.</p>
        <div><a href="#verify">Verificar constancia</a><a href="#legal/privacidad">Privacidad</a><a href="#legal/terminos">Términos</a><a href="#legal/reembolsos">Reembolsos</a></div>
      </footer>
    </div>`;

  document.querySelectorAll('[data-public-login]').forEach(button => button.addEventListener('click', () => renderAuth('login')));
  document.querySelectorAll('[data-public-signup]').forEach(button => button.addEventListener('click', () => renderAuth('signup')));
  document.querySelectorAll('[data-public-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-public-filter]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      const category = button.dataset.publicFilter;
      const programs = category === 'Todos' ? PUBLIC_PROGRAMS : PUBLIC_PROGRAMS.filter(program => program.category === category);
      document.querySelector('#public-program-grid').innerHTML = programs.map(publicProgramCard).join('');
      document.querySelectorAll('#public-program-grid [data-public-signup]').forEach(item => item.addEventListener('click', () => renderAuth('signup')));
    });
  });
  if (section) requestAnimationFrame(() => document.querySelector(`#${section}`)?.scrollIntoView({ behavior: 'smooth' }));
}

async function route() {
  const hash = location.hash.replace('#','') || (state.session ? 'home' : 'catalog');
  const [page, id, lessonId] = hash.split('/');

  if (!state.session) {
    if (page === 'catalog') return renderPublicCatalog(id);
    if (page === 'verify') return renderCertificateVerification(id ? decodeURIComponent(id) : '');
    if (page === 'legal') return renderLegal(id || 'centro');
    return renderAuth();
  }

  if (state.profile?.account_status && state.profile.account_status !== 'active') {
    return renderAccountRestricted(state.profile.account_status);
  }

  renderShell(page);

  if (page === 'home') renderHome();
  else if (page === 'catalog') renderPublicCatalog(id);
  else if (page === 'courses') renderCourses();
  else if (page === 'evaluations') renderEvaluations();
  else if (page === 'evaluation') await renderEvaluation(id);
  else if (page === 'resources') renderResources();
  else if (page === 'agenda') renderAgenda();
  else if (page === 'progress') renderProgress();
  else if (page === 'help') renderHelp();
  else if (page === 'legal') renderLegal(id || 'centro');
  else if (page === 'verify') renderCertificateVerification(id ? decodeURIComponent(id) : '');
  else if (page === 'notifications') renderNotifications();
  else if (page === 'certificates') renderCertificates();
  else if (page === 'certificate') await renderCertificate(id);
  else if (page === 'search') renderSearch(decodeURIComponent(id || ''));
  else if (page === 'profile') renderProfile();
  else if (page === 'course') renderCourse(id);
  else if (page === 'lesson') await renderLesson(id, lessonId);
  else if (page === 'builder' && canManageContent()) await renderBlockBuilder(id, lessonId);
  else if (page === 'workspace' && canManageContent()) {
    state.activeWorkspaceId = id || null;
    renderAdmin();
  }
  else if (page === 'admin' && canManageContent()) {
    state.activeWorkspaceId = null;
    renderAdmin();
  }
  else renderHome();
}

function safeNotificationHref(value = '') {
  const href = String(value || '').trim();
  return href.startsWith('#') ? href : '#notifications';
}

function notificationMeta(type = 'general') {
  return ({
    course: ['▤', 'Curso'],
    event: ['◷', 'Evento'],
    account: ['⌾', 'Cuenta'],
    support: ['?', 'Soporte'],
    certificate: ['◇', 'Certificado'],
    general: ['◆', 'Aviso']
  })[type] || ['◆', 'Aviso'];
}

function userVisibleNotifications() {
  return (state.notifications || []).filter(item => !item.target_user || item.target_user === state.user?.id);
}

function unreadNotificationCount() {
  const read = new Set((state.notificationReads || []).map(item => item.notification_id));
  return userVisibleNotifications().filter(item => !read.has(item.id)).length;
}

async function markNotificationsRead() {
  const unread = unreadNotificationCount();
  if (!unread) return;
  try {
    const { error } = await db.rpc('mark_my_notifications_read');
    if (error) throw error;
    state.notificationReads = userVisibleNotifications().map(item => ({
      notification_id: item.id,
      user_id: state.user.id,
      read_at: new Date().toISOString()
    }));
    document.querySelector('.notification-count')?.remove();
  } catch (error) {
    if (!String(error?.message || '').includes('does not exist')) console.error('Mark notifications error:', error);
  }
}

function renderShell(active) {
  const activeNav = ['course', 'lesson'].includes(active)
  ? 'courses'
  : active === 'evaluation'
    ? 'evaluations'
    : ['builder', 'workspace'].includes(active)
      ? 'admin'
      : ['certificate', 'certificates'].includes(active)
        ? 'certificates'
        : ['legal','verify'].includes(active) ? 'help' : active;
  app.innerHTML = `
    <div class="app-shell">
      <aside class="sidebar">
        <a class="brand" href="#home">
          <img src="icono-oficial.png" alt="Icono AG Business Networking">
          <span><strong>Academia AG</strong><span>Sueña, conéctate y triunfa</span></span>
        </a>

        <span class="sidebar-label">MI ESPACIO</span>
        <nav class="sidebar-nav">
          ${navItems.map(([id, icon, label]) => `
            <a class="nav-link ${activeNav === id ? 'active' : ''}" href="#${id}">
              <span class="nav-icon">${icon}</span>
              ${label}
            </a>`).join('')}

          <a class="nav-link nav-link-secondary ${activeNav === 'catalog' ? 'active' : ''}" href="#catalog">
            <span class="nav-icon">＋</span>
            Explorar cursos
          </a>

          ${canManageContent() ? `
            <a class="nav-link admin-nav-link ${activeNav === 'admin' ? 'active' : ''}" href="#admin">
              <span class="nav-icon">⚙</span>
              ${isAdmin() ? 'Administrar' : 'Mis contenidos'}
            </a>` : ''}
        </nav>

        <div class="sidebar-bottom">
          <a class="user-mini" href="#profile">
            <img src="${escapeHtml(avatarUrl())}" alt="" onerror="imageErrorFallback(event, 'icono-oficial.png')">
            <span><strong>${escapeHtml(displayName())}</strong><span>${isAdmin() ? 'Administrador' : isInstructor() ? 'Instructor' : 'Alumno'}</span></span>
          </a>
        </div>
      </aside>

      <section class="main-area">
        <header class="topbar">
          <div class="topbar-heading">
            <small>AG BUSINESS NETWORKING</small>
            <strong>${escapeHtml(navItems.find(([id]) => id === activeNav)?.[2] || (activeNav === 'admin' ? 'Administración' : 'Mi espacio'))}</strong>
          </div>
          <div class="search-box"><input id="global-search" aria-label="Buscar en el aula" placeholder="Buscar cursos, lecciones, libros o ayuda"></div>
          <div class="top-actions">
            <button class="icon-button install-button hide" data-install title="Instalar">⇩</button>
            <a class="icon-button notification-button" href="#notifications" title="Notificaciones">♢${unreadNotificationCount() ? `<span class="notification-count">${unreadNotificationCount() > 9 ? '9+' : unreadNotificationCount()}</span>` : ''}</a>
            <a class="icon-button" href="#help" title="Centro de ayuda">?</a>
            <button class="icon-button" id="refresh-button" title="Actualizar">↻</button>
            <a class="top-avatar" href="#profile" title="Mi perfil"><img src="${escapeHtml(avatarUrl())}" alt=""></a>
          </div>
        </header>
        <main class="content"><div class="page" id="page"></div></main>
      </section>

      <nav class="mobile-nav">
        ${mobileNavItems.map(([id,icon,label]) => `
          <button class="${activeNav === id ? 'active' : ''}" onclick="location.hash='${id}'">
            <span>${icon}</span><span>${label}</span>
          </button>`).join('')}
      </nav>
    </div>`;

  document.querySelectorAll('[data-install]').forEach(button => {
    button.addEventListener('click', installApp);
    if (deferredPrompt) button.classList.remove('hide');
  });

  document.querySelector('#refresh-button')?.addEventListener('click', async () => {
    showToast('Actualizando información...');
    await loadApplicationData();
    route();
  });

  document.querySelector('#global-search')?.addEventListener('keydown', event => {
    if (event.key !== 'Enter') return;
    const term = event.target.value.trim();
    if (!term) return;
    location.hash = `search/${encodeURIComponent(term)}`;
  });
}

async function installApp() {
  if (!deferredPrompt) {
    showToast('En el menú del navegador selecciona “Agregar a pantalla de inicio”.');
    return;
  }
  deferredPrompt.prompt();
  await deferredPrompt.userChoice;
  deferredPrompt = null;
}

function emptyCoursesMessage() {
  return `
    <section class="empty-state glass">
      <img src="icono-oficial.png" alt="" class="empty-logo">
      <h2>${isAdmin() ? 'La base de datos todavía no tiene cursos' : 'Aún no tienes cursos asignados'}</h2>
      <p>${isAdmin()
        ? 'Ejecuta el archivo 03-datos-iniciales.sql en Supabase o crea un curso desde Administrar.'
        : 'Tu cuenta está activa. Un administrador debe asignarte un curso.'}</p>
      ${isAdmin() ? '<a class="btn btn-primary" href="#admin">Abrir administración</a>' : ''}
    </section>`;
}

function courseCard(course) {
  const progress = courseProgress(course);
  const lessons = allLessons(course).length;
  return `
    <a class="course-card" href="#course/${course.id}">
      <img src="${escapeHtml(cover(course))}" alt="${escapeHtml(course.title)}" onerror="imageErrorFallback(event)">
      <div class="card-content">
        <div class="card-badges">
          ${course.featured ? '<span class="badge">Destacado</span>' : ''}
          <span class="status-pill ${progress === 100 ? 'complete' : ''}">${progress === 100 ? 'Completado' : progress > 0 ? 'En progreso' : 'Disponible'}</span>
        </div>
        <h3>${escapeHtml(course.title)}</h3>
        <div class="card-meta"><span>${escapeHtml(course.category || 'Curso')} · ${lessons} lecciones</span><strong>${progress}%</strong></div>
        <div class="mini-progress"><span style="width:${progress}%"></span></div>
      </div>
    </a>`;
}

function daysUntil(dateValue) {
  const difference = new Date(dateValue).getTime() - Date.now();
  return Math.max(0, Math.ceil(difference / 86400000));
}

function renderHome() {
  const page = document.querySelector('#page');
  if (!state.courses.length) {
    page.innerHTML = emptyCoursesMessage();
    return;
  }

  const featured = state.courses.find(course => course.featured) || state.courses[0];
  const firstLesson = firstIncompleteLesson(featured);
  const progress = courseProgress(featured);

  const totalLessons = state.courses.reduce((sum, course) => sum + allLessons(course).length, 0);
  const completedLessons = state.progressRows.filter(row => row.completed).length;
  const bookCount = state.resources.filter(resource => resource.resource_type === 'book').length;
  const webinar = ACADEMY_EVENTS.find(event => event.id === 'webinar');

  page.innerHTML = `
    <section class="welcome-line welcome-professional">
      <div><span class="eyebrow">Tu espacio de aprendizaje</span><h1>Hola, ${escapeHtml(displayName().split(' ')[0])}</h1><p>Continúa construyendo con claridad, dirección y propósito.</p></div>
      <div class="welcome-date"><strong>${new Intl.DateTimeFormat('es-MX', { day: '2-digit' }).format(new Date())}</strong><span>${new Intl.DateTimeFormat('es-MX', { month: 'short', year: 'numeric' }).format(new Date()).toUpperCase()}</span></div>
    </section>

    <section class="dashboard-summary">
      <article><span>▤</span><div><strong>${state.courses.length}</strong><small>Cursos disponibles</small></div></article>
      <article><span>✓</span><div><strong>${completedLessons}/${totalLessons}</strong><small>Lecciones completadas</small></div></article>
      <article><span>▧</span><div><strong>${bookCount}</strong><small>Libros en tu biblioteca</small></div></article>
      <article><span>◷</span><div><strong>${daysUntil(webinar.date)} días</strong><small>Para el próximo evento</small></div></article>
    </section>

    <section class="home-layout">
      <section class="hero">
        <img src="${escapeHtml(cover(featured))}" alt="${escapeHtml(featured.title)}" onerror="imageErrorFallback(event)">
        <div class="hero-content">
          <span class="badge">Continúa aprendiendo</span>
          <h1>${escapeHtml(featured.title)}</h1>
          <p>${escapeHtml(featured.subtitle || featured.description || '')}</p>
          <div class="hero-actions">
            ${firstLesson
              ? `<a class="btn btn-primary" href="#lesson/${featured.id}/${firstLesson.id}">▶ Continuar curso</a>`
              : `<a class="btn btn-primary" href="#course/${featured.id}">Ver contenido</a>`}
            <a class="btn btn-secondary" href="#course/${featured.id}">Ver programa</a>
          </div>
          <div class="progress-line">
            <span>${progress}% completado</span>
            <div class="progress-track"><span style="width:${progress}%"></span></div>
          </div>
        </div>
      </section>

      <aside class="next-event-card">
        <span class="eyebrow">Próximo evento</span>
        <div class="event-date-block"><strong>${webinar.day}</strong><span>${webinar.month}</span></div>
        <h2>${escapeHtml(webinar.title)}</h2>
        <p>${escapeHtml(webinar.description)}</p>
        <div class="event-meta"><span>◷ 7:00 p. m.</span><span>⌖ En línea por Zoom</span></div>
        <a class="btn btn-secondary" href="#agenda">Ver agenda</a>
      </aside>
    </section>

    <div class="section-heading"><div><span class="eyebrow">Tu formación</span><h2>Continúa aprendiendo</h2></div><a class="text-link" href="#courses">Ver todos →</a></div>
    <section class="card-row">${state.courses.slice(0, 5).map(courseCard).join('')}</section>

    <section class="home-lower-grid">
      <article class="announcement-panel glass">
        <div class="section-heading"><h2>Novedades del aula</h2><a href="#notifications">Ver todas</a></div>
        <a href="#resources"><span>Biblioteca</span><strong>Tus manuales y recursos privados están disponibles en un solo lugar.</strong><small>Acceso protegido para cuentas autorizadas →</small></a>
        <a href="#agenda"><span>Evento en vivo</span><strong>Webinar del libro · 8 de agosto, 7:00 p. m.</strong><small>Consulta los detalles del encuentro →</small></a>
      </article>
      <article class="support-panel">
        <span class="eyebrow">¿Necesitas ayuda?</span>
        <h2>Estamos para acompañarte.</h2>
        <p>Encuentra respuestas sobre acceso, pagos, cursos y libros digitales.</p>
        <a class="btn btn-primary" href="#help">Abrir centro de ayuda</a>
      </article>
    </section>`;
}

function professionalCourseCard(course) {
  const progress = courseProgress(course);
  const lessons = allLessons(course);
  const completed = lessons.filter(lesson => isLessonCompleted(lesson.id)).length;
  const nextLesson = firstIncompleteLesson(course);
  const statusClass = progress === 100 ? 'complete' : progress > 0 ? 'progress' : 'new';
  const statusLabel = progress === 100 ? 'Finalizado' : progress > 0 ? 'En progreso' : 'No iniciado';
  const actionLabel = progress === 100 ? 'Repasar curso' : progress > 0 ? 'Continuar' : 'Comenzar curso';
  const actionUrl = nextLesson
    ? `#lesson/${course.id}/${nextLesson.id}`
    : `#course/${course.id}`;

  return `
    <article class="learning-course-card" data-course-progress="${progress}" data-course-category="${escapeHtml(course.category || '')}">
      <a class="learning-course-cover" href="#course/${course.id}" aria-label="Abrir ${escapeHtml(course.title)}">
        <img src="${escapeHtml(cover(course))}" alt="${escapeHtml(course.title)}" onerror="imageErrorFallback(event)">
        ${course.featured ? '<span class="learning-featured">Destacado</span>' : ''}
      </a>

      <div class="learning-course-body">
        <div class="learning-course-topline">
          <span class="course-status course-status-${statusClass}"><i></i>${statusLabel}</span>
          <span class="learning-course-category">${escapeHtml(course.category || 'Curso')}</span>
        </div>

        <div>
          <h3><a href="#course/${course.id}">${escapeHtml(course.title)}</a></h3>
          <p>${escapeHtml(course.subtitle || course.description || 'Continúa avanzando a tu propio ritmo.')}</p>
        </div>

        <div class="learning-progress-block">
          <div class="learning-progress-label"><span>Tu avance</span><strong>${progress}%</strong></div>
          <div class="learning-progress-track"><span style="width:${progress}%"></span></div>
        </div>

        <div class="learning-course-details">
          <span><small>Contenido</small><strong>${completed}/${lessons.length} lecciones</strong></span>
          ${course.duration_label ? `<span><small>Duración</small><strong>${escapeHtml(course.duration_label)}</strong></span>` : ''}
          <span><small>Siguiente paso</small><strong>${nextLesson ? escapeHtml(nextLesson.title) : progress === 100 ? 'Curso completado' : 'Ver programa'}</strong></span>
        </div>

        <div class="learning-course-actions">
          <a class="btn btn-primary learning-primary-action" href="${actionUrl}">${actionLabel}</a>
          <a class="learning-outline-action" href="#course/${course.id}">Ver contenido</a>
        </div>
      </div>
    </article>`;
}

function renderCourses() {
  const page = document.querySelector('#page');

  if (!state.courses.length) {
    page.innerHTML = emptyCoursesMessage();
    return;
  }

  const categories = [...new Set(state.courses.map(course => course.category).filter(Boolean))];
  const activeCourse = state.courses
    .filter(course => courseProgress(course) < 100)
    .sort((a, b) => courseProgress(b) - courseProgress(a))[0] || state.courses[0];
  const activeProgress = courseProgress(activeCourse);
  const activeNextLesson = firstIncompleteLesson(activeCourse);
  const completedCourses = state.courses.filter(course => courseProgress(course) === 100).length;
  const inProgressCourses = state.courses.filter(course => {
    const value = courseProgress(course);
    return value > 0 && value < 100;
  }).length;

  page.innerHTML = `
    <section class="courses-page-heading">
      <div>
        <span class="eyebrow">Tu formación</span>
        <h1 class="page-title">Mis cursos</h1>
        <p class="page-subtitle">Retoma tu aprendizaje, revisa tu avance y accede a todos los programas asignados a tu cuenta.</p>
      </div>
      <a class="btn btn-secondary" href="#catalog">Explorar nuevos cursos</a>
    </section>

    <section class="courses-overview">
      <article><span>▤</span><div><strong>${state.courses.length}</strong><small>Cursos disponibles</small></div></article>
      <article><span>◔</span><div><strong>${inProgressCourses}</strong><small>En progreso</small></div></article>
      <article><span>✓</span><div><strong>${completedCourses}</strong><small>Finalizados</small></div></article>
    </section>

    <section class="continue-learning-panel">
      <div class="continue-learning-image">
        <img src="${escapeHtml(cover(activeCourse))}" alt="${escapeHtml(activeCourse.title)}" onerror="imageErrorFallback(event)">
      </div>
      <div class="continue-learning-content">
        <span class="eyebrow">Continuar aprendiendo</span>
        <h2>${escapeHtml(activeCourse.title)}</h2>
        <p>${escapeHtml(activeCourse.subtitle || activeCourse.description || '')}</p>
        <div class="continue-progress-row">
          <div class="learning-progress-track"><span style="width:${activeProgress}%"></span></div>
          <strong>${activeProgress}%</strong>
        </div>
        <div class="continue-learning-actions">
          <a class="btn btn-primary" href="${activeNextLesson ? `#lesson/${activeCourse.id}/${activeNextLesson.id}` : `#course/${activeCourse.id}`}">${activeProgress > 0 ? 'Continuar curso' : 'Comenzar curso'}</a>
          <a class="btn btn-secondary" href="#course/${activeCourse.id}">Ver programa</a>
        </div>
      </div>
    </section>

    <section class="courses-list-heading">
      <div><span class="eyebrow">Biblioteca de aprendizaje</span><h2>Todos mis cursos</h2></div>
      <span id="course-result-count">${state.courses.length} ${state.courses.length === 1 ? 'curso' : 'cursos'}</span>
    </section>

    <div class="filters courses-filters">
      <button class="filter-button active" data-filter="all">Todos</button>
      <button class="filter-button" data-filter="progress">En progreso</button>
      <button class="filter-button" data-filter="new">No iniciados</button>
      <button class="filter-button" data-filter="complete">Finalizados</button>
      ${categories.map(category => `<button class="filter-button" data-filter="category:${escapeHtml(category)}">${escapeHtml(category)}</button>`).join('')}
    </div>

    <section class="learning-course-list" id="course-grid">${state.courses.map(professionalCourseCard).join('')}</section>`;

  document.querySelectorAll('[data-filter]').forEach(button => {
    button.addEventListener('click', () => {
      document.querySelectorAll('[data-filter]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');

      const filter = button.dataset.filter;
      let list = state.courses;

      if (filter === 'progress') list = list.filter(course => {
        const progress = courseProgress(course);
        return progress > 0 && progress < 100;
      });

      if (filter === 'new') list = list.filter(course => courseProgress(course) === 0);
      if (filter === 'complete') list = list.filter(course => courseProgress(course) === 100);
      if (filter.startsWith('category:')) {
        const category = filter.slice('category:'.length);
        list = list.filter(course => course.category === category);
      }

      document.querySelector('#course-result-count').textContent = `${list.length} ${list.length === 1 ? 'curso' : 'cursos'}`;
      document.querySelector('#course-grid').innerHTML = list.length
        ? list.map(professionalCourseCard).join('')
        : '<section class="empty-state glass courses-empty"><h2>No hay cursos en esta categoría.</h2><p>Prueba con otro filtro para ver tus programas disponibles.</p></section>';
    });
  });
}

function assessmentAttemptsFor(id) {
  return (state.assessmentAttempts || []).filter(row => row.assessment_id === id && (!row.user_id || row.user_id === state.user?.id || isAdmin()));
}

function renderEvaluations() {
  const page = document.querySelector('#page');
  const courseIds = new Set((state.courses || []).map(course => course.id));
  const items = (state.assessments || []).filter(item => courseIds.has(item.course_id) || canManageContent());
  page.innerHTML = `
    <section class="courses-page-heading">
      <div>
        <span class="eyebrow">Seguimiento académico</span>
        <h1 class="page-title">Evaluaciones</h1>
        <p class="page-subtitle">Consulta las evaluaciones asignadas, tus intentos y los resultados registrados en tu cuenta.</p>
      </div>
      <a class="btn btn-secondary" href="#help">¿Necesitas ayuda?</a>
    </section>
    <section class="evaluation-grid">
      ${items.length ? items.map(item => {
        const course = findCourse(item.course_id);
        const attempts = assessmentAttemptsFor(item.id).filter(row => row.user_id === state.user?.id);
        const passed = attempts.some(row => row.passed);
        const latest = attempts[0];
        return `<article class="evaluation-card glass">
          <div class="evaluation-card-top"><span class="status-pill ${passed ? 'complete' : ''}">${passed ? 'Aprobada' : latest ? 'Intentada' : 'Pendiente'}</span><small>${escapeHtml(course?.title || 'Curso')}</small></div>
          <h2>${escapeHtml(item.title)}</h2>
          <p>${escapeHtml(item.description || 'Evaluación del curso.')}</p>
          <div class="evaluation-meta">
            <span><small>Calificación mínima</small><strong>${Number(item.pass_score || 70)}%</strong></span>
            <span><small>Intentos</small><strong>${attempts.length}/${Number(item.max_attempts || 3)}</strong></span>
            <span><small>Último resultado</small><strong>${latest ? `${Math.round(Number(latest.percentage || 0))}%` : '—'}</strong></span>
          </div>
          <a class="btn btn-primary" href="#evaluation/${item.id}">${passed ? 'Revisar evaluación' : 'Comenzar evaluación'}</a>
        </article>`;
      }).join('') : `<section class="empty-state glass"><h2>No tienes evaluaciones pendientes.</h2><p>Cuando un curso incluya una evaluación, aparecerá aquí automáticamente.</p><a class="btn btn-secondary" href="#courses">Volver a mis cursos</a></section>`}
    </section>`;
}

async function renderEvaluation(id) {
  const page = document.querySelector('#page');
  const assessment = (state.assessments || []).find(item => item.id === id);
  if (!assessment) return renderEvaluations();
  page.innerHTML = `<section class="empty-state glass"><div class="spinner"></div><h2>Cargando evaluación…</h2></section>`;
  const { data, error } = await db.rpc('get_assessment_payload', { target_assessment: id });
  if (error) {
    page.innerHTML = `<section class="empty-state glass"><h2>No se pudo abrir la evaluación.</h2><p>${escapeHtml(error.message)}</p><a class="btn btn-secondary" href="#evaluations">Regresar</a></section>`;
    return;
  }
  const payload = data || {};
  const questions = payload.questions || [];
  const ownAttempts = assessmentAttemptsFor(id).filter(row => row.user_id === state.user?.id);
  const remaining = Math.max(0, Number(assessment.max_attempts || 3) - ownAttempts.length);
  page.innerHTML = `
    <a class="back-link" href="#evaluations">← Volver a evaluaciones</a>
    <section class="evaluation-heading glass">
      <span class="eyebrow">Evaluación académica</span>
      <h1>${escapeHtml(assessment.title)}</h1>
      <p>${escapeHtml(assessment.description || '')}</p>
      <div class="evaluation-meta">
        <span><small>Calificación mínima</small><strong>${Number(assessment.pass_score || 70)}%</strong></span>
        <span><small>Intentos disponibles</small><strong>${remaining}</strong></span>
        <span><small>Preguntas</small><strong>${questions.length}</strong></span>
      </div>
    </section>
    ${remaining <= 0 ? `<section class="empty-state glass"><h2>Ya utilizaste todos los intentos disponibles.</h2><p>Contacta a soporte si necesitas que el equipo académico revise tu caso.</p><a class="btn btn-secondary" href="#help">Contactar soporte</a></section>` : `
    <form id="assessment-form" class="assessment-form">
      ${questions.map((question, index) => `<fieldset class="assessment-question glass" data-question-id="${escapeHtml(question.id)}">
        <legend><span>${index + 1}</span>${escapeHtml(question.text)}</legend>
        <div class="assessment-options">
          ${(question.options || []).map(option => `<label><input type="radio" name="q-${escapeHtml(question.id)}" value="${escapeHtml(option.id)}" required><span>${escapeHtml(option.text)}</span></label>`).join('')}
        </div>
      </fieldset>`).join('')}
      <section class="assessment-submit glass"><div><strong>Antes de enviar</strong><p>Revisa tus respuestas. El resultado se registrará como un intento académico dentro de la plataforma.</p></div><button class="btn btn-primary" type="submit">Enviar evaluación</button></section>
    </form>`}`;
  document.querySelector('#assessment-form')?.addEventListener('submit', event => submitAssessment(event, id, questions));
}

async function submitAssessment(event, assessmentId, questions) {
  event.preventDefault();
  const form = event.currentTarget;
  const formData = new FormData(form);
  const answers = questions.map(question => ({ question_id: question.id, option_id: formData.get(`q-${question.id}`) })).filter(item => item.option_id);
  if (answers.length !== questions.length) return showToast('Responde todas las preguntas antes de enviar.', 'error');
  setFormBusy(form, true);
  const { data, error } = await db.rpc('submit_assessment', { target_assessment: assessmentId, submitted_answers: answers });
  setFormBusy(form, false);
  if (error) return showToast(error.message, 'error');
  const result = data || {};
  showToast(result.passed ? `Evaluación aprobada con ${Math.round(Number(result.percentage || 0))}%.` : `Resultado: ${Math.round(Number(result.percentage || 0))}%. Puedes volver a intentarlo si tienes intentos disponibles.`, result.passed ? 'success' : 'info');
  await loadApplicationData();
  renderEvaluations();
}

function renderCourse(id) {
  const course = findCourse(id);
  if (!course) return renderCourses();

  const page = document.querySelector('#page');
  const progress = courseProgress(course);

  page.innerHTML = `
    <a class="back-link" href="#courses">← Volver a mis cursos</a>

    <section class="course-head">
      <article class="course-cover">
        <img src="${escapeHtml(cover(course))}" alt="${escapeHtml(course.title)}" onerror="imageErrorFallback(event)">
        <div class="hero-content">
          <span class="badge">${escapeHtml(course.category || 'Curso')}</span>
          <h1>${escapeHtml(course.title)}</h1>
          <p>${escapeHtml(course.subtitle || course.description || '')}</p>
          <div class="course-facts">
            <span><small>Instructor</small><strong>${escapeHtml(course.instructor_name || 'Equipo AG Business Networking')}</strong></span>
            <span><small>Contenido</small><strong>${course.modules.length} módulos · ${allLessons(course).length} lecciones</strong></span>
            ${course.duration_label ? `<span><small>Duración</small><strong>${escapeHtml(course.duration_label)}</strong></span>` : ''}
          </div>
          <div class="progress-line">
            <span>${progress}% completado</span>
            <div class="progress-track"><span style="width:${progress}%"></span></div>
          </div>
        </div>
      </article>

      <aside class="module-panel glass">
        <h2>Contenido del curso</h2>
        ${course.modules.length ? course.modules.map((module, index) => moduleMarkup(course, module, index)).join('') : `
          <div class="empty-module"><p>Este curso todavía no tiene módulos publicados.</p></div>`}
      </aside>
    </section>`;
}

function moduleMarkup(course, module, index, activeLessonId = null) {
  return `
    <details class="module" ${index === 0 || module.lessons.some(item => item.id === activeLessonId) ? 'open' : ''}>
      <summary>
        <div><strong>Módulo ${index + 1}: ${escapeHtml(module.title)}</strong><span>${module.lessons.length} lecciones</span></div>
        <span>⌄</span>
      </summary>
      <div class="lesson-list">
        ${module.lessons.map(lesson => {
          const done = isLessonCompleted(lesson.id);
          return `
            <div class="lesson-item ${done ? 'completed' : ''}">
              <button type="button" data-complete="${lesson.id}">${done ? '✓' : '▶'}</button>
              <a href="#lesson/${course.id}/${lesson.id}">
                <strong>${escapeHtml(lesson.title)}</strong>
                <small>${lesson.lesson_type || 'Lección'}</small>
              </a>
              <small>${lesson.duration_minutes || 0} min</small>
            </div>`;
        }).join('')}
      </div>
    </details>`;
}

async function renderLesson(courseId, lessonId) {
  const course = findCourse(courseId);
  const found = course && findLesson(course, lessonId);
  if (!found) return renderCourse(courseId);

  const { lesson, module } = found;
  const page = document.querySelector('#page');
  const noteResult = await db
    .from('lesson_notes')
    .select('note')
    .eq('user_id', state.user.id)
    .eq('lesson_id', lesson.id)
    .maybeSingle();

  if (noteResult.error) console.error(noteResult.error);
  const note = noteResult.data?.note || '';

  const blocksResult = await db
    .from('lesson_blocks')
    .select('*')
    .eq('lesson_id', lesson.id)
    .order('position', { ascending: true });
  if (blocksResult.error && blocksResult.error.code !== '42P01') console.error('Blocks error:', blocksResult.error);
  const lessonBlocks = await hydrateLessonBlockMedia(blocksResult.data || []);

  page.innerHTML = `
    <a class="back-link" href="#course/${course.id}">← Volver al contenido</a>
    <span class="eyebrow">${escapeHtml(course.title)}</span>
    <h1 class="page-title">${escapeHtml(lesson.title)}</h1>
    <p class="page-subtitle">Módulo: ${escapeHtml(module.title)}</p>

    <section class="lesson-layout">
      <div>
        <div class="video-shell">
          ${lesson.video_url ? `
            <iframe
              class="lesson-frame"
              src="${escapeHtml(lesson.video_url)}"
              title="${escapeHtml(lesson.title)}"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen></iframe>
          ` : `
            <img src="${escapeHtml(cover(course))}" alt="" onerror="imageErrorFallback(event)">
            <div class="video-center"><button class="play-button" type="button" id="video-placeholder">▶</button></div>
            <div class="video-bar"><span>Video pendiente</span><div class="video-timeline"><span></span></div><span>⚙ ⛶</span></div>
          `}
        </div>

        ${lessonBlocks.length ? `<section class="student-block-stream">${lessonBlocks.map(renderStudentBlock).join('')}</section>` : ''}
        ${lesson.content_html ? `<article class="lesson-content glass">${sanitizeLessonHtml(lesson.content_html)}</article>` : ''}

        <div class="lesson-actions">
          <button class="action-card" id="complete-current">
            <strong>${isLessonCompleted(lesson.id) ? '✓ Lección completada' : '○ Marcar como completada'}</strong>
            <small>Guarda tu progreso en tu cuenta</small>
          </button>
          <button class="action-card" id="material-button" ${state.resources.some(resource => resource.course_id === course.id) ? '' : 'disabled'}>
            <strong>⇩ Abrir material</strong><small>${state.resources.some(resource => resource.course_id === course.id) ? 'Libro, guía o recurso del curso' : 'Material pendiente'}</small>
          </button>
          <button class="action-card" id="focus-notes">
            <strong>✎ Tomar notas</strong><small>Notas privadas</small>
          </button>
        </div>

        <textarea id="lesson-notes" class="notes" placeholder="Escribe aquí tus notas personales...">${escapeHtml(note)}</textarea>
        <small class="autosave-note">Tus notas se guardan automáticamente.</small>
      </div>

      <aside class="module-panel glass">
        <h2>Contenido del curso</h2>
        ${course.modules.map((item, index) => moduleMarkup(course, item, index, lesson.id)).join('')}
      </aside>
    </section>`;

  document.querySelectorAll('[data-complete]').forEach(button => {
    button.addEventListener('click', () => toggleLesson(button.dataset.complete));
  });

  document.querySelector('#complete-current').addEventListener('click', () => completeLesson(lesson.id, true));
  document.querySelector('#focus-notes').addEventListener('click', () => document.querySelector('#lesson-notes').focus());
  document.querySelector('#material-button').addEventListener('click', () => {
    const resource = state.resources.find(item => item.course_id === course.id);
    if (resource) openResource(resource.id);
  });
  document.querySelector('#video-placeholder')?.addEventListener('click', () => showToast('Agrega el enlace de video desde Supabase.'));

  document.querySelector('#lesson-notes').addEventListener('input', event => {
    clearTimeout(notesTimer);
    notesTimer = setTimeout(() => saveNote(lesson.id, event.target.value), 700);
  });

  document.querySelectorAll('[data-save-activity]').forEach(button => button.addEventListener('click', async () => {
    const blockId = button.dataset.saveActivity;
    const answer = document.querySelector(`[data-activity-block="${blockId}"]`)?.value || '';
    const { error } = await db.from('block_responses').upsert({ user_id: state.user.id, block_id: blockId, response: { text: answer }, updated_at: new Date().toISOString() }, { onConflict: 'user_id,block_id' });
    showToast(error ? 'No se pudo guardar la respuesta.' : 'Respuesta guardada.', error ? 'error' : 'success');
  }));
}

async function completeLesson(lessonId, completed) {
  const payload = {
    user_id: state.user.id,
    lesson_id: lessonId,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    updated_at: new Date().toISOString()
  };

  const { data, error } = await db
    .from('lesson_progress')
    .upsert(payload, { onConflict: 'user_id,lesson_id' })
    .select()
    .single();

  if (error) {
    console.error(error);
    showToast('No se pudo guardar el progreso.', 'error');
    return;
  }

  const index = state.progressRows.findIndex(row => row.lesson_id === lessonId);
  if (index >= 0) state.progressRows[index] = data;
  else state.progressRows.push(data);

  showToast(completed ? 'Lección completada.' : 'Lección marcada como pendiente.', 'success');
  route();
}

async function toggleLesson(lessonId) {
  await completeLesson(lessonId, !isLessonCompleted(lessonId));
}

async function saveNote(lessonId, note) {
  const { error } = await db
    .from('lesson_notes')
    .upsert({
      user_id: state.user.id,
      lesson_id: lessonId,
      note,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id,lesson_id' });

  if (error) {
    console.error(error);
    showToast('No se pudo guardar la nota.', 'error');
  } else {
    showToast('Nota guardada.', 'success');
  }
}

function renderProgress() {
  const page = document.querySelector('#page');
  const totalLessons = state.courses.reduce((sum, course) => sum + allLessons(course).length, 0);
  const completedLessons = state.progressRows.filter(row => row.completed).length;
  const completedCourses = state.courses.filter(course => courseProgress(course) === 100).length;

  page.innerHTML = `
    <span class="eyebrow">Tu recorrido</span>
    <h1 class="page-title">Mi progreso</h1>
    <p class="page-subtitle">Mide tu avance y continúa construyendo con dirección.</p>

    <section class="stats-grid">
      <article class="stat-card glass"><div class="stat-icon">◷</div><strong>${completedLessons * 15} min</strong><span>Tiempo estimado</span></article>
      <article class="stat-card glass"><div class="stat-icon">▤</div><strong>${state.courses.length}</strong><span>Cursos activos</span></article>
      <article class="stat-card glass"><div class="stat-icon">✓</div><strong>${completedLessons}/${totalLessons}</strong><span>Lecciones completadas</span></article>
      <article class="stat-card glass"><div class="stat-icon">★</div><strong>${completedCourses}</strong><span>Cursos terminados</span></article>
    </section>

    <section class="list-panel glass">
      <div class="section-heading"><h2>Avance por curso</h2></div>
      ${state.courses.length ? state.courses.map(course => {
        const progress = courseProgress(course);
        return `
          <div class="list-course">
            <img src="${escapeHtml(cover(course))}" alt="" onerror="imageErrorFallback(event)">
            <div><h3>${escapeHtml(course.title)}</h3><div class="mini-progress"><span style="width:${progress}%"></span></div><small>${progress}% completado</small></div>
            <a class="btn btn-primary" href="#course/${course.id}">Continuar</a>
          </div>`;
      }).join('') : '<p>No tienes cursos asignados.</p>'}
    </section>

    <section class="progress-certificate-banner">
      <div><span class="eyebrow">Reconoce tu recorrido</span><h2>Certificados de finalización</h2><p>Completa todas las lecciones para habilitar un certificado imprimible con tu nombre.</p></div>
      <a class="btn btn-primary" href="#certificates">Ver mis certificados</a>
    </section>`;
}

function resourceTypeLabel(type) {
  return ({
    book: 'Libro digital',
    pdf: 'Documento PDF',
    template: 'Plantilla',
    audio: 'Audio',
    video: 'Video',
    link: 'Enlace'
  })[type] || 'Recurso';
}

function libraryResourceGroup(resource) {
  return resource.resource_type === 'book' ? 'book' : 'material';
}

function resourceCardMarkup(resource) {
  const course = state.courses.find(item => item.id === resource.course_id);
  const isBook = resource.resource_type === 'book';
  const fallback = isBook ? 'curso-utah-driver.webp' : 'recurso-manual-ag.webp';
  const subtitle = course ? course.title : 'Recurso general de Academia AG';

  if (isBook) {
    return `
      <article class="library-book-card" data-resource-type="book" data-resource-title="${escapeHtml(`${resource.title} ${subtitle}`.toLowerCase())}">
        <button class="library-book-cover" type="button" data-resource-id="${escapeHtml(resource.id)}" aria-label="Abrir ${escapeHtml(resource.title)}">
          <img src="${escapeHtml(normalizeMediaUrl(resource.thumbnail_url, fallback))}" alt="Portada de ${escapeHtml(resource.title)}" onerror="imageErrorFallback(event, '${fallback}')">
          <span class="library-access-badge">En tu biblioteca</span>
          <span class="library-book-overlay">Leer ahora</span>
        </button>
        <div class="library-book-info">
          <span class="eyebrow">${escapeHtml(resourceTypeLabel(resource.resource_type))}</span>
          <h3>${escapeHtml(resource.title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
          <button class="library-text-action" type="button" data-resource-id="${escapeHtml(resource.id)}">Abrir libro <span>→</span></button>
        </div>
      </article>`;
  }

  return `
    <article class="library-material-card glass" data-resource-type="material" data-resource-title="${escapeHtml(`${resource.title} ${subtitle} ${resourceTypeLabel(resource.resource_type)}`.toLowerCase())}">
      <div class="library-material-thumb">
        <img src="${escapeHtml(normalizeMediaUrl(resource.thumbnail_url, fallback))}" alt="${escapeHtml(resource.title)}" onerror="imageErrorFallback(event, '${fallback}')">
        <span>${escapeHtml(resourceTypeLabel(resource.resource_type))}</span>
      </div>
      <div class="library-material-body">
        <div>
          <span class="eyebrow">Material de apoyo</span>
          <h3>${escapeHtml(resource.title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
        <button class="btn btn-secondary" type="button" data-resource-id="${escapeHtml(resource.id)}">Abrir recurso</button>
      </div>
    </article>`;
}

function bindResourceButtons() {
  document.querySelectorAll('[data-resource-id]').forEach(button => {
    button.addEventListener('click', () => openResource(button.dataset.resourceId));
  });
}

function renderResources() {
  const page = document.querySelector('#page');
  const books = state.resources.filter(resource => resource.resource_type === 'book');
  const materials = state.resources.filter(resource => resource.resource_type !== 'book');
  const featuredBook = books[0] || null;

  page.innerHTML = `
    <section class="library-page-heading">
      <div>
        <span class="eyebrow">Colección personal</span>
        <h1 class="page-title">Mi biblioteca</h1>
        <p class="page-subtitle">Encuentra los libros y materiales vinculados a tus cursos. Tu acceso es privado y exclusivo para tu cuenta.</p>
      </div>
      <div class="library-summary" aria-label="Resumen de biblioteca">
        <article><strong>${books.length}</strong><span>${books.length === 1 ? 'Libro' : 'Libros'}</span></article>
        <article><strong>${materials.length}</strong><span>${materials.length === 1 ? 'Material' : 'Materiales'}</span></article>
      </div>
    </section>

    <section class="library-toolbar glass">
      <label class="library-search">
        <span>⌕</span>
        <input id="library-search" type="search" placeholder="Buscar en mi biblioteca" autocomplete="off">
      </label>
      <div class="library-filter-tabs" role="group" aria-label="Filtrar biblioteca">
        <button class="library-filter active" type="button" data-resource-filter="all">Todo</button>
        <button class="library-filter" type="button" data-resource-filter="book">Libros</button>
        <button class="library-filter" type="button" data-resource-filter="material">Materiales</button>
      </div>
    </section>

    ${featuredBook ? `
      <section class="library-featured-book">
        <div class="library-featured-cover">
          <img src="${escapeHtml(normalizeMediaUrl(featuredBook.thumbnail_url, 'curso-utah-driver.webp'))}" alt="Portada de ${escapeHtml(featuredBook.title)}" onerror="imageErrorFallback(event, 'curso-utah-driver.webp')">
        </div>
        <div class="library-featured-content">
          <span class="eyebrow">Lectura destacada</span>
          <h2>${escapeHtml(featuredBook.title)}</h2>
          <p>Este libro forma parte de tu colección. Puedes abrirlo desde cualquier dispositivo mientras tu sesión esté activa.</p>
          <div class="library-featured-actions">
            <button class="btn btn-primary" type="button" data-resource-id="${escapeHtml(featuredBook.id)}">Leer ahora</button>
            <a class="btn btn-secondary" href="#help">Ayuda con mi acceso</a>
          </div>
          <small>El enlace de lectura es temporal para proteger tu contenido.</small>
        </div>
      </section>` : ''}

    <section class="library-content" id="library-content">
      ${books.length ? `
        <div class="library-section" data-library-section="book">
          <div class="section-heading library-section-heading">
            <div><span class="eyebrow">Tu estantería</span><h2>Libros digitales</h2></div>
            <span>${books.length} ${books.length === 1 ? 'título' : 'títulos'}</span>
          </div>
          <div class="library-books-grid">
            ${books.map(resourceCardMarkup).join('')}
          </div>
        </div>` : ''}

      ${materials.length ? `
        <div class="library-section" data-library-section="material">
          <div class="section-heading library-section-heading">
            <div><span class="eyebrow">Para seguir aprendiendo</span><h2>Materiales de apoyo</h2></div>
            <span>${materials.length} ${materials.length === 1 ? 'recurso' : 'recursos'}</span>
          </div>
          <div class="library-materials-grid">
            ${materials.map(resourceCardMarkup).join('')}
          </div>
        </div>` : ''}

      ${state.resources.length ? '' : `
        <section class="library-empty-state glass">
          <div class="library-empty-icon">▧</div>
          <span class="eyebrow">Tu colección está lista para crecer</span>
          <h2>Tu biblioteca aún está vacía</h2>
          <p>Los libros, manuales y recursos aparecerán aquí cuando sean asignados a tu cuenta.</p>
          <a class="btn btn-primary" href="#catalog">Explorar cursos</a>
        </section>`}

      <section class="library-no-results hide" id="library-no-results">
        <div class="library-empty-icon">⌕</div>
        <h2>No encontramos coincidencias</h2>
        <p>Prueba con otro título, curso o tipo de recurso.</p>
      </section>
    </section>

    <section class="library-security-note">
      <span>⌾</span>
      <div><strong>Biblioteca protegida</strong><p>Los archivos privados utilizan enlaces temporales y solo se abren para cuentas autorizadas.</p></div>
    </section>`;

  bindResourceButtons();

  const searchInput = document.querySelector('#library-search');
  const filterButtons = [...document.querySelectorAll('[data-resource-filter]')];
  let currentFilter = 'all';

  const applyLibraryFilters = () => {
    const query = (searchInput?.value || '').trim().toLowerCase();
    let visibleCards = 0;

    document.querySelectorAll('[data-resource-title]').forEach(card => {
      const typeMatches = currentFilter === 'all' || card.dataset.resourceType === currentFilter;
      const textMatches = !query || card.dataset.resourceTitle.includes(query);
      const visible = typeMatches && textMatches;
      card.classList.toggle('hide', !visible);
      if (visible) visibleCards += 1;
    });

    document.querySelectorAll('[data-library-section]').forEach(section => {
      const visibleInSection = section.querySelectorAll('[data-resource-title]:not(.hide)').length > 0;
      section.classList.toggle('hide', !visibleInSection);
    });

    document.querySelector('#library-no-results')?.classList.toggle('hide', visibleCards > 0 || state.resources.length === 0);
  };

  filterButtons.forEach(button => {
    button.addEventListener('click', () => {
      currentFilter = button.dataset.resourceFilter;
      filterButtons.forEach(item => item.classList.toggle('active', item === button));
      applyLibraryFilters();
    });
  });

  searchInput?.addEventListener('input', applyLibraryFilters);
}

async function openResource(resourceId) {
  const resource = state.resources.find(item => item.id === resourceId);
  if (!resource) {
    showToast('No encontramos este recurso.', 'error');
    return;
  }

  if (resource.external_url && /^https?:\/\//i.test(resource.external_url)) {
    window.open(resource.external_url, '_blank', 'noopener');
    return;
  }

  if (!resource.file_path) {
    showToast('Este recurso todavía no tiene un archivo disponible.', 'error');
    return;
  }

  showToast('Preparando acceso seguro...');
  const { data, error } = await db.storage
    .from('digital-products')
    .createSignedUrl(resource.file_path, 600);

  if (error || !data?.signedUrl) {
    console.error(error);
    showToast('No pudimos abrir el recurso. Revisa que tu acceso esté activo.', 'error');
    return;
  }

  window.open(data.signedUrl, '_blank', 'noopener');
}

function renderAgenda() {
  const page = document.querySelector('#page');
  const now = new Date();
  const sortedEvents = [...ACADEMY_EVENTS].sort((a, b) => new Date(a.date) - new Date(b.date));
  const upcomingEvents = sortedEvents.filter(event => new Date(event.date) >= now);
  const pastEvents = sortedEvents.filter(event => new Date(event.date) < now);
  const nextEvent = upcomingEvents[0] || null;

  const calendarBase = nextEvent ? new Date(nextEvent.date) : (sortedEvents[0] ? new Date(sortedEvents[0].date) : now);
  const calendarYear = calendarBase.getFullYear();
  const calendarMonth = calendarBase.getMonth();
  const monthName = calendarBase.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' });
  const firstWeekday = (new Date(calendarYear, calendarMonth, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
  const eventDays = new Set(
    sortedEvents
      .map(event => new Date(event.date))
      .filter(date => date.getFullYear() === calendarYear && date.getMonth() === calendarMonth)
      .map(date => date.getDate())
  );

  const formatEventDate = dateValue => {
    const date = new Date(dateValue);
    return {
      day: date.toLocaleDateString('es-MX', { day: '2-digit' }),
      month: date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '').toUpperCase(),
      full: date.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }),
      time: date.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit' })
    };
  };

  const renderEventCard = event => {
    const date = new Date(event.date);
    const dateInfo = formatEventDate(event.date);
    const past = date < now;

    return `
      <article class="calendar-event-card glass ${past ? 'is-past' : ''}" data-calendar-event="${past ? 'past' : 'upcoming'}">
        <div class="calendar-event-date">
          <strong>${dateInfo.day}</strong>
          <span>${dateInfo.month}</span>
        </div>

        <div class="calendar-event-content">
          <div class="calendar-event-topline">
            <span class="calendar-status ${past ? 'completed' : 'live'}">${escapeHtml(past ? 'Finalizado' : event.type)}</span>
            <span>${escapeHtml(dateInfo.time)} · Hora de Utah</span>
          </div>
          <h3>${escapeHtml(event.title)}</h3>
          <p>${escapeHtml(event.description)}</p>
          <div class="calendar-event-meta">
            <span>◷ 60 minutos</span>
            <span>⌖ En línea</span>
            <span>◉ Zoom</span>
          </div>
        </div>

        <div class="calendar-event-action">
          <small>${escapeHtml(dateInfo.full)}</small>
          <a class="btn ${past ? 'btn-secondary' : 'btn-primary'}" href="${whatsappUrl(`Hola, necesito ayuda con el acceso al evento: ${event.title}.`)}" target="_blank" rel="noopener">
            ${past ? 'Solicitar grabación' : 'Solicitar acceso'}
          </a>
        </div>
      </article>`;
  };

  page.innerHTML = `
    <section class="calendar-page-heading">
      <div>
        <span class="eyebrow">Mi calendario</span>
        <h1 class="page-title">Próximos encuentros</h1>
        <p class="page-subtitle">Consulta webinars, lanzamientos y sesiones disponibles dentro de tus programas.</p>
      </div>
      <div class="calendar-heading-summary">
        <article><strong>${upcomingEvents.length}</strong><span>Próximos</span></article>
        <article><strong>${pastEvents.length}</strong><span>Finalizados</span></article>
      </div>
    </section>

    ${nextEvent ? (() => {
      const info = formatEventDate(nextEvent.date);
      return `
        <section class="calendar-featured-event">
          <div class="calendar-featured-copy">
            <span class="eyebrow">Siguiente evento</span>
            <h2>${escapeHtml(nextEvent.title)}</h2>
            <p>${escapeHtml(nextEvent.description)}</p>
            <div class="calendar-featured-meta">
              <span>▣ ${escapeHtml(info.full)}</span>
              <span>◷ ${escapeHtml(info.time)}</span>
              <span>⌖ Utah · En línea</span>
            </div>
            <div class="calendar-featured-actions">
              <a class="btn btn-primary" href="${whatsappUrl(`Hola, quiero confirmar mi acceso al evento: ${nextEvent.title}.`)}" target="_blank" rel="noopener">Confirmar mi acceso</a>
              <button class="btn btn-secondary" type="button" id="copy-next-event">Copiar fecha</button>
            </div>
          </div>
          <div class="calendar-featured-date">
            <span>${escapeHtml(info.month)}</span>
            <strong>${escapeHtml(info.day)}</strong>
            <small>${calendarYear}</small>
          </div>
        </section>`;
    })() : `
      <section class="calendar-empty-feature glass">
        <span class="calendar-empty-icon">◷</span>
        <h2>No tienes eventos próximos</h2>
        <p>Cuando se programe una nueva sesión aparecerá aquí automáticamente.</p>
      </section>`}

    <section class="calendar-layout">
      <div class="calendar-events-panel">
        <div class="calendar-toolbar glass">
          <div>
            <span class="eyebrow">Agenda</span>
            <h2>Todos los eventos</h2>
          </div>
          <div class="calendar-filter-tabs" role="tablist" aria-label="Filtrar eventos">
            <button class="calendar-filter active" type="button" data-calendar-filter="all">Todos</button>
            <button class="calendar-filter" type="button" data-calendar-filter="upcoming">Próximos</button>
            <button class="calendar-filter" type="button" data-calendar-filter="past">Finalizados</button>
          </div>
        </div>

        <div class="calendar-event-list" id="calendar-event-list">
          ${sortedEvents.length ? sortedEvents.map(renderEventCard).join('') : `
            <article class="calendar-empty-list glass">
              <span>▣</span>
              <h3>Aún no hay eventos registrados</h3>
              <p>Las nuevas fechas de cursos y webinars aparecerán en esta sección.</p>
            </article>`}
        </div>

        <article class="calendar-no-results glass hide" id="calendar-no-results">
          <h3>No hay eventos en esta categoría</h3>
          <p>Selecciona otro filtro para consultar el resto de la agenda.</p>
        </article>
      </div>

      <aside class="calendar-sidebar">
        <article class="calendar-month-card glass">
          <div class="calendar-month-heading">
            <div>
              <span class="eyebrow">Vista mensual</span>
              <h2>${escapeHtml(monthName.charAt(0).toUpperCase() + monthName.slice(1))}</h2>
            </div>
            <span class="calendar-month-count">${eventDays.size} ${eventDays.size === 1 ? 'fecha' : 'fechas'}</span>
          </div>

          <div class="calendar-grid" aria-label="Calendario de ${escapeHtml(monthName)}">
            ${['L','M','M','J','V','S','D'].map(day => `<small>${day}</small>`).join('')}
            ${Array.from({ length: firstWeekday }, () => '<span class="calendar-day empty"></span>').join('')}
            ${Array.from({ length: daysInMonth }, (_, index) => {
              const day = index + 1;
              const isToday = now.getFullYear() === calendarYear && now.getMonth() === calendarMonth && now.getDate() === day;
              const hasEvent = eventDays.has(day);
              return `<span class="calendar-day ${hasEvent ? 'has-event' : ''} ${isToday ? 'is-today' : ''}">${day}</span>`;
            }).join('')}
          </div>
          <div class="calendar-legend"><span><i></i> Evento programado</span></div>
        </article>

        <article class="calendar-info-card glass">
          <span class="calendar-info-icon">◎</span>
          <div>
            <strong>Zona horaria</strong>
            <p>Los horarios de los eventos se muestran con la hora local indicada por Academia AG en Utah.</p>
          </div>
        </article>

        <article class="calendar-info-card glass">
          <span class="calendar-info-icon">?</span>
          <div>
            <strong>¿Necesitas ayuda?</strong>
            <p>Escríbenos si compraste un programa y todavía no recibes el enlace.</p>
            <a href="${whatsappUrl('Hola, necesito ayuda con un evento de Academia AG.')}" target="_blank" rel="noopener">Contactar soporte →</a>
          </div>
        </article>
      </aside>
    </section>`;

  document.querySelectorAll('[data-calendar-filter]').forEach(button => {
    button.addEventListener('click', () => {
      const filter = button.dataset.calendarFilter;
      document.querySelectorAll('[data-calendar-filter]').forEach(item => item.classList.toggle('active', item === button));
      let visible = 0;
      document.querySelectorAll('[data-calendar-event]').forEach(card => {
        const show = filter === 'all' || card.dataset.calendarEvent === filter;
        card.classList.toggle('hide', !show);
        if (show) visible += 1;
      });
      document.querySelector('#calendar-no-results')?.classList.toggle('hide', visible > 0 || sortedEvents.length === 0);
    });
  });

  document.querySelector('#copy-next-event')?.addEventListener('click', async () => {
    if (!nextEvent) return;
    const info = formatEventDate(nextEvent.date);
    const textToCopy = `${nextEvent.title} · ${info.full} · ${info.time} · Hora de Utah`;
    try {
      await navigator.clipboard.writeText(textToCopy);
      showToast('Fecha copiada correctamente.');
    } catch {
      showToast('No pudimos copiar la fecha.', 'error');
    }
  });
}

function legalDocumentContent(section = 'centro') {
  const docs = {
    privacidad: {
      title: 'Aviso de privacidad',
      body: `<p>AG Business Networking utiliza los datos proporcionados por alumnos, instructores y administradores para crear cuentas, administrar inscripciones, registrar progreso, emitir constancias, brindar soporte y proteger el acceso a la plataforma.</p><p>La academia debe publicar, antes de operar comercialmente, los datos completos del responsable, medios de contacto, finalidades, mecanismos para ejercer derechos de privacidad y los proveedores que procesan información.</p><h3>Datos tratados por la plataforma</h3><ul><li>Nombre, correo y datos de perfil.</li><li>Inscripciones, progreso, respuestas de actividades y evaluaciones.</li><li>Registros técnicos necesarios para seguridad y soporte.</li><li>Datos de compras o referencias de acceso cuando se integren proveedores de pago.</li></ul>`
    },
    terminos: {
      title: 'Términos de uso académico',
      body: `<p>El acceso es personal e intransferible. Cada alumno es responsable de mantener segura su contraseña y utilizar los materiales únicamente conforme a la licencia otorgada para su formación.</p><h3>Reglas de la plataforma</h3><ul><li>No compartir cuentas, enlaces privados ni archivos protegidos.</li><li>No copiar, revender o redistribuir cursos, manuales o materiales sin autorización.</li><li>Mantener una conducta respetuosa en actividades, sesiones y espacios comunitarios.</li><li>Utilizar evaluaciones de forma individual salvo que la actividad indique lo contrario.</li></ul><p>Las constancias emitidas por Academia AG acreditan la finalización interna del programa correspondiente. No equivalen por sí mismas a una licencia gubernamental, certificación profesional regulada o autorización estatal, salvo que un curso indique expresamente una aprobación oficial verificable.</p>`
    },
    reembolsos: {
      title: 'Política de cancelación y reembolso',
      body: `<p>Antes de aceptar pagos, AG Business Networking debe definir y publicar para cada programa: precio, qué incluye, fecha de inicio, condiciones de cancelación, periodos de reembolso, tratamiento de clases ya consumidas y procedimiento para solicitar una revisión.</p><p>La plataforma conserva un historial de accesos y puede suspender o reactivar productos sin borrar el historial académico del alumno.</p>`
    },
    conducta: {
      title: 'Código de conducta académica',
      body: `<p>Academia AG promueve un entorno profesional, seguro y respetuoso. No se permite acoso, suplantación, fraude académico, distribución no autorizada de contenido, amenazas o uso de la plataforma para actividades ilícitas.</p><p>Las medidas pueden incluir advertencia, restricción temporal o suspensión del acceso, con registro administrativo de la acción.</p>`
    },
    autor: {
      title: 'Derechos de autor y propiedad intelectual',
      body: `<p>Los cursos, videos, manuales, evaluaciones, diseños y materiales pertenecen a sus respectivos titulares. La inscripción concede únicamente un derecho personal de acceso durante el periodo autorizado, salvo que el producto indique una licencia distinta.</p><p>Los instructores deben contar con autorización para todo material de terceros que incorporen a sus cursos.</p>`
    },
    accesibilidad: {
      title: 'Accesibilidad y soporte',
      body: `<p>La academia está diseñada para funcionar en computadora y dispositivos móviles. Cuando un alumno requiera apoyo razonable para acceder al contenido, puede abrir un ticket de soporte para que el equipo revise alternativas disponibles.</p>`
    }
  };
  return docs[section] || null;
}

function renderLegal(section = 'centro') {
  const target = state.session ? document.querySelector('#page') : null;
  const selected = legalDocumentContent(section);
  const nav = [
    ['privacidad','Privacidad'],['terminos','Términos de uso'],['reembolsos','Reembolsos'],['conducta','Conducta'],['autor','Derechos de autor'],['accesibilidad','Accesibilidad']
  ];
  const content = `
    <section class="legal-page-heading">
      <span class="eyebrow">Centro legal y académico</span>
      <h1 class="page-title">${escapeHtml(selected?.title || 'Documentos de la academia')}</h1>
      <p class="page-subtitle">Políticas base de Academia AG Business Networking. Antes del lanzamiento comercial deben revisarse con los datos legales definitivos de la empresa y la jurisdicción aplicable.</p>
    </section>
    <nav class="legal-tabs">${nav.map(([id,label]) => `<a class="${section===id?'active':''}" href="#legal/${id}">${escapeHtml(label)}</a>`).join('')}</nav>
    <section class="legal-document glass">
      ${selected ? selected.body : `<h2>Centro de documentos</h2><p>Selecciona una política para consultar su contenido.</p>`}
      <div class="legal-version"><strong>Versión:</strong> ${escapeHtml(CONFIG.legalVersion || '2026-08')} · <strong>Organización:</strong> AG Business Networking</div>
    </section>`;
  if (target) {
    target.innerHTML = content;
  } else {
    app.innerHTML = `<div class="public-shell"><header class="public-header"><a class="public-brand" href="#catalog"><img src="logo-texto-oficial.png" alt="AG Business Networking"></a><nav><a href="#catalog">Inicio</a><a href="#legal/privacidad">Privacidad</a><a href="#legal/terminos">Términos</a></nav><button class="btn btn-primary" type="button" id="legal-login">Entrar</button></header><main class="public-section">${content}</main><footer class="public-footer"><img src="logo-texto-oficial.png" alt="AG Business Networking"><p>Sueña, conéctate y triunfa.</p></footer></div>`;
    document.querySelector('#legal-login')?.addEventListener('click', () => renderAuth('login'));
  }
}

async function createSupportTicket(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  setFormBusy(formElement, true);
  const { error } = await db.from('support_tickets').insert({
    user_id: state.user.id,
    category: String(form.get('category') || 'general'),
    subject: String(form.get('subject') || '').trim(),
    message: String(form.get('message') || '').trim(),
    status: 'open',
    priority: 'normal'
  });
  setFormBusy(formElement, false);
  if (error) return showToast(error.message, 'error');
  showToast('Ticket enviado a soporte.', 'success');
  formElement.reset();
  await loadApplicationData();
  renderHelp();
}

function renderHelp() {
  const page = document.querySelector('#page');
  page.innerHTML = `
    <section class="help-hero">
      <span class="eyebrow">Centro de ayuda</span>
      <h1>¿Cómo podemos ayudarte?</h1>
      <p>Encuentra respuestas sobre tu cuenta, compras, cursos y biblioteca digital.</p>
      <div class="help-search"><span>⌕</span><input id="help-search" aria-label="Buscar en ayuda" placeholder="Escribe una pregunta"></div>
    </section>

    <section class="help-categories">
      <button type="button" data-help-scroll><span>01</span><strong>Acceso y contraseña</strong><small>Cuenta y seguridad</small></button>
      <button type="button" data-help-scroll><span>02</span><strong>Compras y accesos</strong><small>Pagos y asignaciones</small></button>
      <button type="button" data-help-scroll><span>03</span><strong>Cursos y progreso</strong><small>Lecciones y certificados</small></button>
      <button type="button" data-help-scroll><span>04</span><strong>Libros digitales</strong><small>Biblioteca privada</small></button>
    </section>

    <section class="help-layout" id="help-access">
      <article class="faq-panel glass">
        <div class="section-heading"><div><span class="eyebrow">Preguntas frecuentes</span><h2>Respuestas rápidas</h2></div></div>
        <div id="faq-list">
          ${HELP_TOPICS.map(([question, answer], index) => `
            <details class="faq-item" data-help-text="${escapeHtml(`${question} ${answer}`.toLowerCase())}" ${index === 0 ? 'open' : ''}>
              <summary>${escapeHtml(question)}<span>+</span></summary>
              <p>${escapeHtml(answer)}</p>
            </details>`).join('')}
        </div>
        <p class="empty-help hide" id="empty-help">No encontramos una respuesta. Puedes escribirnos por WhatsApp.</p>
      </article>

      <aside class="contact-card">
        <span class="eyebrow">Atención personal</span>
        <h2>¿Necesitas que revisemos tu cuenta?</h2>
        <p>Escríbenos incluyendo tu nombre, correo de registro y una descripción del problema.</p>
        ${WHATSAPP_NUMBER ? `<a class="btn btn-primary" href="${whatsappUrl('Hola, necesito ayuda con Academia AG. Mi nombre es: ___ y mi correo de registro es: ___.')}" target="_blank" rel="noopener">Escribir por WhatsApp</a>` : `<button class="btn btn-primary" type="button" data-support-scroll>Abrir ticket de soporte</button>`}
        <div><strong>WhatsApp Business</strong><small>AG Business Networking · ${WHATSAPP_NUMBER ? '+' + WHATSAPP_NUMBER : 'WhatsApp por configurar'}</small></div>
        <div><strong>Horario de atención</strong><small>Horario definido por el equipo de AG Business Networking</small></div>
      </aside>
    </section>

    <section class="support-ticket-layout">
      <article class="settings-card glass">
        <div class="section-heading"><div><span class="eyebrow">Soporte académico y técnico</span><h2>Abrir un ticket</h2></div></div>
        <form id="support-ticket-form" class="stack-form">
          <div class="field"><label>Tipo de solicitud</label><select name="category"><option value="access">Acceso o contraseña</option><option value="course">Curso o contenido</option><option value="evaluation">Evaluación</option><option value="payment">Pago o inscripción</option><option value="certificate">Certificado</option><option value="general">Otro</option></select></div>
          <div class="field"><label>Asunto</label><input name="subject" maxlength="140" required></div>
          <div class="field"><label>Describe el problema</label><textarea name="message" rows="6" required></textarea></div>
          <button class="btn btn-primary" type="submit">Enviar ticket</button>
        </form>
      </article>
      <article class="settings-card glass">
        <div class="section-heading"><div><span class="eyebrow">Mis solicitudes</span><h2>Historial de soporte</h2></div></div>
        <div class="ticket-list">${(state.supportTickets || []).filter(ticket => ticket.user_id === state.user.id || isAdmin()).slice(0,8).map(ticket => `<article><span class="status-pill">${escapeHtml(ticket.status || 'open')}</span><strong>${escapeHtml(ticket.subject)}</strong><small>${new Date(ticket.created_at).toLocaleString('es-MX')}</small></article>`).join('') || '<p class="page-subtitle">Aún no has enviado tickets.</p>'}</div>
      </article>
    </section>`;

  document.querySelector('#help-search').addEventListener('input', event => {
    const term = event.target.value.trim().toLowerCase();
    let visible = 0;
    document.querySelectorAll('[data-help-text]').forEach(item => {
      const matches = !term || item.dataset.helpText.includes(term);
      item.classList.toggle('hide', !matches);
      if (matches) visible += 1;
    });
    document.querySelector('#empty-help').classList.toggle('hide', visible > 0);
  });
  document.querySelectorAll('[data-help-scroll]').forEach(button =>
    button.addEventListener('click', () => document.querySelector('#help-access').scrollIntoView({ behavior: 'smooth' }))
  );
  document.querySelector('[data-support-scroll]')?.addEventListener('click', () => document.querySelector('#support-ticket-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  document.querySelector('#support-ticket-form')?.addEventListener('submit', createSupportTicket);
}

function renderNotifications() {
  const page = document.querySelector('#page');
  const notifications = userVisibleNotifications();

  page.innerHTML = `
    <span class="eyebrow">Mantente al día</span>
    <h1 class="page-title">Notificaciones</h1>
    <p class="page-subtitle">Avisos importantes enviados por Academia AG sobre tus cursos, eventos, soporte y certificados.</p>
    <section class="notification-list">
      ${notifications.length ? notifications.map(notification => {
        const [icon, label] = notificationMeta(notification.notification_type);
        return `
          <a class="notification-item glass" href="${escapeHtml(safeNotificationHref(notification.href))}">
            <span class="notification-icon">${icon}</span>
            <div>
              <small>${escapeHtml(label)} · ${new Date(notification.created_at).toLocaleString('es-MX')}</small>
              <strong>${escapeHtml(notification.title)}</strong>
              <p>${escapeHtml(notification.message)}</p>
            </div>
            <span>→</span>
          </a>`;
      }).join('') : `
        <article class="settings-card glass notification-empty-state">
          <span class="notification-icon">✓</span>
          <div><strong>Todo al día</strong><p>No tienes avisos pendientes. Las novedades importantes aparecerán aquí.</p></div>
        </article>`}
    </section>`;

  markNotificationsRead();
}

function renderSearch(term) {
  const page = document.querySelector('#page');
  const normalized = term.trim().toLowerCase();
  const results = [];

  state.courses.forEach(course => {
    const text = `${course.title} ${course.subtitle || ''} ${course.description || ''} ${course.category || ''}`.toLowerCase();
    if (text.includes(normalized)) results.push({ type: 'Curso', title: course.title, text: course.subtitle || course.description, href: `#course/${course.id}` });
    course.modules.forEach(module => module.lessons.forEach(lesson => {
      const lessonText = `${lesson.title} ${module.title} ${course.title}`.toLowerCase();
      if (lessonText.includes(normalized)) results.push({ type: 'Lección', title: lesson.title, text: `${course.title} · ${module.title}`, href: `#lesson/${course.id}/${lesson.id}` });
    }));
  });
  state.resources.forEach(resource => {
    if (`${resource.title} ${resource.resource_type}`.toLowerCase().includes(normalized)) {
      results.push({ type: resourceTypeLabel(resource.resource_type), title: resource.title, text: 'Disponible en tu biblioteca', href: '#resources' });
    }
  });
  HELP_TOPICS.forEach(([question, answer]) => {
    if (`${question} ${answer}`.toLowerCase().includes(normalized)) results.push({ type: 'Ayuda', title: question, text: answer, href: '#help' });
  });

  page.innerHTML = `
    <span class="eyebrow">Búsqueda global</span>
    <h1 class="page-title">Resultados</h1>
    <p class="page-subtitle">${results.length} ${results.length === 1 ? 'resultado' : 'resultados'} para “${escapeHtml(term)}”.</p>
    <section class="search-results">
      ${results.length ? results.map(result => `
        <a class="search-result glass" href="${result.href}">
          <span>${escapeHtml(result.type)}</span>
          <div><h2>${escapeHtml(result.title)}</h2><p>${escapeHtml(result.text || '')}</p></div>
          <strong>→</strong>
        </a>`).join('') : `
        <section class="empty-state glass"><h2>No encontramos coincidencias.</h2><p>Prueba con el nombre de un curso, una lección, un libro o una pregunta.</p><a class="btn btn-secondary" href="#help">Abrir ayuda</a></section>`}
    </section>`;
}


async function renderCertificateVerification(initialCode = '') {
  const mount = state.session ? document.querySelector('#page') : app;
  if (!mount) return;
  const code = String(initialCode || '').trim();
  mount.innerHTML = `${state.session ? '' : '<main class="public-verify-page">'}
    <section class="verification-card glass">
      <img class="verification-logo" src="logo-completo-oficial.png" alt="AG Business Networking">
      <span class="eyebrow">Validación académica</span>
      <h1>Verificar constancia</h1>
      <p>Ingresa el folio de una constancia emitida por Academia AG Business Networking.</p>
      <form id="certificate-verification-form" class="verification-form">
        <label><span>Folio</span><input name="code" value="${escapeHtml(code)}" placeholder="AG-2026-XXXXXXXXXXXX" required autocomplete="off"></label>
        <button class="btn btn-primary" type="submit">Verificar</button>
      </form>
      <div id="verification-result" class="verification-result" aria-live="polite"></div>
      <div class="verification-note"><strong>Importante</strong><p>La verificación confirma una constancia interna de finalización de Academia AG. No convierte el documento en una licencia, permiso o certificación gubernamental.</p></div>
      <div class="verification-actions">
        <a class="btn btn-secondary" href="${state.session ? '#certificates' : '#catalog'}">${state.session ? 'Mis certificados' : 'Volver a la academia'}</a>
        <a class="certificate-text-link" href="#legal/terminos">Términos de uso</a>
      </div>
    </section>
  ${state.session ? '' : '</main>'}`;

  const form = mount.querySelector('#certificate-verification-form');
  form?.addEventListener('submit', event => {
    event.preventDefault();
    const value = String(new FormData(form).get('code') || '').trim();
    if (!value) return;
    const target = `verify/${encodeURIComponent(value)}`;
    if (location.hash.replace(/^#/,'') === target) verifyCertificateCode(value, mount);
    else location.hash = target;
  });
  if (code) await verifyCertificateCode(code, mount);
}

async function verifyCertificateCode(code, mount = document) {
  const result = mount.querySelector('#verification-result');
  if (!result) return;
  result.innerHTML = '<div class="verification-loading">Verificando folio…</div>';
  try {
    const { data, error } = await db.rpc('verify_certificate', { target_code: code });
    if (error) throw error;
    const record = Array.isArray(data) ? data[0] : data;
    if (!record) {
      result.innerHTML = `<article class="verification-result-card invalid"><span>×</span><div><strong>Folio no encontrado</strong><p>Revisa que el código esté escrito exactamente como aparece en la constancia.</p></div></article>`;
      return;
    }
    const valid = record.status === 'valid';
    const issued = record.issued_at ? new Intl.DateTimeFormat('es-MX', { day:'numeric', month:'long', year:'numeric' }).format(new Date(record.issued_at)) : 'Fecha no disponible';
    result.innerHTML = `<article class="verification-result-card ${valid ? 'valid' : 'invalid'}">
      <span>${valid ? '✓' : '!'}</span>
      <div>
        <strong>${valid ? 'Constancia válida' : 'Constancia revocada'}</strong>
        <h2>${escapeHtml(record.course_title || 'Programa de Academia AG')}</h2>
        <p><b>Alumno:</b> ${escapeHtml(record.student_name || 'Sin nombre')}</p>
        <p><b>Emisión:</b> ${escapeHtml(issued)}</p>
        <small>Folio: ${escapeHtml(record.credential_code || code)}</small>
      </div>
    </article>`;
  } catch (error) {
    console.error(error);
    result.innerHTML = `<article class="verification-result-card invalid"><span>!</span><div><strong>No fue posible verificar</strong><p>${escapeHtml(error.message || 'Intenta nuevamente más tarde.')}</p></div></article>`;
  }
}

function certificateStatus(course) {
  const lessons = allLessons(course);
  const progress = lessons.length ? courseProgress(course) : 0;
  const completedLessons = lessons.filter(lesson => isLessonCompleted(lesson.id)).length;
  const requiredAssessments = (state.assessments || []).filter(item => item.course_id === course.id && item.status === 'published');
  const passedAssessments = requiredAssessments.filter(item => (state.assessmentAttempts || []).some(attempt => attempt.user_id === state.user?.id && attempt.assessment_id === item.id && attempt.passed));
  const assessmentsComplete = requiredAssessments.length === 0 || passedAssessments.length === requiredAssessments.length;
  return {
    lessons: lessons.length,
    progress,
    completedLessons,
    requiredAssessments: requiredAssessments.length,
    passedAssessments: passedAssessments.length,
    isComplete: lessons.length > 0 && progress === 100 && assessmentsComplete
  };
}

function renderCertificates() {
  const page = document.querySelector('#page');
  const courseSummaries = state.courses
    .map(course => ({ course, ...certificateStatus(course) }))
    .filter(item => item.lessons > 0);
  const completed = courseSummaries.filter(item => item.isComplete);
  const pending = courseSummaries.filter(item => !item.isComplete).sort((a, b) => b.progress - a.progress);
  const nextCertificate = pending[0] || null;

  page.innerHTML = `
    <section class="certificates-page-heading">
      <div>
        <span class="eyebrow">Reconoce tu constancia</span>
        <h1 class="page-title">Mis certificados</h1>
        <p class="page-subtitle">Consulta los reconocimientos obtenidos y revisa cuánto te falta para desbloquear el siguiente.</p>
      </div>
      <div class="certificates-summary" aria-label="Resumen de certificados">
        <article><strong>${completed.length}</strong><span>Disponibles</span></article>
        <article><strong>${pending.length}</strong><span>En proceso</span></article>
      </div>
    </section>

    ${completed.length ? `
      <section class="certificate-featured">
        <div class="certificate-featured-copy">
          <span class="eyebrow">Logro más reciente</span>
          <h2>${escapeHtml(completed[0].course.title)}</h2>
          <p>Tu constancia ya está disponible. Puedes abrirla, imprimirla o guardarla como PDF desde cualquier dispositivo.</p>
          <div class="certificate-featured-actions">
            <a class="btn btn-primary" href="#certificate/${completed[0].course.id}">Ver certificado</a>
            <a class="btn btn-secondary" href="#courses">Seguir aprendiendo</a>
          </div>
        </div>
        <div class="certificate-featured-preview" aria-hidden="true">
          <div class="certificate-mini-document">
            <img src="logo-completo-oficial.png" alt="">
            <span>CONSTANCIA</span>
            <strong>${escapeHtml(displayName())}</strong>
            <small>${escapeHtml(completed[0].course.title)}</small>
            <i>AG</i>
          </div>
        </div>
      </section>` : nextCertificate ? `
      <section class="certificate-progress-hero glass">
        <div class="certificate-progress-icon">◇</div>
        <div class="certificate-progress-copy">
          <span class="eyebrow">Tu siguiente reconocimiento</span>
          <h2>${escapeHtml(nextCertificate.course.title)}</h2>
          <p>Has completado ${nextCertificate.completedLessons} de ${nextCertificate.lessons} lecciones. Continúa hasta alcanzar el 100%.</p>
          <div class="certificate-progress-bar"><span style="width:${nextCertificate.progress}%"></span></div>
          <small>${nextCertificate.progress}% completado</small>
        </div>
        <a class="btn btn-primary" href="#course/${nextCertificate.course.id}">Continuar curso</a>
      </section>` : `
      <section class="certificate-empty-hero glass">
        <div class="certificate-empty-icon">◇</div>
        <span class="eyebrow">Tu próximo logro comienza aquí</span>
        <h2>Aún no tienes cursos con certificado</h2>
        <p>Cuando tengas acceso a un programa con lecciones, podrás consultar aquí tu avance y tus reconocimientos.</p>
        <a class="btn btn-primary" href="#catalog">Explorar cursos</a>
      </section>`}

    ${completed.length ? `
      <section class="certificates-section">
        <div class="section-heading certificates-section-heading">
          <div><span class="eyebrow">Reconocimientos obtenidos</span><h2>Certificados disponibles</h2></div>
          <span>${completed.length} ${completed.length === 1 ? 'certificado' : 'certificados'}</span>
        </div>
        <div class="certificates-grid-professional">
          ${completed.map(({ course }) => `
            <article class="certificate-achievement-card glass">
              <div class="certificate-achievement-cover">
                <img src="${escapeHtml(cover(course))}" alt="${escapeHtml(course.title)}" onerror="imageErrorFallback(event, 'curso-utah-driver.webp')">
                <span>Completado</span>
              </div>
              <div class="certificate-achievement-body">
                <span class="eyebrow">Constancia digital</span>
                <h3>${escapeHtml(course.title)}</h3>
                <p>Emitida para ${escapeHtml(displayName())} al cumplir los requisitos académicos del programa.</p>
                <div class="certificate-achievement-actions">
                  <a class="btn btn-primary" href="#certificate/${course.id}">Abrir certificado</a>
                  <a class="certificate-text-link" href="#course/${course.id}">Ver curso →</a>
                </div>
              </div>
            </article>`).join('')}
        </div>
      </section>` : ''}

    ${pending.length ? `
      <section class="certificates-section certificates-pending-section">
        <div class="section-heading certificates-section-heading">
          <div><span class="eyebrow">Sigue avanzando</span><h2>Certificados en proceso</h2></div>
          <span>${pending.length} ${pending.length === 1 ? 'programa' : 'programas'}</span>
        </div>
        <div class="certificate-pending-list">
          ${pending.map(({ course, progress, completedLessons, lessons }) => `
            <article class="certificate-pending-card glass">
              <img src="${escapeHtml(cover(course))}" alt="${escapeHtml(course.title)}" onerror="imageErrorFallback(event, 'curso-utah-driver.webp')">
              <div class="certificate-pending-copy">
                <div class="certificate-pending-topline"><span>${progress === 0 ? 'No iniciado' : 'En progreso'}</span><strong>${progress}%</strong></div>
                <h3>${escapeHtml(course.title)}</h3>
                <p>${completedLessons} de ${lessons} lecciones completadas</p>
                <div class="certificate-progress-bar"><span style="width:${progress}%"></span></div>
              </div>
              <a class="btn btn-secondary" href="#course/${course.id}">${progress === 0 ? 'Comenzar' : 'Continuar'}</a>
            </article>`).join('')}
        </div>
      </section>` : ''}

    <section class="certificate-info-note">
      <span>i</span>
      <div><strong>¿Cómo se habilita un certificado?</strong><p>Se habilita cuando completas las lecciones requeridas y apruebas las evaluaciones obligatorias del curso. Después podrás imprimirlo o guardarlo en PDF.</p></div>
      <a href="#help">Ver ayuda</a>
    </section>`;
}

async function renderCertificate(courseId) {
  const page = document.querySelector('#page');
  const course = findCourse(courseId);
  const status = course ? certificateStatus(course) : null;
  if (!course || !status?.isComplete) return renderCertificates();

  let certificate = (state.certificates || []).find(item => item.course_id === course.id && item.user_id === state.user?.id);
  if (!certificate) {
    try {
      const { data, error } = await db.rpc('issue_my_certificate', { target_course: course.id });
      if (!error && data) {
        certificate = Array.isArray(data) ? data[0] : data;
        if (certificate) state.certificates = [certificate, ...(state.certificates || []).filter(item => item.id !== certificate.id)];
      }
    } catch (error) {
      console.error('Certificate issue error:', error);
    }
  }
  const issuedAt = certificate?.issued_at ? new Date(certificate.issued_at) : new Date();
  const date = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(issuedAt);
  const credentialCode = certificate?.credential_code || `AG-${String(course.id).replace(/[^a-z0-9]/gi, '').slice(0, 8).toUpperCase()}-${String(state.user?.id || 'ALUMNO').replace(/[^a-z0-9]/gi, '').slice(0, 6).toUpperCase()}`;

  page.innerHTML = `
    <section class="certificate-view-heading">
      <div>
        <a class="back-link" href="#certificates">← Volver a mis certificados</a>
        <span class="eyebrow">Constancia digital</span>
        <h1 class="page-title">${escapeHtml(course.title)}</h1>
        <p class="page-subtitle">Revisa tu reconocimiento y guárdalo en formato PDF.</p>
      </div>
      <div class="certificate-actions">
        <a class="btn btn-secondary" href="#verify/${encodeURIComponent(credentialCode)}">Verificar folio</a>
        <button class="btn btn-secondary" id="copy-certificate-code" type="button">Copiar folio</button>
        <button class="btn btn-primary" id="print-certificate" type="button">Imprimir o guardar PDF</button>
      </div>
    </section>

    <section class="certificate-document-wrap">
      <div class="certificate-document" id="certificate-document">
        <div class="certificate-border certificate-border-outer"></div>
        <div class="certificate-border certificate-border-inner"></div>
        <div class="certificate-corner top-left">✦</div>
        <div class="certificate-corner top-right">✦</div>
        <div class="certificate-corner bottom-left">✦</div>
        <div class="certificate-corner bottom-right">✦</div>

        <img class="certificate-logo" src="logo-completo-oficial.png" alt="AG Business Networking">
        <span class="certificate-kicker">CONSTANCIA DE FINALIZACIÓN</span>
        <p class="certificate-intro">AG Business Networking reconoce a</p>
        <h1>${escapeHtml(displayName())}</h1>
        <div class="certificate-name-line"></div>
        <p class="certificate-course-intro">por haber completado satisfactoriamente el programa</p>
        <h2>${escapeHtml(course.title)}</h2>
        <p class="certificate-description">Demostrando compromiso, constancia y dedicación durante su proceso de aprendizaje en Academia AG.</p>

        <div class="certificate-footer-data">
          <div><span>${escapeHtml(date)}</span><small>Fecha de emisión</small></div>
          <div class="certificate-seal"><strong>AG</strong><small>BUSINESS<br>NETWORKING</small></div>
          <div><span>Dirección Académica</span><small>AG Business Networking</small></div>
        </div>
        <small class="certificate-code">Folio: ${escapeHtml(credentialCode)} · Academia AG</small>
      </div>
    </section>

    <section class="certificate-download-help glass">
      <span>⌄</span>
      <div><strong>Guardar como PDF</strong><p>Selecciona “Imprimir o guardar PDF” y, en la ventana de impresión, elige la opción “Guardar como PDF”.</p></div>
    </section>`;

  document.querySelector('#print-certificate')?.addEventListener('click', () => window.print());
  document.querySelector('#copy-certificate-code')?.addEventListener('click', async event => {
    try {
      await navigator.clipboard.writeText(credentialCode);
      const button = event.currentTarget;
      const original = button.textContent;
      button.textContent = 'Folio copiado';
      setTimeout(() => { button.textContent = original; }, 1800);
    } catch {
      window.prompt('Copia el folio de tu certificado:', credentialCode);
    }
  });
}

function renderProfile() {
  const page = document.querySelector('#page');
  const completedCourses = state.courses.filter(course => courseProgress(course) === 100).length;
  const completedLessons = state.progressRows.filter(row => row.completed).length;
  const totalLessons = state.courses.reduce((sum, course) => sum + allLessons(course).length, 0);
  const certificateCount = completedCourses;
  const profileComplete = Boolean(state.profile?.full_name?.trim()) && Boolean(state.profile?.avatar_url?.trim());
  const joinedAt = state.user?.created_at
    ? new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' }).format(new Date(state.user.created_at))
    : 'Academia AG';
  const roleLabel = isAdmin() ? 'Administrador' : isInstructor() ? 'Instructor' : 'Alumno';
  const initial = displayName().trim().charAt(0).toUpperCase() || 'A';

  page.innerHTML = `
    <header class="profile-page-heading">
      <div>
        <span class="eyebrow">Mi cuenta</span>
        <h1 class="page-title">Mi perfil</h1>
        <p class="page-subtitle">Administra tus datos personales, accesos y preferencias de Academia AG.</p>
      </div>
      <span class="profile-status-pill ${profileComplete ? 'complete' : ''}">
        ${profileComplete ? '✓ Perfil completo' : '○ Completa tu perfil'}
      </span>
    </header>

    <section class="profile-professional-layout">
      <aside class="profile-identity-card glass">
        <div class="profile-cover-band"></div>
        <div class="profile-avatar-wrap">
          <img src="${escapeHtml(avatarUrl())}" alt="Fotografía de ${escapeHtml(displayName())}" onerror="imageErrorFallback(event, 'icono-oficial.png')">
          <span>${escapeHtml(initial)}</span>
        </div>
        <div class="profile-identity-copy">
          <span class="profile-role-badge">${escapeHtml(roleLabel)}</span>
          <h2>${escapeHtml(displayName())}</h2>
          <p>${escapeHtml(state.user.email)}</p>
          <small>Miembro desde ${escapeHtml(joinedAt)}</small>
        </div>

        <div class="profile-achievement-grid">
          <article><strong>${state.courses.length}</strong><span>Cursos</span></article>
          <article><strong>${completedLessons}</strong><span>Lecciones</span></article>
          <article><strong>${certificateCount}</strong><span>Certificados</span></article>
          <article><strong>${state.resources.length}</strong><span>Recursos</span></article>
        </div>

        <a class="btn btn-secondary profile-certificate-link" href="#certificates">Ver mis certificados</a>
      </aside>

      <div class="profile-main-column">
        <section class="profile-settings-panel glass">
          <div class="profile-section-heading">
            <div>
              <span class="eyebrow">Información personal</span>
              <h2>Datos de tu cuenta</h2>
            </div>
            <span class="profile-section-icon">✎</span>
          </div>

          <form id="profile-form" class="profile-form-modern">
            <div class="field">
              <label for="profile-name">Nombre completo</label>
              <input id="profile-name" name="fullName" value="${escapeHtml(state.profile?.full_name || '')}" placeholder="Escribe tu nombre completo" required>
              <small>Este nombre aparecerá en tus certificados.</small>
            </div>
            <div class="field">
              <label for="profile-email">Correo electrónico</label>
              <input id="profile-email" value="${escapeHtml(state.user.email)}" disabled>
              <small>Tu correo se utiliza para iniciar sesión.</small>
            </div>
            <div class="field profile-field-wide profile-photo-field">
              <label>Fotografía de perfil</label>
              <div class="profile-photo-control">
                <img id="profile-photo-preview" src="${escapeHtml(avatarUrl())}" alt="Vista previa de la fotografía" onerror="imageErrorFallback(event, 'icono-oficial.png')">
                <div>
                  <strong>Elige una fotografía</strong>
                  <small>JPG, PNG o WebP · máximo 2 MB. Se recortará a 600 × 600 px.</small>
                  <button class="btn btn-secondary profile-photo-button" id="choose-avatar-button" type="button">Cambiar fotografía</button>
                  <input id="avatar-file-input" type="file" accept="image/jpeg,image/png,image/webp" hidden>
                </div>
              </div>
            </div>
            <div class="profile-form-actions profile-field-wide">
              <span>Los cambios se reflejarán en todo el aula.</span>
              <button class="btn btn-primary" type="submit">Guardar cambios</button>
            </div>
          </form>
        </section>

        <section class="profile-progress-panel glass">
          <div class="profile-section-heading">
            <div>
              <span class="eyebrow">Actividad académica</span>
              <h2>Tu avance en Academia AG</h2>
            </div>
            <a href="#courses">Ver cursos</a>
          </div>
          <div class="profile-progress-summary">
            <div class="profile-progress-ring" style="--value:${totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0}">
              <strong>${totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0}%</strong>
            </div>
            <div>
              <h3>${completedLessons} de ${totalLessons} lecciones completadas</h3>
              <p>${completedCourses ? `Has finalizado ${completedCourses} ${completedCourses === 1 ? 'curso' : 'cursos'}.` : 'Tu progreso comenzará cuando completes tu primera lección.'}</p>
              <div class="profile-linear-progress"><span style="width:${totalLessons ? Math.round((completedLessons / totalLessons) * 100) : 0}%"></span></div>
            </div>
          </div>
        </section>

        <section class="profile-options-grid">
          <article class="profile-option-card glass">
            <span class="profile-option-icon">▣</span>
            <div><h3>Instalar Academia AG</h3><p>Accede desde tu pantalla de inicio como una aplicación.</p></div>
            <button class="profile-option-action" data-install type="button">Instalar</button>
          </article>
          <article class="profile-option-card glass">
            <span class="profile-option-icon">?</span>
            <div><h3>Centro de ayuda</h3><p>Resuelve dudas sobre accesos, compras y materiales.</p></div>
            <a class="profile-option-action" href="#help">Abrir</a>
          </article>
          ${canManageContent() ? `
          <article class="profile-option-card glass">
            <span class="profile-option-icon">⚙</span>
            <div><h3>Panel de contenidos</h3><p>Gestiona cursos, módulos y recursos autorizados.</p></div>
            <a class="profile-option-action" href="#admin">Abrir</a>
          </article>` : ''}
          <article class="profile-option-card glass profile-option-danger">
            <span class="profile-option-icon">↪</span>
            <div><h3>Cerrar sesión</h3><p>Finaliza la sesión de manera segura en este dispositivo.</p></div>
            <button class="profile-option-action" id="logout-button" type="button">Salir</button>
          </article>
        </section>
      </div>
    </section>`;

  document.querySelector('#profile-form')?.addEventListener('submit', updateProfile);
  document.querySelector('#choose-avatar-button')?.addEventListener('click', () => document.querySelector('#avatar-file-input')?.click());
  document.querySelector('#avatar-file-input')?.addEventListener('change', handleAvatarSelection);
  document.querySelector('#logout-button')?.addEventListener('click', logout);
  document.querySelectorAll('[data-install]').forEach(button => button.addEventListener('click', installApp));
}


const AVATAR_ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
const AVATAR_OUTPUT_SIZE = 600;
let avatarEditorState = null;

function handleAvatarSelection(event) {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;

  if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
    showToast('Solo puedes subir imágenes JPG, PNG o WebP.', 'error');
    return;
  }
  if (file.size > AVATAR_MAX_BYTES) {
    showToast('La fotografía no debe superar los 2 MB.', 'error');
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const image = new Image();
  image.onload = () => {
    openAvatarEditor(image, objectUrl);
  };
  image.onerror = () => {
    URL.revokeObjectURL(objectUrl);
    showToast('No se pudo leer la imagen seleccionada.', 'error');
  };
  image.src = objectUrl;
}

function openAvatarEditor(image, objectUrl) {
  closeAvatarEditor();
  avatarEditorState = {
    image,
    objectUrl,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    dragging: false,
    startX: 0,
    startY: 0,
    originX: 0,
    originY: 0
  };

  document.body.insertAdjacentHTML('beforeend', `
    <div class="avatar-editor-backdrop" id="avatar-editor" role="dialog" aria-modal="true" aria-labelledby="avatar-editor-title">
      <section class="avatar-editor-card glass">
        <header>
          <div><span class="eyebrow">Mi perfil</span><h2 id="avatar-editor-title">Ajustar fotografía</h2></div>
          <button class="avatar-editor-close" id="avatar-editor-close" type="button" aria-label="Cerrar">×</button>
        </header>
        <p>Arrastra la imagen para centrarla y utiliza el control para acercar o alejar.</p>
        <div class="avatar-crop-stage" id="avatar-crop-stage">
          <canvas id="avatar-crop-canvas" width="600" height="600"></canvas>
          <span class="avatar-crop-ring" aria-hidden="true"></span>
        </div>
        <label class="avatar-zoom-control" for="avatar-zoom">
          <span>Zoom</span>
          <input id="avatar-zoom" type="range" min="1" max="3" step="0.01" value="1">
        </label>
        <div class="avatar-upload-progress hide" id="avatar-upload-progress">
          <div><span>Subiendo fotografía…</span><strong id="avatar-progress-label">0%</strong></div>
          <div class="avatar-progress-track"><span id="avatar-progress-bar"></span></div>
        </div>
        <footer>
          <button class="btn btn-secondary" id="avatar-cancel" type="button">Cancelar</button>
          <button class="btn btn-primary" id="avatar-save" type="button">Guardar fotografía</button>
        </footer>
      </section>
    </div>`);

  document.body.classList.add('modal-open');
  const stage = document.querySelector('#avatar-crop-stage');
  const zoom = document.querySelector('#avatar-zoom');
  document.querySelector('#avatar-editor-close')?.addEventListener('click', closeAvatarEditor);
  document.querySelector('#avatar-cancel')?.addEventListener('click', closeAvatarEditor);
  document.querySelector('#avatar-save')?.addEventListener('click', saveAvatarImage);
  document.querySelector('#avatar-editor')?.addEventListener('click', event => {
    if (event.target.id === 'avatar-editor') closeAvatarEditor();
  });
  zoom?.addEventListener('input', event => {
    avatarEditorState.zoom = Number(event.target.value);
    clampAvatarOffsets();
    drawAvatarCrop();
  });
  stage?.addEventListener('pointerdown', startAvatarDrag);
  stage?.addEventListener('pointermove', moveAvatarDrag);
  stage?.addEventListener('pointerup', endAvatarDrag);
  stage?.addEventListener('pointercancel', endAvatarDrag);
  drawAvatarCrop();
}

function avatarDrawMetrics() {
  const { image, zoom, offsetX, offsetY } = avatarEditorState;
  const canvasSize = AVATAR_OUTPUT_SIZE;
  const baseScale = Math.max(canvasSize / image.naturalWidth, canvasSize / image.naturalHeight);
  const scale = baseScale * zoom;
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  return {
    width,
    height,
    x: (canvasSize - width) / 2 + offsetX,
    y: (canvasSize - height) / 2 + offsetY
  };
}

function clampAvatarOffsets() {
  if (!avatarEditorState) return;
  const { image, zoom } = avatarEditorState;
  const baseScale = Math.max(AVATAR_OUTPUT_SIZE / image.naturalWidth, AVATAR_OUTPUT_SIZE / image.naturalHeight);
  const width = image.naturalWidth * baseScale * zoom;
  const height = image.naturalHeight * baseScale * zoom;
  const maxX = Math.max(0, (width - AVATAR_OUTPUT_SIZE) / 2);
  const maxY = Math.max(0, (height - AVATAR_OUTPUT_SIZE) / 2);
  avatarEditorState.offsetX = Math.max(-maxX, Math.min(maxX, avatarEditorState.offsetX));
  avatarEditorState.offsetY = Math.max(-maxY, Math.min(maxY, avatarEditorState.offsetY));
}

function drawAvatarCrop() {
  if (!avatarEditorState) return;
  const canvas = document.querySelector('#avatar-crop-canvas');
  const context = canvas?.getContext('2d');
  if (!context) return;
  const metrics = avatarDrawMetrics();
  context.clearRect(0, 0, AVATAR_OUTPUT_SIZE, AVATAR_OUTPUT_SIZE);
  context.drawImage(avatarEditorState.image, metrics.x, metrics.y, metrics.width, metrics.height);
}

function startAvatarDrag(event) {
  if (!avatarEditorState) return;
  avatarEditorState.dragging = true;
  avatarEditorState.startX = event.clientX;
  avatarEditorState.startY = event.clientY;
  avatarEditorState.originX = avatarEditorState.offsetX;
  avatarEditorState.originY = avatarEditorState.offsetY;
  event.currentTarget.setPointerCapture?.(event.pointerId);
}

function moveAvatarDrag(event) {
  if (!avatarEditorState?.dragging) return;
  const stageRect = event.currentTarget.getBoundingClientRect();
  const ratio = AVATAR_OUTPUT_SIZE / stageRect.width;
  avatarEditorState.offsetX = avatarEditorState.originX + (event.clientX - avatarEditorState.startX) * ratio;
  avatarEditorState.offsetY = avatarEditorState.originY + (event.clientY - avatarEditorState.startY) * ratio;
  clampAvatarOffsets();
  drawAvatarCrop();
}

function endAvatarDrag(event) {
  if (!avatarEditorState) return;
  avatarEditorState.dragging = false;
  event.currentTarget.releasePointerCapture?.(event.pointerId);
}

function canvasToWebpBlob(canvas, quality = 0.86) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('No se pudo procesar la fotografía.')), 'image/webp', quality);
  });
}

function setAvatarProgress(value) {
  const normalized = Math.max(0, Math.min(100, Math.round(value)));
  const label = document.querySelector('#avatar-progress-label');
  const bar = document.querySelector('#avatar-progress-bar');
  if (label) label.textContent = `${normalized}%`;
  if (bar) bar.style.width = `${normalized}%`;
}

async function saveAvatarImage() {
  if (!avatarEditorState || !state.user) return;
  const saveButton = document.querySelector('#avatar-save');
  const cancelButton = document.querySelector('#avatar-cancel');
  const progress = document.querySelector('#avatar-upload-progress');
  const canvas = document.querySelector('#avatar-crop-canvas');
  saveButton.disabled = true;
  cancelButton.disabled = true;
  progress?.classList.remove('hide');
  setAvatarProgress(15);

  try {
    const blob = await canvasToWebpBlob(canvas);
    setAvatarProgress(35);
    const filePath = `${state.user.id}/avatar.webp`;
    const { error: uploadError } = await db.storage
      .from('avatars')
      .upload(filePath, blob, { contentType: 'image/webp', upsert: true, cacheControl: '3600' });
    if (uploadError) throw uploadError;

    setAvatarProgress(75);
    const { data: publicData } = db.storage.from('avatars').getPublicUrl(filePath);
    const publicUrl = `${publicData.publicUrl}?v=${Date.now()}`;
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .update({ avatar_url: publicUrl })
      .eq('id', state.user.id)
      .select()
      .single();
    if (profileError) throw profileError;

    setAvatarProgress(100);
    state.profile = profile;
    const preview = document.querySelector('#profile-photo-preview');
    if (preview) preview.src = publicUrl;
    await new Promise(resolve => setTimeout(resolve, 250));
    closeAvatarEditor();
    showToast('Fotografía actualizada correctamente.', 'success');
    route();
  } catch (error) {
    console.error('Avatar upload error:', error);
    showToast(error?.message?.includes('Bucket not found')
      ? 'Primero crea el bucket avatars en Supabase.'
      : 'No se pudo subir la fotografía. Revisa la configuración de Storage.', 'error');
    if (saveButton) saveButton.disabled = false;
    if (cancelButton) cancelButton.disabled = false;
  }
}

function closeAvatarEditor() {
  document.querySelector('#avatar-editor')?.remove();
  document.body.classList.remove('modal-open');
  if (avatarEditorState?.objectUrl) URL.revokeObjectURL(avatarEditorState.objectUrl);
  avatarEditorState = null;
}

async function updateProfile(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);

  setFormBusy(event.currentTarget, true);

  const { data, error } = await db
    .from('profiles')
    .update({
      full_name: String(form.get('fullName')).trim()
    })
    .eq('id', state.user.id)
    .select()
    .single();

  setFormBusy(event.currentTarget, false);

  if (error) {
    console.error(error);
    showToast('No se pudo actualizar el perfil.', 'error');
    return;
  }

  state.profile = data;
  showToast('Perfil actualizado.', 'success');
  route();
}

async function logout() {
  const { error } = await db.auth.signOut();
  if (error) showToast('No se pudo cerrar la sesión.', 'error');
}

function workspaceCourseCount(workspaceId) {
  return state.courses.filter(course => course.workspace_id === workspaceId && (isAdmin() || canManageCourseClient(course))).length;
}

function workspaceResourceCount(workspaceId) {
  const courseIds = new Set(state.courses.filter(course => course.workspace_id === workspaceId && (isAdmin() || canManageCourseClient(course))).map(course => course.id));
  return state.resources.filter(resource => courseIds.has(resource.course_id) || (isAdmin() && resource.workspace_id === workspaceId)).length;
}

function workspaceMemberCount(workspaceId) {
  return state.workspaceMembers.filter(member => member.workspace_id === workspaceId).length;
}

function renderAdmin() {
  if (state.activeWorkspaceId) return renderWorkspaceAdmin(state.activeWorkspaceId);
  return renderWorkspaceOverview();
}

function renderWorkspaceOverview() {
  const page = document.querySelector('#page');
  const folders = state.workspaces || [];
  const visibleManagedCourses = isAdmin() ? state.courses : state.courses.filter(canManageCourseClient);
  const visibleManagedCourseIds = new Set(visibleManagedCourses.map(course => course.id));
  const visibleManagedResources = isAdmin() ? state.resources : state.resources.filter(resource => visibleManagedCourseIds.has(resource.course_id));
  const unassignedCourses = visibleManagedCourses.filter(course => !course.workspace_id);
  const unassignedResources = visibleManagedResources.filter(resource => !resource.workspace_id);
  const hasContent = visibleManagedCourses.length || visibleManagedResources.length;

  page.innerHTML = `
    <section class="workspace-hero">
      <div>
        <span class="eyebrow">Administrador 2.0</span>
        <h1>Espacios de trabajo</h1>
        <p>Abre una carpeta para administrar sus cursos publicados, borradores, alumnos, libros y recursos.</p>
      </div>
      <div class="workspace-hero-actions">
        ${isAdmin() ? '<button class="btn btn-primary" type="button" id="new-workspace-button">＋ Crear espacio</button>' : ''}
        ${isAdmin() && (!folders.length || unassignedCourses.length || unassignedResources.length)
          ? '<button class="btn btn-secondary" type="button" id="repair-workspace-button">Reparar espacio principal</button>'
          : ''}
      </div>
    </section>

    <section class="workspace-summary-grid">
      <article><span>▣</span><div><strong>${folders.length}</strong><small>Espacios</small></div></article>
      <article><span>▤</span><div><strong>${visibleManagedCourses.length}</strong><small>Cursos</small></div></article>
      <article><span>✓</span><div><strong>${visibleManagedCourses.filter(course => course.status === 'published').length}</strong><small>Publicados</small></div></article>
      <article><span>◷</span><div><strong>${visibleManagedCourses.filter(course => course.status !== 'published').length}</strong><small>Borradores</small></div></article>
    </section>

    ${isAdmin() ? `<section class="workspace-create-panel glass hide" id="workspace-create-panel">
      <div class="section-heading"><div><span class="eyebrow">Nueva carpeta</span><h2>Crear espacio de trabajo</h2></div></div>
      <form id="workspace-form" class="workspace-form">
        <label><span>Nombre</span><input name="name" placeholder="Ej. Formación empresarial" required maxlength="80"></label>
        <label><span>Descripción</span><input name="description" placeholder="Cursos, libros y programas de la marca"></label>
        <label><span>Color de identificación</span><input name="accentColor" type="color" value="#005134"></label>
        <button class="btn btn-primary" type="submit">Crear espacio</button>
      </form>
    </section>` : ''}

    ${isAdmin() && hasContent ? `<section class="admin-general-access glass">
      <div>
        <span class="eyebrow">Acceso de recuperación</span>
        <h2>Administración general</h2>
        <p>Desde aquí puedes volver a ver todos los cursos, cambiar su estado y asignar accesos, incluso si todavía no quedaron asociados a una carpeta.</p>
      </div>
      <a class="btn btn-primary" href="#workspace/general">Abrir administración general</a>
    </section>` : ''}

    <section class="workspace-grid">
      ${folders.length ? folders.map(workspace => {
        const courseCount = workspaceCourseCount(workspace.id);
        const resourceCount = workspaceResourceCount(workspace.id);
        const memberCount = workspaceMemberCount(workspace.id);
        const workspaceVisibleCourses = visibleManagedCourses.filter(course => course.workspace_id === workspace.id);
        const publishedCount = workspaceVisibleCourses.filter(course => course.status === 'published').length;
        const draftCount = workspaceVisibleCourses.filter(course => course.status !== 'published').length;
        return `<article class="workspace-folder" style="--workspace-accent:${escapeHtml(workspace.accent_color || '#005134')}">
          <div class="workspace-folder-top">
            <div class="workspace-folder-icon">▰</div>
            <span>${isAdmin() ? 'Espacio administrado' : 'Espacio asignado'}</span>
          </div>
          <div class="workspace-folder-body">
            <h2>${escapeHtml(workspace.name)}</h2>
            <p>${escapeHtml(workspace.description || 'Cursos y recursos organizados en una sola carpeta.')}</p>
            <div class="workspace-folder-metrics">
              <span><strong>${courseCount}</strong> cursos</span>
              <span><strong>${publishedCount}</strong> publicados</span>
              <span><strong>${draftCount}</strong> borradores</span>
              <span><strong>${resourceCount}</strong> recursos</span>
              <span><strong>${memberCount}</strong> miembros</span>
            </div>
          </div>
          <div class="workspace-folder-actions">
            <a class="btn btn-primary" href="#workspace/${escapeHtml(workspace.id)}">Abrir carpeta</a>
            ${isAdmin() ? `<button class="btn btn-secondary" type="button" data-rename-workspace="${escapeHtml(workspace.id)}">Renombrar</button>
            <button class="btn btn-danger" type="button" data-delete-workspace="${escapeHtml(workspace.id)}" ${courseCount || resourceCount ? 'disabled title="Mueve o elimina el contenido antes de borrar"' : ''}>Eliminar</button>` : ''}
          </div>
        </article>`;
      }).join('') : `<section class="empty-state glass workspace-empty"><div>▰</div><h2>No hay espacios de trabajo visibles</h2><p>${isAdmin() ? 'Presiona “Reparar espacio principal” para recuperar la administración de cursos y accesos.' : 'Un administrador debe asignarte a un espacio.'}</p></section>`}
    </section>

    ${(unassignedCourses.length || unassignedResources.length) ? `<section class="workspace-warning glass">
      <div><strong>Contenido sin carpeta</strong><p>${unassignedCourses.length} cursos y ${unassignedResources.length} recursos todavía necesitan un espacio de trabajo.</p></div>
      ${isAdmin() ? '<button class="btn btn-primary" id="repair-unassigned-button" type="button">Asignar a AG Business Networking</button>' : ''}
    </section>` : ''}`;

  document.querySelector('#new-workspace-button')?.addEventListener('click', () => {
    document.querySelector('#workspace-create-panel')?.classList.toggle('hide');
    document.querySelector('#workspace-create-panel input[name="name"]')?.focus();
  });
  document.querySelector('#workspace-form')?.addEventListener('submit', createWorkspace);
  document.querySelector('#repair-workspace-button')?.addEventListener('click', repairDefaultWorkspace);
  document.querySelector('#repair-unassigned-button')?.addEventListener('click', repairDefaultWorkspace);
  document.querySelectorAll('[data-rename-workspace]').forEach(button => button.addEventListener('click', () => renameWorkspace(button.dataset.renameWorkspace)));
  document.querySelectorAll('[data-delete-workspace]').forEach(button => button.addEventListener('click', () => deleteWorkspace(button.dataset.deleteWorkspace)));
}

async function repairDefaultWorkspace() {
  if (!isAdmin()) return;
  showToast('Reparando el espacio principal...');
  try {
    let workspace = state.workspaces.find(item => item.slug === 'ag-business-networking') || state.workspaces[0] || null;
    if (!workspace) {
      const { data, error } = await db.from('workspaces').insert({
        name: 'AG Business Networking',
        slug: 'ag-business-networking',
        description: 'Cursos, libros y recursos principales de AG Business Networking.',
        accent_color: '#005134',
        created_by: state.user.id
      }).select().single();
      if (error) throw error;
      workspace = data;
    }

    const { error: memberError } = await db.from('workspace_members').upsert({
      workspace_id: workspace.id,
      user_id: state.user.id,
      role: 'owner'
    }, { onConflict: 'workspace_id,user_id' });
    if (memberError) throw memberError;

    const unassignedCourseIds = state.courses.filter(course => !course.workspace_id).map(course => course.id);
    if (unassignedCourseIds.length) {
      const { error } = await db.from('courses').update({ workspace_id: workspace.id }).in('id', unassignedCourseIds);
      if (error) throw error;
    }

    const unassignedResourceIds = state.resources.filter(resource => !resource.workspace_id).map(resource => resource.id);
    if (unassignedResourceIds.length) {
      const { error } = await db.from('resources').update({ workspace_id: workspace.id }).in('id', unassignedResourceIds);
      if (error) throw error;
    }

    await loadApplicationData();
    showToast('Espacio principal reparado.', 'success');
    location.hash = `workspace/${workspace.id}`;
  } catch (error) {
    console.error(error);
    showToast('No se pudo reparar desde la interfaz. Ejecuta el archivo 12-reparar-administrador-espacios.sql.', 'error');
  }
}

async function createWorkspace(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const name = String(form.get('name') || '').trim();
  if (!name) return;
  setFormBusy(formElement, true);
  try {
    const { data: workspace, error } = await db.from('workspaces').insert({
      name,
      slug: `${slugify(name)}-${Date.now().toString().slice(-5)}`,
      description: String(form.get('description') || '').trim() || null,
      accent_color: String(form.get('accentColor') || '#005134'),
      created_by: state.user.id
    }).select().single();
    if (error) throw error;
    const { error: memberError } = await db.from('workspace_members').insert({
      workspace_id: workspace.id,
      user_id: state.user.id,
      role: 'owner'
    });
    if (memberError) throw memberError;
    showToast('Espacio creado correctamente.', 'success');
    await loadApplicationData();
    state.activeWorkspaceId = workspace.id;
    location.hash = `workspace/${workspace.id}`;
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo crear el espacio.', 'error');
  } finally {
    setFormBusy(formElement, false);
  }
}

async function renameWorkspace(workspaceId) {
  const workspace = state.workspaces.find(item => item.id === workspaceId);
  if (!workspace) return;
  const name = prompt('Nuevo nombre del espacio:', workspace.name);
  if (!name?.trim() || name.trim() === workspace.name) return;
  const { error } = await db.from('workspaces').update({ name: name.trim(), updated_at: new Date().toISOString() }).eq('id', workspaceId);
  if (error) return showToast(error.message, 'error');
  showToast('Espacio actualizado.', 'success');
  await loadApplicationData();
  renderWorkspaceOverview();
}

async function deleteWorkspace(workspaceId) {
  const workspace = state.workspaces.find(item => item.id === workspaceId);
  if (!workspace || workspaceCourseCount(workspaceId) || workspaceResourceCount(workspaceId)) return;
  if (!confirm(`¿Eliminar la carpeta “${workspace.name}”?`)) return;
  const { error } = await db.from('workspaces').delete().eq('id', workspaceId);
  if (error) return showToast(error.message, 'error');
  showToast('Espacio eliminado.', 'success');
  await loadApplicationData();
  renderWorkspaceOverview();
}

function renderWorkspaceAdmin(workspaceId) {
  const page = document.querySelector('#page');
  const generalMode = workspaceId === 'general' && isAdmin();
  const workspace = generalMode
    ? { id: 'general', name: 'Administración general', description: 'Vista de recuperación con todos los cursos, recursos y accesos de la plataforma.' }
    : state.workspaces.find(item => item.id === workspaceId);
  if (!workspace) { state.activeWorkspaceId = null; return renderWorkspaceOverview(); }
  const managedCourses = generalMode
    ? (state.courses || [])
    : (state.courses || []).filter(course => course.workspace_id === workspaceId && canManageCourseClient(course));
  const managedResources = generalMode
    ? (state.resources || [])
    : (state.resources || []).filter(resource => resource.workspace_id === workspaceId || managedCourses.some(course => course.id === resource.course_id));
  const publishedCourses = managedCourses.filter(course => course.status === 'published');
  const draftCourses = managedCourses.filter(course => course.status !== 'published');
  const totalModules = managedCourses.reduce((sum, course) => sum + (course.modules?.length || 0), 0);
  const totalLessons = managedCourses.reduce((sum, course) =>
    sum + (course.modules || []).reduce((moduleSum, module) => moduleSum + (module.lessons?.length || 0), 0), 0);
  const activeEnrollments = isAdmin()
    ? state.enrollments.filter(row => row.status !== 'cancelled')
    : [];

  const courseOptions = managedCourses.map(course =>
    `<option value="${course.id}">${escapeHtml(course.title)}</option>`
  ).join('');

  const studentOptions = state.profiles
    .filter(profile => profile.role === 'student')
    .map(profile => `<option value="${profile.id}">${escapeHtml(profile.full_name || profile.email)}</option>`)
    .join('');

  const courseCards = managedCourses.length
    ? managedCourses.map(course => {
        const moduleCount = course.modules?.length || 0;
        const lessonCount = (course.modules || []).reduce((sum, module) => sum + (module.lessons?.length || 0), 0);
        const enrollmentCount = isAdmin()
          ? activeEnrollments.filter(row => row.course_id === course.id).length
          : null;
        const isPublished = course.status === 'published';
        return `
          <article class="instructor-course-card">
            <div class="instructor-course-cover">
              <img src="${escapeHtml(cover(course))}" alt="Portada de ${escapeHtml(course.title)}" onerror="imageErrorFallback(event, 'curso-utah-driver.webp')">
              <span class="status-pill ${isPublished ? 'available' : ''}">${isPublished ? 'Publicado' : 'Borrador'}</span>
            </div>
            <div class="instructor-course-body">
              <span class="instructor-course-category">${escapeHtml(course.category || 'Formación')}</span>
              <h3>${escapeHtml(course.title)}</h3>
              <p>${escapeHtml(course.subtitle || course.description || 'Curso de Academia AG')}</p>
              <div class="instructor-course-metrics">
                <span><strong>${moduleCount}</strong> módulos</span>
                <span><strong>${lessonCount}</strong> lecciones</span>
                ${isAdmin() ? `<span><strong>${enrollmentCount}</strong> alumnos</span>` : ''}
              </div>
              <div class="instructor-course-actions">
                <a class="btn btn-primary" href="#builder/${escapeHtml(course.id)}">Editor por bloques</a>
                <button class="btn btn-secondary" type="button" data-admin-scroll="admin-content" data-select-course="${escapeHtml(course.id)}">Estructura rápida</button>
                ${isAdmin() ? `<button class="btn btn-secondary" type="button" data-admin-scroll="admin-users">Ver alumnos</button>` : ''}
                <button class="btn btn-secondary" type="button" data-course-status="${escapeHtml(course.id)}" data-next-status="${isPublished ? 'draft' : 'published'}">${isPublished ? 'Pasar a borrador' : 'Publicar'}</button>
                ${course.cover_path ? `<button class="btn btn-secondary" type="button" data-remove-course-cover="${escapeHtml(course.id)}">Quitar portada</button>` : ''}
                <button class="btn btn-danger" type="button" data-delete-course="${escapeHtml(course.id)}">Eliminar curso</button>
              </div>
            </div>
          </article>`;
      }).join('')
    : `
      <div class="instructor-empty-state">
        <span>＋</span>
        <h3>Aún no tienes cursos</h3>
        <p>Crea tu primer curso y después agrega módulos, lecciones y recursos.</p>
        <button class="btn btn-primary" type="button" data-admin-scroll="create-course-panel">Crear mi primer curso</button>
      </div>`;

  page.innerHTML = `
    <a class="back-link workspace-back-link" href="#admin">← Volver a espacios</a>
    <section class="instructor-hero workspace-admin-hero">
      <div>
        <span class="eyebrow">Espacio de trabajo</span>
        <h1>${escapeHtml(workspace.name)}</h1>
        <p>${escapeHtml(workspace.description || 'Cursos, libros, recursos y alumnos organizados dentro de esta carpeta.')}</p>
      </div>
      <button class="btn btn-primary" type="button" data-admin-scroll="create-course-panel">＋ Crear curso</button>
    </section>

    <nav class="workspace-admin-tabs" aria-label="Secciones administrativas">
      <a href="#admin-courses">Cursos</a>
      <a href="#admin-resources">Biblioteca y recursos</a>
      <a href="#admin-assessments">Evaluaciones</a>
      ${isAdmin() ? '<a href="#admin-instructors">Instructores</a>' : ''}
      ${isAdmin() ? '<a href="#access-center">Accesos y ventas</a><a href="#admin-notifications">Avisos</a><a href="#admin-support">Soporte</a><a href="#admin-users">Alumnos</a>' : ''}
      <a href="#create-course-panel">Crear contenido</a>
    </nav>

    <section class="instructor-summary-grid">
      <article class="instructor-summary-card">
        <span class="summary-icon">▤</span>
        <div><strong>${managedCourses.length}</strong><span>${isAdmin() ? 'Cursos administrados' : 'Mis cursos'}</span></div>
      </article>
      <article class="instructor-summary-card">
        <span class="summary-icon">✓</span>
        <div><strong>${publishedCourses.length}</strong><span>Publicados</span></div>
      </article>
      <article class="instructor-summary-card">
        <span class="summary-icon">◷</span>
        <div><strong>${draftCourses.length}</strong><span>Borradores</span></div>
      </article>
      <article class="instructor-summary-card">
        <span class="summary-icon">${isAdmin() ? '◎' : '≡'}</span>
        <div><strong>${isAdmin() ? activeEnrollments.length : totalLessons}</strong><span>${isAdmin() ? 'Inscripciones activas' : 'Lecciones creadas'}</span></div>
      </article>
    </section>

    <section class="instructor-quick-actions">
      <div>
        <span class="eyebrow">Acciones rápidas</span>
        <h2>¿Qué deseas hacer hoy?</h2>
      </div>
      <div class="instructor-action-buttons">
        <button type="button" data-admin-scroll="create-course-panel"><span>＋</span>Crear curso</button>
        <button type="button" data-admin-scroll="admin-content"><span>▤</span>Agregar contenido</button>
        <button type="button" data-admin-scroll="admin-resources"><span>▧</span>Subir recurso</button>
        <button type="button" data-admin-scroll="admin-assessments"><span>✓</span>Crear evaluación</button>
        ${isAdmin() ? '<button type="button" data-admin-scroll="admin-instructors"><span>♙</span>Asignar instructor</button>' : ''}
        ${isAdmin() ? '<button type="button" data-admin-scroll="access-center"><span>◆</span>Accesos y ventas</button><button type="button" data-admin-scroll="admin-notifications"><span>♢</span>Enviar aviso</button><button type="button" data-admin-scroll="admin-support"><span>?</span>Revisar soporte</button><button type="button" data-admin-scroll="admin-users"><span>◎</span>Gestionar usuarios</button>' : ''}
      </div>
    </section>

    <section class="instructor-section" id="admin-courses">
      <div class="section-heading instructor-section-heading">
        <div><span class="eyebrow">Catálogo académico</span><h2>${generalMode ? 'Todos los cursos' : isAdmin() ? 'Cursos del espacio' : 'Mis cursos'}</h2></div>
        <span class="section-count">${managedCourses.length} ${managedCourses.length === 1 ? 'curso' : 'cursos'}</span>
      </div>
      <div class="instructor-course-grid">${courseCards}</div>
    </section>

    <section class="instructor-workspace" id="create-course-panel">
      <div class="instructor-workspace-header">
        <div><span class="eyebrow">Constructor académico</span><h2>Crear y organizar contenido</h2></div>
        <p>Completa cada bloque en orden. No necesitas terminar todo el curso en una sola sesión.</p>
      </div>

      <div class="instructor-builder-grid">
        <article class="settings-card glass builder-card">
          <div class="builder-step"><span>1</span><div><strong>Crear curso</strong><small>Información general y publicación</small></div></div>
          <form id="course-form" class="stack-form"><input type="hidden" name="workspaceId" value="${escapeHtml(generalMode ? (state.workspaces[0]?.id || '') : workspace.id)}">
            <div class="field"><label>Título</label><input name="title" required></div>
            <div class="field"><label>Subtítulo</label><input name="subtitle"></div>
            <div class="field"><label>Descripción</label><textarea name="description" rows="3"></textarea></div>
            <div class="field"><label>Categoría</label><input name="category" value="Formación"></div>
            <div class="field">
              <label>Imagen de portada del curso</label>
              <input name="coverFile" type="file" accept="image/jpeg,image/png,image/webp">
              <small>JPG, PNG o WebP · máximo 5 MB. Recomendado: 1600 × 900 px.</small>
            </div>
            <div class="field"><label>Ruta de portada opcional</label><input name="coverUrl" placeholder="curso-utah-driver.webp o https://..."></div>
            <div class="form-two-columns">
              <div class="field"><label>Instructor</label><input name="instructorName" value="${escapeHtml(displayName())}"></div>
              <div class="field"><label>Duración</label><input name="durationLabel" placeholder="4 semanas"></div>
            </div>
            <div class="form-two-columns">
              <div class="field"><label>Precio MXN</label><input name="price" type="number" min="0" step="0.01"></div>
              <div class="field"><label>Precio promocional</label><input name="salePrice" type="number" min="0" step="0.01"></div>
            </div>
            <div class="field"><label>Enlace de pago</label><input name="paymentUrl" type="url" placeholder="https://tu-enlace-de-pago.com/..."></div>
            <div class="form-two-columns">
              <div class="field"><label>Estado</label><select name="status"><option value="draft">Borrador</option><option value="published">Publicado</option></select></div>
              <label class="switch-field"><input name="featured" type="checkbox"><span>Curso destacado</span></label>
            </div>
            <button class="btn btn-primary">Crear curso</button>
          </form>
        </article>

        <article class="settings-card glass builder-card">
          <div class="builder-step"><span>2</span><div><strong>Agregar módulo</strong><small>Divide el curso en etapas claras</small></div></div>
          <form id="module-form" class="stack-form">
            <div class="field"><label>Curso</label><select name="courseId" required>${courseOptions || '<option value="">Primero crea un curso</option>'}</select></div>
            <div class="field"><label>Título del módulo</label><input name="title" required></div>
            <div class="field"><label>Posición</label><input name="position" type="number" min="1" value="1"></div>
            <button class="btn btn-primary" ${!courseOptions ? 'disabled' : ''}>Agregar módulo</button>
          </form>
        </article>

        ${isAdmin() ? `<article class="settings-card glass builder-card">
          <div class="builder-step"><span>3</span><div><strong>Asignar curso</strong><small>Concede acceso a un alumno</small></div></div>
          <form id="enrollment-form" class="stack-form">
            <div class="field"><label>Alumno</label><select name="userId" required>${studentOptions || '<option value="">No hay alumnos registrados</option>'}</select></div>
            <div class="field"><label>Curso</label><select name="courseId" required>${courseOptions || '<option value="">No hay cursos disponibles</option>'}</select></div>
            <button class="btn btn-primary" ${!studentOptions || !courseOptions ? 'disabled' : ''}>Asignar acceso</button>
          </form>
        </article>` : ''}
      </div>
    </section>

    <section class="settings-card glass instructor-content-panel" id="admin-content">
      <div class="builder-step"><span>${isAdmin() ? '4' : '3'}</span><div><strong>Agregar lección</strong><small>Incorpora video, duración y contenido a un módulo</small></div></div>
      <form id="lesson-form" class="admin-form admin-form-wide">
        <select name="moduleId" required>
          ${managedCourses.flatMap(course => course.modules.map(module =>
            `<option value="${module.id}" data-course-id="${course.id}">${escapeHtml(course.title)} — ${escapeHtml(module.title)}</option>`
          )).join('') || '<option value="">Primero crea un módulo</option>'}
        </select>
        <input name="title" placeholder="Título de la lección" required>
        <input name="videoUrl" placeholder="URL incrustable de video">
        <input name="duration" type="number" min="0" value="10" placeholder="Minutos">
        <button class="btn btn-primary" ${totalModules === 0 ? 'disabled' : ''}>Agregar</button>
      </form>
    </section>

    <section class="settings-card glass instructor-content-panel" id="course-structure-manager">
      <div class="section-heading instructor-section-heading">
        <div><span class="eyebrow">Constructor visual</span><h2>Organizar módulos y lecciones</h2></div>
        <span class="section-count">${totalModules} módulos · ${totalLessons} lecciones</span>
      </div>
      <p class="page-subtitle">Edita títulos, cambia el orden o elimina contenido sin afectar los demás cursos.</p>
      <div class="course-structure-list">
        ${managedCourses.length ? managedCourses.map(course => `
          <article class="structure-course-card">
            <div class="structure-course-header">
              <div>
                <span class="status-pill ${course.status === 'published' ? 'available' : ''}">${course.status === 'published' ? 'Publicado' : 'Borrador'}</span>
                <h3>${escapeHtml(course.title)}</h3>
              </div>
              <button class="btn btn-secondary" type="button" data-admin-scroll="admin-content" data-select-course="${escapeHtml(course.id)}">Agregar lección</button>
            </div>
            <div class="structure-modules">
              ${(course.modules || []).length ? course.modules.map((module, moduleIndex) => `
                <section class="structure-module-card">
                  <div class="structure-module-header">
                    <div class="structure-order-number">${moduleIndex + 1}</div>
                    <div class="structure-title-block">
                      <strong>${escapeHtml(module.title)}</strong>
                      <small>${module.lessons?.length || 0} ${(module.lessons?.length || 0) === 1 ? 'lección' : 'lecciones'}</small>
                    </div>
                    <div class="structure-actions">
                      <button type="button" title="Subir módulo" data-move-module="${escapeHtml(module.id)}" data-direction="up" ${moduleIndex === 0 ? 'disabled' : ''}>↑</button>
                      <button type="button" title="Bajar módulo" data-move-module="${escapeHtml(module.id)}" data-direction="down" ${moduleIndex === course.modules.length - 1 ? 'disabled' : ''}>↓</button>
                      <button type="button" title="Editar módulo" data-edit-module="${escapeHtml(module.id)}">Editar</button>
                      <button class="danger" type="button" title="Eliminar módulo" data-delete-module="${escapeHtml(module.id)}">Eliminar</button>
                    </div>
                  </div>
                  <div class="structure-lessons">
                    ${(module.lessons || []).length ? module.lessons.map((lesson, lessonIndex) => `
                      <div class="structure-lesson-row">
                        <span class="lesson-position">${lessonIndex + 1}</span>
                        <div class="structure-title-block">
                          <strong>${escapeHtml(lesson.title)}</strong>
                          <small>${Number(lesson.duration_minutes) || 0} min${lesson.video_url ? ' · Video' : ''}</small>
                        </div>
                        <div class="structure-actions lesson-actions">
                          <button type="button" title="Subir lección" data-move-lesson="${escapeHtml(lesson.id)}" data-direction="up" ${lessonIndex === 0 ? 'disabled' : ''}>↑</button>
                          <button type="button" title="Bajar lección" data-move-lesson="${escapeHtml(lesson.id)}" data-direction="down" ${lessonIndex === module.lessons.length - 1 ? 'disabled' : ''}>↓</button>
                          <button type="button" data-edit-lesson="${escapeHtml(lesson.id)}">Editar</button>
                          <button class="danger" type="button" data-delete-lesson="${escapeHtml(lesson.id)}">Eliminar</button>
                        </div>
                      </div>
                    `).join('') : '<div class="structure-empty">Este módulo todavía no tiene lecciones.</div>'}
                  </div>
                </section>
              `).join('') : '<div class="structure-empty">Este curso todavía no tiene módulos.</div>'}
            </div>
          </article>
        `).join('') : '<div class="instructor-empty-state"><span>▤</span><h3>Aún no hay contenido</h3><p>Crea un curso y después organiza sus módulos y lecciones aquí.</p></div>'}
      </div>
    </section>

    <section class="settings-card glass instructor-content-panel" id="admin-resources">
      <div class="builder-step"><span>${isAdmin() ? '5' : '4'}</span><div><strong>Agregar libro o recurso</strong><small>Entrega materiales privados a tus alumnos</small></div></div>
      <p class="page-subtitle">El archivo se guarda en un depósito privado y solo lo abren las personas autorizadas.</p>
      <form id="resource-form" class="admin-form admin-resource-form"><input type="hidden" name="workspaceId" value="${escapeHtml(generalMode ? (state.workspaces[0]?.id || '') : workspace.id)}">
        <select name="courseId"><option value="">Recurso general</option>${courseOptions}</select>
        <input name="title" placeholder="Título del recurso" required>
        <select name="resourceType" required><option value="book">Libro digital</option><option value="pdf">PDF</option><option value="template">Plantilla</option><option value="audio">Audio</option><option value="link">Enlace</option></select>
        <input name="externalUrl" type="url" placeholder="Enlace externo opcional">
        <label class="file-field"><span>Portada del libro o manual</span><input name="thumbnailFile" type="file" accept="image/jpeg,image/png,image/webp"></label>
        <small class="field-help">JPG, PNG o WebP · máximo 5 MB. Recomendado para libros: 1200 × 1800 px.</small>
        <label class="file-field"><span>Archivo privado</span><input name="file" type="file" accept=".html,.htm,.pdf,.epub,.zip,.mp3,.m4a,.wav"></label>
        <button class="btn btn-primary">Guardar recurso</button>
      </form>
      <div class="demo-note">Para un libro digital usa el archivo HTML autocontenido. No lo subas al repositorio público.</div>
    </section>

    <section class="settings-card glass instructor-content-panel" id="admin-resource-list">
      <div class="section-heading"><div><span class="eyebrow">Biblioteca administrada</span><h2>Libros, manuales y recursos</h2></div><span class="section-count">${managedResources.length} recursos</span></div>
      <div class="admin-resource-grid">
        ${managedResources.length ? managedResources.map(resource => `
          <article class="admin-resource-card">
            <img src="${escapeHtml(normalizeMediaUrl(resource.thumbnail_url, resource.resource_type === 'book' ? 'recurso-utah-driver.webp' : 'recurso-manual-ag.webp'))}" alt="Portada de ${escapeHtml(resource.title)}" onerror="imageErrorFallback(event, 'recurso-manual-ag.webp')">
            <div>
              <span class="status-pill">${escapeHtml(resource.resource_type || 'recurso')}</span>
              <h3>${escapeHtml(resource.title)}</h3>
              <p>${escapeHtml(managedCourses.find(course => course.id === resource.course_id)?.title || 'Recurso general')}</p>
              <div class="instructor-course-actions">
                ${resource.thumbnail_path ? `<button class="btn btn-secondary" type="button" data-remove-resource-cover="${escapeHtml(resource.id)}">Quitar portada</button>` : ''}
                <button class="btn btn-danger" type="button" data-delete-resource="${escapeHtml(resource.id)}">Eliminar recurso</button>
              </div>
            </div>
          </article>
        `).join('') : '<div class="instructor-empty-state"><span>▧</span><h3>Aún no hay recursos</h3><p>Sube un libro, manual, PDF o material de apoyo.</p></div>'}
      </div>
    </section>


    ${renderAssessmentAdminMarkup(managedCourses)}
    ${isAdmin() ? renderInstructorAssignmentsMarkup(managedCourses) : ''}
    ${isAdmin() ? renderNotificationsAdminMarkup() : ''}
    ${isAdmin() ? renderSupportAdminMarkup() : ''}

    ${isAdmin() ? renderAccessCenterMarkup(workspace, managedCourses, managedResources, studentOptions) : ''}

    ${isAdmin() ? `<section class="settings-card glass instructor-content-panel" id="admin-users">
      <div class="section-heading"><div><span class="eyebrow">Comunidad</span><h2>Usuarios e inscripciones</h2></div></div>
      <div class="admin-table-wrap"><table class="admin-table">
        <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Cursos asignados</th><th>Acción</th></tr></thead>
        <tbody>${state.profiles.map(profile => {
          const assigned = state.enrollments.filter(row => row.user_id === profile.id && row.status !== 'cancelled').map(row => managedCourses.find(course => course.id === row.course_id)?.title).filter(Boolean);
          const accountStatus = profile.account_status || 'active';
          const statusLabel = accountStatus === 'active' ? 'Activo' : accountStatus === 'suspended' ? 'Suspendido' : 'Inactivo';
          const nextStatus = accountStatus === 'active' ? 'suspended' : 'active';
          return `<tr>
            <td>${escapeHtml(profile.full_name || 'Sin nombre')}</td>
            <td>${escapeHtml(profile.email || '')}</td>
            <td><select data-role-user="${escapeHtml(profile.id)}" ${profile.id === state.user.id ? 'disabled' : ''}><option value="student" ${profile.role === 'student' ? 'selected' : ''}>Alumno</option><option value="instructor" ${profile.role === 'instructor' ? 'selected' : ''}>Instructor</option><option value="admin" ${profile.role === 'admin' ? 'selected' : ''}>Administrador</option></select></td>
            <td><span class="status-pill ${accountStatus === 'active' ? 'available' : ''}">${statusLabel}</span></td>
            <td>${escapeHtml(assigned.join(', ') || 'Ninguno')}</td>
            <td>${profile.id === state.user.id ? '<small>Cuenta actual</small>' : `<button class="btn ${accountStatus === 'active' ? 'btn-danger' : 'btn-secondary'} btn-compact" type="button" data-account-status="${escapeHtml(profile.id)}" data-next-status="${nextStatus}">${accountStatus === 'active' ? 'Suspender' : 'Reactivar'}</button>`}</td>
          </tr>`;
        }).join('')}</tbody>
      </table></div>
    </section>` : ''}`;

  document.querySelector('#course-form')?.addEventListener('submit', createCourse);
  document.querySelector('#module-form')?.addEventListener('submit', createModule);
  document.querySelector('#lesson-form')?.addEventListener('submit', createLesson);
  document.querySelector('#resource-form')?.addEventListener('submit', createResource);
  document.querySelector('#assessment-admin-form')?.addEventListener('submit', createAssessment);
  document.querySelector('#assessment-question-form')?.addEventListener('submit', createAssessmentQuestion);
  document.querySelectorAll('[data-assessment-status]').forEach(button => button.addEventListener('click', () => setAssessmentStatus(button.dataset.assessmentStatus, button.dataset.nextStatus)));
  document.querySelectorAll('[data-delete-assessment]').forEach(button => button.addEventListener('click', () => deleteAssessment(button.dataset.deleteAssessment)));
  document.querySelector('#course-instructor-form')?.addEventListener('submit', assignCourseInstructor);
  document.querySelectorAll('[data-remove-course-instructor]').forEach(button => button.addEventListener('click', () => removeCourseInstructor(button.dataset.removeCourseInstructor)));
  document.querySelector('#admin-notification-form')?.addEventListener('submit', createAdminNotification);
  document.querySelectorAll('[data-delete-notification]').forEach(button => button.addEventListener('click', () => deleteAdminNotification(button.dataset.deleteNotification)));
  document.querySelectorAll('[data-ticket-status]').forEach(button => button.addEventListener('click', () => updateSupportTicketStatus(button.dataset.ticketStatus, button.dataset.nextStatus)));
  document.querySelector('#enrollment-form')?.addEventListener('submit', assignCourse);
  document.querySelector('#product-form')?.addEventListener('submit', createProduct);
  document.querySelector('#manual-access-form')?.addEventListener('submit', grantProductAccess);
  document.querySelectorAll('[data-product-toggle]').forEach(button =>
    button.addEventListener('click', () => toggleProductStatus(button.dataset.productToggle, button.dataset.nextStatus))
  );
  document.querySelectorAll('[data-product-delete]').forEach(button =>
    button.addEventListener('click', () => deleteProduct(button.dataset.productDelete))
  );
  document.querySelectorAll('[data-access-status]').forEach(button =>
    button.addEventListener('click', () => changeStudentAccessStatus(button.dataset.accessStatus, button.dataset.nextStatus))
  );
  document.querySelector('#access-search')?.addEventListener('input', filterAccessRows);
  document.querySelectorAll('[data-course-status]').forEach(button =>
    button.addEventListener('click', () => setCourseStatus(button.dataset.courseStatus, button.dataset.nextStatus))
  );
  document.querySelectorAll('[data-delete-course]').forEach(button =>
    button.addEventListener('click', () => deleteCourse(button.dataset.deleteCourse))
  );
  document.querySelectorAll('[data-remove-course-cover]').forEach(button =>
    button.addEventListener('click', () => removeCourseCover(button.dataset.removeCourseCover))
  );
  document.querySelectorAll('[data-delete-resource]').forEach(button =>
    button.addEventListener('click', () => deleteResource(button.dataset.deleteResource))
  );
  document.querySelectorAll('[data-remove-resource-cover]').forEach(button =>
    button.addEventListener('click', () => removeResourceCover(button.dataset.removeResourceCover))
  );
  document.querySelectorAll('[data-edit-module]').forEach(button =>
    button.addEventListener('click', () => editModule(button.dataset.editModule))
  );
  document.querySelectorAll('[data-delete-module]').forEach(button =>
    button.addEventListener('click', () => deleteModule(button.dataset.deleteModule))
  );
  document.querySelectorAll('[data-move-module]').forEach(button =>
    button.addEventListener('click', () => moveModule(button.dataset.moveModule, button.dataset.direction))
  );
  document.querySelectorAll('[data-edit-lesson]').forEach(button =>
    button.addEventListener('click', () => editLesson(button.dataset.editLesson))
  );
  document.querySelectorAll('[data-delete-lesson]').forEach(button =>
    button.addEventListener('click', () => deleteLesson(button.dataset.deleteLesson))
  );
  document.querySelectorAll('[data-move-lesson]').forEach(button =>
    button.addEventListener('click', () => moveLesson(button.dataset.moveLesson, button.dataset.direction))
  );
  document.querySelectorAll('[data-role-user]').forEach(select =>
    select.addEventListener('change', () => updateUserRole(select.dataset.roleUser, select.value))
  );
  document.querySelectorAll('[data-account-status]').forEach(button =>
    button.addEventListener('click', () => changeUserAccountStatus(button.dataset.accountStatus, button.dataset.nextStatus))
  );
  document.querySelectorAll('[data-admin-scroll]').forEach(button =>
    button.addEventListener('click', () => {
      const target = document.querySelector(`#${button.dataset.adminScroll}`);
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (button.dataset.selectCourse) {
        const moduleCourseSelect = document.querySelector('#module-form select[name="courseId"]');
        const resourceCourseSelect = document.querySelector('#resource-form select[name="courseId"]');
        if (moduleCourseSelect) moduleCourseSelect.value = button.dataset.selectCourse;
        if (resourceCourseSelect) resourceCourseSelect.value = button.dataset.selectCourse;
        const lessonSelect = document.querySelector('#lesson-form select[name="moduleId"]');
        const matchingOption = lessonSelect ? [...lessonSelect.options].find(option => option.dataset.courseId === button.dataset.selectCourse) : null;
        if (matchingOption) lessonSelect.value = matchingOption.value;
      }
    })
  );
}


function renderAssessmentAdminMarkup(courses) {
  const courseIds = new Set((courses || []).map(course => course.id));
  const assessments = (state.assessments || []).filter(item => courseIds.has(item.course_id) && item.status !== 'archived');
  const courseOptions = (courses || []).map(course => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join('');
  const assessmentOptions = assessments.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.title)}</option>`).join('');

  return `<section class="settings-card glass instructor-content-panel" id="admin-assessments">
    <div class="section-heading">
      <div><span class="eyebrow">Control académico</span><h2>Evaluaciones y criterios de aprobación</h2></div>
      <span class="section-count">${assessments.length} ${assessments.length === 1 ? 'evaluación' : 'evaluaciones'}</span>
    </div>
    <p class="page-subtitle">Crea evaluaciones protegidas. Las respuestas correctas permanecen en Supabase y la calificación se calcula en el servidor.</p>

    <div class="assessment-admin-grid">
      <form id="assessment-admin-form" class="stack-form assessment-admin-form">
        <div class="builder-step"><span>1</span><div><strong>Crear evaluación</strong><small>Define curso, calificación mínima e intentos</small></div></div>
        <div class="field"><label>Curso</label><select name="courseId" required><option value="">Selecciona un curso</option>${courseOptions}</select></div>
        <div class="field"><label>Título</label><input name="title" placeholder="Ej. Evaluación final · Clase 1" required maxlength="140"></div>
        <div class="field"><label>Descripción</label><textarea name="description" rows="3" placeholder="Indicaciones para el alumno"></textarea></div>
        <div class="form-two-columns">
          <div class="field"><label>Calificación mínima (%)</label><input name="passScore" type="number" min="0" max="100" step="1" value="80" required></div>
          <div class="field"><label>Intentos permitidos</label><input name="maxAttempts" type="number" min="1" max="20" step="1" value="3" required></div>
        </div>
        <div class="field"><label>Estado inicial</label><select name="status"><option value="draft">Borrador</option><option value="published">Publicada</option></select></div>
        <button class="btn btn-primary" type="submit" ${courses?.length ? '' : 'disabled'}>Crear evaluación</button>
      </form>

      <form id="assessment-question-form" class="stack-form assessment-question-form">
        <div class="builder-step"><span>2</span><div><strong>Agregar pregunta</strong><small>Marca una sola respuesta correcta</small></div></div>
        <div class="field"><label>Evaluación</label><select name="assessmentId" required><option value="">Selecciona una evaluación</option>${assessmentOptions}</select></div>
        <div class="field"><label>Pregunta</label><textarea name="question" rows="3" required placeholder="Escribe la pregunta"></textarea></div>
        <div class="assessment-option-editor">
          <label><span>Respuesta A</span><input name="option0" required></label>
          <label><span>Respuesta B</span><input name="option1" required></label>
          <label><span>Respuesta C</span><input name="option2"></label>
          <label><span>Respuesta D</span><input name="option3"></label>
        </div>
        <div class="form-two-columns">
          <div class="field"><label>Respuesta correcta</label><select name="correctIndex" required><option value="0">A</option><option value="1">B</option><option value="2">C</option><option value="3">D</option></select></div>
          <div class="field"><label>Puntos</label><input name="points" type="number" min="0.25" max="100" step="0.25" value="1" required></div>
        </div>
        <button class="btn btn-primary" type="submit" ${assessments.length ? '' : 'disabled'}>Guardar pregunta</button>
      </form>
    </div>

    <div class="assessment-admin-list">
      ${assessments.length ? assessments.map(item => {
        const course = courses.find(course => course.id === item.course_id);
        const isPublished = item.status === 'published';
        return `<article class="assessment-admin-card">
          <div>
            <span class="status-pill ${isPublished ? 'available' : ''}">${isPublished ? 'Publicada' : 'Borrador'}</span>
            <h3>${escapeHtml(item.title)}</h3>
            <p>${escapeHtml(course?.title || 'Curso')} · Aprueba con ${Number(item.pass_score || 0)}% · ${Number(item.max_attempts || 1)} intentos</p>
          </div>
          <div class="assessment-admin-actions">
            <button class="btn btn-secondary btn-compact" type="button" data-assessment-status="${escapeHtml(item.id)}" data-next-status="${isPublished ? 'draft' : 'published'}">${isPublished ? 'Pasar a borrador' : 'Publicar'}</button>
            <button class="btn btn-danger btn-compact" type="button" data-delete-assessment="${escapeHtml(item.id)}">Eliminar</button>
          </div>
        </article>`;
      }).join('') : '<div class="instructor-empty-state"><span>✓</span><h3>Aún no hay evaluaciones</h3><p>Crea la primera evaluación y después agrega sus preguntas.</p></div>'}
    </div>
  </section>`;
}

async function createAssessment(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const courseId = String(form.get('courseId') || '');
  const title = String(form.get('title') || '').trim();
  if (!courseId || !title) return;
  setFormBusy(formElement, true);
  try {
    const { error } = await db.from('assessments').insert({
      course_id: courseId,
      title,
      description: String(form.get('description') || '').trim() || null,
      pass_score: Number(form.get('passScore') || 80),
      max_attempts: Number(form.get('maxAttempts') || 3),
      status: String(form.get('status') || 'draft'),
      created_by: state.user.id
    });
    if (error) throw error;
    await loadApplicationData();
    showToast('Evaluación creada.', 'success');
    renderAdmin();
    requestAnimationFrame(() => document.querySelector('#admin-assessments')?.scrollIntoView({ behavior: 'smooth' }));
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo crear la evaluación.', 'error');
  } finally {
    setFormBusy(formElement, false);
  }
}

async function createAssessmentQuestion(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const assessmentId = String(form.get('assessmentId') || '');
  const questionText = String(form.get('question') || '').trim();
  const rawOptions = [0,1,2,3].map(index => String(form.get(`option${index}`) || '').trim());
  const correctIndex = Number(form.get('correctIndex'));
  const options = rawOptions.map((text, index) => ({ text, index })).filter(item => item.text);
  if (!assessmentId || !questionText || options.length < 2) return showToast('Agrega por lo menos dos respuestas.', 'error');
  if (!rawOptions[correctIndex]) return showToast('La respuesta marcada como correcta debe tener texto.', 'error');

  setFormBusy(formElement, true);
  try {
    const { data: lastPositions, error: positionError } = await db.from('assessment_questions')
      .select('position').eq('assessment_id', assessmentId).order('position', { ascending: false }).limit(1);
    if (positionError) throw positionError;
    const position = Number(lastPositions?.[0]?.position || 0) + 1;
    const { data: question, error: questionError } = await db.from('assessment_questions').insert({
      assessment_id: assessmentId,
      question_text: questionText,
      position,
      points: Number(form.get('points') || 1)
    }).select().single();
    if (questionError) throw questionError;

    const { error: optionsError } = await db.from('assessment_options').insert(options.map((item, positionIndex) => ({
      question_id: question.id,
      option_text: item.text,
      is_correct: item.index === correctIndex,
      position: positionIndex + 1
    })));
    if (optionsError) throw optionsError;

    formElement.reset();
    const assessmentSelect = formElement.querySelector('[name="assessmentId"]');
    if (assessmentSelect) assessmentSelect.value = assessmentId;
    const pointsInput = formElement.querySelector('[name="points"]');
    if (pointsInput) pointsInput.value = '1';
    showToast('Pregunta guardada.', 'success');
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo guardar la pregunta.', 'error');
  } finally {
    setFormBusy(formElement, false);
  }
}

async function setAssessmentStatus(assessmentId, status) {
  try {
    const { error } = await db.from('assessments').update({ status, updated_at: new Date().toISOString() }).eq('id', assessmentId);
    if (error) throw error;
    await loadApplicationData();
    showToast(status === 'published' ? 'Evaluación publicada.' : 'Evaluación en borrador.', 'success');
    renderAdmin();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo actualizar la evaluación.', 'error');
  }
}

async function deleteAssessment(assessmentId) {
  const assessment = state.assessments.find(item => item.id === assessmentId);
  if (!assessment || !confirm(`¿Eliminar la evaluación “${assessment.title}” y sus preguntas?`)) return;
  try {
    const { error } = await db.from('assessments').delete().eq('id', assessmentId);
    if (error) throw error;
    await loadApplicationData();
    showToast('Evaluación eliminada.', 'success');
    renderAdmin();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo eliminar la evaluación.', 'error');
  }
}


function renderInstructorAssignmentsMarkup(courses) {
  const courseIds = new Set((courses || []).map(course => course.id));
  const assignments = (state.courseInstructors || []).filter(item => courseIds.has(item.course_id));
  const instructors = (state.profiles || []).filter(profile => profile.role === 'instructor' && (profile.account_status || 'active') === 'active');
  const courseOptions = (courses || []).map(course => `<option value="${escapeHtml(course.id)}">${escapeHtml(course.title)}</option>`).join('');
  const instructorOptions = instructors.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.full_name || profile.email || 'Instructor')}</option>`).join('');

  return `<section class="settings-card glass instructor-content-panel" id="admin-instructors">
    <div class="section-heading"><div><span class="eyebrow">Equipo académico</span><h2>Asignación de instructores</h2></div><span class="section-count">${assignments.length} asignaciones</span></div>
    <p class="page-subtitle">Un instructor solo puede editar cursos que haya creado o que el administrador le asigne expresamente.</p>
    <form id="course-instructor-form" class="instructor-assignment-form">
      <label><span>Curso</span><select name="courseId" required><option value="">Selecciona un curso</option>${courseOptions}</select></label>
      <label><span>Instructor activo</span><select name="userId" required><option value="">Selecciona un instructor</option>${instructorOptions}</select></label>
      <button class="btn btn-primary" type="submit" ${!courses?.length || !instructors.length ? 'disabled' : ''}>Asignar instructor</button>
    </form>
    ${!instructors.length ? '<div class="demo-note">Primero cambia el rol de una cuenta a Instructor en la sección “Usuarios e inscripciones”.</div>' : ''}
    <div class="instructor-assignment-list">
      ${assignments.length ? assignments.map(item => {
        const course = courses.find(course => course.id === item.course_id);
        const profile = state.profiles.find(profile => profile.id === item.user_id);
        return `<article><div><strong>${escapeHtml(profile?.full_name || profile?.email || 'Instructor')}</strong><small>${escapeHtml(course?.title || 'Curso')}</small></div><button class="btn btn-danger btn-compact" type="button" data-remove-course-instructor="${escapeHtml(item.id)}">Quitar asignación</button></article>`;
      }).join('') : '<p class="page-subtitle">Todavía no hay instructores asignados a estos cursos.</p>'}
    </div>
  </section>`;
}

async function assignCourseInstructor(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const courseId = String(form.get('courseId') || '');
  const userId = String(form.get('userId') || '');
  if (!courseId || !userId) return;
  setFormBusy(formElement, true);
  try {
    const { error } = await db.rpc('admin_assign_course_instructor', { target_course: courseId, target_user: userId });
    if (error) throw error;
    await loadApplicationData();
    showToast('Instructor asignado al curso.', 'success');
    renderAdmin();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo asignar el instructor.', 'error');
  } finally {
    setFormBusy(formElement, false);
  }
}

async function removeCourseInstructor(assignmentId) {
  const assignment = (state.courseInstructors || []).find(item => item.id === assignmentId);
  if (!assignment || !confirm('¿Quitar esta asignación de instructor?')) return;
  try {
    const { error } = await db.rpc('admin_remove_course_instructor', { target_assignment: assignmentId });
    if (error) throw error;
    await loadApplicationData();
    showToast('Asignación eliminada.', 'success');
    renderAdmin();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo quitar la asignación.', 'error');
  }
}

function renderNotificationsAdminMarkup() {
  const profiles = (state.profiles || []).filter(profile => profile.account_status !== 'inactive');
  const targetOptions = profiles.map(profile => `<option value="${escapeHtml(profile.id)}">${escapeHtml(profile.full_name || profile.email || 'Usuario')} · ${escapeHtml(profile.role || 'student')}</option>`).join('');
  const notices = (state.notifications || []).slice(0, 12);

  return `<section class="settings-card glass instructor-content-panel" id="admin-notifications">
    <div class="section-heading"><div><span class="eyebrow">Comunicación interna</span><h2>Avisos y notificaciones</h2></div><span class="section-count">${notices.length} recientes</span></div>
    <p class="page-subtitle">Envía un aviso general a toda la academia o dirígelo a una sola cuenta. Los alumnos lo verán en la campana de notificaciones.</p>
    <form id="admin-notification-form" class="admin-form notification-admin-form">
      <select name="targetUser"><option value="">Toda la academia</option>${targetOptions}</select>
      <select name="notificationType"><option value="general">Aviso general</option><option value="course">Curso</option><option value="event">Evento</option><option value="account">Cuenta</option><option value="support">Soporte</option><option value="certificate">Certificado</option></select>
      <input name="title" maxlength="140" placeholder="Título del aviso" required>
      <input name="href" placeholder="#courses, #agenda, #help…">
      <textarea name="message" rows="4" maxlength="1200" placeholder="Mensaje para el alumno" required></textarea>
      <div class="field"><label>Vencimiento opcional</label><input name="expiresAt" type="datetime-local"></div>
      <button class="btn btn-primary" type="submit">Enviar aviso</button>
    </form>
    <div class="notification-admin-list">
      ${notices.length ? notices.map(item => {
        const target = item.target_user ? state.profiles.find(profile => profile.id === item.target_user) : null;
        return `<article class="assessment-admin-item">
          <div><span class="status-pill">${escapeHtml(notificationMeta(item.notification_type)[1])}</span><h3>${escapeHtml(item.title)}</h3><p>${escapeHtml(item.message)}</p><small>${target ? `Para: ${escapeHtml(target.full_name || target.email || 'Usuario')}` : 'Para: toda la academia'} · ${new Date(item.created_at).toLocaleString('es-MX')}</small></div>
          <div class="assessment-admin-actions"><button class="btn btn-danger btn-compact" type="button" data-delete-notification="${escapeHtml(item.id)}">Eliminar</button></div>
        </article>`;
      }).join('') : '<div class="instructor-empty-state"><span>♢</span><h3>Aún no hay avisos</h3><p>Crea el primer mensaje para la comunidad académica.</p></div>'}
    </div>
  </section>`;
}

async function createAdminNotification(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const href = safeNotificationHref(String(form.get('href') || '').trim());
  const expiresRaw = String(form.get('expiresAt') || '').trim();
  setFormBusy(formElement, true);
  try {
    const { error } = await db.from('notifications').insert({
      target_user: String(form.get('targetUser') || '').trim() || null,
      notification_type: String(form.get('notificationType') || 'general'),
      title: String(form.get('title') || '').trim(),
      message: String(form.get('message') || '').trim(),
      href,
      created_by: state.user.id,
      expires_at: expiresRaw ? new Date(expiresRaw).toISOString() : null
    });
    if (error) throw error;
    await loadApplicationData();
    showToast('Aviso enviado.', 'success');
    renderAdmin();
    requestAnimationFrame(() => document.querySelector('#admin-notifications')?.scrollIntoView({ behavior: 'smooth' }));
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo enviar el aviso.', 'error');
  } finally {
    setFormBusy(formElement, false);
  }
}

async function deleteAdminNotification(notificationId) {
  if (!confirm('¿Eliminar este aviso?')) return;
  try {
    const { error } = await db.from('notifications').delete().eq('id', notificationId);
    if (error) throw error;
    await loadApplicationData();
    showToast('Aviso eliminado.', 'success');
    renderAdmin();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo eliminar el aviso.', 'error');
  }
}

function renderSupportAdminMarkup() {
  const tickets = (state.supportTickets || []).slice(0, 50);
  const openCount = tickets.filter(ticket => ['open','in_progress'].includes(ticket.status)).length;
  return `<section class="settings-card glass instructor-content-panel" id="admin-support">
    <div class="section-heading"><div><span class="eyebrow">Atención al alumno</span><h2>Centro de soporte</h2></div><span class="section-count">${openCount} pendientes</span></div>
    <p class="page-subtitle">Revisa solicitudes de acceso, cursos, evaluaciones, certificados, pagos y problemas técnicos.</p>
    <div class="support-admin-list">
      ${tickets.length ? tickets.map(ticket => {
        const user = state.profiles.find(profile => profile.id === ticket.user_id);
        return `<article class="support-admin-card">
          <div class="support-admin-copy">
            <div><span class="status-pill ${ticket.status === 'resolved' ? 'available' : ''}">${escapeHtml(ticket.status || 'open')}</span><span class="ticket-category">${escapeHtml(ticket.category || 'general')}</span></div>
            <h3>${escapeHtml(ticket.subject)}</h3>
            <p>${escapeHtml(ticket.message)}</p>
            <small>${escapeHtml(user?.full_name || user?.email || 'Alumno')} · ${new Date(ticket.created_at).toLocaleString('es-MX')}</small>
          </div>
          <div class="assessment-admin-actions">
            ${ticket.status === 'open' ? `<button class="btn btn-secondary btn-compact" type="button" data-ticket-status="${escapeHtml(ticket.id)}" data-next-status="in_progress">En proceso</button>` : ''}
            ${ticket.status !== 'resolved' ? `<button class="btn btn-primary btn-compact" type="button" data-ticket-status="${escapeHtml(ticket.id)}" data-next-status="resolved">Resolver</button>` : `<button class="btn btn-secondary btn-compact" type="button" data-ticket-status="${escapeHtml(ticket.id)}" data-next-status="closed">Cerrar</button>`}
          </div>
        </article>`;
      }).join('') : '<div class="instructor-empty-state"><span>?</span><h3>Sin tickets pendientes</h3><p>Las solicitudes enviadas desde el Centro de ayuda aparecerán aquí.</p></div>'}
    </div>
  </section>`;
}

async function updateSupportTicketStatus(ticketId, status) {
  try {
    const { error } = await db.from('support_tickets').update({ status, updated_at: new Date().toISOString() }).eq('id', ticketId);
    if (error) throw error;
    await loadApplicationData();
    showToast('Ticket actualizado.', 'success');
    renderAdmin();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo actualizar el ticket.', 'error');
  }
}


function productTypeLabel(type) {
  return ({course:'Curso',book:'Libro digital',manual:'Manual',webinar:'Webinar',bundle:'Paquete',membership:'Membresía',free:'Acceso gratuito'})[type] || 'Producto';
}
function accessStatusLabel(status) {
  return ({active:'Activo',suspended:'Suspendido',revoked:'Revocado',expired:'Vencido'})[status] || status || 'Sin estado';
}
function workspaceProducts(workspaceId) {
  return (state.products || []).filter(product => product.workspace_id === workspaceId);
}
function productContentSummary(productId, courses, resources) {
  const labels = (state.productContents || []).filter(row => row.product_id === productId).map(row => {
    if (row.content_type === 'course') return courses.find(item => item.id === row.course_id)?.title || 'Curso';
    if (row.content_type === 'resource') return resources.find(item => item.id === row.resource_id)?.title || 'Recurso';
    return row.event_title || 'Evento';
  });
  return labels.length ? labels.join(' · ') : 'Sin contenidos vinculados';
}
function renderAccessCenterMarkup(workspace, courses, resources, studentOptions) {
  const workspaceId = workspace.id === 'general' ? (state.workspaces[0]?.id || '') : workspace.id;
  const products = workspaceProducts(workspaceId);
  const productIds = new Set(products.map(item => item.id));
  const accesses = (state.studentAccess || []).filter(item => productIds.has(item.product_id));
  const productOptions = products.filter(item => item.status === 'active')
    .map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`).join('');
  const profile = id => state.profiles.find(item => item.id === id);
  const product = id => products.find(item => item.id === id);

  return `
  <section class="access-center" id="access-center">
    <div class="access-center-heading">
      <div><span class="eyebrow">Control comercial</span><h2>Accesos y ventas</h2>
      <p>Agrupa cursos, libros y webinars en productos; concede, suspende o revoca accesos sin borrar el progreso.</p></div>
      <span class="access-center-badge">Preparado para integrar pagos</span>
    </div>

    <section class="access-summary-grid">
      <article><span>◆</span><div><strong>${products.length}</strong><small>Productos</small></div></article>
      <article><span>✓</span><div><strong>${accesses.filter(x => x.status === 'active').length}</strong><small>Activos</small></div></article>
      <article><span>Ⅱ</span><div><strong>${accesses.filter(x => x.status === 'suspended').length}</strong><small>Suspendidos</small></div></article>
      <article><span>＄</span><div><strong>${(state.orders || []).filter(x => productIds.has(x.product_id)).length}</strong><small>Órdenes</small></div></article>
    </section>

    <div class="access-management-grid">
      <article class="settings-card glass">
        <div class="builder-step"><span>1</span><div><strong>Crear producto</strong><small>Selecciona todo lo que recibirá el alumno.</small></div></div>
        <form id="product-form" class="stack-form">
          <input type="hidden" name="workspaceId" value="${escapeHtml(workspaceId)}">
          <div class="field"><label>Nombre</label><input name="name" placeholder="Curso + manual / paquete de formación" required></div>
          <div class="form-two-columns">
            <div class="field"><label>Tipo</label><select name="productType">
              <option value="course">Solo curso</option><option value="book">Solo libro</option>
              <option value="manual">Manual</option><option value="webinar">Webinar</option>
              <option value="bundle" selected>Paquete</option><option value="free">Gratuito</option>
            </select></div>
            <div class="field"><label>Precio MXN</label><input name="price" type="number" min="0" step="0.01" value="0"></div>
          </div>
          <div class="field"><label>Descripción</label><textarea name="description" rows="3"></textarea></div>
          <div class="field"><label>Referencia comercial</label><input name="externalReference" placeholder="ag-utah-driver-program"></div>
          <div class="field"><label>Enlace de pago</label><input name="paymentUrl" type="url" placeholder="https://tu-enlace-de-pago.com/..."></div>
          <fieldset class="access-content-selector"><legend>Contenido incluido</legend>
            <div class="access-selector-group"><strong>Cursos</strong>
              ${courses.length ? courses.map(item => `<label><input type="checkbox" name="courseIds" value="${escapeHtml(item.id)}"><span>${escapeHtml(item.title)}</span></label>`).join('') : '<small>No hay cursos.</small>'}
            </div>
            <div class="access-selector-group"><strong>Libros y recursos</strong>
              ${resources.length ? resources.map(item => `<label><input type="checkbox" name="resourceIds" value="${escapeHtml(item.id)}"><span>${escapeHtml(item.title)}</span></label>`).join('') : '<small>No hay recursos.</small>'}
            </div>
            <label class="access-event-toggle"><input type="checkbox" name="includeEvent"><span>Incluir webinar</span></label>
            <div class="form-two-columns">
              <div class="field"><label>Evento</label><input name="eventTitle" placeholder="Webinar en vivo"></div>
              <div class="field"><label>Fecha</label><input name="eventDate" type="datetime-local"></div>
            </div>
          </fieldset>
          <button class="btn btn-primary">Crear producto</button>
        </form>
      </article>

      <article class="settings-card glass">
        <div class="builder-step"><span>2</span><div><strong>Conceder acceso</strong><small>Asigna un producto a una cuenta registrada.</small></div></div>
        <form id="manual-access-form" class="stack-form">
          <div class="field"><label>Alumno</label><select name="userId" required>${studentOptions || '<option value="">No hay alumnos</option>'}</select></div>
          <div class="field"><label>Producto</label><select name="productId" required>${productOptions || '<option value="">Primero crea un producto</option>'}</select></div>
          <div class="form-two-columns">
            <div class="field"><label>Origen</label><select name="source"><option value="manual">Manual</option><option value="pago_online">Pago en línea</option><option value="gift">Cortesía</option></select></div>
            <div class="field"><label>Vencimiento</label><input name="expiresAt" type="datetime-local"></div>
          </div>
          <div class="field"><label>Referencia</label><input name="reference" placeholder="Folio o comprobante"></div>
          <button class="btn btn-primary" ${!studentOptions || !productOptions ? 'disabled' : ''}>Conceder acceso</button>
        </form>
      </article>
    </div>

    <section class="settings-card glass access-products-panel">
      <div class="section-heading"><div><span class="eyebrow">Catálogo interno</span><h2>Productos</h2></div><span class="section-count">${products.length}</span></div>
      <div class="access-product-grid">
        ${products.length ? products.map(item => `
          <article class="access-product-card">
            <div class="access-product-top"><span class="status-pill ${item.status === 'active' ? 'available' : ''}">${item.status === 'active' ? 'Activo' : 'Inactivo'}</span><span>${escapeHtml(productTypeLabel(item.product_type))}</span></div>
            <h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.description || '')}</p>
            <div class="access-product-price"><strong>${Number(item.price || 0).toLocaleString('es-MX',{style:'currency',currency:'MXN'})}</strong><small>${escapeHtml(item.external_reference)}</small></div>
            <div class="access-product-content">${escapeHtml(productContentSummary(item.id, courses, resources))}</div>
            <div class="instructor-course-actions">
              ${item.payment_url ? `<a class="btn btn-secondary" href="${escapeHtml(item.payment_url)}" target="_blank" rel="noopener">Pago</a>` : ''}
              <button class="btn btn-secondary" data-product-toggle="${escapeHtml(item.id)}" data-next-status="${item.status === 'active' ? 'inactive' : 'active'}">${item.status === 'active' ? 'Desactivar' : 'Activar'}</button>
              <button class="btn btn-danger" data-product-delete="${escapeHtml(item.id)}">Eliminar</button>
            </div>
          </article>`).join('') : '<div class="instructor-empty-state"><h3>Aún no hay productos</h3></div>'}
      </div>
    </section>

    <section class="settings-card glass access-students-panel">
      <div class="section-heading"><div><span class="eyebrow">Alumnos autorizados</span><h2>Accesos concedidos</h2></div><input id="access-search" class="access-search" placeholder="Buscar"></div>
      <div class="admin-table-wrap"><table class="admin-table access-table">
        <thead><tr><th>Alumno</th><th>Producto</th><th>Origen</th><th>Estado</th><th>Acciones</th></tr></thead>
        <tbody>${accesses.length ? accesses.map(item => {
          const person = profile(item.user_id), prod = product(item.product_id);
          const search = `${person?.full_name || ''} ${person?.email || ''} ${prod?.name || ''}`.toLowerCase();
          return `<tr data-access-row data-search="${escapeHtml(search)}">
            <td><strong>${escapeHtml(person?.full_name || 'Sin nombre')}</strong><small>${escapeHtml(person?.email || '')}</small></td>
            <td>${escapeHtml(prod?.name || 'Producto')}</td><td>${escapeHtml(item.source)}</td>
            <td><span class="status-pill access-${escapeHtml(item.status)}">${escapeHtml(accessStatusLabel(item.status))}</span></td>
            <td class="access-actions">
              ${item.status === 'active' ? `<button class="btn btn-secondary" data-access-status="${item.id}" data-next-status="suspended">Suspender</button>` : ''}
              ${item.status === 'suspended' ? `<button class="btn btn-primary" data-access-status="${item.id}" data-next-status="active">Reactivar</button>` : ''}
              ${item.status !== 'revoked' ? `<button class="btn btn-danger" data-access-status="${item.id}" data-next-status="revoked">Revocar</button>` : ''}
            </td></tr>`;
        }).join('') : '<tr><td colspan="5">No hay accesos concedidos.</td></tr>'}</tbody>
      </table></div>
    </section>
  </section>`;
}
function filterAccessRows(event) {
  const term = String(event.target.value || '').trim().toLowerCase();
  document.querySelectorAll('[data-access-row]').forEach(row => row.classList.toggle('hide', term && !row.dataset.search.includes(term)));
}
async function createProduct(event) {
  event.preventDefault();
  const formElement = event.currentTarget, form = new FormData(formElement);
  setFormBusy(formElement, true);
  try {
    const name = String(form.get('name')).trim();
    const reference = String(form.get('externalReference') || '').trim() || `${slugify(name)}-${Date.now().toString().slice(-6)}`;
    const { data: product, error } = await db.from('products').insert({
      workspace_id: form.get('workspaceId'), name, slug:`${slugify(name)}-${Date.now().toString().slice(-5)}`,
      product_type: form.get('productType'), description:String(form.get('description') || '').trim() || null,
      price:Number(form.get('price') || 0), currency:'MXN', status:'active',
      external_reference:reference, payment_url:String(form.get('paymentUrl') || '').trim() || null,
      created_by:state.user.id
    }).select().single();
    if (error) throw error;
    const contents = [];
    form.getAll('courseIds').forEach(id => contents.push({product_id:product.id,content_type:'course',course_id:id}));
    form.getAll('resourceIds').forEach(id => contents.push({product_id:product.id,content_type:'resource',resource_id:id}));
    if (form.get('includeEvent') === 'on') contents.push({product_id:product.id,content_type:'event',event_title:String(form.get('eventTitle') || '').trim() || 'Evento',event_date:form.get('eventDate') || null});
    if (!contents.length) throw new Error('Selecciona al menos un contenido.');
    const { error: contentError } = await db.from('product_contents').insert(contents);
    if (contentError) throw contentError;
    showToast('Producto creado.', 'success'); await loadApplicationData(); renderWorkspaceAdmin(state.activeWorkspaceId);
  } catch (error) { console.error(error); showToast(error.message || 'No se pudo crear.', 'error'); }
  finally { setFormBusy(formElement, false); }
}
async function toggleProductStatus(id, status) {
  const { error } = await db.from('products').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if (error) return showToast(error.message,'error');
  await loadApplicationData(); renderWorkspaceAdmin(state.activeWorkspaceId);
}
async function deleteProduct(id) {
  if ((state.studentAccess || []).some(x => x.product_id === id && x.status === 'active')) return showToast('Revoca los accesos activos antes de eliminar.','error');
  if (!confirm('¿Eliminar este producto?')) return;
  const { error } = await db.from('products').delete().eq('id',id);
  if (error) return showToast(error.message,'error');
  await loadApplicationData(); renderWorkspaceAdmin(state.activeWorkspaceId);
}
async function grantProductAccess(event) {
  event.preventDefault();
  const formElement = event.currentTarget, form = new FormData(formElement);
  setFormBusy(formElement,true);
  const { error } = await db.rpc('admin_grant_product_access',{
    target_user:form.get('userId'), target_product:form.get('productId'),
    access_source:form.get('source') || 'manual',
    access_reference:String(form.get('reference') || '').trim() || null,
    access_expires_at:form.get('expiresAt') || null
  });
  setFormBusy(formElement,false);
  if (error) return showToast(error.message,'error');
  showToast('Acceso concedido.','success'); await loadApplicationData(); renderWorkspaceAdmin(state.activeWorkspaceId);
}
async function changeStudentAccessStatus(id,status) {
  if (!confirm(`¿Cambiar el acceso a ${accessStatusLabel(status)}?`)) return;
  const { error } = await db.rpc('admin_change_student_access_status',{target_access:id,new_status:status});
  if (error) return showToast(error.message,'error');
  await loadApplicationData(); renderWorkspaceAdmin(state.activeWorkspaceId);
}

async function createCourse(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const coverFile = form.get('coverFile');
  setFormBusy(formElement, true);

  let courseId = null;
  let uploadedCover = null;

  try {
    if (coverFile?.size) validateCoverImage(coverFile);
    const title = String(form.get('title')).trim();
    const { data: course, error } = await db.from('courses').insert({
      workspace_id: String(form.get('workspaceId') || state.activeWorkspaceId || '').trim() || null,
      title,
      slug: `${slugify(title)}-${Date.now().toString().slice(-5)}`,
      subtitle: String(form.get('subtitle')).trim() || null,
      description: String(form.get('description')).trim() || null,
      category: String(form.get('category')).trim() || 'Formación',
      cover_url: String(form.get('coverUrl')).trim() || 'curso-utah-driver.webp',
      instructor_name: String(form.get('instructorName')).trim() || displayName(),
      duration_label: String(form.get('durationLabel')).trim() || null,
      price: Number(form.get('price')) || null,
      sale_price: Number(form.get('salePrice')) || null,
      payment_url: String(form.get('paymentUrl')).trim() || null,
      status: String(form.get('status')) || 'draft',
      featured: form.get('featured') === 'on',
      created_by: state.user.id
    }).select().single();
    if (error) throw error;
    courseId = course.id;

    if (coverFile?.size) {
      uploadedCover = await uploadCourseMedia(coverFile, 'courses', course.id);
      const { error: updateError } = await db.from('courses').update({
        cover_url: uploadedCover.publicUrl,
        cover_path: uploadedCover.path
      }).eq('id', course.id);
      if (updateError) throw updateError;
    }

    showToast('Curso creado correctamente.', 'success');
    formElement.reset();
    await loadApplicationData();
    renderAdmin();
  } catch (error) {
    console.error(error);
    if (uploadedCover?.path) await removeCourseMedia(uploadedCover.path).catch(() => {});
    if (courseId) await db.from('courses').delete().eq('id', courseId).catch(() => {});
    showToast(error.message || 'No se pudo crear el curso.', 'error');
  } finally {
    setFormBusy(formElement, false);
  }
}

async function setCourseStatus(courseId, status) {
  const { error } = await db.from('courses').update({ status }).eq('id', courseId);
  if (error) return showToast(error.message, 'error');
  showToast(status === 'published' ? 'Curso publicado.' : 'Curso guardado como borrador.', 'success');
  await loadApplicationData();
  renderAdmin();
}

async function updateUserRole(userId, role) {
  const { error } = await db.rpc('admin_set_user_role', { target_user: userId, new_role: role });
  if (error) return showToast(error.message, 'error');
  showToast('Rol actualizado correctamente.', 'success');
  await loadApplicationData();
  renderAdmin();
}

async function changeUserAccountStatus(userId, status) {
  const profile = state.profiles.find(item => item.id === userId);
  const action = status === 'active' ? 'reactivar' : 'suspender';
  if (!profile || !confirm(`¿Deseas ${action} la cuenta de ${profile.full_name || profile.email || 'este usuario'}?`)) return;
  const { error } = await db.rpc('admin_set_account_status', { target_user: userId, new_status: status });
  if (error) return showToast(error.message, 'error');
  showToast(status === 'active' ? 'Cuenta reactivada.' : 'Cuenta suspendida.', 'success');
  await loadApplicationData();
  renderAdmin();
}

async function createModule(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setFormBusy(event.currentTarget, true);

  const { error } = await db.from('modules').insert({
    course_id: form.get('courseId'),
    title: String(form.get('title')).trim(),
    position: Number(form.get('position')) || 1
  });

  setFormBusy(event.currentTarget, false);
  if (error) return showToast(error.message, 'error');

  showToast('Módulo creado.', 'success');
  await loadApplicationData();
  renderAdmin();
}

function findManagedModule(moduleId) {
  for (const course of state.courses || []) {
    const module = (course.modules || []).find(item => item.id === moduleId);
    if (module) return { course, module };
  }
  return null;
}

function findManagedLesson(lessonId) {
  for (const course of state.courses || []) {
    for (const module of course.modules || []) {
      const lesson = (module.lessons || []).find(item => item.id === lessonId);
      if (lesson) return { course, module, lesson };
    }
  }
  return null;
}

async function refreshAdminAfterChange(message) {
  showToast(message, 'success');
  await loadApplicationData();
  renderAdmin();
  setTimeout(() => document.querySelector('#course-structure-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
}

async function editModule(moduleId) {
  const found = findManagedModule(moduleId);
  if (!found) return;
  const title = prompt('Nuevo nombre del módulo:', found.module.title);
  if (title === null) return;
  const cleanTitle = title.trim();
  if (!cleanTitle) return showToast('El título no puede quedar vacío.', 'error');
  const { error } = await db.from('modules').update({ title: cleanTitle }).eq('id', moduleId);
  if (error) return showToast(error.message, 'error');
  await refreshAdminAfterChange('Módulo actualizado.');
}

async function deleteModule(moduleId) {
  const found = findManagedModule(moduleId);
  if (!found) return;
  const lessonCount = found.module.lessons?.length || 0;
  const message = lessonCount
    ? `¿Eliminar el módulo “${found.module.title}” y sus ${lessonCount} lecciones? Esta acción no se puede deshacer.`
    : `¿Eliminar el módulo “${found.module.title}”?`;
  if (!confirm(message)) return;
  const { error } = await db.from('modules').delete().eq('id', moduleId);
  if (error) return showToast(error.message, 'error');
  await refreshAdminAfterChange('Módulo eliminado.');
}

async function moveModule(moduleId, direction) {
  const found = findManagedModule(moduleId);
  if (!found) return;
  const ordered = [...(found.course.modules || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  const index = ordered.findIndex(item => item.id === moduleId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
  const current = ordered[index];
  const target = ordered[targetIndex];
  const currentPosition = Number(current.position) || index + 1;
  const targetPosition = Number(target.position) || targetIndex + 1;
  const first = await db.from('modules').update({ position: targetPosition }).eq('id', current.id);
  if (first.error) return showToast(first.error.message, 'error');
  const second = await db.from('modules').update({ position: currentPosition }).eq('id', target.id);
  if (second.error) return showToast(second.error.message, 'error');
  await refreshAdminAfterChange('Orden de módulos actualizado.');
}

async function editLesson(lessonId) {
  const found = findManagedLesson(lessonId);
  if (!found) return;
  const title = prompt('Nuevo título de la lección:', found.lesson.title);
  if (title === null) return;
  const cleanTitle = title.trim();
  if (!cleanTitle) return showToast('El título no puede quedar vacío.', 'error');
  const durationInput = prompt('Duración en minutos:', String(Number(found.lesson.duration_minutes) || 0));
  if (durationInput === null) return;
  const duration = Math.max(0, Number(durationInput) || 0);
  const videoUrl = prompt('URL del video (puede quedar vacía):', found.lesson.video_url || '');
  if (videoUrl === null) return;
  const { error } = await db.from('lessons').update({
    title: cleanTitle,
    duration_minutes: duration,
    video_url: videoUrl.trim() || null
  }).eq('id', lessonId);
  if (error) return showToast(error.message, 'error');
  await refreshAdminAfterChange('Lección actualizada.');
}

async function deleteLesson(lessonId) {
  const found = findManagedLesson(lessonId);
  if (!found) return;
  if (!confirm(`¿Eliminar la lección “${found.lesson.title}”? Esta acción no se puede deshacer.`)) return;
  const { error } = await db.from('lessons').delete().eq('id', lessonId);
  if (error) return showToast(error.message, 'error');
  await refreshAdminAfterChange('Lección eliminada.');
}

async function moveLesson(lessonId, direction) {
  const found = findManagedLesson(lessonId);
  if (!found) return;
  const ordered = [...(found.module.lessons || [])].sort((a, b) => (a.position || 0) - (b.position || 0));
  const index = ordered.findIndex(item => item.id === lessonId);
  const targetIndex = direction === 'up' ? index - 1 : index + 1;
  if (index < 0 || targetIndex < 0 || targetIndex >= ordered.length) return;
  const current = ordered[index];
  const target = ordered[targetIndex];
  const currentPosition = Number(current.position) || index + 1;
  const targetPosition = Number(target.position) || targetIndex + 1;
  const first = await db.from('lessons').update({ position: targetPosition }).eq('id', current.id);
  if (first.error) return showToast(first.error.message, 'error');
  const second = await db.from('lessons').update({ position: currentPosition }).eq('id', target.id);
  if (second.error) return showToast(second.error.message, 'error');
  await refreshAdminAfterChange('Orden de lecciones actualizado.');
}

async function createLesson(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setFormBusy(event.currentTarget, true);

  const moduleId = form.get('moduleId');
  if (!moduleId) {
    setFormBusy(event.currentTarget, false);
    return showToast('Primero debes crear un módulo.', 'error');
  }

  const { error } = await db.from('lessons').insert({
    module_id: moduleId,
    title: String(form.get('title')).trim(),
    video_url: String(form.get('videoUrl')).trim() || null,
    duration_minutes: Number(form.get('duration')) || 0,
    lesson_type: 'video',
    position: (() => {
      const found = findManagedModule(moduleId);
      return (found?.module?.lessons?.length || 0) + 1;
    })()
  });

  setFormBusy(event.currentTarget, false);
  if (error) return showToast(error.message, 'error');

  showToast('Lección agregada.', 'success');
  await loadApplicationData();
  renderAdmin();
}

async function createResource(event) {
  event.preventDefault();
  const formElement = event.currentTarget;
  const form = new FormData(formElement);
  const file = form.get('file');
  const thumbnailFile = form.get('thumbnailFile');
  const externalUrl = String(form.get('externalUrl') || '').trim();
  const courseId = String(form.get('courseId') || '').trim();

  if ((!file || !file.size) && !externalUrl) {
    showToast('Selecciona un archivo o agrega un enlace externo.', 'error');
    return;
  }

  setFormBusy(formElement, true);
  let filePath = null;
  let thumbnail = null;
  let resourceId = null;

  try {
    if (thumbnailFile?.size) validateCoverImage(thumbnailFile);
    if (file?.size) {
      const cleanName = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, '-')
        .replace(/^-+|-+$/g, '');
      filePath = `courses/${courseId || 'general'}/${Date.now()}-${cleanName}`;
      const contentType = /\.html?$/i.test(file.name)
        ? 'text/html; charset=utf-8'
        : file.type || 'application/octet-stream';
      const { error: uploadError } = await db.storage
        .from('digital-products')
        .upload(filePath, file, { contentType, upsert: false });
      if (uploadError) throw uploadError;
    }

    if (thumbnailFile?.size) {
      thumbnail = await uploadCourseMedia(thumbnailFile, 'resources', courseId || state.user.id);
    }

    const { data: resource, error } = await db.from('resources').insert({
      workspace_id: String(form.get('workspaceId') || state.activeWorkspaceId || '').trim() || null,
      course_id: courseId || null,
      title: String(form.get('title')).trim(),
      resource_type: String(form.get('resourceType')).trim(),
      external_url: externalUrl || null,
      file_path: filePath,
      thumbnail_url: thumbnail?.publicUrl || null,
      thumbnail_path: thumbnail?.path || null,
      is_public: false
    }).select().single();
    if (error) throw error;
    resourceId = resource.id;

    showToast('Recurso privado guardado.', 'success');
    formElement.reset();
    await loadApplicationData();
    renderAdmin();
  } catch (error) {
    console.error(error);
    if (filePath && !resourceId) await db.storage.from('digital-products').remove([filePath]).catch(() => {});
    if (thumbnail?.path && !resourceId) await removeCourseMedia(thumbnail.path).catch(() => {});
    showToast(error.message || 'No se pudo guardar el recurso.', 'error');
  } finally {
    setFormBusy(formElement, false);
  }
}

async function removeCourseCover(courseId) {
  const course = state.courses.find(item => item.id === courseId);
  if (!course?.cover_path) return;
  if (!confirm(`¿Quitar la portada de “${course.title}”?`)) return;
  try {
    await removeCourseMedia(course.cover_path);
    const { error } = await db.from('courses').update({ cover_url: 'curso-utah-driver.webp', cover_path: null }).eq('id', courseId);
    if (error) throw error;
    showToast('Portada eliminada.', 'success');
    await loadApplicationData();
    renderAdmin();
  } catch (error) {
    showToast(error.message || 'No se pudo eliminar la portada.', 'error');
  }
}

async function removeResourceCover(resourceId) {
  const resource = state.resources.find(item => item.id === resourceId);
  if (!resource?.thumbnail_path) return;
  if (!confirm(`¿Quitar la portada de “${resource.title}”?`)) return;
  try {
    await removeCourseMedia(resource.thumbnail_path);
    const { error } = await db.from('resources').update({ thumbnail_url: null, thumbnail_path: null }).eq('id', resourceId);
    if (error) throw error;
    showToast('Portada eliminada.', 'success');
    await loadApplicationData();
    renderAdmin();
  } catch (error) {
    showToast(error.message || 'No se pudo eliminar la portada.', 'error');
  }
}

async function deleteResource(resourceId, skipConfirmation = false) {
  const resource = state.resources.find(item => item.id === resourceId);
  if (!resource) return;
  if (!skipConfirmation && !confirm(`¿Eliminar definitivamente “${resource.title}”? Esta acción no se puede deshacer.`)) return;
  try {
    if (resource.file_path) {
      const { error } = await db.storage.from('digital-products').remove([resource.file_path]);
      if (error) throw error;
    }
    if (resource.thumbnail_path) await removeCourseMedia(resource.thumbnail_path);
    const { error } = await db.from('resources').delete().eq('id', resourceId);
    if (error) throw error;
    if (!skipConfirmation) {
      showToast('Recurso eliminado.', 'success');
      await loadApplicationData();
      renderAdmin();
    }
  } catch (error) {
    if (!skipConfirmation) showToast(error.message || 'No se pudo eliminar el recurso.', 'error');
    else throw error;
  }
}

async function deleteCourse(courseId) {
  const course = state.courses.find(item => item.id === courseId);
  if (!course) return;
  const confirmation = prompt(`Para eliminar el curso escribe ELIMINAR:
${course.title}`);
  if (confirmation !== 'ELIMINAR') {
    if (confirmation !== null) showToast('El curso no fue eliminado.', 'error');
    return;
  }
  try {
    const relatedResources = state.resources.filter(item => item.course_id === courseId);
    for (const resource of relatedResources) await deleteResource(resource.id, true);
    if (course.cover_path) await removeCourseMedia(course.cover_path);
    const { error } = await db.rpc('delete_managed_course', { target_course: courseId });
    if (error) throw error;
    showToast('Curso eliminado definitivamente.', 'success');
    await loadApplicationData();
    renderAdmin();
  } catch (error) {
    console.error(error);
    showToast(error.message || 'No se pudo eliminar el curso.', 'error');
  }
}

async function assignCourse(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  setFormBusy(event.currentTarget, true);

  const { error } = await db.from('enrollments').upsert({
    user_id: form.get('userId'),
    course_id: form.get('courseId'),
    status: 'active'
  }, { onConflict: 'user_id,course_id' });

  setFormBusy(event.currentTarget, false);
  if (error) return showToast(error.message, 'error');

  showToast('Curso asignado.', 'success');
  await loadApplicationData();
  renderAdmin();
}



function safeMediaUrl(value = '') {
  const raw = String(value || '').trim();
  return /^(https?:|blob:|data:)/i.test(raw) ? raw : '';
}


const LESSON_MEDIA_BUCKET = 'lesson-media';
const LESSON_MEDIA_LIMITS = {
  image: 8 * 1024 * 1024,
  pdf: 25 * 1024 * 1024,
  audio: 80 * 1024 * 1024,
  video: 250 * 1024 * 1024
};

function lessonMediaKind(blockType) {
  return ({ image: 'image', pdf: 'pdf', audio: 'audio', video: 'video' })[blockType] || null;
}

function lessonMediaAccept(blockType) {
  return ({
    image: 'image/jpeg,image/png,image/webp',
    pdf: 'application/pdf',
    audio: 'audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/webm',
    video: 'video/mp4,video/webm,video/quicktime'
  })[blockType] || '';
}

function formatFileSize(bytes = 0) {
  if (!Number(bytes)) return '';
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(bytes > 10 * 1024 * 1024 ? 0 : 1)} MB`;
}

function safeFileName(name = 'archivo') {
  return String(name)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'archivo';
}

async function compressLessonImage(file) {
  const image = await createImageBitmap(file);
  const maxSide = 1920;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);
  image.close?.();
  const blob = await new Promise((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('No se pudo procesar la imagen.')), 'image/webp', .86));
  return new File([blob], `${safeFileName(file.name).replace(/\.[^.]+$/, '')}.webp`, { type: 'image/webp' });
}

function validateLessonMediaFile(file, blockType) {
  const kind = lessonMediaKind(blockType);
  if (!kind) throw new Error('Este bloque no admite archivos.');
  const accepted = lessonMediaAccept(blockType).split(',');
  if (!accepted.includes(file.type)) throw new Error(`Formato no permitido para ${kind}.`);
  if (file.size > LESSON_MEDIA_LIMITS[kind]) throw new Error(`El archivo supera el límite de ${formatFileSize(LESSON_MEDIA_LIMITS[kind])}.`);
}

async function signedLessonMediaUrl(path) {
  if (!path) return '';
  const { data, error } = await db.storage.from(LESSON_MEDIA_BUCKET).createSignedUrl(path, 3600);
  if (error) {
    console.error('Signed lesson media URL error:', error);
    return '';
  }
  return data?.signedUrl || '';
}

async function hydrateLessonBlockMedia(blocks = []) {
  return Promise.all(blocks.map(async block => {
    const content = { ...(block.content || {}) };
    if (content.file_path) content.resolved_url = await signedLessonMediaUrl(content.file_path);
    return { ...block, content };
  }));
}

function builderMediaUploadMarkup(block, data) {
  const kind = lessonMediaKind(block.block_type);
  if (!kind) return '';
  const hasFile = Boolean(data.file_path);
  return `<section class="builder-media-upload" data-media-uploader>
    <div class="builder-media-preview">
      ${block.block_type === 'image' && data.resolved_url ? `<img src="${escapeHtml(data.resolved_url)}" alt="">` : ''}
      ${block.block_type === 'video' && data.resolved_url ? `<video controls preload="metadata" src="${escapeHtml(data.resolved_url)}"></video>` : ''}
      ${block.block_type === 'audio' && data.resolved_url ? `<audio controls preload="metadata" src="${escapeHtml(data.resolved_url)}"></audio>` : ''}
      ${block.block_type === 'pdf' && data.resolved_url ? `<a href="${escapeHtml(data.resolved_url)}" target="_blank" rel="noopener">Vista previa del PDF ↗</a>` : ''}
    </div>
    <div class="builder-media-file-row">
      <label class="builder-upload-button">
        <input type="file" data-block-upload accept="${lessonMediaAccept(block.block_type)}">
        <span>${hasFile ? 'Reemplazar archivo' : 'Subir archivo'}</span>
      </label>
      ${hasFile ? `<button class="builder-remove-media" data-remove-block-media type="button">Quitar archivo</button>` : ''}
    </div>
    <div class="builder-upload-details">
      <span>${hasFile ? `${escapeHtml(data.file_name || 'Archivo')} · ${escapeHtml(formatFileSize(data.file_size))}` : `Máximo ${formatFileSize(LESSON_MEDIA_LIMITS[kind])}`}</span>
      <span data-upload-progress></span>
    </div>
  </section>`;
}

function renderStudentBlock(block) {
  const data = block.content || {};
  const type = block.block_type;
  const url = safeMediaUrl(data.resolved_url || data.url);
  if (type === 'text') return `<article class="student-content-block text-block">${sanitizeLessonHtml(data.html || data.text || '')}</article>`;
  if (type === 'video') {
    if (!url) return '';
    if (data.file_path || /^video\//i.test(data.mime_type || '')) return `<article class="student-content-block media-block"><video controls playsinline preload="metadata" src="${escapeHtml(url)}"></video></article>`;
    return `<article class="student-content-block media-block"><iframe src="${escapeHtml(url)}" title="Video de la lección" allowfullscreen loading="lazy"></iframe></article>`;
  }
  if (type === 'image') return url ? `<figure class="student-content-block image-block"><img src="${escapeHtml(url)}" alt="${escapeHtml(data.alt || '')}">${data.caption ? `<figcaption>${escapeHtml(data.caption)}</figcaption>` : ''}</figure>` : '';
  if (type === 'pdf') return url ? `<article class="student-content-block file-block"><div><span>PDF</span><strong>${escapeHtml(data.title || data.file_name || 'Material de lectura')}</strong><small>${escapeHtml(formatFileSize(data.file_size))}</small></div><a class="btn btn-secondary" href="${escapeHtml(url)}" target="_blank" rel="noopener">Abrir documento</a></article>` : '';
  if (type === 'audio') return url ? `<article class="student-content-block audio-block"><strong>${escapeHtml(data.title || data.file_name || 'Audio')}</strong><audio controls preload="metadata" src="${escapeHtml(url)}"></audio></article>` : '';
  if (type === 'activity') return `<article class="student-content-block activity-block"><span class="eyebrow">Actividad</span><h3>${escapeHtml(data.title || 'Reflexiona y escribe')}</h3><p>${escapeHtml(data.prompt || '')}</p><textarea data-activity-block="${escapeHtml(block.id)}" placeholder="Escribe tu respuesta..."></textarea><button class="btn btn-secondary" type="button" data-save-activity="${escapeHtml(block.id)}">Guardar respuesta</button></article>`;
  if (type === 'divider') return '<hr class="student-block-divider">';
  return '';
}

const BLOCK_LIBRARY = [
  ['text', '¶', 'Texto', 'Explicaciones, instrucciones y contenido editorial'],
  ['video', '▶', 'Video', 'YouTube, Vimeo o enlace incrustable'],
  ['image', '▧', 'Imagen', 'Fotografía, ilustración o infografía'],
  ['pdf', 'PDF', 'Documento', 'Manual, guía o material complementario'],
  ['audio', '♫', 'Audio', 'Meditación, podcast o ejercicio'],
  ['activity', '✎', 'Actividad', 'Pregunta de reflexión para el alumno'],
  ['divider', '—', 'Separador', 'Organiza visualmente el contenido']
];

function defaultBlockContent(type) {
  if (type === 'text') return { html: '<h2>Nuevo bloque de texto</h2><p>Escribe aquí el contenido de la lección.</p>' };
  if (type === 'video') return { url: '', title: '' };
  if (type === 'image') return { url: '', alt: '', caption: '' };
  if (type === 'pdf') return { url: '', title: 'Material de lectura' };
  if (type === 'audio') return { url: '', title: 'Audio de la lección' };
  if (type === 'activity') return { title: 'Actividad de reflexión', prompt: '¿Qué aprendizaje te llevas de esta lección?' };
  return {};
}

function builderBlockEditor(block, index) {
  const data = block.content || {};
  const label = BLOCK_LIBRARY.find(item => item[0] === block.block_type)?.[2] || block.block_type;
  let fields = '';
  if (block.block_type === 'text') fields = `<label>Contenido HTML básico<textarea data-block-field="html" rows="8">${escapeHtml(data.html || '')}</textarea></label>`;
  if (block.block_type === 'video') fields = `${builderMediaUploadMarkup(block, data)}<label>O utiliza una URL incrustable<input data-block-field="url" type="url" value="${escapeHtml(data.url || '')}" placeholder="https://www.youtube.com/embed/..."></label>`;
  if (block.block_type === 'image') fields = `${builderMediaUploadMarkup(block, data)}<label>O utiliza una URL de imagen<input data-block-field="url" type="url" value="${escapeHtml(data.url || '')}"></label><div class="builder-two"><label>Texto alternativo<input data-block-field="alt" value="${escapeHtml(data.alt || '')}"></label><label>Pie de imagen<input data-block-field="caption" value="${escapeHtml(data.caption || '')}"></label></div>`;
  if (block.block_type === 'pdf') fields = `${builderMediaUploadMarkup(block, data)}<label>Título<input data-block-field="title" value="${escapeHtml(data.title || '')}"></label><label>O utiliza una URL del PDF<input data-block-field="url" type="url" value="${escapeHtml(data.url || '')}"></label>`;
  if (block.block_type === 'audio') fields = `${builderMediaUploadMarkup(block, data)}<label>Título<input data-block-field="title" value="${escapeHtml(data.title || '')}"></label><label>O utiliza una URL del audio<input data-block-field="url" type="url" value="${escapeHtml(data.url || '')}"></label>`;
  if (block.block_type === 'activity') fields = `<label>Título<input data-block-field="title" value="${escapeHtml(data.title || '')}"></label><label>Instrucción<textarea data-block-field="prompt" rows="4">${escapeHtml(data.prompt || '')}</textarea></label>`;
  if (block.block_type === 'divider') fields = '<p class="builder-divider-note">Este bloque agrega una separación visual en la lección.</p>';
  return `<article class="builder-block" draggable="true" data-builder-block="${escapeHtml(block.id)}" data-index="${index}">
    <header><span class="builder-drag">⋮⋮</span><div><small>Bloque ${index + 1}</small><strong>${escapeHtml(label)}</strong></div><div class="builder-block-actions"><button type="button" data-move-block="up" title="Subir">↑</button><button type="button" data-move-block="down" title="Bajar">↓</button><button type="button" data-delete-block title="Eliminar">×</button></div></header>
    <div class="builder-block-fields">${fields}</div>
    <div class="builder-save-state" data-block-state>Guardado</div>
  </article>`;
}

async function renderBlockBuilder(courseId, selectedLessonId = '') {
  const course = findCourse(courseId);
  const page = document.querySelector('#page');
  if (!course || !canManageCourseClient(course)) {
    page.innerHTML = `<section class="empty-state glass"><h2>Sin permiso de edición</h2><p>Este curso no está asignado a tu cuenta de instructor.</p><a class="btn btn-secondary" href="#admin">Volver al panel</a></section>`;
    return;
  }
  const lessons = allLessons(course);
  const selectedLesson = lessons.find(item => item.id === selectedLessonId) || lessons[0] || null;
  if (!selectedLesson) {
    page.innerHTML = `<a class="back-link" href="#admin">← Volver al panel</a><section class="empty-state glass"><h2>Este curso todavía no tiene lecciones</h2><p>Crea al menos un módulo y una lección para abrir el editor por bloques.</p><a class="btn btn-primary" href="#admin">Crear contenido</a></section>`;
    return;
  }
  const { data: rawBlocks, error } = await db.from('lesson_blocks').select('*').eq('lesson_id', selectedLesson.id).order('position');
  const blocks = error ? [] : await hydrateLessonBlockMedia(rawBlocks || []);
  if (error) {
    page.innerHTML = `<section class="empty-state glass"><h2>Falta activar el editor por bloques</h2><p>Ejecuta el archivo 09-editor-profesional-por-bloques.sql en Supabase.</p><a class="btn btn-secondary" href="#admin">Volver</a></section>`;
    return;
  }
  const { data: versions } = await db.from('course_versions').select('id,version_number,label,created_at').eq('course_id', course.id).order('version_number', { ascending: false }).limit(8);
  page.innerHTML = `
    <section class="builder-shell">
      <header class="builder-topbar">
        <div><a class="back-link" href="${course.workspace_id ? `#workspace/${course.workspace_id}` : '#admin'}">← Volver a la carpeta</a><span class="eyebrow">Editor profesional</span><h1>${escapeHtml(course.title)}</h1><p data-builder-status>Todos los cambios están guardados</p></div>
        <div class="builder-top-actions"><a class="btn btn-secondary" href="#lesson/${course.id}/${selectedLesson.id}" target="_blank">Vista alumno</a><button class="btn btn-secondary" id="save-course-version" type="button">Guardar versión</button><button class="btn btn-primary" id="publish-from-builder" type="button">${course.status === 'published' ? 'Guardar publicado' : 'Publicar curso'}</button></div>
      </header>
      <div class="builder-layout">
        <aside class="builder-outline glass">
          <div class="builder-outline-heading"><span>ESTRUCTURA</span><strong>${course.modules.length} módulos</strong></div>
          ${course.modules.map((module, mi) => `<section><h3><span>${mi+1}</span>${escapeHtml(module.title)}</h3>${module.lessons.map(lesson => `<a class="${lesson.id===selectedLesson.id?'active':''}" href="#builder/${course.id}/${lesson.id}"><span>▤</span>${escapeHtml(lesson.title)}</a>`).join('')}</section>`).join('')}
          <a class="builder-outline-footer" href="#admin">＋ Administrar módulos y lecciones</a>
        </aside>
        <main class="builder-canvas">
          <div class="builder-lesson-heading glass"><div><span class="eyebrow">Lección seleccionada</span><h2>${escapeHtml(selectedLesson.title)}</h2></div><span>${(blocks||[]).length} bloques</span></div>
          <div class="builder-block-list" id="builder-block-list">${(blocks||[]).length ? blocks.map(builderBlockEditor).join('') : '<div class="builder-empty"><span>＋</span><h3>Comienza a construir esta lección</h3><p>Agrega texto, video, materiales y actividades desde el panel derecho.</p></div>'}</div>
        </main>
        <aside class="builder-library glass">
          <div><span class="eyebrow">Agregar contenido</span><h2>Bloques</h2><p>Selecciona un elemento para añadirlo al final de la lección.</p></div>
          <div class="builder-library-grid">${BLOCK_LIBRARY.map(([type,icon,label,desc]) => `<button type="button" data-add-block="${type}"><span>${icon}</span><strong>${label}</strong><small>${desc}</small></button>`).join('')}</div>
          <div class="builder-versions"><div><span class="eyebrow">Historial</span><h3>Versiones guardadas</h3></div>${(versions||[]).length ? versions.map(v => `<button type="button" data-restore-version="${v.id}"><strong>Versión ${v.version_number}</strong><small>${escapeHtml(v.label || new Date(v.created_at).toLocaleString('es-MX'))}</small></button>`).join('') : '<p>Aún no hay versiones manuales.</p>'}</div>
        </aside>
      </div>
    </section>`;
  bindBlockBuilder(course, selectedLesson, blocks || []);
}

function collectBlockContent(blockElement, existing = {}) {
  const content = { ...existing };
  delete content.resolved_url;
  blockElement.querySelectorAll('[data-block-field]').forEach(field => { content[field.dataset.blockField] = field.value; });
  return content;
}

function bindBlockBuilder(course, lesson, initialBlocks) {
  let blocks = [...initialBlocks];
  let saveTimers = new Map();
  const status = document.querySelector('[data-builder-status]');
  const setStatus = text => { if (status) status.textContent = text; };

  async function refreshBuilder() { await loadApplicationData(); await renderBlockBuilder(course.id, lesson.id); }

  document.querySelectorAll('[data-add-block]').forEach(button => button.addEventListener('click', async () => {
    setStatus('Agregando bloque…');
    const { error } = await db.from('lesson_blocks').insert({ lesson_id: lesson.id, block_type: button.dataset.addBlock, position: blocks.length + 1, content: defaultBlockContent(button.dataset.addBlock), created_by: state.user.id });
    if (error) return showToast(error.message, 'error');
    showToast('Bloque agregado.', 'success');
    await refreshBuilder();
  }));

  document.querySelectorAll('[data-builder-block]').forEach(element => {
    const id = element.dataset.builderBlock;
    element.querySelectorAll('[data-block-field]').forEach(field => field.addEventListener('input', () => {
      setStatus('Guardando cambios…');
      element.querySelector('[data-block-state]').textContent = 'Guardando…';
      clearTimeout(saveTimers.get(id));
      saveTimers.set(id, setTimeout(async () => {
        const currentBlock = blocks.find(item => item.id === id);
        const { error } = await db.from('lesson_blocks').update({ content: collectBlockContent(element, currentBlock?.content || {}), updated_at: new Date().toISOString() }).eq('id', id);
        element.querySelector('[data-block-state]').textContent = error ? 'Error al guardar' : 'Guardado';
        setStatus(error ? 'Hay cambios sin guardar' : 'Todos los cambios están guardados');
      }, 900));
    }));
    element.querySelector('[data-block-upload]')?.addEventListener('change', async event => {
      const input = event.currentTarget;
      const file = input.files?.[0];
      if (!file) return;
      const currentBlock = blocks.find(item => item.id === id);
      if (!currentBlock) return;
      const progress = element.querySelector('[data-upload-progress]');
      try {
        validateLessonMediaFile(file, currentBlock.block_type);
        setStatus('Preparando archivo…');
        if (progress) progress.textContent = 'Procesando 20%';
        const prepared = currentBlock.block_type === 'image' ? await compressLessonImage(file) : file;
        const extension = prepared.name.includes('.') ? prepared.name.split('.').pop().toLowerCase() : 'bin';
        const path = `courses/${course.id}/lessons/${lesson.id}/blocks/${id}/${Date.now()}.${extension}`;
        if (progress) progress.textContent = 'Subiendo 55%';
        const { error: uploadError } = await db.storage.from(LESSON_MEDIA_BUCKET).upload(path, prepared, { contentType: prepared.type || 'application/octet-stream', upsert: false });
        if (uploadError) throw uploadError;
        if (progress) progress.textContent = 'Guardando 85%';
        const previousPath = currentBlock.content?.file_path;
        const nextContent = {
          ...(currentBlock.content || {}),
          file_path: path,
          file_name: prepared.name,
          file_size: prepared.size,
          mime_type: prepared.type,
          url: ''
        };
        delete nextContent.resolved_url;
        const { error: updateError } = await db.from('lesson_blocks').update({ content: nextContent, updated_at: new Date().toISOString() }).eq('id', id);
        if (updateError) {
          await db.storage.from(LESSON_MEDIA_BUCKET).remove([path]);
          throw updateError;
        }
        if (previousPath && previousPath !== path) await db.storage.from(LESSON_MEDIA_BUCKET).remove([previousPath]);
        if (progress) progress.textContent = 'Completado 100%';
        showToast('Archivo integrado a la lección.', 'success');
        await refreshBuilder();
      } catch (error) {
        console.error(error);
        if (progress) progress.textContent = 'Error';
        showToast(error.message || 'No se pudo subir el archivo.', 'error');
        input.value = '';
        setStatus('No se pudo guardar el archivo');
      }
    });

    element.querySelector('[data-remove-block-media]')?.addEventListener('click', async () => {
      const currentBlock = blocks.find(item => item.id === id);
      const path = currentBlock?.content?.file_path;
      if (!path || !confirm('¿Quitar el archivo de este bloque?')) return;
      const nextContent = { ...(currentBlock.content || {}) };
      delete nextContent.file_path;
      delete nextContent.file_name;
      delete nextContent.file_size;
      delete nextContent.mime_type;
      delete nextContent.resolved_url;
      const { error } = await db.from('lesson_blocks').update({ content: nextContent, updated_at: new Date().toISOString() }).eq('id', id);
      if (error) return showToast(error.message, 'error');
      await db.storage.from(LESSON_MEDIA_BUCKET).remove([path]);
      showToast('Archivo retirado del bloque.', 'success');
      await refreshBuilder();
    });

    element.querySelector('[data-delete-block]')?.addEventListener('click', async () => {
      if (!confirm('¿Eliminar este bloque?')) return;
      const currentBlock = blocks.find(item => item.id === id);
      const { error } = await db.from('lesson_blocks').delete().eq('id', id);
      if (error) return showToast(error.message, 'error');
      if (currentBlock?.content?.file_path) await db.storage.from(LESSON_MEDIA_BUCKET).remove([currentBlock.content.file_path]);
      await refreshBuilder();
    });
    element.querySelectorAll('[data-move-block]').forEach(button => button.addEventListener('click', async () => {
      const index = blocks.findIndex(item => item.id === id);
      const target = button.dataset.moveBlock === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= blocks.length) return;
      const current = blocks[index], other = blocks[target];
      await Promise.all([db.from('lesson_blocks').update({ position: other.position }).eq('id', current.id), db.from('lesson_blocks').update({ position: current.position }).eq('id', other.id)]);
      await refreshBuilder();
    }));
  });

  document.querySelector('#publish-from-builder')?.addEventListener('click', async () => {
    const { error } = await db.from('courses').update({ status: 'published' }).eq('id', course.id);
    if (error) return showToast(error.message, 'error');
    showToast('Curso publicado.', 'success');
    await refreshBuilder();
  });

  document.querySelector('#save-course-version')?.addEventListener('click', async () => {
    setStatus('Creando versión…');
    const snapshot = { course: { id: course.id, title: course.title, status: course.status }, modules: course.modules, lesson_id: lesson.id, blocks };
    const { data: latest } = await db.from('course_versions').select('version_number').eq('course_id', course.id).order('version_number', { ascending: false }).limit(1).maybeSingle();
    const number = (latest?.version_number || 0) + 1;
    const { error } = await db.from('course_versions').insert({ course_id: course.id, version_number: number, label: `Versión manual ${number}`, snapshot, created_by: state.user.id });
    if (error) return showToast(error.message, 'error');
    showToast(`Versión ${number} guardada.`, 'success');
    await refreshBuilder();
  });

  document.querySelectorAll('[data-restore-version]').forEach(button => button.addEventListener('click', async () => {
    if (!confirm('¿Restaurar los bloques guardados en esta versión? Los bloques actuales de esta lección serán reemplazados.')) return;
    const { data: version, error } = await db.from('course_versions').select('snapshot').eq('id', button.dataset.restoreVersion).single();
    if (error) return showToast(error.message, 'error');
    const snapshotBlocks = version.snapshot?.blocks || [];
    await db.from('lesson_blocks').delete().eq('lesson_id', lesson.id);
    if (snapshotBlocks.length) {
      const rows = snapshotBlocks.map((item, index) => ({ lesson_id: lesson.id, block_type: item.block_type, position: index + 1, content: item.content || {}, created_by: state.user.id }));
      const { error: insertError } = await db.from('lesson_blocks').insert(rows);
      if (insertError) return showToast(insertError.message, 'error');
    }
    showToast('Versión restaurada.', 'success');
    await refreshBuilder();
  }));
}

window.addEventListener('hashchange', route);
window.addEventListener('load', () => {
  init().catch(error => {
    console.error('Fallo al iniciar Academia AG:', error);
    app.innerHTML = `
      <main class="login-screen">
        <section class="login-card glass">
          <img class="official-lockup" src="logo-completo-oficial.png" alt="AG Business Networking">
          <h1>No pudimos iniciar la academia</h1>
          <p>${escapeHtml(error?.message || 'Ocurrió un error inesperado.')}</p>
          <div class="bootstrap-actions">
            <a class="btn btn-primary" href="diagnostico.html">Abrir diagnóstico</a>
            <a class="btn btn-secondary" href="limpiar-cache.html">Limpiar versión anterior</a>
          </div>
        </section>
      </main>`;
  });
});
