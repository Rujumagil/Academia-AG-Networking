-- ============================================================
-- ACADEMIA AG · PASO 22
-- LIMPIEZA DE REFERENCIAS TÉCNICAS VISIBLES
-- Mantiene los enlaces de reproducción internamente, pero evita mostrar
-- al alumno dónde está alojado el contenido multimedia.
-- ============================================================

begin;

update public.lessons l
set content_html = null,
    updated_at = now()
from public.modules m
where l.module_id = m.id
  and m.course_id = '11111111-1111-4111-8111-111111111111'
  and lower(coalesce(l.content_html, '')) like '%alojado en wix media%';

update public.resources
set description = 'Manual oficial del alumno del UTAH DRIVER SUCCESS PROGRAM™.',
    updated_at = now()
where id = 'aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa';

commit;
