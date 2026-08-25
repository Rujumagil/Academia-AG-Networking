(() => {
  'use strict';

  const COMPAS_PUBLIC_KEY = 'wc_aa7383fbaabaca8e3f7e4be26704a0c8c0fc';
  const COMPAS_API_BASE = 'https://app.proyectocompas.com';
  const COMPAS_ENDPOINT = `${COMPAS_API_BASE}/api/public/web-chat/messages?key=${encodeURIComponent(COMPAS_PUBLIC_KEY)}`;
  const FLOW_STORAGE_KEY = 'ag-driver-registration:agent-flow-v2';
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

  const STEP_ORDER = ['name', 'email', 'phone', 'consent', 'occupation', 'address', 'city', 'state', 'zip', 'heardFrom', 'referrer'];
  const FIELD_LABELS = {
    occupation: 'Ocupación',
    address: 'Dirección',
    city: 'Ciudad',
    state: 'Estado',
    zip: 'Código postal / ZIP',
    heardFrom: 'Cómo se enteró del curso',
    referrer: 'Persona que invitó o recomendó'
  };

  let busy = false;
  let flow = loadFlow();

  function defaultFlow() {
    return {
      version: 2,
      step: 'name',
      answers: {},
      sessionToken: '',
      completed: false,
      log: [],
      pending: null,
      createdAt: new Date().toISOString()
    };
  }

  function loadFlow() {
    try {
      const raw = window.localStorage.getItem(FLOW_STORAGE_KEY);
      if (!raw) return defaultFlow();
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 2 || !parsed?.answers || !Array.isArray(parsed?.log)) return defaultFlow();
      return { ...defaultFlow(), ...parsed };
    } catch (_) {
      return defaultFlow();
    }
  }

  function saveFlow() {
    try { window.localStorage.setItem(FLOW_STORAGE_KEY, JSON.stringify(flow)); } catch (_) {}
  }

  function uniqueId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `ag-driver-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function campaignContext() {
    const params = new URLSearchParams(window.location.search);
    return {
      source: params.get('utm_source') || 'landing-registrocurso',
      medium: params.get('utm_medium') || 'direct',
      campaign: params.get('utm_campaign') || 'utah-driver-success-program',
      content: params.get('utm_content') || '',
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
    if (!messagesNode || !text) return null;
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
    return bubble;
  }

  function renderLog() {
    if (!messagesNode) return;
    messagesNode.innerHTML = '';
    for (const item of flow.log) addBubble(item.text, item.kind, false);
  }

  function setStatus(text = '', type = '') {
    if (!statusNode) return;
    statusNode.textContent = text;
    statusNode.className = `chat-status${type ? ` is-${type}` : ''}`;
  }

  function setBusy(next, label = '') {
    busy = next;
    if (input) input.disabled = next || flow.step === 'consent';
    if (sendButton) sendButton.disabled = next || flow.step === 'consent';
    if (next) setStatus(label || 'El Asesor AG está respondiendo…', 'busy');
    else if (statusNode?.classList.contains('is-busy')) setStatus('');
  }

  function renderQuickReplies(items = []) {
    if (!quickNode) return;
    quickNode.innerHTML = '';
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'chat-quick-reply';
      button.textContent = item.label;
      button.addEventListener('click', () => item.action());
      quickNode.appendChild(button);
    }
  }

  function inputSettings(step) {
    const settings = {
      name: ['text', 'Tu nombre y apellido', 'name'],
      email: ['email', 'nombre@correo.com', 'email'],
      phone: ['tel', '(801) 000-0000', 'tel'],
      occupation: ['text', 'Ej. Construcción, ventas, estudiante, hogar', 'organization-title'],
      address: ['text', 'Calle y número', 'street-address'],
      city: ['text', 'Tu ciudad', 'address-level2'],
      state: ['text', 'Ej. Utah', 'address-level1'],
      zip: ['text', 'Ej. 84000', 'postal-code'],
      heardFrom: ['text', 'Elige una opción', 'off'],
      referrer: ['text', 'Nombre de la persona', 'off'],
      followup: ['text', 'Escribe tu pregunta al Asesor AG…', 'off']
    };
    return settings[step] || settings.followup;
  }

  function configureComposer() {
    if (!input || !sendButton) return;
    const step = flow.completed ? 'followup' : flow.step;
    const [type, placeholder, autocomplete] = inputSettings(step);
    input.type = type;
    input.placeholder = placeholder;
    input.autocomplete = autocomplete;
    input.inputMode = step === 'phone' ? 'tel' : step === 'zip' ? 'numeric' : 'text';
    input.disabled = busy || step === 'consent';
    sendButton.disabled = busy || step === 'consent';

    if (flow.completed) {
      renderQuickReplies([]);
      setStatus('Registro enviado. Puedes seguir conversando con el Asesor AG.');
      return;
    }

    if (flow.pending) {
      renderQuickReplies([
        { label: 'Reintentar conexión', action: retryPending }
      ]);
      input.disabled = true;
      sendButton.disabled = true;
      setStatus('Tu respuesta está guardada. Falta reconectar con el Asesor AG.', 'error');
      return;
    }

    if (step === 'consent') {
      renderQuickReplies([
        { label: 'Sí, autorizo y continuar', action: () => processAnswer('Sí, autorizo') }
      ]);
      setStatus('Lee el aviso de privacidad antes de continuar.');
      return;
    }

    if (step === 'heardFrom') {
      const choices = ['Instagram', 'Facebook', 'TikTok', 'WhatsApp', 'Recomendación', 'Otro'];
      renderQuickReplies(choices.map(value => ({ label: value, action: () => processAnswer(value) })));
      setStatus('Puedes elegir una opción o escribirla.');
      return;
    }

    renderQuickReplies([]);
    if (!busy) setStatus('');
  }

  function promptFor(step) {
    const prompts = {
      name: 'Hola. Soy el Asesor AG de registro. Te acompañaré paso a paso para solicitar tu lugar en Utah Driver Success Program™. Para comenzar, ¿cuál es tu nombre completo?',
      email: 'Gracias. ¿Cuál es tu correo electrónico?',
      phone: 'Perfecto. ¿Cuál es tu número de teléfono? Incluye el código de área.',
      consent: 'Antes de conectarte con el agente, necesito tu autorización para usar estos datos únicamente para atender tu solicitud y dar seguimiento a tu inscripción. Revisa el aviso de privacidad que aparece debajo de la conversación y, si estás de acuerdo, selecciona “Sí, autorizo y continuar”.',
      occupation: 'Ahora sí, continuemos con tu registro. ¿Cuál es tu ocupación actualmente?',
      address: '¿Cuál es tu dirección? Escribe calle y número.',
      city: '¿En qué ciudad vives?',
      state: '¿En qué estado vives?',
      zip: '¿Cuál es tu código postal o ZIP?',
      heardFrom: '¿Cómo te enteraste del Utah Driver Success Program™?',
      referrer: '¿Cómo se llama la persona que te invitó o te recomendó el curso?'
    };
    return prompts[step] || '';
  }

  function askCurrent() {
    if (flow.completed || flow.pending) {
      configureComposer();
      return;
    }
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
      ['instagram', 'Instagram'], ['facebook', 'Facebook'], ['tiktok', 'TikTok'],
      ['tik tok', 'TikTok'], ['whatsapp', 'WhatsApp'], ['recomendación', 'Recomendación'],
      ['recomendacion', 'Recomendación'], ['alguien me invitó', 'Recomendación'],
      ['alguien me invito', 'Recomendación'], ['otro', 'Otro'], ['otro medio', 'Otro']
    ]);
    return map.get(clean) || value.trim();
  }

  function validateAnswer(step, raw) {
    const value = String(raw || '').trim();
    if (!value) return { ok: false, message: 'Escribe una respuesta para continuar.' };

    if (step === 'name') {
      const name = normalizeName(value);
      if (name.split(' ').filter(Boolean).length < 2) {
        return { ok: false, message: 'Escribe tu nombre y apellido para identificar correctamente tu solicitud.' };
      }
      return { ok: true, value: name };
    }

    if (step === 'email') {
      const email = value.replace(/\s+/g, '').toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return { ok: false, message: 'Ese correo no parece completo. Escríbelo de nuevo, por ejemplo nombre@correo.com.' };
      }
      return { ok: true, value: email };
    }

    if (step === 'phone') {
      const digits = value.replace(/\D/g, '');
      if (digits.length < 10 || digits.length > 15) {
        return { ok: false, message: 'Escribe un teléfono válido con código de área (entre 10 y 15 dígitos).' };
      }
      return { ok: true, value };
    }

    if (step === 'consent') {
      if (!/^s[ií]/i.test(value) && !/autorizo/i.test(value)) {
        return { ok: false, message: 'Para enviar tu solicitud necesitamos tu autorización. Puedes revisar el aviso de privacidad y continuar cuando estés de acuerdo.' };
      }
      return { ok: true, value: 'Sí, autorizo' };
    }

    if (step === 'heardFrom') return { ok: true, value: normalizeHeardFrom(value) };
    return { ok: true, value };
  }

  function splitName(fullName) {
    const parts = normalizeName(fullName).split(' ');
    return {
      firstName: parts.shift() || '',
      lastName: parts.join(' ')
    };
  }

  async function sendToAgent(message) {
    const name = flow.answers.name || '';
    const response = await fetch(COMPAS_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        publicKey: COMPAS_PUBLIC_KEY,
        sessionToken: flow.sessionToken || undefined,
        clientMessageId: uniqueId(),
        message,
        name,
        email: flow.answers.email || undefined,
        phone: flow.answers.phone || undefined,
        company: 'AG Business Networking',
        consent: true,
        pageUrl: window.location.href,
        serviceRoute: 'sales'
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok || !payload.ok) throw new Error(payload.error || 'No fue posible conectar con el Asesor AG.');

    if (payload.sessionToken) {
      flow.sessionToken = payload.sessionToken;
      saveFlow();
    }
    return String(payload.reply || '').trim();
  }

  function kickoffMessage() {
    const context = campaignContext();
    return [
      'INICIO DE REGISTRO ASISTIDO · Utah Driver Success Program™.',
      `Nombre: ${flow.answers.name}`,
      `Correo: ${flow.answers.email}`,
      `Teléfono: ${flow.answers.phone}`,
      `Origen: ${context.source}`,
      `Medio: ${context.medium}`,
      `Campaña: ${context.campaign}`,
      context.content ? `Contenido: ${context.content}` : '',
      context.ref ? `Referencia: ${context.ref}` : '',
      'La persona ya autorizó el uso de sus datos para atender esta solicitud.',
      'Responde directamente a la persona con una bienvenida breve y humana. Confirma que la acompañarás durante el registro. No declares que la inscripción está aprobada y no hagas ninguna pregunta todavía; la página mostrará la siguiente pregunta.'
    ].filter(Boolean).join('\n');
  }

  async function startAgentSession(isRetry = false) {
    if (!isRetry) flow.pending = null;
    setBusy(true, 'Conectando con el Asesor AG…');
    try {
      const reply = await sendToAgent(kickoffMessage());
      if (reply) addBubble(reply, 'agent');
      flow.pending = null;
      flow.step = 'occupation';
      saveFlow();
      setBusy(false);
      askCurrent();
    } catch (error) {
      console.error('AG_DRIVER_AGENT_START_FAILED', error);
      flow.pending = { mode: 'start' };
      saveFlow();
      setBusy(false);
      addBubble('No pude conectar con el Asesor AG en este momento. Tus datos siguen guardados en este dispositivo; puedes reintentar sin volver a escribirlos.', 'system');
      configureComposer();
    }
  }

  function agentFieldMessage(step, value) {
    const label = FIELD_LABELS[step] || step;
    return [
      'DATO DE REGISTRO · Utah Driver Success Program™',
      `${label}: ${value}`,
      'La persona acaba de responder este dato en el registro guiado. Responde brevemente y de forma humana a lo que indicó, sin solicitar otros datos y sin hacer otra pregunta; la página realizará la siguiente pregunta automáticamente.'
    ].join('\n');
  }

  function nextStepAfter(step) {
    if (step === 'heardFrom') {
      return flow.answers.heardFrom === 'Recomendación' ? 'referrer' : 'final';
    }
    if (step === 'referrer') return 'final';
    const index = STEP_ORDER.indexOf(step);
    return index >= 0 && index < STEP_ORDER.length - 1 ? STEP_ORDER[index + 1] : 'final';
  }

  async function sendFieldToAgent(step, value, isRetry = false) {
    setBusy(true);
    try {
      const reply = await sendToAgent(agentFieldMessage(step, value));
      if (reply) addBubble(reply, 'agent');
      flow.pending = null;
      const next = nextStepAfter(step);
      saveFlow();
      setBusy(false);
      if (next === 'final') await finalizeRegistration();
      else {
        flow.step = next;
        saveFlow();
        askCurrent();
      }
    } catch (error) {
      console.error('AG_DRIVER_AGENT_FIELD_FAILED', error);
      flow.pending = { mode: 'field', step, value };
      saveFlow();
      setBusy(false);
      if (!isRetry) addBubble('Tu respuesta quedó guardada, pero se interrumpió la conexión con el Asesor AG. Pulsa “Reintentar conexión” para continuar desde aquí.', 'system');
      configureComposer();
    }
  }

  function summaryText() {
    const context = campaignContext();
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
      'Autorización de privacidad: Sí',
      `Campaña: ${context.campaign}`
    ].filter(Boolean).join('\n');
  }

  async function finalizeRegistration(isRetry = false) {
    flow.step = 'final';
    saveFlow();
    if (!isRetry) addBubble(summaryText(), 'summary');
    setBusy(true, 'Enviando el resumen de tu solicitud…');

    const context = campaignContext();
    const finalMessage = [
      'REGISTRO COMPLETO · Utah Driver Success Program™',
      summaryText(),
      `Origen: ${context.source}`,
      `Medio: ${context.medium}`,
      context.content ? `Contenido: ${context.content}` : '',
      context.ref ? `Referencia: ${context.ref}` : '',
      'La persona terminó todas las preguntas del registro. Responde directamente al usuario confirmando únicamente que la SOLICITUD fue recibida para seguimiento de AG Business Networking; no digas que su inscripción ya está aprobada. Explica brevemente qué ocurrirá después y ofrece resolver cualquier duda adicional.'
    ].filter(Boolean).join('\n');

    try {
      const reply = await sendToAgent(finalMessage);
      if (reply) addBubble(reply, 'agent');
      flow.pending = null;
      flow.completed = true;
      flow.step = 'followup';
      saveFlow();
      window.sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify({
        name: flow.answers.name,
        email: flow.answers.email,
        phone: flow.answers.phone,
        submittedAt: new Date().toISOString(),
        campaign: context.campaign
      }));
      setBusy(false);
      addBubble('Tu conversación y tus datos quedaron enviados al canal de seguimiento de AG Business Networking. Puedes seguir escribiendo aquí si tienes alguna pregunta.', 'system');
      configureComposer();
    } catch (error) {
      console.error('AG_DRIVER_AGENT_FINAL_FAILED', error);
      flow.pending = { mode: 'final' };
      saveFlow();
      setBusy(false);
      if (!isRetry) addBubble('Tus respuestas están completas, pero no pudimos confirmar el envío final. Pulsa “Reintentar conexión” para enviarlas sin volver a comenzar.', 'system');
      configureComposer();
    }
  }

  async function sendFollowup(value) {
    addBubble(value, 'user');
    setBusy(true);
    try {
      const reply = await sendToAgent(value);
      if (reply) addBubble(reply, 'agent');
      setBusy(false);
      configureComposer();
    } catch (error) {
      console.error('AG_DRIVER_AGENT_FOLLOWUP_FAILED', error);
      setBusy(false);
      addBubble('No pude enviar ese mensaje. Intenta nuevamente en unos segundos.', 'system');
      configureComposer();
    }
  }

  async function retryPending() {
    if (busy || !flow.pending) return;
    const pending = { ...flow.pending };
    if (pending.mode === 'start') return startAgentSession(true);
    if (pending.mode === 'field') return sendFieldToAgent(pending.step, pending.value, true);
    if (pending.mode === 'final') return finalizeRegistration(true);
  }

  async function processAnswer(raw) {
    if (busy) return;
    if (flow.pending) return retryPending();
    if (flow.completed) return sendFollowup(String(raw || '').trim());

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

    if (step === 'name') {
      const names = splitName(value);
      flow.answers.firstName = names.firstName;
      flow.answers.lastName = names.lastName;
      flow.step = 'email';
      saveFlow();
      askCurrent();
      return;
    }

    if (step === 'email') {
      flow.step = 'phone';
      saveFlow();
      askCurrent();
      return;
    }

    if (step === 'phone') {
      flow.step = 'consent';
      saveFlow();
      askCurrent();
      return;
    }

    if (step === 'consent') {
      flow.answers.consent = true;
      saveFlow();
      await startAgentSession();
      return;
    }

    await sendFieldToAgent(step, value);
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

    if (flow.pending) configureComposer();
    if (flow.completed) configureComposer();
  }

  form?.addEventListener('submit', event => {
    event.preventDefault();
    const value = String(input?.value || '').trim();
    if (!value && !flow.pending) return;
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