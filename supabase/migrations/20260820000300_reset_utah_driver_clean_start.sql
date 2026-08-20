-- ============================================================
-- ACADEMIA AG · RESET TOTAL UTAH DRIVER · INICIO LIMPIO
-- Fecha: 2026-08-20
--
-- Objetivo:
--   1) Eliminar el Utah Driver Success Program anterior.
--   2) Eliminar progreso, evaluaciones, inscripciones y relaciones heredadas
--      por medio de las FK ON DELETE CASCADE existentes.
--   3) Eliminar productos/accesos comerciales ligados al curso viejo.
--   4) Retirar funciones específicas de los cuestionarios anteriores.
--   5) Dejar la base lista para reconstruir el curso desde cero con
--      Cloudflare Stream como única fuente de video.
--
-- Esta migración NO elimina usuarios, perfiles, workspaces ni otros cursos.
-- Es idempotente: puede ejecutarse otra vez sin recrear ni duplicar datos.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Identificar exclusivamente el curso heredado.
-- ------------------------------------------------------------
create temporary table _ag_legacy_utah_courses(
  id uuid primary key
) on commit drop;

insert into _ag_legacy_utah_courses(id)
select c.id
from public.courses c
where c.id = '11111111-1111-4111-8111-111111111111'::uuid
   or lower(coalesce(c.slug,'')) = 'utah-driver-success-program'
on conflict do nothing;

-- ------------------------------------------------------------
-- 2. Identificar productos que daban acceso al curso viejo.
-- ------------------------------------------------------------
create temporary table _ag_legacy_utah_products(
  id uuid primary key
) on commit drop;

do $$
begin
  if to_regclass('public.product_contents') is not null then
    execute $sql$
      insert into pg_temp._ag_legacy_utah_products(id)
      select distinct pc.product_id
      from public.product_contents pc
      where pc.course_id in (select id from pg_temp._ag_legacy_utah_courses)
      on conflict do nothing
    $sql$;
  end if;

  if to_regclass('public.products') is not null then
    execute $sql$
      insert into pg_temp._ag_legacy_utah_products(id)
      select p.id
      from public.products p
      where lower(coalesce(p.name,'')) like '%utah driver%'
         or lower(coalesce(p.slug,'')) like '%utah-driver%'
         or lower(coalesce(p.external_reference,'')) like '%utah%driver%'
      on conflict do nothing
    $sql$;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 3. Desconectar órdenes históricas y borrar el producto viejo.
--    No borramos la orden: conservamos el registro económico/auditable.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.orders') is not null then
    execute $sql$
      update public.orders
      set product_id = null,
          updated_at = now()
      where product_id in (select id from pg_temp._ag_legacy_utah_products)
    $sql$;
  end if;

  if to_regclass('public.products') is not null then
    execute $sql$
      delete from public.products
      where id in (select id from pg_temp._ag_legacy_utah_products)
    $sql$;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 4. Eliminar recursos heredados dedicados al curso anterior.
-- ------------------------------------------------------------
delete from public.resources r
where r.id = 'aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa'::uuid
   or r.course_id in (select id from _ag_legacy_utah_courses)
   or lower(coalesce(r.title,'')) in (
        'manual de utah driver',
        'utah driver success program™',
        'utah driver success program'
      );

-- ------------------------------------------------------------
-- 5. Eliminar el curso viejo.
--
-- Las relaciones del esquema eliminan en cascada, según corresponda:
-- módulos, lecciones, progreso, notas, bloques, inscripciones,
-- evaluaciones, intentos, certificados, instructores y recursos del curso.
-- ------------------------------------------------------------
delete from public.courses c
where c.id in (select id from _ag_legacy_utah_courses)
   or c.id = '11111111-1111-4111-8111-111111111111'::uuid
   or lower(coalesce(c.slug,'')) = 'utah-driver-success-program';

-- ------------------------------------------------------------
-- 6. Retirar RPCs específicos del sistema académico viejo.
--    Las recrearemos con la arquitectura nueva cuando corresponda.
-- ------------------------------------------------------------
drop function if exists public.get_module_exam(uuid);
drop function if exists public.submit_module_exam(uuid,jsonb);
drop function if exists public.get_lesson_quiz(uuid);
drop function if exists public.submit_lesson_quiz(uuid,text);

commit;

-- ============================================================
-- VERIFICACIÓN FINAL
-- Todo debe quedar en 0.
-- ============================================================
select
  (
    select count(*)
    from public.courses c
    where c.id = '11111111-1111-4111-8111-111111111111'::uuid
       or lower(coalesce(c.slug,'')) = 'utah-driver-success-program'
  ) as curso_utah_anterior,
  (
    select count(*)
    from public.lessons l
    where coalesce(l.video_url,'') ~* '(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)'
  ) as urls_video_legacy_en_lecciones,
  (
    select count(*)
    from public.resources r
    where coalesce(r.external_url,'') ~* '(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)'
  ) as urls_legacy_en_recursos,
  (
    select count(*)
    from public.lesson_blocks b
    where coalesce(b.content::text,'') ~* '(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)'
  ) as urls_legacy_en_bloques;
