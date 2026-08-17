(() => {
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

  document.querySelector('#year').textContent = new Date().getFullYear();

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

  renderCalendar();
})();
