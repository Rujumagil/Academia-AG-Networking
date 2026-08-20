(() => {
  'use strict';

  const RELEASE = '20260819.40';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const MODES = {
    education: {
      label: 'Tutor Educativo',
      subtitle: 'Aprende y refuerza',
      greeting: 'Hola. Soy tu Tutor Educativo de Academia AG. Puedo explicarte conceptos, darte ejemplos y ayudarte a repasar la lección actual. Durante una evaluación te ayudaré a entender el tema, pero no contestaré el examen por ti.',
      placeholder: 'Pregunta sobre tu clase o tema…',
      footer: 'Te ayudo a comprender; no respondo evaluaciones por ti.',
      chips: ['Explícame esta lección', 'Dame un ejemplo', 'Hazme un repaso rápido']
    },
    support: {
      label: 'Soporte Técnico',
      subtitle: 'Acceso y plataforma',
      greeting: 'Hola. Soy el agente de Soporte Técnico de Academia AG. Puedo ayudarte con acceso, contraseña, videos, navegación, evaluaciones y problemas de la plataforma. Nunca te pediré tu contraseña ni códigos de seguridad.',
      placeholder: 'Describe el problema técnico…',
      footer: 'Nunca compartas contraseñas ni códigos de seguridad.',
      chips: ['No reproduce un video', 'No puedo entrar', 'Tengo un problema con el examen']
    }
  };

  let mode = 'education';
  let client = null;
  let session = null;
  let busy = false;
  let mounted = false;
  const histories = { education: [], support: [] };

  const esc = value => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  function storageKey(kind) {
    return `ag-academy-agent-${kind}-${mode}`;
  }

  function loadHistory(kind) {
    try {
      const parsed = JSON.parse(sessionStorage.getItem(`ag-academy-agent-${kind}`) || '[]');
      return Array.isArray(parsed) ? parsed.slice(-14) : [];
    } catch {
      return [];
    }
  }

  function saveHistory(kind) {
    try {
      sessionStorage.setItem(`ag-academy-agent-${kind}`, JSON.stringify(histories[kind].slice(-14)));
    } catch {}
  }

  function stateContext() {
    const context = {
      route: location.hash || '#home',
      course_id: null,
      course_title: null,
      module_id: null,
      module_title: null,
      lesson_id: null,
      lesson_title: null,
      exam_active: Boolean(document.querySelector('.module-exam-card, .assessment-form, .quiz-form')),
      page_title: document.querySelector('.page-title')?.textContent?.trim() || document.title,
      user_agent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    };

    try {
      const parts = location.hash.replace(/^#/, '').split('/');
      if (parts[0] === 'lesson' && parts[1] && parts[2]) {
        context.course_id = parts[1];
        context.lesson_id = parts[2];
      } else if (parts[0] === 'course' && parts[1]) {
        context.course_id = parts[1];
      }

      if (typeof state !== 'undefined' && Array.isArray(state.courses)) {
        const course = state.courses.find(item => item.id === context.course_id) || state.courses.find(item => item.id === COURSE_ID);
        if (course) {
          context.course_id = course.id;
          context.course_title = course.title;
          for (const module of course.modules || []) {
            const lesson = (module.lessons || []).find(item => item.id === context.lesson_id);
            if (lesson) {
              context.module_id = module.id;
              context.module_title = module.title;
              context.lesson_title = lesson.title;
              break;
            }
          }
        }
      }
    } catch {}

    return context;
  }

  async function ensureClient() {
    if (client && session?.access_token) return true;
    const cfg = window.SUPABASE_CONFIG;
    if (!window.supabase?.createClient || !cfg?.url || !cfg?.publishableKey) return false;
    client = window.supabase.createClient(cfg.url, cfg.publishableKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
    });
    const { data } = await client.auth.getSession();
    session = data?.session || null;
    return Boolean(session?.access_token);
  }

  function shell() {
    const launcher = document.createElement('button');
    launcher.type = 'button';
    launcher.className = 'ag-agent-launcher';
    launcher.setAttribute('aria-label', 'Abrir ayuda de Academia AG');
    launcher.innerHTML = `
      <span class="ag-agent-launcher__icon">✦</span>
      <span class="ag-agent-launcher__copy"><small>Academia AG</small><span>Ayuda inteligente</span></span>`;

    const panel = document.createElement('section');
    panel.className = 'ag-agent-panel';
    panel.setAttribute('aria-label', 'Asistentes de Academia AG');
    panel.innerHTML = `
      <header class="ag-agent-head">
        <span class="ag-agent-brand">AG</span>
        <div class="ag-agent-headcopy"><strong id="ag-agent-title">Tutor Educativo</strong><span><i class="ag-agent-status-dot"></i><span id="ag-agent-subtitle">Aprende y refuerza</span></span></div>
        <button class="ag-agent-close" type="button" aria-label="Cerrar">×</button>
      </header>
      <div class="ag-agent-modes">
        <button class="ag-agent-mode is-active" data-agent-mode="education" type="button"><strong>🎓 Tutor Educativo</strong><span>Clase, conceptos y repaso</span></button>
        <button class="ag-agent-mode" data-agent-mode="support" type="button"><strong>🛠 Soporte Técnico</strong><span>Acceso, videos y plataforma</span></button>
      </div>
      <div class="ag-agent-messages" id="ag-agent-messages" role="log" aria-live="polite"></div>
      <div class="ag-agent-quick" id="ag-agent-quick"></div>
      <div class="ag-agent-compose">
        <div class="ag-agent-inputrow">
          <textarea class="ag-agent-input" id="ag-agent-input" rows="1" maxlength="1800" placeholder="Pregunta sobre tu clase o tema…"></textarea>
          <button class="ag-agent-send" id="ag-agent-send" type="button" aria-label="Enviar">➤</button>
        </div>
        <div class="ag-agent-meta"><span id="ag-agent-footer">Te ayudo a comprender; no respondo evaluaciones por ti.</span><button class="ag-agent-ticket" id="ag-agent-ticket" type="button" hidden>Crear ticket humano</button></div>
        <div class="ag-agent-ticketbox" id="ag-agent-ticketbox">
          <p>Enviaré al equipo de soporte tu problema, la lección actual y datos técnicos básicos del navegador. No se envían contraseñas.</p>
          <div class="ag-agent-ticket-actions"><button class="ag-agent-ticket-confirm" id="ag-agent-ticket-confirm" type="button">Crear ticket</button><button class="ag-agent-ticket-cancel" id="ag-agent-ticket-cancel" type="button">Cancelar</button></div>
        </div>
      </div>`;

    document.body.append(launcher, panel);
    return { launcher, panel };
  }

  function ensureGreeting(kind) {
    if (!histories[kind].length) histories[kind].push({ role: 'assistant', text: MODES[kind].greeting, local: true });
  }

  function renderMessages() {
    ensureGreeting(mode);
    const node = document.querySelector('#ag-agent-messages');
    if (!node) return;
    node.innerHTML = histories[mode].map(message => `
      <div class="ag-agent-message ${message.role === 'user' ? 'is-user' : message.role === 'system' ? 'is-system' : 'is-assistant'}">
        <div class="ag-agent-bubble">${esc(message.text)}</div>
      </div>`).join('');
    node.scrollTop = node.scrollHeight;
  }

  function renderMode() {
    const meta = MODES[mode];
    document.querySelector('#ag-agent-title').textContent = meta.label;
    document.querySelector('#ag-agent-subtitle').textContent = meta.subtitle;
    document.querySelector('#ag-agent-input').placeholder = meta.placeholder;
    document.querySelector('#ag-agent-footer').textContent = meta.footer;
    document.querySelector('#ag-agent-ticket').hidden = mode !== 'support';
    document.querySelectorAll('[data-agent-mode]').forEach(btn => btn.classList.toggle('is-active', btn.dataset.agentMode === mode));
    const quick = document.querySelector('#ag-agent-quick');
    quick.innerHTML = meta.chips.map(text => `<button class="ag-agent-chip" type="button" data-agent-chip="${esc(text)}">${esc(text)}</button>`).join('');
    document.querySelector('#ag-agent-ticketbox')?.classList.remove('is-open');
    renderMessages();
  }

  function push(role, text, local = false) {
    histories[mode].push({ role, text: String(text || '').trim(), local });
    histories[mode] = histories[mode].slice(-14);
    saveHistory(mode);
    renderMessages();
  }

  function setThinking(show) {
    const node = document.querySelector('#ag-agent-messages');
    node?.querySelector('.ag-agent-message.is-thinking')?.remove();
    if (!show || !node) return;
    const row = document.createElement('div');
    row.className = 'ag-agent-message is-assistant is-thinking';
    row.innerHTML = '<div class="ag-agent-bubble"><span class="ag-agent-thinking"><i></i><i></i><i></i></span></div>';
    node.appendChild(row);
    node.scrollTop = node.scrollHeight;
  }

  function localSupport(message) {
    const q = message.toLowerCase();
    if (/video|reproduce|reproducci[oó]n|youtube|pantalla negra/.test(q)) {
      return 'Prueba primero abrir otra lección y volver a la actual. Si el reproductor sigue sin cargar, recarga la página y verifica tu conexión. Si el problema continúa, pulsa “Crear ticket humano” para que soporte reciba la lección exacta donde ocurre.';
    }
    if (/contrase|password|entrar|acceso|sesion|sesi[oó]n/.test(q)) {
      return 'No compartas tu contraseña. Usa la opción de recuperación de acceso de la Academia y confirma que estás entrando con el mismo correo con el que fuiste registrado. Si sigues sin poder entrar, crea un ticket humano desde este panel.';
    }
    if (/examen|evaluaci[oó]n|pregunta|resultado/.test(q)) {
      return 'Si el cuestionario no carga o no guarda el resultado, recarga la lección final del módulo y vuelve a abrir “Reforzar lo aprendido”. Si persiste, crea un ticket humano para revisar tu cuenta y el módulo exacto.';
    }
    return 'Puedo ayudarte con acceso, videos, navegación, evaluaciones o fallas de la plataforma. Si el problema no se resuelve con una indicación básica, usa “Crear ticket humano” para enviarlo al equipo técnico.';
  }

  function offlineEducation() {
    const ctx = stateContext();
    const where = [ctx.module_title, ctx.lesson_title].filter(Boolean).join(' · ');
    return `El Tutor Educativo está instalado, pero la conexión de IA todavía no está activa en el servidor.${where ? ` Estás en: ${where}.` : ''} En cuanto se active, podré explicarte la lección, darte ejemplos y ayudarte a repasar sin contestar evaluaciones por ti.`;
  }

  async function askAgent(message) {
    if (!await ensureClient()) throw new Error('SESSION_UNAVAILABLE');
    const cfg = window.SUPABASE_CONFIG;
    const context = stateContext();
    const history = histories[mode]
      .filter(item => item.role === 'user' || item.role === 'assistant')
      .slice(-8)
      .map(item => ({ role: item.role, text: item.text }));

    const response = await fetch(`${cfg.url}/functions/v1/academy-agent`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
        'apikey': cfg.publishableKey
      },
      body: JSON.stringify({ mode, message, history, context })
    });

    let payload = {};
    try { payload = await response.json(); } catch {}
    if (!response.ok) {
      const error = new Error(payload?.error || `HTTP_${response.status}`);
      error.status = response.status;
      throw error;
    }
    if (!payload?.reply) throw new Error('EMPTY_REPLY');
    return String(payload.reply);
  }

  async function send(text) {
    const message = String(text || '').trim();
    if (!message || busy) return;
    busy = true;
    const input = document.querySelector('#ag-agent-input');
    const sendBtn = document.querySelector('#ag-agent-send');
    input.value = '';
    input.style.height = 'auto';
    sendBtn.disabled = true;
    push('user', message);
    setThinking(true);

    try {
      const reply = await askAgent(message);
      setThinking(false);
      push('assistant', reply);
    } catch (error) {
      console.warn('Academy agent unavailable:', error);
      setThinking(false);
      push('assistant', mode === 'support' ? localSupport(message) : offlineEducation(), true);
    } finally {
      busy = false;
      sendBtn.disabled = false;
      input.focus();
    }
  }

  async function createSupportTicket() {
    const confirm = document.querySelector('#ag-agent-ticket-confirm');
    if (!confirm || confirm.disabled) return;
    confirm.disabled = true;
    confirm.textContent = 'Enviando…';
    try {
      if (!await ensureClient()) throw new Error('No hay sesión activa.');
      const ctx = stateContext();
      const transcript = histories.support.slice(-8).map(item => `${item.role === 'user' ? 'Alumno' : 'Soporte'}: ${item.text}`).join('\n\n');
      const message = [
        transcript || 'El alumno solicitó soporte técnico desde el agente.',
        '',
        '--- Diagnóstico automático ---',
        `Ruta: ${ctx.route}`,
        `Curso: ${ctx.course_title || ctx.course_id || 'No identificado'}`,
        `Módulo: ${ctx.module_title || ctx.module_id || 'No identificado'}`,
        `Lección: ${ctx.lesson_title || ctx.lesson_id || 'No identificada'}`,
        `Pantalla: ${ctx.viewport}`,
        `Navegador: ${ctx.user_agent}`
      ].join('\n').slice(0, 4900);

      const { error } = await client.from('support_tickets').insert({
        user_id: session.user.id,
        category: 'technical',
        subject: `Soporte Academia AG · ${ctx.lesson_title || ctx.page_title || 'Plataforma'}`.slice(0, 140),
        message
      });
      if (error) throw error;
      document.querySelector('#ag-agent-ticketbox')?.classList.remove('is-open');
      push('system', 'Ticket creado correctamente. El equipo técnico recibió el problema y el contexto de la pantalla donde ocurrió.');
    } catch (error) {
      console.error('Support ticket error:', error);
      push('system', 'No pude crear el ticket en este momento. Intenta nuevamente o utiliza el Centro de Soporte de la Academia.');
    } finally {
      confirm.disabled = false;
      confirm.textContent = 'Crear ticket';
    }
  }

  function bind() {
    const launcher = document.querySelector('.ag-agent-launcher');
    const panel = document.querySelector('.ag-agent-panel');
    launcher.addEventListener('click', () => {
      panel.classList.add('is-open');
      renderMode();
      setTimeout(() => document.querySelector('#ag-agent-input')?.focus(), 60);
    });
    document.querySelector('.ag-agent-close').addEventListener('click', () => panel.classList.remove('is-open'));
    document.querySelectorAll('[data-agent-mode]').forEach(button => button.addEventListener('click', () => {
      mode = button.dataset.agentMode;
      renderMode();
    }));
    document.querySelector('#ag-agent-send').addEventListener('click', () => send(document.querySelector('#ag-agent-input').value));
    document.querySelector('#ag-agent-input').addEventListener('keydown', event => {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        send(event.currentTarget.value);
      }
    });
    document.querySelector('#ag-agent-input').addEventListener('input', event => {
      event.currentTarget.style.height = 'auto';
      event.currentTarget.style.height = `${Math.min(event.currentTarget.scrollHeight, 112)}px`;
    });
    document.querySelector('#ag-agent-quick').addEventListener('click', event => {
      const button = event.target.closest('[data-agent-chip]');
      if (button) send(button.dataset.agentChip);
    });
    document.querySelector('#ag-agent-ticket').addEventListener('click', () => document.querySelector('#ag-agent-ticketbox').classList.add('is-open'));
    document.querySelector('#ag-agent-ticket-cancel').addEventListener('click', () => document.querySelector('#ag-agent-ticketbox').classList.remove('is-open'));
    document.querySelector('#ag-agent-ticket-confirm').addEventListener('click', createSupportTicket);
  }

  function mount() {
    if (mounted || document.querySelector('.ag-agent-launcher')) return;
    histories.education = loadHistory('education');
    histories.support = loadHistory('support');
    shell();
    bind();
    renderMode();
    mounted = true;
    document.documentElement.dataset.agAcademyAgents = RELEASE;
  }

  const wait = setInterval(() => {
    const appReady = document.querySelector('.app-shell, .dashboard-shell, .course-detail, .lesson-layout, .student-shell');
    if (appReady || (typeof state !== 'undefined' && state?.user)) {
      clearInterval(wait);
      mount();
    }
  }, 350);
  setTimeout(() => { clearInterval(wait); if (!mounted) mount(); }, 15000);

  window.ACADEMIA_AG_AGENTS = { release: RELEASE, open: () => document.querySelector('.ag-agent-panel')?.classList.add('is-open') };
})();
