-- ============================================================
-- ACADEMIA AG · PASO 13
-- ESPACIOS DE TRABAJO / CARPETAS POR MARCA O PROYECTO
-- Ejecutar después de los archivos SQL anteriores.
-- ============================================================

begin;

create table if not exists public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  accent_color text not null default '#005134',
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workspace_members (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'instructor' check (role in ('owner','admin','instructor')),
  created_at timestamptz not null default now(),
  unique(workspace_id,user_id)
);

alter table public.courses add column if not exists workspace_id uuid references public.workspaces(id) on delete restrict;
alter table public.resources add column if not exists workspace_id uuid references public.workspaces(id) on delete restrict;
create index if not exists courses_workspace_id_idx on public.courses(workspace_id);
create index if not exists resources_workspace_id_idx on public.resources(workspace_id);
create index if not exists workspace_members_user_id_idx on public.workspace_members(user_id);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;

drop policy if exists workspace_select_member_or_admin on public.workspaces;
create policy workspace_select_member_or_admin on public.workspaces
for select to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or created_by = auth.uid()
  or exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = auth.uid())
);

drop policy if exists workspace_insert_admin on public.workspaces;
create policy workspace_insert_admin on public.workspaces
for insert to authenticated
with check (
  created_by = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
);

drop policy if exists workspace_update_manager on public.workspaces;
create policy workspace_update_manager on public.workspaces
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or created_by = auth.uid()
  or exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = auth.uid() and wm.role in ('owner','admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or created_by = auth.uid()
  or exists (select 1 from public.workspace_members wm where wm.workspace_id = id and wm.user_id = auth.uid() and wm.role in ('owner','admin'))
);

drop policy if exists workspace_delete_manager on public.workspaces;
create policy workspace_delete_manager on public.workspaces
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or created_by = auth.uid()
);

drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
for select to authenticated
using (
  user_id = auth.uid()
  or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from public.workspace_members mine where mine.workspace_id = workspace_members.workspace_id and mine.user_id = auth.uid() and mine.role in ('owner','admin'))
);

drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert on public.workspace_members
for insert to authenticated
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from public.workspaces w where w.id = workspace_id and w.created_by = auth.uid())
  or exists (select 1 from public.workspace_members mine where mine.workspace_id = workspace_members.workspace_id and mine.user_id = auth.uid() and mine.role in ('owner','admin'))
);

drop policy if exists workspace_members_update on public.workspace_members;
create policy workspace_members_update on public.workspace_members
for update to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from public.workspace_members mine where mine.workspace_id = workspace_members.workspace_id and mine.user_id = auth.uid() and mine.role in ('owner','admin'))
)
with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from public.workspace_members mine where mine.workspace_id = workspace_members.workspace_id and mine.user_id = auth.uid() and mine.role in ('owner','admin'))
);

drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete on public.workspace_members
for delete to authenticated
using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  or exists (select 1 from public.workspace_members mine where mine.workspace_id = workspace_members.workspace_id and mine.user_id = auth.uid() and mine.role in ('owner','admin'))
);

-- Los miembros del espacio pueden ver y gestionar los cursos de esa carpeta.
drop policy if exists workspace_courses_select on public.courses;
create policy workspace_courses_select on public.courses
for select to authenticated
using (
  workspace_id is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
  )
);

drop policy if exists workspace_courses_insert on public.courses;
create policy workspace_courses_insert on public.courses
for insert to authenticated
with check (
  created_by = auth.uid()
  and workspace_id is not null
  and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
  )
);

drop policy if exists workspace_courses_update on public.courses;
create policy workspace_courses_update on public.courses
for update to authenticated
using (
  workspace_id is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
  )
)
with check (
  workspace_id is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
  )
);

drop policy if exists workspace_courses_delete on public.courses;
create policy workspace_courses_delete on public.courses
for delete to authenticated
using (
  workspace_id is not null and exists (
    select 1 from public.workspace_members wm
    where wm.workspace_id = courses.workspace_id and wm.user_id = auth.uid()
  )
);

-- Crear una carpeta inicial para conservar y ordenar el contenido existente.
do $$
declare
  admin_id uuid;
  default_workspace uuid;
begin
  select id into admin_id from public.profiles where role = 'admin' order by created_at asc limit 1;
  if admin_id is not null then
    insert into public.workspaces (name,slug,description,accent_color,created_by)
    values ('AG Business Networking','ag-business-networking','Cursos, evaluaciones, manuales y recursos de Academia AG Business Networking.','#005134',admin_id)
    on conflict (slug) do update set name = excluded.name
    returning id into default_workspace;

    insert into public.workspace_members (workspace_id,user_id,role)
    values (default_workspace,admin_id,'owner')
    on conflict (workspace_id,user_id) do update set role = 'owner';

    update public.courses set workspace_id = default_workspace where workspace_id is null;
    update public.resources r
      set workspace_id = coalesce((select c.workspace_id from public.courses c where c.id = r.course_id), default_workspace)
      where r.workspace_id is null;

    insert into public.workspace_members (workspace_id,user_id,role)
    select distinct default_workspace,c.created_by,'instructor'
    from public.courses c
    where c.created_by is not null and c.created_by <> admin_id
    on conflict (workspace_id,user_id) do nothing;
  end if;
end $$;

commit;
