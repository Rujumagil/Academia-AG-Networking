-- ============================================================
-- ACADEMIA AG — PORTADAS Y ELIMINACIÓN SEGURA DE CONTENIDO
-- Ejecuta después de 07-fotografias-perfil-storage.sql.
-- ============================================================

begin;

alter table public.courses
  add column if not exists cover_path text;

alter table public.resources
  add column if not exists thumbnail_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'course-media',
  'course-media',
  true,
  5242880,
  array['image/jpeg','image/png','image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Las portadas son públicas para que puedan verse en el catálogo.
drop policy if exists "course_media_public_read" on storage.objects;
create policy "course_media_public_read"
on storage.objects for select
to public
using (bucket_id = 'course-media');

-- Administradores e instructores pueden subir imágenes de cursos propios.
drop policy if exists "course_media_managers_insert" on storage.objects;
create policy "course_media_managers_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'course-media'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[2]
        and (select private.can_manage_course(c.id))
    )
  )
);

drop policy if exists "course_media_managers_update" on storage.objects;
create policy "course_media_managers_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'course-media'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[2]
        and (select private.can_manage_course(c.id))
    )
  )
)
with check (
  bucket_id = 'course-media'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[2]
        and (select private.can_manage_course(c.id))
    )
  )
);

drop policy if exists "course_media_managers_delete" on storage.objects;
create policy "course_media_managers_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'course-media'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.courses c
      where c.id::text = (storage.foldername(name))[2]
        and (select private.can_manage_course(c.id))
    )
  )
);

-- Elimina el curso y sus registros dependientes solo si el usuario lo administra.
create or replace function public.delete_managed_course(target_course uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.can_manage_course(target_course)) then
    raise exception 'No autorizado para eliminar este curso';
  end if;

  if to_regclass('public.lesson_progress') is not null then
    execute $sql$
      delete from public.lesson_progress lp
      using public.lessons l, public.modules m
      where lp.lesson_id = l.id
        and l.module_id = m.id
        and m.course_id = $1
    $sql$ using target_course;
  end if;

  if to_regclass('public.certificates') is not null then
    execute 'delete from public.certificates where course_id = $1' using target_course;
  end if;

  if to_regclass('public.events') is not null then
    execute 'delete from public.events where course_id = $1' using target_course;
  end if;

  delete from public.enrollments where course_id = target_course;
  delete from public.resources where course_id = target_course;
  delete from public.lessons
  where module_id in (select id from public.modules where course_id = target_course);
  delete from public.modules where course_id = target_course;
  delete from public.courses where id = target_course;
end;
$$;

revoke all on function public.delete_managed_course(uuid) from public;
grant execute on function public.delete_managed_course(uuid) to authenticated;

commit;
