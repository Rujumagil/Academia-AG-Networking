-- ============================================================
-- ACADEMIA AG BUSINESS NETWORKING · ESQUEMA BASE
-- Ejecutar primero en un proyecto NUEVO de Supabase.
-- No contiene secretos.
-- ============================================================

begin;
create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ------------------------------------------------------------
-- PERFILES
-- ------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text not null default '',
  avatar_url text,
  role text not null default 'student' check (role in ('student','instructor','admin')),
  account_status text not null default 'active' check (account_status in ('active','suspended','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles(id,email,full_name,role,account_status)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',''),'student','active')
  on conflict (id) do update set email=excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function private.is_active_user()
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.account_status='active');
$$;

create or replace function private.is_admin()
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(select 1 from public.profiles p where p.id=auth.uid() and p.role='admin' and p.account_status='active');
$$;

-- ------------------------------------------------------------
-- CURSOS / MÓDULOS / LECCIONES
-- ------------------------------------------------------------
create table if not exists public.courses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  subtitle text,
  description text,
  cover_url text,
  cover_path text,
  category text,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  featured boolean not null default false,
  instructor_name text,
  duration_label text,
  price numeric(12,2),
  sale_price numeric(12,2),
  payment_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  position integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.modules(id) on delete cascade,
  title text not null,
  lesson_type text not null default 'video' check (lesson_type in ('video','text','activity','resource','live')),
  video_url text,
  duration_minutes integer not null default 0,
  position integer not null default 1,
  content_html text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  status text not null default 'active' check (status in ('active','completed','cancelled','expired')),
  enrolled_at timestamptz not null default now(),
  completed_at timestamptz,
  expires_at timestamptz,
  unique(user_id,course_id)
);

create table if not exists public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(user_id,lesson_id)
);

create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  notes text not null default '',
  updated_at timestamptz not null default now(),
  unique(user_id,lesson_id)
);

create table if not exists public.resources (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references public.courses(id) on delete cascade,
  title text not null,
  description text,
  resource_type text not null default 'pdf' check (resource_type in ('book','pdf','audio','video','template','link','image')),
  external_url text,
  file_path text,
  thumbnail_url text,
  thumbnail_path text,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists modules_course_position_idx on public.modules(course_id,position);
create index if not exists lessons_module_position_idx on public.lessons(module_id,position);
create index if not exists enrollments_user_idx on public.enrollments(user_id);
create index if not exists enrollments_course_idx on public.enrollments(course_id);
create index if not exists resources_course_idx on public.resources(course_id);

create or replace function private.can_manage_course(target_course uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select (select private.is_admin())
  or exists(
    select 1 from public.courses c
    join public.profiles p on p.id=auth.uid()
    where c.id=target_course and c.created_by=auth.uid() and p.role='instructor' and p.account_status='active'
  );
$$;

create or replace function private.can_view_course(target_course uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select (select private.is_admin())
  or exists(select 1 from public.courses c where c.id=target_course and c.created_by=auth.uid())
  or exists(
    select 1 from public.enrollments e
    join public.profiles p on p.id=e.user_id
    where e.course_id=target_course and e.user_id=auth.uid()
      and e.status in ('active','completed')
      and (e.expires_at is null or e.expires_at > now())
      and p.account_status='active'
  );
$$;

create or replace function private.can_view_lesson(target_lesson uuid)
returns boolean
language sql stable security definer set search_path=''
as $$
  select exists(
    select 1 from public.lessons l join public.modules m on m.id=l.module_id
    where l.id=target_lesson and private.can_view_course(m.course_id)
  );
$$;

-- ------------------------------------------------------------
-- RLS
-- ------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.courses enable row level security;
alter table public.modules enable row level security;
alter table public.lessons enable row level security;
alter table public.enrollments enable row level security;
alter table public.lesson_progress enable row level security;
alter table public.lesson_notes enable row level security;
alter table public.resources enable row level security;

create policy profiles_select on public.profiles for select to authenticated
using (id=auth.uid() or (select private.is_admin()));
create policy profiles_update_self on public.profiles for update to authenticated
using (id=auth.uid() and account_status='active') with check (id=auth.uid());

create policy courses_select_authorized on public.courses for select to authenticated
using ((select private.can_view_course(id)));
create policy courses_insert_manager on public.courses for insert to authenticated
with check (created_by=auth.uid() and exists(select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','instructor') and p.account_status='active'));
create policy courses_update_manager on public.courses for update to authenticated
using ((select private.can_manage_course(id))) with check ((select private.can_manage_course(id)));
create policy courses_delete_manager on public.courses for delete to authenticated
using ((select private.can_manage_course(id)));

create policy modules_select_authorized on public.modules for select to authenticated
using ((select private.can_view_course(course_id)));
create policy modules_insert_manager on public.modules for insert to authenticated
with check ((select private.can_manage_course(course_id)));
create policy modules_update_manager on public.modules for update to authenticated
using ((select private.can_manage_course(course_id))) with check ((select private.can_manage_course(course_id)));
create policy modules_delete_manager on public.modules for delete to authenticated
using ((select private.can_manage_course(course_id)));

create policy lessons_select_authorized on public.lessons for select to authenticated
using (exists(select 1 from public.modules m where m.id=lessons.module_id and private.can_view_course(m.course_id)));
create policy lessons_insert_manager on public.lessons for insert to authenticated
with check (exists(select 1 from public.modules m where m.id=lessons.module_id and private.can_manage_course(m.course_id)));
create policy lessons_update_manager on public.lessons for update to authenticated
using (exists(select 1 from public.modules m where m.id=lessons.module_id and private.can_manage_course(m.course_id)))
with check (exists(select 1 from public.modules m where m.id=lessons.module_id and private.can_manage_course(m.course_id)));
create policy lessons_delete_manager on public.lessons for delete to authenticated
using (exists(select 1 from public.modules m where m.id=lessons.module_id and private.can_manage_course(m.course_id)));

create policy enrollments_select on public.enrollments for select to authenticated
using (user_id=auth.uid() or (select private.is_admin()) or (select private.can_manage_course(course_id)));
create policy enrollments_admin_insert on public.enrollments for insert to authenticated
with check ((select private.is_admin()));
create policy enrollments_admin_update on public.enrollments for update to authenticated
using ((select private.is_admin())) with check ((select private.is_admin()));
create policy enrollments_admin_delete on public.enrollments for delete to authenticated
using ((select private.is_admin()));

create policy progress_select on public.lesson_progress for select to authenticated
using (user_id=auth.uid() or (select private.is_admin()));
create policy progress_insert_self on public.lesson_progress for insert to authenticated
with check (user_id=auth.uid() and (select private.can_view_lesson(lesson_id)));
create policy progress_update_self on public.lesson_progress for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid() and (select private.can_view_lesson(lesson_id)));
create policy progress_delete_self on public.lesson_progress for delete to authenticated
using (user_id=auth.uid());

create policy notes_select on public.lesson_notes for select to authenticated
using (user_id=auth.uid() or (select private.is_admin()));
create policy notes_insert_self on public.lesson_notes for insert to authenticated
with check (user_id=auth.uid() and (select private.can_view_lesson(lesson_id)));
create policy notes_update_self on public.lesson_notes for update to authenticated
using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy notes_delete_self on public.lesson_notes for delete to authenticated
using (user_id=auth.uid());

create policy resources_select_authorized on public.resources for select to authenticated
using (
  is_public or (select private.is_admin())
  or (course_id is not null and (select private.can_view_course(course_id)))
);
create policy resources_insert_manager on public.resources for insert to authenticated
with check ((select private.is_admin()) or (course_id is not null and (select private.can_manage_course(course_id))));
create policy resources_update_manager on public.resources for update to authenticated
using ((select private.is_admin()) or (course_id is not null and (select private.can_manage_course(course_id))))
with check ((select private.is_admin()) or (course_id is not null and (select private.can_manage_course(course_id))));
create policy resources_delete_manager on public.resources for delete to authenticated
using ((select private.is_admin()) or (course_id is not null and (select private.can_manage_course(course_id))));

-- Permisos SQL. RLS sigue siendo la barrera real por fila.
grant select on public.profiles,public.courses,public.modules,public.lessons,public.enrollments,public.lesson_progress,public.lesson_notes,public.resources to authenticated;
grant insert,update,delete on public.courses,public.modules,public.lessons,public.enrollments,public.lesson_progress,public.lesson_notes,public.resources to authenticated;
grant update(full_name,avatar_url) on public.profiles to authenticated;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.is_active_user() to authenticated;
grant execute on function private.can_manage_course(uuid) to authenticated;
grant execute on function private.can_view_course(uuid) to authenticated;
grant execute on function private.can_view_lesson(uuid) to authenticated;

commit;
