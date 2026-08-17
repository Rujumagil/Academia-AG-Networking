-- ACADEMIA AG · PASO 14
-- REPARAR ESPACIO PRINCIPAL, POLÍTICAS Y ACCESO ADMINISTRATIVO
-- Ejecutar una sola vez en Supabase SQL Editor.

begin;

-- 1) Asegurar que administradores puedan consultar y administrar todos los cursos.
drop policy if exists workspace_courses_select on public.courses;
create policy workspace_courses_select on public.courses
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or (
    workspace_id is not null and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
    )
  )
);

drop policy if exists workspace_courses_insert on public.courses;
create policy workspace_courses_insert on public.courses
for insert to authenticated
with check (
  created_by = auth.uid()
  and (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
    or (
      workspace_id is not null and exists (
        select 1 from public.workspace_members wm
        where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
      )
    )
  )
);

drop policy if exists workspace_courses_update on public.courses;
create policy workspace_courses_update on public.courses
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or (
    workspace_id is not null and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
    )
  )
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or (
    workspace_id is not null and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
    )
  )
);

drop policy if exists workspace_courses_delete on public.courses;
create policy workspace_courses_delete on public.courses
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or (
    workspace_id is not null and exists (
      select 1 from public.workspace_members wm
      where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
    )
  )
);

-- 2) Crear o recuperar el espacio principal y migrar contenido sin carpeta.
do $$
declare
  admin_id uuid;
  default_workspace uuid;
begin
  select id into admin_id
  from public.profiles
  where role = 'admin'
  order by created_at asc
  limit 1;

  if admin_id is null then
    raise exception 'No existe un perfil con role=admin. Corrige primero el rol del administrador en public.profiles.';
  end if;

  insert into public.workspaces (name,slug,description,accent_color,created_by)
  values (
    'AG Business Networking',
    'ag-business-networking',
    'Cursos, evaluaciones, manuales y recursos de Academia AG Business Networking.',
    '#005134',
    admin_id
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = coalesce(public.workspaces.description, excluded.description),
    updated_at = now()
  returning id into default_workspace;

  insert into public.workspace_members (workspace_id,user_id,role)
  values (default_workspace,admin_id,'owner')
  on conflict (workspace_id,user_id) do update set role='owner';

  update public.courses
  set workspace_id = default_workspace
  where workspace_id is null;

  update public.resources r
  set workspace_id = coalesce(
    (select c.workspace_id from public.courses c where c.id = r.course_id),
    default_workspace
  )
  where r.workspace_id is null;

  insert into public.workspace_members (workspace_id,user_id,role)
  select distinct default_workspace,c.created_by,'instructor'
  from public.courses c
  where c.created_by is not null and c.created_by <> admin_id
  on conflict (workspace_id,user_id) do nothing;
end $$;

commit;
