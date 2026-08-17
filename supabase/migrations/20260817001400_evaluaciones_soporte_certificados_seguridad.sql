-- ============================================================
-- ACADEMIA AG BUSINESS NETWORKING · PASO 14
-- EVALUACIONES, SOPORTE, CONSENTIMIENTOS, CERTIFICADOS Y AUDITORÍA
-- Ejecutar después de 13-centro-accesos-productos.sql.
-- ============================================================

begin;
create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- ESTADO DE CUENTA Y AUDITORÍA ADMINISTRATIVA
-- ------------------------------------------------------------
alter table public.profiles
  add column if not exists account_status text not null default 'active';

alter table public.profiles drop constraint if exists profiles_account_status_check;
alter table public.profiles
  add constraint profiles_account_status_check
  check (account_status in ('active','suspended','inactive'));

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  target_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
drop policy if exists admin_audit_select on public.admin_audit_log;
create policy admin_audit_select on public.admin_audit_log
for select to authenticated
using ((select private.is_admin()));

create or replace function public.admin_set_account_status(target_user uuid, new_status text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_status text;
begin
  if not (select private.is_admin()) then
    raise exception 'No autorizado';
  end if;
  if new_status not in ('active','suspended','inactive') then
    raise exception 'Estado inválido';
  end if;
  if target_user = auth.uid() and new_status <> 'active' then
    raise exception 'No puedes suspender tu propia cuenta administrativa';
  end if;

  select account_status into old_status
  from public.profiles where id = target_user;
  if old_status is null then raise exception 'Usuario no encontrado'; end if;

  update public.profiles
  set account_status = new_status, updated_at = now()
  where id = target_user;

  insert into public.admin_audit_log(actor_user_id,target_user_id,action,details)
  values(auth.uid(),target_user,'account_status_changed',jsonb_build_object('from',old_status,'to',new_status));
end;
$$;

revoke all on function public.admin_set_account_status(uuid,text) from public;
grant execute on function public.admin_set_account_status(uuid,text) to authenticated;

-- Endurece accesos comerciales para cuentas suspendidas.
drop policy if exists "own student access" on public.student_access;
create policy "own student access" on public.student_access
for select to authenticated
using (user_id = auth.uid() and (select private.is_active_user()));

drop policy if exists "own resource access" on public.resource_access;
create policy "own resource access" on public.resource_access
for select to authenticated
using (user_id = auth.uid() and (select private.is_active_user()));

-- ------------------------------------------------------------
-- ASIGNACIÓN SEGURA DE INSTRUCTORES A CURSOS
-- ------------------------------------------------------------
create table if not exists public.course_instructors (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(course_id,user_id)
);
create index if not exists course_instructors_user_idx on public.course_instructors(user_id,course_id);
alter table public.course_instructors enable row level security;

-- Fuente única para decidir quién puede modificar un curso.
create or replace function private.can_manage_course(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_admin())
  or exists(
    select 1
    from public.courses c
    join public.profiles p on p.id=auth.uid()
    where c.id=target_course
      and c.created_by=auth.uid()
      and p.role in ('instructor','admin')
      and p.account_status='active'
  )
  or exists(
    select 1
    from public.course_instructors ci
    join public.profiles p on p.id=ci.user_id
    where ci.course_id=target_course
      and ci.user_id=auth.uid()
      and p.role in ('instructor','admin')
      and p.account_status='active'
  )
  or exists(
    select 1
    from public.courses c
    join public.workspace_members wm on wm.workspace_id=c.workspace_id
    join public.profiles p on p.id=wm.user_id
    where c.id=target_course
      and wm.user_id=auth.uid()
      and wm.role in ('owner','admin')
      and p.account_status='active'
  );
$$;

revoke all on function private.can_manage_course(uuid) from public;
grant execute on function private.can_manage_course(uuid) to authenticated;

-- Un instructor asignado debe poder leer el curso que administra; un alumno sólo si
-- tiene una inscripción vigente y su cuenta continúa activa.
create or replace function private.can_view_course(target_course uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_active_user())
  and (
    (select private.can_manage_course(target_course))
    or exists(
      select 1
      from public.enrollments e
      where e.course_id=target_course
        and e.user_id=auth.uid()
        and e.status in ('active','completed')
        and (e.expires_at is null or e.expires_at > now())
    )
  );
$$;

create or replace function private.can_view_lesson(target_lesson uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists(
    select 1
    from public.lessons l
    join public.modules m on m.id=l.module_id
    where l.id=target_lesson
      and private.can_view_course(m.course_id)
  );
$$;

revoke all on function private.can_view_course(uuid) from public;
revoke all on function private.can_view_lesson(uuid) from public;
grant execute on function private.can_view_course(uuid) to authenticated;
grant execute on function private.can_view_lesson(uuid) to authenticated;

-- Helpers SECURITY DEFINER para evitar políticas recursivas en workspace_members.
create or replace function private.is_workspace_member(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_active_user())
  and exists(
    select 1 from public.workspace_members wm
    where wm.workspace_id=target_workspace and wm.user_id=auth.uid()
  );
$$;

create or replace function private.can_manage_workspace(target_workspace uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select private.is_active_user())
  and (
    (select private.is_admin())
    or exists(select 1 from public.workspaces w where w.id=target_workspace and w.created_by=auth.uid())
    or exists(
      select 1 from public.workspace_members wm
      where wm.workspace_id=target_workspace
        and wm.user_id=auth.uid()
        and wm.role in ('owner','admin')
    )
  );
$$;

revoke all on function private.is_workspace_member(uuid) from public;
revoke all on function private.can_manage_workspace(uuid) from public;
grant execute on function private.is_workspace_member(uuid) to authenticated;
grant execute on function private.can_manage_workspace(uuid) to authenticated;

-- Endurece las políticas agregadas por los pasos de workspaces.
drop policy if exists workspace_courses_select on public.courses;
create policy workspace_courses_select on public.courses
for select to authenticated
using (
  (select private.is_active_user())
  and (
    (select private.is_admin())
    or (
      workspace_id is not null and exists(
        select 1 from public.workspace_members wm
        where wm.workspace_id=courses.workspace_id and wm.user_id=auth.uid()
      )
    )
  )
);

-- Dos políticas de INSERT heredadas coexistían con OR; ambas se reemplazan por
-- reglas equivalentes para impedir que un instructor cree cursos en otro workspace.
drop policy if exists courses_insert_manager on public.courses;
create policy courses_insert_manager on public.courses
for insert to authenticated
with check (
  created_by=auth.uid()
  and (select private.is_active_user())
  and exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.role in ('admin','instructor') and p.account_status='active'
  )
  and (
    (select private.is_admin())
    or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  )
);

drop policy if exists workspace_courses_insert on public.courses;
create policy workspace_courses_insert on public.courses
for insert to authenticated
with check (
  created_by=auth.uid()
  and (select private.is_active_user())
  and exists(
    select 1 from public.profiles p
    where p.id=auth.uid() and p.role in ('admin','instructor') and p.account_status='active'
  )
  and (
    (select private.is_admin())
    or (workspace_id is not null and (select private.is_workspace_member(workspace_id)))
  )
);

drop policy if exists workspace_courses_update on public.courses;
create policy workspace_courses_update on public.courses
for update to authenticated
using ((select private.can_manage_course(id)))
with check ((select private.can_manage_course(id)));

drop policy if exists workspace_courses_delete on public.courses;
create policy workspace_courses_delete on public.courses
for delete to authenticated
using ((select private.can_manage_course(id)));

-- Las políticas antiguas de instructor permitían INSERT sin validar workspace.
-- A partir de este paso se conserva únicamente la fuente autoritativa anterior.
drop policy if exists instructor_courses_select on public.courses;
drop policy if exists instructor_courses_insert on public.courses;

drop policy if exists course_instructors_select on public.course_instructors;
create policy course_instructors_select on public.course_instructors
for select to authenticated
using (
  (select private.is_active_user())
  and (
    user_id=auth.uid()
    or (select private.is_admin())
    or (select private.can_manage_course(course_id))
  )
);

drop policy if exists course_instructors_admin_insert on public.course_instructors;
create policy course_instructors_admin_insert on public.course_instructors
for insert to authenticated
with check ((select private.is_admin()));

drop policy if exists course_instructors_admin_delete on public.course_instructors;
create policy course_instructors_admin_delete on public.course_instructors
for delete to authenticated
using ((select private.is_admin()));

create or replace function public.admin_assign_course_instructor(target_course uuid,target_user uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  assignment_id uuid;
  target_workspace uuid;
begin
  if not (select private.is_admin()) then raise exception 'No autorizado'; end if;
  if not exists(select 1 from public.profiles where id=target_user and role='instructor' and account_status='active') then
    raise exception 'El usuario debe ser un instructor activo';
  end if;

  select workspace_id into target_workspace
  from public.courses
  where id=target_course;
  if not found then raise exception 'Curso no encontrado'; end if;

  insert into public.course_instructors(course_id,user_id,assigned_by)
  values(target_course,target_user,auth.uid())
  on conflict(course_id,user_id) do update set assigned_by=excluded.assigned_by
  returning id into assignment_id;

  -- La asignación también da visibilidad al espacio que contiene el curso.
  -- El filtro del frontend y private.can_manage_course mantienen limitado el acceso
  -- a los cursos que realmente fueron asignados o creados por el instructor.
  if target_workspace is not null then
    insert into public.workspace_members(workspace_id,user_id,role)
    values(target_workspace,target_user,'instructor')
    on conflict(workspace_id,user_id) do nothing;
  end if;

  insert into public.admin_audit_log(actor_user_id,target_user_id,action,details)
  values(auth.uid(),target_user,'course_instructor_assigned',jsonb_build_object('course_id',target_course,'workspace_id',target_workspace));
  return assignment_id;
end;
$$;

create or replace function public.admin_remove_course_instructor(target_assignment uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare row_data public.course_instructors%rowtype;
begin
  if not (select private.is_admin()) then raise exception 'No autorizado'; end if;
  select * into row_data from public.course_instructors where id=target_assignment;
  if not found then raise exception 'Asignación no encontrada'; end if;
  delete from public.course_instructors where id=target_assignment;
  insert into public.admin_audit_log(actor_user_id,target_user_id,action,details)
  values(auth.uid(),row_data.user_id,'course_instructor_removed',jsonb_build_object('course_id',row_data.course_id));
end;
$$;

revoke all on function public.admin_assign_course_instructor(uuid,uuid) from public;
revoke all on function public.admin_remove_course_instructor(uuid) from public;
grant execute on function public.admin_assign_course_instructor(uuid,uuid) to authenticated;
grant execute on function public.admin_remove_course_instructor(uuid) to authenticated;

-- ------------------------------------------------------------
-- POLÍTICAS AUTORITATIVAS DE WORKSPACES Y CONTENIDO PRIVADO
-- ------------------------------------------------------------
-- Sustituye las reglas previas para evitar recursión y bloquear cuentas suspendidas.
drop policy if exists workspace_select_member_or_admin on public.workspaces;
create policy workspace_select_member_or_admin on public.workspaces
for select to authenticated
using (
  (select private.is_active_user())
  and (
    (select private.is_admin())
    or created_by=auth.uid()
    or (select private.is_workspace_member(id))
  )
);

drop policy if exists workspace_insert_admin on public.workspaces;
create policy workspace_insert_admin on public.workspaces
for insert to authenticated
with check ((select private.is_admin()) and created_by=auth.uid());

drop policy if exists workspace_update_manager on public.workspaces;
create policy workspace_update_manager on public.workspaces
for update to authenticated
using ((select private.can_manage_workspace(id)))
with check ((select private.can_manage_workspace(id)));

drop policy if exists workspace_delete_manager on public.workspaces;
create policy workspace_delete_manager on public.workspaces
for delete to authenticated
using ((select private.is_admin()) or (created_by=auth.uid() and (select private.is_active_user())));

drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
for select to authenticated
using (
  (select private.is_active_user())
  and (
    user_id=auth.uid()
    or (select private.is_admin())
    or (select private.can_manage_workspace(workspace_id))
  )
);

drop policy if exists workspace_members_insert on public.workspace_members;
create policy workspace_members_insert on public.workspace_members
for insert to authenticated
with check ((select private.can_manage_workspace(workspace_id)));

drop policy if exists workspace_members_update on public.workspace_members;
create policy workspace_members_update on public.workspace_members
for update to authenticated
using ((select private.can_manage_workspace(workspace_id)))
with check ((select private.can_manage_workspace(workspace_id)));

drop policy if exists workspace_members_delete on public.workspace_members;
create policy workspace_members_delete on public.workspace_members
for delete to authenticated
using ((select private.can_manage_workspace(workspace_id)));

-- Consultas del historial académico quedan disponibles sólo mientras la cuenta está activa.
drop policy if exists enrollments_select on public.enrollments;
create policy enrollments_select on public.enrollments
for select to authenticated
using (
  (select private.is_active_user())
  and (user_id=auth.uid() or (select private.is_admin()) or (select private.can_manage_course(course_id)))
);

drop policy if exists progress_select on public.lesson_progress;
create policy progress_select on public.lesson_progress
for select to authenticated
using ((select private.is_active_user()) and (user_id=auth.uid() or (select private.is_admin())));

drop policy if exists notes_select on public.lesson_notes;
create policy notes_select on public.lesson_notes
for select to authenticated
using ((select private.is_active_user()) and (user_id=auth.uid() or (select private.is_admin())));

-- Una cuenta suspendida conserva su fotografía publicada, pero no puede modificarla.
drop policy if exists "Usuarios suben su avatar" on storage.objects;
create policy "Usuarios suben su avatar" on storage.objects
for insert to authenticated
with check (
  bucket_id='avatars'
  and (select private.is_active_user())
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Usuarios actualizan su avatar" on storage.objects;
create policy "Usuarios actualizan su avatar" on storage.objects
for update to authenticated
using (
  bucket_id='avatars'
  and (select private.is_active_user())
  and (storage.foldername(name))[1]=auth.uid()::text
)
with check (
  bucket_id='avatars'
  and (select private.is_active_user())
  and (storage.foldername(name))[1]=auth.uid()::text
);

drop policy if exists "Usuarios eliminan su avatar" on storage.objects;
create policy "Usuarios eliminan su avatar" on storage.objects
for delete to authenticated
using (
  bucket_id='avatars'
  and (select private.is_active_user())
  and (storage.foldername(name))[1]=auth.uid()::text
);

-- Recursos: una única regla de lectura que contempla inscripción y acceso comercial.
drop policy if exists resources_select_authorized on public.resources;
drop policy if exists "resources_authorized_read" on public.resources;
create policy "resources_authorized_read"
on public.resources
for select to authenticated
using (
  (select private.is_active_user())
  and (
    is_public
    or (select private.is_admin())
    or (course_id is not null and (select private.can_view_course(course_id)))
    or exists(
      select 1 from public.resource_access ra
      where ra.resource_id=resources.id
        and ra.user_id=auth.uid()
        and ra.status='active'
        and (ra.expires_at is null or ra.expires_at > now())
    )
  )
);

-- Archivos de productos digitales: el archivo hereda exactamente el permiso del recurso.
drop policy if exists "digital_products_authorized_read" on storage.objects;
create policy "digital_products_authorized_read"
on storage.objects
for select to authenticated
using (
  bucket_id='digital-products'
  and (select private.is_active_user())
  and exists(
    select 1 from public.resources r
    where r.file_path=name
      and (
        r.is_public
        or (select private.is_admin())
        or (r.course_id is not null and (select private.can_view_course(r.course_id)))
        or exists(
          select 1 from public.resource_access ra
          where ra.resource_id=r.id
            and ra.user_id=auth.uid()
            and ra.status='active'
            and (ra.expires_at is null or ra.expires_at > now())
        )
      )
  )
);

-- Medios de lecciones: sólo gestores del curso o alumnos con acceso vigente.
drop policy if exists "lesson_media_authorized_read" on storage.objects;
create policy "lesson_media_authorized_read"
on storage.objects
for select to authenticated
using (
  bucket_id='lesson-media'
  and (storage.foldername(name))[1]='courses'
  and (storage.foldername(name))[2] ~* '^[0-9a-f-]{36}$'
  and (select private.can_view_course(((storage.foldername(name))[2])::uuid))
);

-- Un alumno suspendido no puede modificar progreso, notas o respuestas mediante API directa.
drop policy if exists progress_insert_self on public.lesson_progress;
create policy progress_insert_self on public.lesson_progress
for insert to authenticated
with check (user_id=auth.uid() and (select private.is_active_user()) and (select private.can_view_lesson(lesson_id)));

drop policy if exists progress_update_self on public.lesson_progress;
create policy progress_update_self on public.lesson_progress
for update to authenticated
using (user_id=auth.uid() and (select private.is_active_user()))
with check (user_id=auth.uid() and (select private.is_active_user()) and (select private.can_view_lesson(lesson_id)));

drop policy if exists progress_delete_self on public.lesson_progress;
create policy progress_delete_self on public.lesson_progress
for delete to authenticated
using (user_id=auth.uid() and (select private.is_active_user()));

drop policy if exists notes_insert_self on public.lesson_notes;
create policy notes_insert_self on public.lesson_notes
for insert to authenticated
with check (user_id=auth.uid() and (select private.is_active_user()) and (select private.can_view_lesson(lesson_id)));

drop policy if exists notes_update_self on public.lesson_notes;
create policy notes_update_self on public.lesson_notes
for update to authenticated
using (user_id=auth.uid() and (select private.is_active_user()))
with check (user_id=auth.uid() and (select private.is_active_user()) and (select private.can_view_lesson(lesson_id)));

drop policy if exists notes_delete_self on public.lesson_notes;
create policy notes_delete_self on public.lesson_notes
for delete to authenticated
using (user_id=auth.uid() and (select private.is_active_user()));

drop policy if exists "alumno gestiona sus respuestas" on public.block_responses;
create policy "alumno gestiona sus respuestas" on public.block_responses
for all to authenticated
using (user_id=auth.uid() and (select private.is_active_user()))
with check (user_id=auth.uid() and (select private.is_active_user()));

-- ------------------------------------------------------------
-- CONSENTIMIENTOS LEGALES VERSIONADOS
-- ------------------------------------------------------------
create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  consent_type text not null check (consent_type in ('privacy','terms','refund','conduct','communications')),
  legal_version text not null,
  source text not null default 'web',
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id,consent_type,legal_version)
);

create index if not exists user_consents_user_idx on public.user_consents(user_id,accepted_at desc);
alter table public.user_consents enable row level security;

drop policy if exists user_consents_select on public.user_consents;
create policy user_consents_select on public.user_consents
for select to authenticated
using (user_id = auth.uid() or (select private.is_admin()));

create or replace function public.record_my_consent(target_type text, target_version text, target_source text default 'web')
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare consent_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if target_type not in ('privacy','terms','refund','conduct','communications') then raise exception 'Tipo de consentimiento inválido'; end if;
  if nullif(trim(target_version),'') is null then raise exception 'Versión requerida'; end if;

  insert into public.user_consents(user_id,consent_type,legal_version,source,accepted_at)
  values(auth.uid(),target_type,target_version,coalesce(nullif(trim(target_source),''),'web'),now())
  on conflict(user_id,consent_type,legal_version)
  do update set accepted_at = excluded.accepted_at, source = excluded.source
  returning id into consent_id;
  return consent_id;
end;
$$;

revoke all on function public.record_my_consent(text,text,text) from public;
grant execute on function public.record_my_consent(text,text,text) to authenticated;

create or replace function public.capture_signup_consents()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare v text;
begin
  v := coalesce(new.raw_user_meta_data->>'legal_version','2026-08');
  if coalesce((new.raw_user_meta_data->>'privacy_accepted')::boolean,false) then
    insert into public.user_consents(user_id,consent_type,legal_version,source)
    values(new.id,'privacy',v,'signup') on conflict do nothing;
  end if;
  if coalesce((new.raw_user_meta_data->>'terms_accepted')::boolean,false) then
    insert into public.user_consents(user_id,consent_type,legal_version,source)
    values(new.id,'terms',v,'signup') on conflict do nothing;
  end if;
  if coalesce((new.raw_user_meta_data->>'refund_policy_accepted')::boolean,false) then
    insert into public.user_consents(user_id,consent_type,legal_version,source)
    values(new.id,'refund',v,'signup') on conflict do nothing;
  end if;
  return new;
exception when others then
  -- El registro del usuario nunca debe fallar por el registro legal auxiliar.
  return new;
end;
$$;

drop trigger if exists on_auth_user_capture_consents on auth.users;
create trigger on_auth_user_capture_consents
after insert on auth.users
for each row execute procedure public.capture_signup_consents();

-- Recupera consentimientos de cuentas creadas antes de este paso, si los metadatos existen.
insert into public.user_consents(user_id,consent_type,legal_version,source,accepted_at)
select u.id,'privacy',coalesce(u.raw_user_meta_data->>'legal_version','2026-08'),'signup',u.created_at
from auth.users u where coalesce((u.raw_user_meta_data->>'privacy_accepted')::boolean,false)
on conflict do nothing;
insert into public.user_consents(user_id,consent_type,legal_version,source,accepted_at)
select u.id,'terms',coalesce(u.raw_user_meta_data->>'legal_version','2026-08'),'signup',u.created_at
from auth.users u where coalesce((u.raw_user_meta_data->>'terms_accepted')::boolean,false)
on conflict do nothing;
insert into public.user_consents(user_id,consent_type,legal_version,source,accepted_at)
select u.id,'refund',coalesce(u.raw_user_meta_data->>'legal_version','2026-08'),'signup',u.created_at
from auth.users u where coalesce((u.raw_user_meta_data->>'refund_policy_accepted')::boolean,false)
on conflict do nothing;

-- ------------------------------------------------------------
-- CENTRO DE SOPORTE
-- ------------------------------------------------------------
create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category text not null default 'general' check (category in ('access','course','evaluation','certificate','payment','technical','general')),
  subject text not null check (char_length(subject) between 3 and 140),
  message text not null check (char_length(message) between 5 and 5000),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  assigned_to uuid references auth.users(id) on delete set null,
  resolution text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists support_tickets_user_idx on public.support_tickets(user_id,created_at desc);
create index if not exists support_tickets_status_idx on public.support_tickets(status,created_at desc);
alter table public.support_tickets enable row level security;

drop policy if exists support_tickets_select on public.support_tickets;
create policy support_tickets_select on public.support_tickets
for select to authenticated
using (user_id = auth.uid() or (select private.is_admin()));

drop policy if exists support_tickets_insert on public.support_tickets;
create policy support_tickets_insert on public.support_tickets
for insert to authenticated
with check (user_id = auth.uid() and (select private.is_active_user()));

drop policy if exists support_tickets_admin_update on public.support_tickets;
create policy support_tickets_admin_update on public.support_tickets
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

-- ------------------------------------------------------------
-- AVISOS Y NOTIFICACIONES INTERNAS
-- ------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  target_user uuid references auth.users(id) on delete cascade,
  notification_type text not null default 'general' check (notification_type in ('general','course','event','account','support','certificate')),
  title text not null check (char_length(title) between 3 and 140),
  message text not null check (char_length(message) between 3 and 1200),
  href text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  expires_at timestamptz
);

create table if not exists public.notification_reads (
  notification_id uuid not null references public.notifications(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  read_at timestamptz not null default now(),
  primary key(notification_id,user_id)
);

create index if not exists notifications_target_idx on public.notifications(target_user,created_at desc);
create index if not exists notification_reads_user_idx on public.notification_reads(user_id,read_at desc);
alter table public.notifications enable row level security;
alter table public.notification_reads enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
for select to authenticated
using (
  (select private.is_active_user())
  and (
    (select private.is_admin())
    or target_user is null
    or target_user=auth.uid()
  )
  and (expires_at is null or expires_at > now())
);

drop policy if exists notifications_admin_insert on public.notifications;
create policy notifications_admin_insert on public.notifications
for insert to authenticated
with check ((select private.is_admin()) and created_by=auth.uid());

drop policy if exists notifications_admin_update on public.notifications;
create policy notifications_admin_update on public.notifications
for update to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists notifications_admin_delete on public.notifications;
create policy notifications_admin_delete on public.notifications
for delete to authenticated
using ((select private.is_admin()));

drop policy if exists notification_reads_select on public.notification_reads;
create policy notification_reads_select on public.notification_reads
for select to authenticated
using (user_id=auth.uid() or (select private.is_admin()));

drop policy if exists notification_reads_insert on public.notification_reads;
create policy notification_reads_insert on public.notification_reads
for insert to authenticated
with check (user_id=auth.uid() and (select private.is_active_user()));

drop policy if exists notification_reads_update on public.notification_reads;
create policy notification_reads_update on public.notification_reads
for update to authenticated
using (user_id=auth.uid() and (select private.is_active_user()))
with check (user_id=auth.uid() and (select private.is_active_user()));

create or replace function public.mark_my_notifications_read()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare affected integer;
begin
  if auth.uid() is null or not (select private.is_active_user()) then raise exception 'Cuenta no activa'; end if;
  insert into public.notification_reads(notification_id,user_id,read_at)
  select n.id,auth.uid(),now()
  from public.notifications n
  where (n.target_user is null or n.target_user=auth.uid())
    and (n.expires_at is null or n.expires_at > now())
  on conflict(notification_id,user_id) do update set read_at=excluded.read_at;
  get diagnostics affected = row_count;
  return affected;
end;
$$;

revoke all on function public.mark_my_notifications_read() from public;
grant execute on function public.mark_my_notifications_read() to authenticated;

-- ------------------------------------------------------------
-- EVALUACIONES SEGURAS
-- ------------------------------------------------------------
create table if not exists public.assessments (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  pass_score numeric(5,2) not null default 70 check (pass_score between 0 and 100),
  max_attempts integer not null default 3 check (max_attempts between 1 and 20),
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.assessment_questions (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  question_text text not null,
  position integer not null default 1,
  points numeric(8,2) not null default 1 check (points > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references public.assessment_questions(id) on delete cascade,
  option_text text not null,
  is_correct boolean not null default false,
  position integer not null default 1,
  created_at timestamptz not null default now()
);

create table if not exists public.assessment_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  assessment_id uuid not null references public.assessments(id) on delete cascade,
  score numeric(10,2) not null default 0,
  max_score numeric(10,2) not null default 0,
  percentage numeric(5,2) not null default 0,
  passed boolean not null default false,
  answers jsonb not null default '[]'::jsonb,
  submitted_at timestamptz not null default now()
);

create index if not exists assessments_course_idx on public.assessments(course_id,status);
create index if not exists assessment_questions_assessment_idx on public.assessment_questions(assessment_id,position);
create index if not exists assessment_options_question_idx on public.assessment_options(question_id,position);
create index if not exists assessment_attempts_user_idx on public.assessment_attempts(user_id,submitted_at desc);
create index if not exists assessment_attempts_assessment_idx on public.assessment_attempts(assessment_id,submitted_at desc);

alter table public.assessments enable row level security;
alter table public.assessment_questions enable row level security;
alter table public.assessment_options enable row level security;
alter table public.assessment_attempts enable row level security;

drop policy if exists assessments_select on public.assessments;
create policy assessments_select on public.assessments
for select to authenticated
using (
  (select private.can_manage_course(course_id))
  or (status = 'published' and (select private.can_view_course(course_id)))
);

drop policy if exists assessments_insert on public.assessments;
create policy assessments_insert on public.assessments
for insert to authenticated
with check ((select private.can_manage_course(course_id)) and created_by = auth.uid());

drop policy if exists assessments_update on public.assessments;
create policy assessments_update on public.assessments
for update to authenticated
using ((select private.can_manage_course(course_id)))
with check ((select private.can_manage_course(course_id)));

drop policy if exists assessments_delete on public.assessments;
create policy assessments_delete on public.assessments
for delete to authenticated
using ((select private.can_manage_course(course_id)));

-- Preguntas y respuestas correctas jamás se exponen directamente al alumno.
drop policy if exists assessment_questions_managers on public.assessment_questions;
create policy assessment_questions_managers on public.assessment_questions
for all to authenticated
using (exists(
  select 1 from public.assessments a
  where a.id = assessment_questions.assessment_id
    and private.can_manage_course(a.course_id)
))
with check (exists(
  select 1 from public.assessments a
  where a.id = assessment_questions.assessment_id
    and private.can_manage_course(a.course_id)
));

drop policy if exists assessment_options_managers on public.assessment_options;
create policy assessment_options_managers on public.assessment_options
for all to authenticated
using (exists(
  select 1 from public.assessment_questions q
  join public.assessments a on a.id=q.assessment_id
  where q.id = assessment_options.question_id
    and private.can_manage_course(a.course_id)
))
with check (exists(
  select 1 from public.assessment_questions q
  join public.assessments a on a.id=q.assessment_id
  where q.id = assessment_options.question_id
    and private.can_manage_course(a.course_id)
));

drop policy if exists assessment_attempts_select on public.assessment_attempts;
create policy assessment_attempts_select on public.assessment_attempts
for select to authenticated
using (
  user_id = auth.uid()
  or exists(
    select 1 from public.assessments a
    where a.id = assessment_attempts.assessment_id
      and private.can_manage_course(a.course_id)
  )
);

create or replace function public.get_assessment_payload(target_assessment uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.assessments%rowtype;
  payload jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  select * into a from public.assessments where id=target_assessment;
  if not found then raise exception 'Evaluación no encontrada'; end if;

  if not (select private.can_manage_course(a.course_id)) then
    if a.status <> 'published' or not (select private.can_view_course(a.course_id)) then
      raise exception 'No tienes acceso a esta evaluación';
    end if;
  end if;

  select jsonb_build_object(
    'id',a.id,'course_id',a.course_id,'title',a.title,'description',a.description,
    'pass_score',a.pass_score,'max_attempts',a.max_attempts,
    'questions',coalesce(jsonb_agg(question_obj order by position),'[]'::jsonb)
  ) into payload
  from (
    select q.position,
      jsonb_build_object(
        'id',q.id,
        'text',q.question_text,
        'points',q.points,
        'options',coalesce((
          select jsonb_agg(jsonb_build_object('id',o.id,'text',o.option_text) order by o.position)
          from public.assessment_options o
          where o.question_id=q.id
        ),'[]'::jsonb)
      ) as question_obj
    from public.assessment_questions q
    where q.assessment_id=a.id
  ) qdata;

  return coalesce(payload,jsonb_build_object(
    'id',a.id,'course_id',a.course_id,'title',a.title,'description',a.description,
    'pass_score',a.pass_score,'max_attempts',a.max_attempts,'questions','[]'::jsonb
  ));
end;
$$;

create or replace function public.submit_assessment(target_assessment uuid, submitted_answers jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  a public.assessments%rowtype;
  used_attempts integer;
  total_points numeric(10,2);
  earned_points numeric(10,2);
  pct numeric(5,2);
  did_pass boolean;
  attempt_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if not (select private.is_active_user()) then raise exception 'Cuenta no activa'; end if;
  if jsonb_typeof(submitted_answers) <> 'array' then raise exception 'Respuestas inválidas'; end if;

  select * into a from public.assessments where id=target_assessment and status='published';
  if not found then raise exception 'Evaluación no disponible'; end if;
  if not (select private.can_view_course(a.course_id)) then raise exception 'No tienes acceso a este curso'; end if;

  select count(*) into used_attempts
  from public.assessment_attempts
  where user_id=auth.uid() and assessment_id=a.id;
  if used_attempts >= a.max_attempts then raise exception 'Ya utilizaste todos los intentos permitidos'; end if;

  select coalesce(sum(points),0) into total_points
  from public.assessment_questions where assessment_id=a.id;
  if total_points <= 0 then raise exception 'La evaluación no tiene preguntas calificables'; end if;

  select coalesce(sum(q.points),0) into earned_points
  from public.assessment_questions q
  join lateral (
    select x.question_id, x.option_id
    from jsonb_to_recordset(submitted_answers) as x(question_id uuid, option_id uuid)
    where x.question_id=q.id
    limit 1
  ) ans on true
  join public.assessment_options o
    on o.id=ans.option_id and o.question_id=q.id and o.is_correct=true
  where q.assessment_id=a.id;

  pct := round((earned_points / total_points) * 100, 2);
  did_pass := pct >= a.pass_score;

  insert into public.assessment_attempts(user_id,assessment_id,score,max_score,percentage,passed,answers)
  values(auth.uid(),a.id,earned_points,total_points,pct,did_pass,submitted_answers)
  returning id into attempt_id;

  return jsonb_build_object(
    'attempt_id',attempt_id,
    'score',earned_points,
    'max_score',total_points,
    'percentage',pct,
    'passed',did_pass,
    'attempt_number',used_attempts + 1,
    'remaining_attempts',greatest(a.max_attempts-used_attempts-1,0)
  );
end;
$$;

revoke all on function public.get_assessment_payload(uuid) from public;
revoke all on function public.submit_assessment(uuid,jsonb) from public;
grant execute on function public.get_assessment_payload(uuid) to authenticated;
grant execute on function public.submit_assessment(uuid,jsonb) to authenticated;

-- ------------------------------------------------------------
-- CERTIFICADOS PERSISTENTES Y VERIFICABLES
-- Son constancias internas de finalización; no equivalen a licencias estatales.
-- ------------------------------------------------------------
create table if not exists public.certificates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  credential_code text not null unique,
  status text not null default 'valid' check (status in ('valid','revoked')),
  issued_at timestamptz not null default now(),
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  unique(user_id,course_id)
);
create index if not exists certificates_user_idx on public.certificates(user_id,issued_at desc);
create index if not exists certificates_course_idx on public.certificates(course_id,issued_at desc);
alter table public.certificates enable row level security;

drop policy if exists certificates_select on public.certificates;
create policy certificates_select on public.certificates
for select to authenticated
using (
  user_id=auth.uid()
  or (select private.is_admin())
  or (select private.can_manage_course(course_id))
);

create or replace function public.issue_my_certificate(target_course uuid)
returns public.certificates
language plpgsql
security definer
set search_path = ''
as $$
declare
  lesson_total integer;
  lesson_done integer;
  assessment_total integer;
  assessment_passed integer;
  cert public.certificates%rowtype;
  code text;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if not (select private.is_active_user()) then raise exception 'Cuenta no activa'; end if;
  if not (select private.can_view_course(target_course)) then raise exception 'No tienes acceso a este curso'; end if;

  select count(*) into lesson_total
  from public.lessons l join public.modules m on m.id=l.module_id
  where m.course_id=target_course;
  select count(*) into lesson_done
  from public.lessons l
  join public.modules m on m.id=l.module_id
  join public.lesson_progress p on p.lesson_id=l.id and p.user_id=auth.uid() and p.completed=true
  where m.course_id=target_course;
  if lesson_total=0 or lesson_done < lesson_total then raise exception 'Aún faltan lecciones por completar'; end if;

  select count(*) into assessment_total
  from public.assessments where course_id=target_course and status='published';
  select count(*) into assessment_passed
  from public.assessments a
  where a.course_id=target_course and a.status='published'
    and exists(select 1 from public.assessment_attempts at where at.assessment_id=a.id and at.user_id=auth.uid() and at.passed=true);
  if assessment_passed < assessment_total then raise exception 'Aún faltan evaluaciones por aprobar'; end if;

  select * into cert from public.certificates
  where user_id=auth.uid() and course_id=target_course;
  if found then return cert; end if;

  code := 'AG-' || to_char(now(),'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
  insert into public.certificates(user_id,course_id,credential_code,status,metadata)
  values(auth.uid(),target_course,code,'valid',jsonb_build_object('lesson_count',lesson_total,'assessment_count',assessment_total))
  returning * into cert;
  return cert;
end;
$$;

create or replace function public.verify_certificate(target_code text)
returns table(
  credential_code text,
  status text,
  issued_at timestamptz,
  student_name text,
  course_title text
)
language sql
stable
security definer
set search_path = ''
as $$
  select c.credential_code,c.status,c.issued_at,p.full_name,co.title
  from public.certificates c
  join public.profiles p on p.id=c.user_id
  join public.courses co on co.id=c.course_id
  where upper(c.credential_code)=upper(trim(target_code))
  limit 1;
$$;

revoke all on function public.issue_my_certificate(uuid) from public;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.issue_my_certificate(uuid) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;

-- ------------------------------------------------------------
-- PERMISOS SQL (RLS CONTINÚA SIENDO LA BARRERA POR FILA)
-- ------------------------------------------------------------
grant select on public.admin_audit_log,public.course_instructors,public.user_consents,public.support_tickets,
  public.notifications,public.notification_reads,
  public.assessments,public.assessment_questions,public.assessment_options,
  public.assessment_attempts,public.certificates to authenticated;
grant insert,delete on public.course_instructors to authenticated;
grant insert on public.support_tickets,public.notifications,public.notification_reads,
  public.assessments,public.assessment_questions,public.assessment_options to authenticated;
grant update,delete on public.notifications to authenticated;
grant update on public.notification_reads to authenticated;
grant update,delete on public.assessments,public.assessment_questions,public.assessment_options to authenticated;
grant update on public.support_tickets to authenticated;

commit;
