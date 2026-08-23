(() => {
  'use strict';

  const COMPAS_PUBLIC_KEY = 'wc_aa7383fbaabaca8e3f7e4be26704a0c8c0fc';
  const COMPAS_API_BASE = 'https://app.proyectocompas.com';
  const COMPAS_STORAGE_KEY = `compas-one-web-chat:${COMPAS_PUBLIC_KEY}`;

  const CLEAN_LANDING_IMAGES = {
    academy: 'https://static.wixstatic.com/media/11f124_b15578e5070d4270a41bbd44310e5370~mv2.png',
    community: 'https://static.wixstatic.com/media/11f124_0d0860da13cb4235b3429d945c18a6b5~mv2.png',
    courses: [
      'https://drive.google.com/thumbnail?id=1tuyhiM-XDc8cyJzw1W_q6Jqdh91VrzMP&sz=w1600',
      'https://static.wixstatic.com/media/11f124_da720acf43f245949d576644333f7c91~mv2.png',
      'https://static.wixstatic.com/media/11f124_c63895cf900f4f9b9624c7a576ca7caf~mv2.png',
      'https://static.wixstatic.com/media/11f124_7860b768bbab446db851d96e3160dbe0~mv2.png',
      'https://static.wixstatic.com/media/11f124_ccf34ce39f5340af92182617f784b464~mv2.png'
    ]
  };

  function applyCleanLandingImages() {
    const academyImage = document.querySelector('.academy-showcase > img');
    if (academyImage) {
      academyImage.src = CLEAN_LANDING_IMAGES.academy;
      academyImage.alt = 'Academia AG: aprender también es parte de crecer';
    }

    const communityImage = document.querySelector('.community-showcase-media img');
    if (communityImage) {
      communityImage.src = CLEAN_LANDING_IMAGES.community;
      communityImage.alt = 'Más que conexiones, somos tu comunidad';
    }

    document.querySelectorAll('.course-selector-grid .course-select-image img').forEach((image, index) => {
      const replacement = CLEAN_LANDING_IMAGES.courses[index];
      if (replacement) image.src = replacement;
    });
  }

  applyCleanLandingImages();

  function uniqueId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `ag-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function waitForCompasLauncher(attempt = 0) {
    const host = document.querySelector('compas-one-web-chat');
    const launcher = host?.shadowRoot?.querySelector('.launcher');
    if (launcher) {
      launcher.click();
      return;
    }
    if (attempt < 30) window.setTimeout(() => waitForCompasLauncher(attempt + 1), 180);
  }

  function openCompasAgent(route = 'sales') {
    window.dispatchEvent(new CustomEvent('compas:chat-route', { detail: { route } }));
    waitForCompasLauncher();
  }

  document.querySelectorAll('[data-open-compas]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      openCompasAgent(button.dataset.openCompas || 'sales');
    });
  });

  const params = new URLSearchParams(window.location.search);
  if (params.get('open_compas') === '1') {
    window.setTimeout(() => openCompasAgent(params.get('compas_agent') || 'sales'), 700);
  }

  const form = document.querySelector('#ag-lead-form');
  const resultBox = document.querySelector('#ag-lead-result');
  const followup = document.querySelector('#ag-lead-followup');
  const submitButton = form?.querySelector('button[type="submit"]');

  function setResult(message, type) {
    if (!resultBox) return;
    resultBox.textContent = message;
    resultBox.className = `lead-result is-visible ${type === 'success' ? 'is-success' : 'is-error'}`;
  }

  async function submitLead(event) {
    event.preventDefault();
    if (!form || !submitButton) return;

    const data = new FormData(form);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const company = String(data.get('company') || '').trim();
    const intent = String(data.get('intent') || '').trim();
    const details = String(data.get('message') || '').trim();
    const consent = data.get('consent') === 'on';

    if (!email && !phone) {
      setResult('Escribe al menos un correo o teléfono para que podamos darte seguimiento.', 'error');
      return;
    }
    if (!consent) {
      setResult('Necesitamos tu autorización para enviar la solicitud y darle seguimiento.', 'error');
      return;
    }

    const message = [
      'Nueva solicitud desde la landing de AG Business Networking.',
      `Interés: ${intent}.`,
      details ? `Detalle: ${details}` : '',
      'Origen: Landing oficial AG.'
    ].filter(Boolean).join('\n');

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Enviando a Compás One…';
    resultBox?.classList.remove('is-visible');
    followup?.classList.remove('is-visible');

    try {
      const response = await fetch(
        `${COMPAS_API_BASE}/api/public/web-chat/messages?key=${encodeURIComponent(COMPAS_PUBLIC_KEY)}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            publicKey: COMPAS_PUBLIC_KEY,
            sessionToken: window.localStorage.getItem(COMPAS_STORAGE_KEY) || undefined,
            clientMessageId: uniqueId(),
            message,
            name,
            email: email || undefined,
            phone: phone || undefined,
            company: company || 'AG Business Networking',
            consent: true,
            pageUrl: window.location.href,
            serviceRoute: 'sales'
          })
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No fue posible enviar la solicitud.');
      }

      if (payload.sessionToken) {
        window.localStorage.setItem(COMPAS_STORAGE_KEY, payload.sessionToken);
      }

      const reply = typeof payload.reply === 'string' ? payload.reply.trim() : '';
      setResult(reply || 'Tu solicitud fue enviada a Compás One. El equipo de AG podrá darle seguimiento con los datos que proporcionaste.', 'success');
      followup?.classList.add('is-visible');
      form.reset();
    } catch (error) {
      console.error('AG_COMPAS_LEAD_FAILED', error);
      setResult('No pudimos enviar la solicitud en este momento. Puedes usar el asistente de Compás One para continuar.', 'error');
      followup?.classList.add('is-visible');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  form?.addEventListener('submit', submitLead);

  document.querySelector('[data-continue-compas]')?.addEventListener('click', () => {
    const target = `${window.location.pathname}?compas_agent=sales&open_compas=1#contacto`;
    window.location.assign(target);
  });
})();