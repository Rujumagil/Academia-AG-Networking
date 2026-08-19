-- ============================================================
-- ACADEMIA AG · YOUTUBE COMPLETO + PROMOS + CIERRE
-- UTAH DRIVER SUCCESS PROGRAM™
--
-- La reproducción se resuelve en frontend por los títulos de YouTube:
-- 00 Bienvenida, C1 01..C6 25, C1 PROMO..C5 PROMO y CIERRE ANGELICA.
-- No existe C6 PROMO: el cierre de Angélica ocupa el cierre general del curso.
-- ============================================================

begin;

update public.courses
set duration_label = '6 clases · 124 videos · 6 evaluaciones · manual del alumno',
    updated_at = now()
where id = '11111111-1111-4111-8111-111111111111';

-- Los cuatro placeholders Extra de clases 1–4 se convierten en el espacio
-- del contenido promocional/especial correspondiente a cada módulo.
update public.lessons
set title = 'Contenido especial del módulo',
    lesson_type = 'video',
    duration_minutes = greatest(coalesce(duration_minutes, 0), 1),
    content_html = '<p>Contenido especial de AG Business Networking para complementar este módulo.</p>',
    updated_at = now()
where id in (
  '22222222-0101-4222-8222-222222222222',
  '22222222-0201-4222-8222-222222222222',
  '22222222-0301-4222-8222-222222222222',
  '22222222-0401-4222-8222-222222222222'
);

-- Clase 5 ya tiene 20 videos académicos; su promocional es un paso adicional.
insert into public.lessons(
  id,module_id,title,lesson_type,video_url,duration_minutes,position,content_html
)
values(
  '22222222-0501-4222-8222-222222222222',
  '11111111-eeee-4111-8111-111111111111',
  'Contenido especial del módulo',
  'video',
  null,
  1,
  21,
  '<p>Contenido especial de AG Business Networking para complementar este módulo.</p>'
)
on conflict (id) do update set
  module_id = excluded.module_id,
  title = excluded.title,
  lesson_type = excluded.lesson_type,
  position = excluded.position,
  content_html = excluded.content_html,
  updated_at = now();

-- No se crea C6 PROMO. El video C6 25 permanece como parte del contenido
-- académico y el siguiente video será el cierre general de Angélica.

update public.lessons
set title = 'Mensaje final de Angélica Gallardo',
    lesson_type = 'video',
    duration_minutes = greatest(coalesce(duration_minutes, 0), 1),
    content_html = '<p>Mensaje final de Angélica Gallardo para cerrar el UTAH DRIVER SUCCESS PROGRAM™.</p>',
    updated_at = now()
where id = '22222222-0801-4222-8222-222222222222';

commit;
