-- ============================================================
-- ACADEMIA AG · FASE 3 · PASO 12
-- Archivos privados para los bloques de lecciones
-- Ejecutar después de 09-editor-profesional-por-bloques.sql
-- ============================================================

begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'lesson-media',
  'lesson-media',
  false,
  262144000,
  array[
    'image/jpeg','image/png','image/webp',
    'application/pdf',
    'audio/mpeg','audio/mp4','audio/x-m4a','audio/wav','audio/webm',
    'video/mp4','video/webm','video/quicktime'
  ]
)
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Ruta esperada:
-- courses/<course_uuid>/lessons/<lesson_uuid>/blocks/<block_uuid>/<archivo>

drop policy if exists "lesson_media_managers_insert" on storage.objects;
create policy "lesson_media_managers_insert"
on storage.objects for insert
to authenticated
with check (
  bucket_id = 'lesson-media'
  and (storage.foldername(name))[1] = 'courses'
  and (
    (select private.is_admin())
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and (select private.can_manage_course(((storage.foldername(name))[2])::uuid))
    )
  )
);

drop policy if exists "lesson_media_managers_update" on storage.objects;
create policy "lesson_media_managers_update"
on storage.objects for update
to authenticated
using (
  bucket_id = 'lesson-media'
  and (
    (select private.is_admin())
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and (select private.can_manage_course(((storage.foldername(name))[2])::uuid))
    )
  )
)
with check (
  bucket_id = 'lesson-media'
  and (
    (select private.is_admin())
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and (select private.can_manage_course(((storage.foldername(name))[2])::uuid))
    )
  )
);

drop policy if exists "lesson_media_managers_delete" on storage.objects;
create policy "lesson_media_managers_delete"
on storage.objects for delete
to authenticated
using (
  bucket_id = 'lesson-media'
  and (
    (select private.is_admin())
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and (select private.can_manage_course(((storage.foldername(name))[2])::uuid))
    )
  )
);

-- Los alumnos sólo pueden leer archivos de cursos donde tienen inscripción activa.
drop policy if exists "lesson_media_authorized_read" on storage.objects;
create policy "lesson_media_authorized_read"
on storage.objects for select
to authenticated
using (
  bucket_id = 'lesson-media'
  and (storage.foldername(name))[1] = 'courses'
  and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
  and (
    (select private.is_admin())
    or (select private.can_manage_course(((storage.foldername(name))[2])::uuid))
    or exists (
      select 1
      from public.enrollments e
      where e.course_id = ((storage.foldername(name))[2])::uuid
        and e.user_id = auth.uid()
        and e.status <> 'cancelled'
    )
  )
);

commit;
