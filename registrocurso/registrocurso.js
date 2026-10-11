(() => {
  'use strict';

  const cfg = window.SUPABASE_CONFIG || {};
  const FLOW_STORAGE_KEY = 'ag-driver-registration:agent-flow-v3';
  const REGISTRATION_STORAGE_KEY = 'ag-driver-registration:last-success';
  const OFFICIAL_COVER = 'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png';

  const messagesNode = document.querySelector('#registration-chat-messages');
  const quickNode = document.querySelector('#registration-quick-replies');
  const form = document.querySelector('#registration-chat-form');
  const input = document.querySelector('#registration-chat-input');
  const sendButton = document.querySelector('#registration-chat-send');
  const statusNode = document.querySelector('#registration-chat-status');
  const restartButton = document.querySelector('#restart-registration');
  const year = document.querySelector('#year');

  const STEP_ORDER = ['name','email','phone','consent','occupation','address','city','state','zip','heardFrom','referrer'];
  let busy = false;
  let flow = loadFlow();

  function defaultFlow() {
    return {
      version: 3,
      step: 'name',
      answers: {},
      completed: false,
      candidateId: '',
      log: [],
      createdAt: new Date().toISOString()
    };
  }

  function loadFlow() {
    try {
      const raw = window.localStorage.getItem(FLOW_STORAGE_KEY);
      if (!raw) return defaultFlow();
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 3 || !parsed?.answers || !Array.isArray(parsed?.log)) return defaultFlow();
      return { ...defaultFlow(), ...parsed };
    } catch (_) {
      return defaultFlow();
    }
  }

  function saveFlow() {
    try { window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flow)); } catch (_) {}
  }

  function campaignContext() {
    const params = new URLSearchParams(window.location.search);
    return {
      utm_source: params.get('utm_source') || 'landing-registrocurso',
      utm_medium: params.get('utm_medium') || 'direct',
      utm_campaign: params.get('utm_campaign') || 'utah-driver-success-program',
      utm_content: params.get('utm_content') || '',
      utm_term: params.get('utm_term') || '',
      ref: params.get('ref') || document.referrer || ''
    };
  }

  function applyOfficialCover() {
    const heroImage = document.querySelector('.hero-image img');
    if (heroImage) {
      heroImage.src = OFFICIAL_COVER;
      heroImage.alt = 'Portada oficial Utah Driver Success Program™ · Angelica Gallardo';
    }
    const socialImage = document.querySelector('meta[property="og:image"]');
    if (socialImage) socialImage.setAttribute('content', OFFICIAL_COVER);
  }

  function scrollChat() {
    if (!messagesNode) return;
    requestAnimationFrame(() => { messagesNode.scrollTop = messagesNode.scrollHeight; });
  }

  function addBubble(text, kind = 'agent', save = true) {
    if (!messagesNode || !text) return;
    const row = document.createElement('div');
    row.className = `registration-chat-row is-${kind}`;

    if (kind === 'agent') {
      const avatar = document.createElement('span');
      avatar.className = 'registration-chat-avatar';
      avatar.textContent = 'AG';
      row.appendChild(avatar);
    }

    const bubble = document.createElement('div');
    bubble.className = 'registration-chat-bubble';
    bubble.textContent = String(text);
    row.appendChild(bubble);
    messagesNode.appendChild(row);

    if (save) {
      flow.log.push({ kind, text: String(text) });
      saveFlow();
    }
    scrollChat();
  }

  function renderLog() {
    if (!messagesNode) return;
    messagesNode.innerHTML = '';
    flow.log.forEach(item => addBubble(item.text, item.kind, false));
  }

  function setStatus(text = '', type = '') {
    if (!statusNode) return;
    statusNode.textContent = text;
    statusNode.className = `chat-status${type ? ` is-${type}` : ''}`;
  }

  function setBusy(next, text = '') {
    busy = next;
    if (input) input.disabled = next || flow.completed || flow.step === 'consent';
    if (sendButton) sendButton.disabled = next || flow.completed || flow.step === 'consent';
    if (next) setStatus(text || 'Procesando…', 'busy');
  }

  function renderQuickReplies(items = []) {
    if (!quickNode) return;
    quickNode.innerHTML = '';
    items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-quick-reply';
      button.textContent = item.label;
      button.addEventListener('click', item.action);
      quickNode.appendChild(button);
    });
  }

  function promptFor(step) {
    const prompts = {
      name: 'Hola. Soy el Asesor AG de registro. Te acompañaré paso a paso para solicitar tu lugar en Utah Driver Success Program™. ¿Cuál es tu nombre completo?',
      email: 'Gracias. ¿Cuál es tu correo electrónico?',
      phone: 'Perfecto. ¿Cuál es tu número de teléfono? Incluye el código de área.',
      consent: 'Antes de continuar necesito tu autorización para que AG Business Networking use estos datos únicamente para atender tu solicitud y dar seguimiento a tu inscripción. Revisa el aviso de privacidad y selecciona “Sí, autorizo y continuar”.',
      occupation: '¿Cuál es tu ocupación actualmente?',
      address: '¿Cuál es tu dirección? Escribe calle y número.',
      city: '¿En qué ciudad vives?',
      state: '¿En qué estado vives?',
      zip: '¿Cuál es tu código postal o ZIP?',
      heardFrom: '¿Cómo te enteraste del Utah Driver Success Program™?',
      referrer: '¿Cómo se llama la persona que te invitó o recomendó el curso?'
    };
    return prompts[step] || '';
  }

  function inputSettings(step) {
    const settings = {
      name: ['text','Tu nombre y apellido','name'],
      email: ['email','nombre@correo.com','email'],
      phone: ['tel','(801) 000-0000','tel'],
      occupation: ['text','Ej. Construcción, ventas, estudiante, hogar','organization-title'],
      address: ['text','Calle y número','street-address'],
      city: ['text','Tu ciudad','address-level2'],
      state: ['text','Ej. Utah','address-level1'],
      zip: ['text','Ej. 84000','postal-code'],
      heardFrom: ['text','Elige una opción','off'],
      referrer: ['text','Nombre de la persona','off']
    };
    return settings[step] || settings.name;
  }

  function configureComposer() {
    if (!input || !sendButton) return;

    if (flow.completed) {
      input.disabled = true;
      sendButton.disabled = true;
      input.placeholder = 'Registro enviado correctamente';
      renderQuickReplies([]);
      setStatus('Solicitud registrada en AG Business Networking.', 'success');
      return;
    }

    const step = flow.step;
    const [type, placeholder, autocomplete] = inputSettings(step);
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.inputMode = step === 'phone' ? 'tel' : step === 'zip' ? 'numeric' : 'text';
    input.disabled = busy || step === 'consent';
    sendButton.disabled = busy || step === 'consent';

    if (step === 'consent') {
      renderQuickReplies([{ label: 'Sí, autorizo y continuar', action: () => processAnswer('Sí, autorizo') }]);
      setStatus('Tus datos se registrarán directamente en el CRM de AG.');
      return;
    }

    if (step === 'heardFrom') {
      const choices = ['Instagram','Facebook','TikTok','WhatsApp','Recomendación','Otro'];
      renderQuickReplies(choices.map(value => ({ label: value, action: () => processAnswer(value) })));
      setStatus('Puedes elegir una opción o escribirla.');
      return;
    }

    renderQuickReplies([]);
    if (!busy) setStatus('');
  }

  function askCurrent() {
    if (flow.completed) return configureComposer();
    const prompt = promptFor(flow.step);
    if (prompt) addBubble(prompt, 'agent');
    configureComposer();
    setTimeout(() => input?.focus(), 80);
  }

  function normalizeName(value) {
    return value.replace(/\s+/g, ' ').trim();
  }

  function normalizeHeardFrom(value) {
    const clean = value.trim().toLowerCase();
    const map = new Map([
      ['instagram','Instagram'],['facebook','Facebook'],['tiktok','TikTok'],['tik tok','TikTok'],
      ['whatsapp','WhatsApp'],['recomendación','Recomendación'],['recomendacion','Recomendación'],
      ['alguien me invitó','Recomendación'],['alguien me invito','Recomendación'],['otro','Otro']
    ]);
    return map.get(clean) || value.trim();
  }

  function validateAnswer(step, raw) {
    const value = String(raw || '').trim();
    if (!value) return { ok:false, message:'Escribe una respuesta para continuar.' };

    if (step === 'name') {
      const name = normalizeName(value);
      if (name.split(' ').filter(Boolean).length < 2) return { ok:false, message:'Escribe tu nombre y apellido para identificar correctamente tu solicitud.' };
      return { ok:true, value:name };
    }

    if (step === 'email') {
      const email = value.replace(/\s+/g,'').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok:false, message:'Ese correo no parece completo. Escríbelo nuevamente.' };
      return { ok:true, value:email };
    }

    if (step === 'phone') {
      const digits = value.replace(/\D/g,'');
      if (digits.length < 10 || digits.length > 15) return { ok:false, message:'Escribe un teléfono válido con código de área.' };
      return { ok:true, value };
    }

    if (step === 'consent') {
      if (!/^s[ií]/i.test(value) && !/autorizo/i.test(value)) return { ok:false, message:'Necesitamos tu autorización para enviar la solicitud.' };
      return { ok:true, value:'Sí, autorizo' };
    }

    if (step === 'heardFrom') return { ok:true, value:normalizeHeardFrom(value) };
    return { ok:true, value };
  }

  function nextStepAfter(step) {
    if (step === 'heardFrom') return flow.answers.heardFrom === 'Recomendación' ? 'referrer' : 'final';
    if (step === 'referrer') return 'final';
    const index = STEP_ORDER.indexOf(step);
    return index >= 0 && index < STEP_ORDER.length - 1 ? STEP_ORDER[index + 1] : 'final';
  }

  function acknowledgement(step) {
    const messages = {
      occupation:'Gracias. Lo agregué a tu solicitud.',
      address:'Perfecto, dirección registrada.',
      city:'Gracias, ciudad registrada.',
      state:'Perfecto.',
      zip:'Gracias.',
      heardFrom:'Excelente, ya registré cómo conociste el programa.',
      referrer:'Gracias. También quedó registrada la referencia.'
    };
    return messages[step] || '';
  }

  function summaryText() {
    return [
      'Resumen de tu solicitud',
      `Nombre: ${flow.answers.name || ''}`,
      `Correo: ${flow.answers.email || ''}`,
      `Teléfono: ${flow.answers.phone || ''}`,
      `Ocupación: ${flow.answers.occupation || ''}`,
      `Dirección: ${flow.answers.address || ''}`,
      `Ciudad: ${flow.answers.city || ''}`,
      `Estado: ${flow.answers.state || ''}`,
      `Código postal / ZIP: ${flow.answers.zip || ''}`,
      `Cómo se enteró: ${flow.answers.heardFrom || ''}`,
      flow.answers.referrer ? `Persona que invitó/recomendó: ${flow.answers.referrer}` : '',
      'Autorización de privacidad: Sí'
    ].filter(Boolean).join('\n');
  }

  async function finalizeRegistration() {
    if (!cfg.url || !cfg.publishableKey) {
      addBubble('El sistema de registro no está disponible en este momento. Intenta nuevamente más tarde.', 'system');
      return;
    }

    addBubble(summaryText(), 'summary');
    setBusy(true, 'Registrando tu solicitud en AG…');

    const campaign = campaignContext();

    try {
      const response = await fetch(`${cfg.url}/rest/v1/rpc/ag_crm_register_course_interest`, {
        method:'POST',
        headers:{
          'Content-Type':'application/json',
          'apikey':cfg.publishableKey,
          'Authorization':`Bearer ${cfg.publishableKey}`
        },
        body:JSON.stringify({
          p_full_name:flow.answers.name,
          p_email:flow.answers.email,
          p_phone:flow.answers.phone,
          p_occupation:flow.answers.occupation || null,
          p_address:flow.answers.address || null,
          p_city:flow.answers.city || null,
          p_state:flow.answers.state || null,
          p_zip:flow.answers.zip || null,
          p_heard_from:flow.answers.heardFrom || null,
          p_referrer:flow.answers.referrer || null,
          p_campaign:campaign,
          p_consent:true,
          p_honeypot:null
        })
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok) throw new Error(payload?.message || 'No fue posible registrar la solicitud.');

      flow.candidateId = typeof payload === 'string' ? payload : String(payload || '');
      flow.completed = true;
      flow.step = 'complete';
      saveFlow();

      try {
        window.sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify({
          candidateId:flow.candidateId,
          name:flow.answers.name,
          email:flow.answers.email,
          phone:flow.answers.phone,
          submittedAt:new Date().toISOString(),
          campaign:campaign.utm_campaign
        }));
      } catch (_) {}

      setBusy(false);
      addBubble('¡Listo! Tu solicitud fue recibida por AG Business Networking. El equipo revisará tu registro y dará seguimiento para confirmar el siguiente paso. Este registro no significa todavía que la inscripción esté aprobada.', 'agent');
      configureComposer();
    } catch (error) {
      console.error('AG_DRIVER_CRM_REGISTRATION_FAILED', error);
      setBusy(false);
      addBubble('Tus respuestas siguen guardadas en este dispositivo, pero no pudimos enviarlas al CRM de AG. Intenta enviar nuevamente en unos segundos.', 'system');
      renderQuickReplies([{ label:'Reintentar envío', action:finalizeRegistration }]);
      setStatus('No se pudo confirmar el envío.', 'error');
    }
  }

  async function processAnswer(raw) {
    if (busy || flow.completed) return;
    const step = flow.step;
    const checked = validateAnswer(step, raw);
    if (!checked.ok) {
      addBubble(checked.message, 'system');
      configureComposer();
      return;
    }

    const value = checked.value;
    addBubble(value, 'user');
    flow.answers[step] = value;
    saveFlow();

    if (step === 'consent') {
      flow.answers.consent = true;
      flow.step = 'occupation';
      saveFlow();
      addBubble('Gracias. Tu autorización quedó registrada. Continuemos.', 'agent');
      askCurrent();
      return;
    }

    const next = nextStepAfter(step);
    const ack = acknowledgement(step);
    if (ack) addBubble(ack, 'agent');

    if (next === 'final') {
      await finalizeRegistration();
      return;
    }

    flow.step = next;
    saveFlow();
    askCurrent();
  }

  function startFreshIfRequested() {
    const params = new URLSearchParams(window.location.search);
    if (params.get('nuevo') !== '1') return;
    window.localStorage.removeItem(FLOW_STORAGE_KEY);
    flow = defaultFlow();
    params.delete('nuevo');
    const nextUrl = `${window.location.pathname}${params.toString() ? `?${params}` : ''}${window.location.hash}`;
    window.history.replaceState({}, '', nextUrl);
  }

  function init() {
    startFreshIfRequested();
    applyOfficialCover();
    if (year) year.textContent = new Date().getFullYear();
    renderLog();

    if (!flow.log.length) askCurrent();
    else configureComposer();
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const value = String(input?.value || '').trim();
    if (!value) return;
    if (input) input.value = '';
    processAnswer(value);
  });

  restartButton?.addEventListener('click', () => {
    const confirmed = window.confirm('¿Quieres borrar esta conversación de registro en este dispositivo y comenzar de nuevo?');
    if (!confirmed) return;
    window.localStorage.removeItem(FLOW_STORAGE_KEY);
    window.sessionStorage.removeItem(REGISTRATION_STORAGE_KEY);
    window.location.reload();
  });

  init();
})();