(() => {
  'use strict';

  const CHAT_ORIGIN = 'https://app.proyectocompas.com';
  const CHAT_KEY = 'wc_aa7383fbaabaca8e3f7e4be26704a0c8c0fc';
  const CHAT_SRC = CHAT_ORIGIN + '/compas-chat.js';
  const CHAT_CONFIG = CHAT_ORIGIN + '/api/public/web-chat/config?key=' + encodeURIComponent(CHAT_KEY);

  if (document.querySelector('[data-ag-fly-root]')) return;

  const root = document.createElement('aside');
  root.className = 'ag-fly-chat';
  root.dataset.agFlyRoot = 'true';
  root.setAttribute('aria-label', 'Compás Fly, asistencia de AG Networking');
  root.innerHTML =
    '<button class="ag-fly-launcher" type="button" aria-label="Abrir chat con Compás Fly" aria-expanded="false" aria-controls="ag-fly-panel">' +
      '<span class="ag-fly-launcher-symbol" aria-hidden="true">✦</span><span>Compás Fly</span>' +
    '</button>' +
    '<section class="ag-fly-panel" id="ag-fly-panel" role="dialog" aria-label="Chat de Compás Fly" hidden>' +
      '<header class="ag-fly-header"><div><strong>Compás Fly</strong><small>Orientación de AG Business Networking</small></div>' +
      '<button class="ag-fly-close" type="button" aria-label="Cerrar chat">×</button></header>' +
      '<div class="ag-fly-feed" role="log" aria-live="polite" aria-relevant="additions text"></div>' +
      '<div class="ag-fly-quick" aria-label="Consultas frecuentes">' +
        '<button type="button" data-ag-topic="cursos">Cursos</button>' +
        '<button type="button" data-ag-topic="eventos">Eventos</button>' +
        '<button type="button" data-ag-topic="membresia">Membresía</button>' +
        '<button type="button" data-ag-topic="servicios">Servicios</button>' +
      '</div>' +
      '<form class="ag-fly-compose"><label class="ag-fly-sr" for="ag-fly-text">Escribe tu mensaje</label>' +
        '<textarea id="ag-fly-text" maxlength="500" rows="1" placeholder="Escribe tu pregunta…" required></textarea>' +
        '<button type="submit" aria-label="Enviar mensaje">➤</button>' +
      '</form>' +
      '<p class="ag-fly-notice">Respuestas informativas mientras el agente IA no está disponible. No compartas datos sensibles. ' +
        '<a href="#contacto">Solicitar seguimiento</a>.</p>' +
    '</section>';
  document.body.appendChild(root);

  const launcher = root.querySelector('.ag-fly-launcher');
  const panel = root.querySelector('.ag-fly-panel');
  const close = root.querySelector('.ag-fly-close');
  const log = root.querySelector('.ag-fly-feed');
  const quick = root.querySelector('.ag-fly-quick');
  const form = root.querySelector('.ag-fly-compose');
  const input = root.querySelector('#ag-fly-text');
  let opened = false;
  let nativeReady = false;

  function addBubble(kind, message, href, linkLabel) {
    const bubble = document.createElement('div');
    bubble.className = 'ag-fly-bubble is-' + kind;
    bubble.textContent = message;
    if (href && linkLabel) {
      const link = document.createElement('a');
      link.href = href;
      link.textContent = linkLabel + ' ↗';
      if (href.startsWith('https://')) {
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      }
      bubble.appendChild(document.createElement('br'));
      bubble.appendChild(link);
    }
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  }

  function setOpen(value) {
    opened = Boolean(value);
    panel.hidden = !opened;
    launcher.setAttribute('aria-expanded', String(opened));
    if (opened) {
      if (!log.children.length) {
        addBubble('agent', '¡Hola! Te doy la bienvenida a AG Business Networking. Mientras conectamos el agente IA, puedo orientarte sobre nuestros cursos, eventos, membresía y servicios.');
      }
      input.focus();
    } else {
      launcher.focus();
    }
  }

  const answers = {
    cursos: {
      text: 'En Academia AG puedes explorar programas como Utah Driver Success Program, Emprende en Utah, Finanzas para Emprendedores, Marketing e Inglés Práctico. Consulta el catálogo para conocer cada programa.',
      href: 'academia.html#catalog', label: 'Explorar Academia AG'
    },
    eventos: {
      text: 'En la sección Eventos encontrarás actividades y carteles de nuestra comunidad. Para los próximos anuncios, también puedes visitar las publicaciones en Facebook.',
      href: '#eventos', label: 'Ver eventos'
    },
    membresia: {
      text: 'AG Business Networking promueve conexiones empresariales, aliados y acompañamiento. Los beneficios y condiciones de membresía se confirman directamente con el equipo.',
      href: '#contacto', label: 'Consultar membresía'
    },
    servicios: {
      text: 'Podemos orientarte en marketing, presencia digital, administración, finanzas, asuntos legales, seguros y networking mediante nuestra red de especialistas. Cada caso requiere una valoración.',
      href: '#servicios', label: 'Explorar servicios'
    },
    contacto: {
      text: 'Para recibir atención personalizada, completa el formulario de contacto de AG. Puedes dejar tu correo o teléfono y una descripción de lo que necesitas.',
      href: '#contacto', label: 'Solicitar seguimiento'
    },
    otro: {
      text: 'Puedo orientarte con información general. Para precios, disponibilidad, citas o una situación particular, el equipo de AG debe confirmar los detalles.',
      href: '#contacto', label: 'Hablar con el equipo'
    }
  };

  function chooseTopic(message) {
    const t = String(message || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (/curso|academia|licencia|utah|estudi|clase|capacitacion|ingles/.test(t)) return 'cursos';
    if (/evento|fiesta|networking|actividad|reunion|encuentro|calendario|fecha/.test(t)) return 'eventos';
    if (/membres|afili|beneficio|socio/.test(t)) return 'membresia';
    if (/servicio|marketing|negocio|proveedor|finanz|contab|seguro|legal|publicidad/.test(t)) return 'servicios';
    if (/contact|asesor|cita|ayuda|persona|telefono|correo|registr|inscrib|precio|costo/.test(t)) return 'contacto';
    return 'otro';
  }

  function answer(message, topic) {
    const clean = String(message || '').trim().slice(0, 500);
    if (!clean) return;
    addBubble('visitor', clean);
    const info = answers[topic || chooseTopic(clean)] || answers.otro;
    window.setTimeout(() => addBubble('agent', info.text, info.href, info.label), 250);
  }

  launcher.addEventListener('click', () => setOpen(!opened));
  close.addEventListener('click', () => setOpen(false));
  quick.addEventListener('click', (event) => {
    const button = event.target.closest('[data-ag-topic]');
    if (!button) return;
    const topic = button.dataset.agTopic;
    const labels = { cursos: 'Quiero conocer los cursos', eventos: '¿Qué eventos tienen?', membresia: '¿Cómo funciona la membresía?', servicios: '¿Qué servicios ofrecen?' };
    answer(labels[topic] || topic, topic);
  });
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = '';
    answer(value);
  });
  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });
  panel.addEventListener('click', (event) => {
    if (event.target.closest('a[href^="#"]')) setOpen(false);
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && opened) setOpen(false);
  });

  document.querySelectorAll('[data-open-compas-fly]').forEach((button) => {
    button.addEventListener('click', (event) => {
      event.preventDefault();
      if (nativeReady) {
        const nativeLauncher = document.querySelector('compas-one-web-chat')?.shadowRoot?.querySelector('.launcher');
        if (nativeLauncher) { nativeLauncher.click(); return; }
      }
      setOpen(true);
    });
  });

  // Conectar al widget oficial solo si su configuración responde.
  // Si Compás One no está disponible, se conserva la orientación local;
  // no se simula una conversación IA ni se envían mensajes sin autorización.
  async function connectOfficialWidget() {
    if (document.querySelector('compas-one-web-chat')) {
      nativeReady = true;
      root.hidden = true;
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(CHAT_CONFIG, { signal: controller.signal, mode: 'cors' });
      if (!response.ok) return;
      const payload = await response.json();
      if (!payload?.ok) return;
      const script = document.createElement('script');
      script.src = CHAT_SRC;
      script.async = true;
      script.dataset.key = CHAT_KEY;
      script.dataset.agFlyOfficial = 'true';
      script.addEventListener('load', () => {
        window.setTimeout(() => {
          const host = document.querySelector('compas-one-web-chat');
          if (!host?.shadowRoot?.querySelector('.launcher')) return;
          nativeReady = true;
          root.hidden = true;
          const observer = new MutationObserver(() => {
            if (!document.querySelector('compas-one-web-chat')) {
              nativeReady = false;
              root.hidden = false;
              observer.disconnect();
            }
          });
          observer.observe(document.body, { childList: true });
        }, 1700);
      }, { once: true });
      script.addEventListener('error', () => { nativeReady = false; root.hidden = false; }, { once: true });
      document.body.appendChild(script);
    } catch (error) {
      // La caída del servicio externo no interrumpe la navegación ni la orientación básica.
      console.info('[AG Compás Fly] Chat oficial no disponible; orientación informativa activa.');
    } finally {
      window.clearTimeout(timer);
    }
  }

  if (document.readyState === 'complete') connectOfficialWidget();
  else window.addEventListener('load', connectOfficialWidget, { once: true });
})();
