(() => {
  'use strict';
  const RELEASE = '20260819.30';
  const COURSE_ID = '11111111-1111-4111-8111-111111111111';
  const ACADEMIC = [
    'Licencias, permisos y documentación',
    'Salud, exámenes y preparación del vehículo',
    'Manejo básico',
    'Reglas del camino y señales',
    'Alcohol, drogas y retos al manejar',
    'Emergencias, compartir el camino y tu récord'
  ];

  let timer = null;
  const clean = text => String(text || '').replace(/^Módulo\s+\d+:\s*/i,'').replace(/^Introducción\s*[·:-]\s*/i,'').trim();
  const isUtah = () => location.hash.includes(COURSE_ID);

  function labelFor(title) {
    const name = clean(title);
    if (/^Bienvenida y cómo usar el curso$/i.test(name)) return 'Introducción · Bienvenida y cómo usar el curso';
    if (/^Cierre del curso$/i.test(name)) return 'Cierre del curso';
    const index = ACADEMIC.findIndex(item => item.toLowerCase() === name.toLowerCase());
    return index >= 0 ? `Módulo ${index + 1}: ${name}` : name;
  }

  function enhancePanels() {
    document.querySelectorAll('.module-panel .module summary strong').forEach(node => {
      const next = labelFor(node.textContent);
      if (next && node.textContent !== next) node.textContent = next;
    });
  }

  function enhanceLessonSubtitle() {
    const subtitle = document.querySelector('.page-subtitle');
    if (!subtitle || !/^Módulo:/i.test(subtitle.textContent.trim())) return;
    const raw = subtitle.textContent.replace(/^Módulo:\s*/i,'').trim();
    const name = clean(raw);
    if (/^Bienvenida y cómo usar el curso$/i.test(name)) subtitle.textContent = 'Introducción';
    else if (/^Cierre del curso$/i.test(name)) subtitle.textContent = 'Cierre del curso';
    else {
      const index = ACADEMIC.findIndex(item => item.toLowerCase() === name.toLowerCase());
      if (index >= 0) subtitle.textContent = `Módulo ${index + 1}: ${name}`;
    }
  }

  function enhanceFacts() {
    document.querySelectorAll('.course-facts > span').forEach(item => {
      if (item.querySelector('small')?.textContent.trim() !== 'Contenido') return;
      const strong = item.querySelector('strong');
      if (strong) strong.textContent = 'Introducción · 6 módulos · cierre';
    });
  }

  function apply() {
    if (!isUtah()) return;
    enhancePanels();
    enhanceLessonSubtitle();
    enhanceFacts();
  }

  function schedule(){ clearTimeout(timer); timer=setTimeout(apply,60); }
  new MutationObserver(schedule).observe(document.querySelector('#app') || document.body,{childList:true,subtree:true});
  window.addEventListener('hashchange',schedule);
  window.addEventListener('pageshow',schedule);
  window.ACADEMIA_AG_UTAH_MODULE_LABELS={release:RELEASE,apply};
  schedule();
})();
