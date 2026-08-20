-- ============================================================
-- ACADEMIA AG · RESET TOTAL UTAH DRIVER · INICIO LIMPIO
-- Fecha: 2026-08-20
-- Versión corregida: SIN tablas temporales.
--
-- Objetivo:
--   1) Eliminar el Utah Driver Success Program anterior.
--   2) Eliminar progreso, evaluaciones, inscripciones y relaciones heredadas
--      por medio de las FK ON DELETE CASCADE existentes.
--   3) Eliminar productos/accesos comerciales ligados al curso viejo.
--   4) Retirar funciones específicas de los cuestionarios anteriores.
--   5) Retirar de la base cualquier URL activa de Wix, Google Drive o YouTube.
--   6) Dejar la base lista para reconstruir el curso desde cero con
--      Cloudflare Stream como única fuente de video.
--
-- Esta migración NO elimina usuarios, perfiles, workspaces ni otros cursos.
-- Es idempotente: puede ejecutarse otra vez sin recrear ni duplicar datos.
-- ============================================================

begin;

-- ------------------------------------------------------------
-- 1. Desconectar órdenes históricas del producto Utah anterior.
--    Conservamos la orden para mantener el historial económico/auditable.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.orders') is not null
     and to_regclass('public.products') is not null then

    if to_regclass('public.product_contents') is not null then
      execute $sql$
        update public.orders o
        set product_id = null,
            updated_at = now()
        where o.product_id in (
          select p.id
          from public.products p
          where lower(coalesce(p.name,'')) like '%utah driver%'
             or lower(coalesce(p.slug,'')) like '%utah-driver%'
             or lower(coalesce(p.external_reference,'')) like '%utah%driver%'
             or exists (
               select 1
               from public.product_contents pc
               join public.courses c on c.id = pc.course_id
               where pc.product_id = p.id
                 and (
                   c.id = '11111111-1111-4111-8111-111111111111'::uuid
                   or lower(coalesce(c.slug,'')) = 'utah-driver-success-program'
                 )
             )
        )
      $sql$;
    else
      execute $sql$
        update public.orders o
        set product_id = null,
            updated_at = now()
        where o.product_id in (
          select p.id
          from public.products p
          where lower(coalesce(p.name,'')) like '%utah driver%'
             or lower(coalesce(p.slug,'')) like '%utah-driver%'
             or lower(coalesce(p.external_reference,'')) like '%utah%driver%'
        )
      $sql$;
    end if;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 2. Eliminar productos/accesos comerciales del curso anterior.
-- ------------------------------------------------------------
do $$
begin
  if to_regclass('public.products') is not null then
    if to_regclass('public.product_contents') is not null then
      execute $sql$
        delete from public.products p
        where lower(coalesce(p.name,'')) like '%utah driver%'
           or lower(coalesce(p.slug,'')) like '%utah-driver%'
           or lower(coalesce(p.external_reference,'')) like '%utah%driver%'
           or exists (
             select 1
             from public.product_contents pc
             join public.courses c on c.id = pc.course_id
             where pc.product_id = p.id
               and (
                 c.id = '11111111-1111-4111-8111-111111111111'::uuid
                 or lower(coalesce(c.slug,'')) = 'utah-driver-success-program'
               )
           )
      $sql$;
    else
      execute $sql$
        delete from public.products p
        where lower(coalesce(p.name,'')) like '%utah driver%'
           or lower(coalesce(p.slug,'')) like '%utah-driver%'
           or lower(coalesce(p.external_reference,'')) like '%utah%driver%'
      $sql$;
    end if;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 3. Eliminar recursos heredados dedicados al curso anterior.
-- ------------------------------------------------------------
delete from public.resources r
where r.id = 'aaaaaaaa-0001-4000-8000-aaaaaaaaaaaa'::uuid
   or r.course_id in (
        select c.id
        from public.courses c
        where c.id = '11111111-1111-4111-8111-111111111111'::uuid
           or lower(coalesce(c.slug,'')) = 'utah-driver-success-program'
      )
   or lower(coalesce(r.title,'')) in (
        'manual de utah driver',
        'utah driver success program™',
        'utah driver success program'
      );

-- ------------------------------------------------------------
-- 4. Eliminar el curso viejo.
--    Las FK ON DELETE CASCADE eliminan módulos, lecciones, progreso,
--    notas, bloques, inscripciones, evaluaciones, intentos,
--    certificados, instructores y recursos relacionados.
-- ------------------------------------------------------------
delete from public.courses c
where c.id = '11111111-1111-4111-8111-111111111111'::uuid
   or lower(coalesce(c.slug,'')) = 'utah-driver-success-program';

-- ------------------------------------------------------------
-- 5. Retirar cualquier conexión ACTIVA restante con proveedores viejos.
-- ------------------------------------------------------------
update public.lessons
set video_url = null,
    updated_at = now()
where coalesce(video_url,'') ~*
'(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)';

update public.resources
set external_url = null,
    updated_at = now()
where coalesce(external_url,'') ~*
'(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)';

-- Sólo si lesson_blocks existe, retirar bloques de video heredados.
do $$
begin
  if to_regclass('public.lesson_blocks') is not null then
    execute $sql$
      delete from public.lesson_blocks
      where block_type = 'video'
        and coalesce(content::text,'') ~*
        '(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)'
    $sql$;
  end if;
end;
$$;

-- ------------------------------------------------------------
-- 6. Retirar RPCs específicos del sistema académico viejo.
-- ------------------------------------------------------------
drop function if exists public.get_module_exam(uuid);
drop function if exists public.submit_module_exam(uuid,jsonb);
drop function if exists public.get_lesson_quiz(uuid);
drop function if exists public.submit_lesson_quiz(uuid,text);

commit;

-- ============================================================
-- VERIFICACIÓN FINAL
-- Los cuatro valores deben quedar en 0.
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
    where coalesce(l.video_url,'') ~*
    '(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)'
  ) as urls_video_legacy_en_lecciones,
  (
    select count(*)
    from public.resources r
    where coalesce(r.external_url,'') ~*
    '(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)'
  ) as urls_legacy_en_recursos,
  (
    case
      when to_regclass('public.lesson_blocks') is null then 0
      else (
        select count(*)
        from public.lesson_blocks b
        where coalesce(b.content::text,'') ~*
        '(youtube\.com|youtu\.be|youtube-nocookie\.com|drive\.google\.com|googleusercontent\.com|wixstatic\.com|wix\.com)'
      )
    end
  ) as urls_legacy_en_bloques;
