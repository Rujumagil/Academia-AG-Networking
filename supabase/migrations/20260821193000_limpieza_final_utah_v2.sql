-- ============================================================
-- ACADEMIA AG · LIMPIEZA FINAL UTAH DRIVER V2
-- Conserva únicamente la estructura oficial V2 y normaliza datos.
-- NO elimina usuarios, perfiles, otros cursos ni historial económico.
-- ============================================================

begin;

-- 1) Eliminar cualquier curso Utah legado/duplicado, conservando únicamente V2.
delete from public.courses c
where c.id <> '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid
  and (
    lower(coalesce(c.slug,'')) like '%utah-driver%'
    or lower(coalesce(c.title,'')) like '%utah driver success program%'
  );

-- 2) El curso oficial debe quedar publicado y con metadatos definitivos.
update public.courses
set title = 'Utah Driver Success Program™',
    slug = 'utah-driver-success-program',
    subtitle = 'Aprende · Aprueba · Conduce con Confianza',
    status = 'published',
    featured = true,
    duration_label = 'Introducción · 6 módulos · cierre',
    updated_at = now()
where id = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid;

-- 3) Normalizar las 8 secciones oficiales.
with official(id,title,position,section_type,academic_number) as (
  values
  ('7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid,'Bienvenida y cómo usar el curso',1,'introduction',null::smallint),
  ('7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,'Licencias, permisos y documentación',2,'academic',1::smallint),
  ('7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,'Salud, exámenes y preparación del vehículo',3,'academic',2::smallint),
  ('7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,'Manejo básico',4,'academic',3::smallint),
  ('7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,'Reglas del camino y señales',5,'academic',4::smallint),
  ('7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,'Alcohol, drogas y retos al manejar',6,'academic',5::smallint),
  ('7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,'Emergencias, compartir el camino y tu récord',7,'academic',6::smallint),
  ('7c4d9f60-9999-4b7b-9f2c-2d5e1a8c4001'::uuid,'Cierre del curso',8,'closing',null::smallint)
)
update public.modules m
set title = o.title,
    position = o.position,
    section_type = o.section_type,
    academic_number = o.academic_number,
    updated_at = now()
from official o
where m.id = o.id
  and m.course_id = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid;

-- Eliminar contenedores extra dentro del curso V2.
delete from public.modules
where course_id = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid
  and id not in (
    '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid,
    '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,
    '7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,
    '7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,
    '7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,
    '7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,
    '7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,
    '7c4d9f60-9999-4b7b-9f2c-2d5e1a8c4001'::uuid
  );

-- 4) Cloudflare es la única fuente activa de video del curso V2.
update public.lessons l
set video_url = null,
    stream_provider = case when nullif(trim(coalesce(l.stream_uid,'')),'') is not null then 'cloudflare' else l.stream_provider end,
    updated_at = now()
where l.module_id in (
  select id from public.modules
  where course_id = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid
);

-- UID confirmado de la introducción.
update public.lessons
set video_url = null,
    stream_provider = 'cloudflare',
    stream_uid = 'c48240b91b7be5b831af4da77193a672',
    updated_at = now()
where module_id = '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid
  and lesson_code = 'INTRO-01';

-- 5) Eliminar residuos huérfanos solo cuando existan las tablas.
do $$
begin
  if to_regclass('public.lesson_progress') is not null then
    delete from public.lesson_progress p
    where not exists (select 1 from public.lessons l where l.id = p.lesson_id);
  end if;

  if to_regclass('public.lesson_quizzes') is not null then
    delete from public.lesson_quizzes q
    where not exists (select 1 from public.lessons l where l.id = q.lesson_id);
  end if;

  if to_regclass('public.module_exam_attempts') is not null then
    delete from public.module_exam_attempts a
    where not exists (select 1 from public.modules m where m.id = a.module_id);
  end if;
end;
$$;

commit;

-- VERIFICACIÓN FINAL
select
  (select count(*) from public.courses where id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid) as curso_v2,
  (select count(*) from public.modules where course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid) as secciones,
  (select count(*) from public.modules where course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid and section_type='academic') as modulos_academicos,
  (select count(*) from public.lessons l join public.modules m on m.id=l.module_id where m.course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid) as contenidos,
  (select count(*) from public.lessons l join public.modules m on m.id=l.module_id where m.course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid and nullif(trim(coalesce(l.stream_uid,'')),'') is null) as videos_sin_uid;
