(() => {
  const COMPAS_PUBLIC_KEY = 'wc_aa7383fbaabaca8e3f7e4be26704a0c8c0fc';
  const COMPAS_ATTRIBUTION_URL = 'https://app.proyectocompas.com/compas-attribution.js?v=1.1';
  const COMPAS_CHAT_URL = 'https://app.proyectocompas.com/compas-chat.js';

  const menuButton = document.querySelector('.menu-toggle');
  const nav = document.querySelector('#main-nav');
  menuButton?.addEventListener('click', () => {
    const open = nav.classList.toggle('is-open');
    menuButton.setAttribute('aria-expanded', String(open));
  });
  nav?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => {
    nav.classList.remove('is-open');
    menuButton?.setAttribute('aria-expanded', 'false');
  }));

  const yearNode = document.querySelector('#year');
  if (yearNode) yearNode.textContent = new Date().getFullYear();

  const reveal = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        reveal.unobserve(entry.target);
      }
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal').forEach(el => reveal.observe(el));

  // Las actividades reales se conectarán a Supabase. Mantener vacío evita publicar fechas no confirmadas.
  const events = [];

  const title = document.querySelector('#calendar-title');
  const days = document.querySelector('#calendar-days');
  const list = document.querySelector('#event-list');
  const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  let cursor = new Date();
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);

  function isoDate(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth()+1).padStart(2,'0');
    const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }

  function renderCalendar() {
    if (!title || !days || !list) return;
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    title.textContent = `${monthNames[month]} ${year}`;

    const first = new Date(year, month, 1);
    const start = new Date(year, month, 1 - first.getDay());
    const todayIso = isoDate(new Date());
    days.innerHTML = '';

    for (let i = 0; i < 42; i++) {
      const date = new Date(start);
      date.setDate(start.getDate()+i);
      const iso = isoDate(date);
      const dayEvents = events.filter(event => event.date === iso);
      const cell = document.createElement('div');
      cell.className = 'calendar-day';
      if (date.getMonth() !== month) cell.classList.add('is-muted');
      if (iso === todayIso) cell.classList.add('is-today');
      cell.innerHTML = `<span class="day-number">${date.getDate()}</span>${dayEvents.map(event => `<span class="event-dot">${event.title}</span>`).join('')}`;
      days.appendChild(cell);
    }

    const upcoming = events
      .filter(event => new Date(`${event.date}T23:59:59`) >= new Date())
      .sort((a,b) => a.date.localeCompare(b.date))
      .slice(0,4);

    list.innerHTML = upcoming.length
      ? upcoming.map(event => `<article class="event-card"><time datetime="${event.date}">${event.date}</time><h4>${event.title}</h4><p>${event.place || 'Ubicación por confirmar'}</p></article>`).join('')
      : '<div class="empty-events"><strong>Próximamente.</strong><br>Las fechas presenciales confirmadas se publicarán aquí. La estructura ya está lista para alimentarse desde Supabase.</div>';
  }

  document.querySelector('[data-cal-prev]')?.addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth()-1, 1);
    renderCalendar();
  });
  document.querySelector('[data-cal-next]')?.addEventListener('click', () => {
    cursor = new Date(cursor.getFullYear(), cursor.getMonth()+1, 1);
    renderCalendar();
  });
  document.querySelector('[data-cal-today]')?.addEventListener('click', () => {
    const now = new Date();
    cursor = new Date(now.getFullYear(), now.getMonth(), 1);
    renderCalendar();
  });


  function renderEventReel() {
    const reel = document.querySelector('#ag-events-reel');
    const caption = document.querySelector('#ag-events-caption');
    const previous = document.querySelector('[data-event-prev]');
    const next = document.querySelector('[data-event-next]');
    if (!reel || !caption || !previous || !next) return;

    const today = isoDate(new Date());
    const upcoming = events
      .filter(event => event && /^\d{4}-\d{2}-\d{2}$/.test(event.date || '') && event.date >= today && event.title)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 9);

    const previews = [
      { category: 'Networking', title: 'Encuentros que crean oportunidades', description: 'Conoce emprendedores, amplía tu red y descubre nuevas alianzas en Utah.', theme: 'navy' },
      { category: 'Formación', title: 'Talleres para seguir creciendo', description: 'Aprende de especialistas con herramientas útiles para tu vida y tu negocio.', theme: 'green' },
      { category: 'Comunidad', title: 'Experiencias para conectar', description: 'Comparte ideas, participa y mantente cerca de la comunidad AG.', theme: 'sage' }
    ];

    const add = (parent, tag, className, value) => {
      const node = document.createElement(tag);
      node.className = className;
      node.textContent = value;
      parent.appendChild(node);
      return node;
    };

    reel.replaceChildren();
    const items = upcoming.length ? upcoming : previews;
    items.forEach((item, index) => {
      const theme = upcoming.length ? ['navy', 'green', 'sage'][index % 3] : item.theme;
      const card = document.createElement('article');
      card.className = 'ag-event-card ag-event-' + theme;
      card.setAttribute('aria-label', (upcoming.length ? 'Próximo evento: ' : 'Próximamente: ') + item.title);
      add(card, 'span', 'ag-event-overline', upcoming.length ? (item.category || 'Evento AG') : 'Próximamente · ' + item.category);
      add(card, 'span', 'ag-event-number', String(index + 1).padStart(2, '0'));
      const body = add(card, 'div', 'ag-event-body', '');
      if (upcoming.length) {
        const date = new Date(item.date + 'T12:00:00');
        const label = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
        const time = add(body, 'time', 'ag-event-date', label);
        time.dateTime = item.date;
      } else {
        add(body, 'span', 'ag-event-date', 'Fecha por anunciar');
      }
      add(body, 'h3', 'ag-event-title', item.title);
      add(body, 'p', 'ag-event-description', item.description || (upcoming.length ? (item.place || 'Detalles por confirmar') : ''));
      if (upcoming.length && item.place) add(body, 'span', 'ag-event-place', '⌖ ' + item.place);
      const action = add(card, 'a', 'ag-event-cta', upcoming.length ? 'Me interesa este evento ↗' : 'Ver eventos en Facebook ↗');
      const href = upcoming.length && typeof item.url === 'string' && /^(https:\/\/|http:\/\/)/i.test(item.url) ? item.url : (upcoming.length ? '#contacto' : 'https://www.facebook.com/angie.galcar.773');
      action.href = href;
      if (href.startsWith('http')) {
        action.target = '_blank';
        action.rel = 'noopener noreferrer';
      }
      reel.appendChild(card);
    });

    caption.textContent = upcoming.length
      ? upcoming.length + (upcoming.length === 1 ? ' próximo evento confirmado. Desliza para conocerlo.' : ' próximos eventos confirmados. Desliza para descubrirlos.')
      : 'Consulta los próximos eventos publicados en Facebook. Agregaremos las fechas al calendario cuando estén confirmadas.';
    const move = direction => {
      const card = reel.querySelector('.ag-event-card');
      if (!card) return;
      const gap = parseFloat(getComputedStyle(reel).gap) || 18;
      reel.scrollBy({ left: direction * (card.getBoundingClientRect().width + gap), behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    };
    previous.addEventListener('click', () => move(-1));
    next.addEventListener('click', () => move(1));
    const syncControls = () => {
      previous.disabled = reel.scrollLeft <= 4;
      next.disabled = reel.scrollLeft + reel.clientWidth >= reel.scrollWidth - 4;
    };
    reel.addEventListener('scroll', syncControls, { passive: true });
    window.addEventListener('resize', syncControls);
    requestAnimationFrame(syncControls);
  }

  renderCalendar();
  renderEventReel();
})();
