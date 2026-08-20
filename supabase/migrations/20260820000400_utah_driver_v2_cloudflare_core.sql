-- ============================================================
-- ACADEMIA AG · UTAH DRIVER SUCCESS PROGRAM™ V2
-- NÚCLEO LIMPIO · CLOUDFLARE STREAM ONLY
-- Fecha: 2026-08-20
--
-- Esta migración crea SOLAMENTE:
--   - arquitectura de secciones explícita (introducción / módulos / cierre)
--   - campos de Cloudflare Stream
--   - campos de progreso de reproducción
--   - curso nuevo con UUID nuevo
--   - 8 secciones contenedoras SIN lecciones todavía
--
-- NO importa videos, NO crea evaluaciones, NO usa Wix/Drive/YouTube.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Arquitectura explícita de secciones.
-- Evita volver a inferir "Introducción" o "Cierre" por posición.
-- ------------------------------------------------------------
alter table public.modules
  add column if not exists section_type text not null default 'academic',
  add column if not exists academic_number smallint;

alter table public.modules
  drop constraint if exists modules_section_type_check;

alter table public.modules
  add constraint modules_section_type_check
  check (section_type in ('introduction','academic','closing'));

alter table public.modules
  drop constraint if exists modules_academic_number_check;

alter table public.modules
  add constraint modules_academic_number_check
  check (
    (section_type = 'academic' and (academic_number is null or academic_number between 1 and 99))
    or
    (section_type in ('introduction','closing') and academic_number is null)
  );

create unique index if not exists modules_course_academic_number_uidx
  on public.modules(course_id, academic_number)
  where academic_number is not null;

-- ------------------------------------------------------------
-- 2. Cloudflare Stream como fuente oficial de video.
-- ------------------------------------------------------------
alter table public.lessons
  add column if not exists stream_provider text,
  add column if not exists stream_uid text,
  add column if not exists stream_hls_url text,
  add column if not exists stream_dash_url text,
  add column if not exists stream_thumbnail_url text,
  add column if not exists stream_duration_seconds integer;

alter table public.lessons
  drop constraint if exists lessons_stream_provider_check;

alter table public.lessons
  add constraint lessons_stream_provider_check
  check (stream_provider is null or stream_provider = 'cloudflare');

alter table public.lessons
  drop constraint if exists lessons_stream_duration_check;

alter table public.lessons
  add constraint lessons_stream_duration_check
  check (stream_duration_seconds is null or stream_duration_seconds >= 0);

create index if not exists lessons_stream_uid_idx
  on public.lessons(stream_uid)
  where stream_uid is not null;

-- ------------------------------------------------------------
-- 3. Progreso real de reproducción.
-- ------------------------------------------------------------
alter table public.lesson_progress
  add column if not exists last_position_seconds numeric(10,2) not null default 0,
  add column if not exists watch_percentage numeric(5,2) not null default 0,
  add column if not exists last_watched_at timestamptz;

alter table public.lesson_progress
  drop constraint if exists lesson_progress_watch_percentage_check;

alter table public.lesson_progress
  add constraint lesson_progress_watch_percentage_check
  check (watch_percentage between 0 and 100);

-- ------------------------------------------------------------
-- 4. Curso V2 con identidad NUEVA.
-- ------------------------------------------------------------
insert into public.courses(
  id,
  title,
  slug,
  subtitle,
  description,
  cover_url,
  category,
  status,
  featured,
  instructor_name,
  duration_label
)
values(
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Utah Driver Success Program™',
  'utah-driver-success-program',
  'Aprende · Aprueba · Conduce con Confianza',
  'Programa de formación de Academia AG para estudiar documentación, seguridad vial, reglas del camino, manejo responsable y preparación para conducir en Utah.',
  'curso-utah-driver.webp',
  'Vida en Utah',
  'draft',
  true,
  'AG Business Networking',
  'Introducción · 6 módulos · cierre'
)
on conflict (id) do update set
  title = excluded.title,
  slug = excluded.slug,
  subtitle = excluded.subtitle,
  description = excluded.description,
  cover_url = excluded.cover_url,
  category = excluded.category,
  status = excluded.status,
  featured = excluded.featured,
  instructor_name = excluded.instructor_name,
  duration_label = excluded.duration_label,
  updated_at = now();

-- Si el slug existiera por una ejecución parcial con otro UUID, abortar de forma clara.
do $$
begin
  if exists (
    select 1
    from public.courses
    where slug = 'utah-driver-success-program'
      and id <> '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid
  ) then
    raise exception 'Existe otro curso con el slug utah-driver-success-program. Ejecuta primero el reset limpio.';
  end if;
end;
$$;

-- Asignar administrador existente como creador cuando sea posible.
update public.courses
set created_by = coalesce(
  created_by,
  (
    select p.id
    from public.profiles p
    where p.role = 'admin'
      and coalesce(p.account_status,'active') = 'active'
    order by p.created_at asc
    limit 1
  )
)
where id = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid;

-- Asignar workspace principal si la columna existe y hay uno disponible.
do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name='courses'
      and column_name='workspace_id'
  ) and to_regclass('public.workspaces') is not null then
    execute $sql$
      update public.courses
      set workspace_id = coalesce(
        workspace_id,
        (
          select w.id
          from public.workspaces w
          where lower(coalesce(w.slug,'')) = 'ag-business-networking'
          order by w.created_at asc
          limit 1
        ),
        (
          select w.id
          from public.workspaces w
          order by w.created_at asc
          limit 1
        )
      )
      where id = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid
    $sql$;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 5. Secciones oficiales V2.
-- Introducción y Cierre viven en modules como contenedores técnicos,
-- pero section_type evita volver a mostrarlos como módulos académicos.
-- ------------------------------------------------------------
insert into public.modules(
  id, course_id, title, position, section_type, academic_number
)
values
(
  '7c4d9f60-0000-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Bienvenida y cómo usar el curso',
  1,
  'introduction',
  null
),
(
  '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Licencias, permisos y documentación',
  2,
  'academic',
  1
),
(
  '7c4d9f60-1002-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Salud, exámenes y preparación del vehículo',
  3,
  'academic',
  2
),
(
  '7c4d9f60-1003-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Manejo básico',
  4,
  'academic',
  3
),
(
  '7c4d9f60-1004-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Reglas del camino y señales',
  5,
  'academic',
  4
),
(
  '7c4d9f60-1005-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Alcohol, drogas y retos al manejar',
  6,
  'academic',
  5
),
(
  '7c4d9f60-1006-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Emergencias, compartir el camino y tu récord',
  7,
  'academic',
  6
),
(
  '7c4d9f60-9999-4b7b-9f2c-2d5e1a8c4001'::uuid,
  '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid,
  'Cierre del curso',
  8,
  'closing',
  null
)
on conflict (id) do update set
  course_id = excluded.course_id,
  title = excluded.title,
  position = excluded.position,
  section_type = excluded.section_type,
  academic_number = excluded.academic_number,
  updated_at = now();

commit;

-- ============================================================
-- VERIFICACIÓN
-- Esperado: 1 curso, 8 secciones, 6 académicas, 0 lecciones.
-- ============================================================
select
  (select count(*) from public.courses where id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid) as cursos_v2,
  (select count(*) from public.modules where course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid) as secciones_v2,
  (select count(*) from public.modules where course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid and section_type='academic') as modulos_academicos,
  (
    select count(*)
    from public.lessons l
    join public.modules m on m.id=l.module_id
    where m.course_id='7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid
  ) as lecciones_v2;
