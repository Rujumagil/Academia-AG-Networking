(() => {
  'use strict';

  const COMPAS_PUBLIC_KEY = 'wc_aa7383fbaabaca8e3f7e4be26704a0c8c0fc';
  const COMPAS_API_BASE = 'https://app.proyectocompas.com';
  const COMPAS_STORAGE_KEY = `compas-one-web-chat:${COMPAS_PUBLIC_KEY}`;
  const REGISTRATION_STORAGE_KEY = 'ag-driver-registration:last-success';
  const OFFICIAL_COVER = 'https://static.wixstatic.com/media/11f124_5a9d6fd7f2054172943aab4260f3cfe7~mv2.png';

  const form = document.querySelector('#driver-registration-form');
  const resultBox = document.querySelector('#driver-registration-result');
  const submitButton = form?.querySelector('button[type="submit"]');
  const year = document.querySelector('#year');
  const referrerWrap = document.querySelector('#referrer-wrap');
  const referrerInput = form?.elements?.namedItem('referrerName');
  const sourceGroup = form?.querySelector('.source-group');
  const consentLabel = form?.querySelector('.consent');

  function applyOfficialCover() {
    const heroImage = document.querySelector('.hero-image img');
    if (heroImage) {
      heroImage.src = OFFICIAL_COVER;
      heroImage.alt = 'Portada oficial Utah Driver Success Program™ · Angelica Gallardo';
    }
    const socialImage = document.querySelector('meta[property="og:image"]');
    if (socialImage) socialImage.setAttribute('content', OFFICIAL_COVER);
  }

  applyOfficialCover();
  if (year) year.textContent = new Date().getFullYear();

  function uniqueId() {
    if (window.crypto?.randomUUID) return window.crypto.randomUUID();
    return `ag-driver-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  }

  function setResult(message, type = 'error') {
    if (!resultBox) return;
    resultBox.textContent = message;
    resultBox.className = `form-result is-visible ${type === 'success' ? 'is-success' : 'is-error'}`;
  }

  function clearValidation() {
    form?.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));
    sourceGroup?.classList.remove('is-invalid');
    consentLabel?.classList.remove('is-invalid');
  }

  function sourceValue() {
    return String(new FormData(form).get('heardFrom') || '').trim();
  }

  function syncReferrerField() {
    const isReferral = sourceValue() === 'Recomendación';
    if (referrerWrap) referrerWrap.hidden = !isReferral;
    if (referrerInput) {
      referrerInput.required = isReferral;
      if (!isReferral) {
        referrerInput.value = '';
        referrerInput.classList.remove('is-invalid');
      }
    }
  }

  function validate(data) {
    clearValidation();
    let valid = true;
    const required = ['firstName', 'lastName', 'email', 'phone', 'occupation', 'address', 'city', 'state', 'zip'];

    required.forEach(name => {
      const input = form?.elements?.namedItem(name);
      if (!String(data.get(name) || '').trim()) {
        input?.classList.add('is-invalid');
        valid = false;
      }
    });

    const email = String(data.get('email') || '').trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      form?.elements?.namedItem('email')?.classList.add('is-invalid');
      valid = false;
    }

    const phone = String(data.get('phone') || '').replace(/\D/g, '');
    if (phone.length < 7) {
      form?.elements?.namedItem('phone')?.classList.add('is-invalid');
      valid = false;
    }

    const heardFrom = String(data.get('heardFrom') || '').trim();
    if (!heardFrom) {
      sourceGroup?.classList.add('is-invalid');
      valid = false;
    }

    if (heardFrom === 'Recomendación' && !String(data.get('referrerName') || '').trim()) {
      referrerInput?.classList.add('is-invalid');
      valid = false;
    }

    if (data.get('consent') !== 'on') {
      consentLabel?.classList.add('is-invalid');
      valid = false;
    }

    return valid;
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

  function renderSuccess(name, email) {
    setResult(`¡Gracias, ${name}! Tu registro fue recibido correctamente. AG Business Networking dará seguimiento a tu solicitud usando ${email}. Cuando tu inscripción sea confirmada, recibirás las indicaciones para acceder a Academia AG.`, 'success');
    if (submitButton) {
      submitButton.textContent = 'Registro enviado ✓';
      submitButton.disabled = true;
    }
  }

  async function submitRegistration(event) {
    event.preventDefault();
    if (!form || !submitButton) return;

    const data = new FormData(form);
    if (!validate(data)) {
      setResult('Revisa los campos obligatorios y acepta el aviso de privacidad para continuar.');
      return;
    }

    const firstName = String(data.get('firstName') || '').trim();
    const lastName = String(data.get('lastName') || '').trim();
    const name = `${firstName} ${lastName}`.trim();
    const email = String(data.get('email') || '').trim();
    const phone = String(data.get('phone') || '').trim();
    const occupation = String(data.get('occupation') || '').trim();
    const address = String(data.get('address') || '').trim();
    const city = String(data.get('city') || '').trim();
    const state = String(data.get('state') || '').trim();
    const zip = String(data.get('zip') || '').trim();
    const heardFrom = String(data.get('heardFrom') || '').trim();
    const referrerName = String(data.get('referrerName') || '').trim();
    const context = campaignContext();

    const message = [
      'Nuevo registro al Utah Driver Success Program™.',
      `Nombre: ${name}`,
      `Correo: ${email}`,
      `Teléfono: ${phone}`,
      `Ocupación: ${occupation}`,
      `Dirección: ${address}`,
      `Ciudad: ${city}`,
      `Estado: ${state}`,
      `Código postal / ZIP: ${zip}`,
      `Cómo se enteró: ${heardFrom}`,
      referrerName ? `Persona que invitó/recomendó: ${referrerName}` : '',
      `Origen: ${context.source}`,
      `Medio: ${context.medium}`,
      `Campaña: ${context.campaign}`,
      context.content ? `Contenido: ${context.content}` : '',
      context.ref ? `Referencia: ${context.ref}` : '',
      'Solicitud: contactar para confirmar inscripción y acceso a Academia AG.'
    ].filter(Boolean).join('\n');

    submitButton.disabled = true;
    const originalText = submitButton.textContent;
    submitButton.textContent = 'Enviando registro…';
    resultBox?.classList.remove('is-visible');

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
            email,
            phone,
            company: 'AG Business Networking',
            consent: true,
            pageUrl: window.location.href,
            serviceRoute: 'sales'
          })
        }
      );

      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || 'No fue posible completar el registro.');
      }

      if (payload.sessionToken) {
        window.localStorage.setItem(COMPAS_STORAGE_KEY, payload.sessionToken);
      }

      window.sessionStorage.setItem(REGISTRATION_STORAGE_KEY, JSON.stringify({
        name,
        email,
        submittedAt: new Date().toISOString(),
        campaign: context.campaign
      }));

      renderSuccess(name, email);
      form.querySelectorAll('input').forEach(input => {
        input.disabled = true;
      });
    } catch (error) {
      console.error('AG_DRIVER_REGISTRATION_FAILED', error);
      setResult('No pudimos enviar tu registro en este momento. Tus datos no fueron confirmados como recibidos. Intenta nuevamente en unos minutos.');
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  form?.addEventListener('change', event => {
    if (event.target?.name === 'heardFrom') syncReferrerField();
  });
  form?.addEventListener('submit', submitRegistration);
  syncReferrerField();
})();