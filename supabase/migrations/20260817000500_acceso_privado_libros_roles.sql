-- ============================================================
-- ACADEMIA AG — LIBROS PRIVADOS, RECURSOS E INSTRUCTORES
-- Ejecuta después de 02-parche-seguridad-y-permisos.sql.
-- No contiene secretos ni sube el archivo del libro.
-- ============================================================

begin;

-- Permite incorporar instructores sin darles acceso administrativo total.
do $$
declare
  constraint_name text;
begin
  select conname
    into constraint_name
  from pg_constraint
  where conrelid = 'public.profiles'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%role%'
  limit 1;

  if constraint_name is not null then
    execute format('alter table public.profiles drop constraint %I', constraint_name);
  end if;
end;
$$;

alter table public.profiles
  add constraint profiles_role_check
  check (role in ('student', 'instructor', 'admin'));

-- Acepta libros HTML junto con los tipos de recurso existentes.
alter table public.resources
  drop constraint if exists resources_resource_type_check;

alter table public.resources
  add constraint resources_resource_type_check
  check (resource_type in ('book', 'pdf', 'audio', 'video', 'template', 'link', 'image'));

create or replace function public.admin_set_user_role(
  target_user uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'No autorizado';
  end if;

  if new_role not in ('student', 'instructor', 'admin') then
    raise exception 'Rol inválido';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

create or replace function private.can_manage_course(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.is_admin())
    or exists (
      select 1
      from public.courses c
      join public.profiles p on p.id = auth.uid()
      where c.id = target_course
        and c.created_by = auth.uid()
        and p.role = 'instructor'
    );
$$;

revoke all on function private.can_manage_course(uuid) from public;
grant execute on function private.can_manage_course(uuid) to authenticated;

-- Depósito privado: los archivos no tienen URL pública permanente.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'digital-products',
  'digital-products',
  false,
  52428800,
  array[
    'text/html',
    'application/pdf',
    'application/epub+zip',
    'application/zip',
    'audio/mpeg',
    'audio/mp4',
    'audio/wav'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

alter table public.resources enable row level security;

drop policy if exists "resources_authorized_read" on public.resources;
create policy "resources_authorized_read"
on public.resources
for select
to authenticated
using (
  is_public
  or (select private.is_admin())
  or (
    course_id is not null
    and exists (
      select 1
      from public.enrollments e
      where e.user_id = auth.uid()
        and e.course_id = resources.course_id
          and e.status in ('active', 'completed')
    )
  )
  or (
    course_id is not null
    and (select private.can_manage_course(resources.course_id))
  )
);

drop policy if exists "resources_managers_insert" on public.resources;
create policy "resources_managers_insert"
on public.resources
for insert
to authenticated
with check (
  (select private.is_admin())
  or (
    course_id is not null
    and (select private.can_manage_course(course_id))
  )
);

drop policy if exists "resources_managers_update" on public.resources;
create policy "resources_managers_update"
on public.resources
for update
to authenticated
using (
  (select private.is_admin())
  or (
    course_id is not null
    and (select private.can_manage_course(course_id))
  )
)
with check (
  (select private.is_admin())
  or (
    course_id is not null
    and (select private.can_manage_course(course_id))
  )
);

drop policy if exists "resources_managers_delete" on public.resources;
create policy "resources_managers_delete"
on public.resources
for delete
to authenticated
using (
  (select private.is_admin())
  or (
    course_id is not null
    and (select private.can_manage_course(course_id))
  )
);

-- Lectura del archivo únicamente cuando el recurso es público,
-- pertenece a un curso comprado/asignado o lo gestiona el usuario.
drop policy if exists "digital_products_authorized_read" on storage.objects;
create policy "digital_products_authorized_read"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'digital-products'
  and exists (
    select 1
    from public.resources r
    where r.file_path = name
      and (
        r.is_public
        or (select private.is_admin())
        or (
          r.course_id is not null
          and exists (
            select 1
            from public.enrollments e
            where e.user_id = auth.uid()
              and e.course_id = r.course_id
          and e.status in ('active', 'completed')
          )
        )
        or (
          r.course_id is not null
          and (select private.can_manage_course(r.course_id))
        )
      )
  )
);

drop policy if exists "digital_products_managers_insert" on storage.objects;
create policy "digital_products_managers_insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'digital-products'
  and (storage.foldername(name))[1] = 'courses'
  and (
    (select private.is_admin())
    or (
      (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
      and (select private.can_manage_course(((storage.foldername(name))[2])::uuid))
    )
  )
);

drop policy if exists "digital_products_managers_delete" on storage.objects;
create policy "digital_products_managers_delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'digital-products'
  and (
    (select private.is_admin())
    or exists (
      select 1
      from public.resources r
      where r.file_path = name
        and r.course_id is not null
        and (select private.can_manage_course(r.course_id))
    )
  )
);

commit;
