(() => {
  'use strict';

  const COMPAS_PUBLIC_KEY = 'wc_aa7383fbaabaca8e3f7e4be26704a0c8c0fc';
  const COMPAS_API_BASE = 'https://app.proyectocompas.com';
  const COMPAS_STORAGE_KEY = `compas-one-web-chat:${COMPAS_PUBLIC_KEY}`;

  const form = document.querySelector('#driver-registration-form');
  const resultBox = document.querySelector('#driver-registration-result');
  const submitButton = form?.querySelector('button[type="submit"]');
  const year = document.querySelector('#year');
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
  }

  function validate(data) {
    clearValidation();
    const required = ['firstName', 'lastName', 'email', 'phone'];
    let valid = true;
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

    if (data.get('consent') !== 'on') valid = false;
    return valid;
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
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source') || 'landing-registrocurso';
    const campaign = params.get('utm_campaign') || 'utah-driver-success-program';

    const message = [
      'Nuevo registro al Utah Driver Success Program™.',
      `Nombre: ${name}`,
      `Correo: ${email}`,
      `Teléfono: ${phone}`,
      `Origen: ${source}`,
      `Campaña: ${campaign}`,
      'Solicitud: contactar para confirmar inscripción y acceso a Academia AG.'
    ].join('\n');

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

      setResult('¡Registro recibido! El equipo de AG Business Networking podrá ponerse en contacto contigo para confirmar tu inscripción y darte los siguientes pasos.', 'success');
      form.reset();
    } catch (error) {
      console.error('AG_DRIVER_REGISTRATION_FAILED', error);
      setResult('No pudimos enviar tu registro en este momento. Intenta nuevamente en unos minutos.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = originalText;
    }
  }

  form?.addEventListener('submit', submitRegistration);
})();
