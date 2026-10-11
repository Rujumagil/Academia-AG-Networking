-- AG Business Networking · mapa de migración de alumnos
-- Conserva la relación entre el usuario del Supabase anterior y el usuario del Supabase maestro.

create table if not exists public.ag_academy_student_migration_map (
  id uuid primary key default gen_random_uuid(),
  source_project_ref text not null default 'wtxlvmpolxacxnibaexj',
  source_user_id uuid not null,
  target_user_id uuid not null references auth.users(id) on delete cascade,
  source_email text not null,
  source_account_status text,
  source_created_at timestamptz,
  source_enrollments jsonb not null default '[]'::jsonb,
  migration_status text not null default 'migrated'
    check (migration_status in ('migrated','existing','error')),
  metadata jsonb not null default '{}'::jsonb,
  migrated_at timestamptz not null default now(),
  unique(source_project_ref,source_user_id),
  unique(source_project_ref,source_email)
);

alter table public.ag_academy_student_migration_map enable row level security;

drop policy if exists "ag academy migration admin read" on public.ag_academy_student_migration_map;
create policy "ag academy migration admin read"
on public.ag_academy_student_migration_map
for select to authenticated
using ((select public.can_admin_ag_crm()));

drop policy if exists "ag academy migration admin write" on public.ag_academy_student_migration_map;
create policy "ag academy migration admin write"
on public.ag_academy_student_migration_map
for all to authenticated
using ((select public.can_admin_ag_crm()))
with check ((select public.can_admin_ag_crm()));

revoke all on table public.ag_academy_student_migration_map from anon;
grant select,insert,update on table public.ag_academy_student_migration_map to authenticated;
