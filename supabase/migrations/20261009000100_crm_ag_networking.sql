-- ============================================================
-- AG BUSINESS NETWORKING — CRM PROPIO
-- Fecha: 2026-10-09
-- Objetivo: administrar candidatos, seguimiento, tareas y actividad
-- sin depender de Compás One.
-- ============================================================

begin;

create extension if not exists pgcrypto;

-- ------------------------------------------------------------
-- Equipo del CRM
-- Permite agregar asesores sin alterar los roles académicos.
-- ------------------------------------------------------------
create table if not exists public.crm_team_members (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  crm_role text not null default 'advisor'
    check (crm_role in ('manager','advisor','viewer')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null
);

-- ------------------------------------------------------------
-- Candidatos / prospectos
-- ------------------------------------------------------------
create table if not exists public.crm_candidates (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text,
  phone text,
  company text,
  candidate_type text not null default 'other'
    check (candidate_type in ('course','membership','service','event','provider','partner','other')),
  interest text,
  message text,
  stage text not null default 'new'
    check (stage in ('new','contacted','qualified','appointment','follow_up','proposal','enrolled','won','lost','unreachable')),
  status text not null default 'active'
    check (status in ('active','converted','lost','archived')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  temperature text not null default 'warm'
    check (temperature in ('cold','warm','hot')),
  source text not null default 'manual',
  source_detail text,
  assigned_to uuid references public.profiles(id) on delete set null,
  next_follow_up_at timestamptz,
  last_contact_at timestamptz,
  converted_at timestamptz,
  lost_reason text,
  consent boolean not null default false,
  consent_at timestamptz,
  utm jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_candidates_contact_required
    check (nullif(btrim(coalesce(email,'')), '') is not null
       or nullif(btrim(coalesce(phone,'')), '') is not null)
);

create index if not exists crm_candidates_stage_idx
  on public.crm_candidates(stage, status);
create index if not exists crm_candidates_followup_idx
  on public.crm_candidates(next_follow_up_at)
  where status = 'active';
create index if not exists crm_candidates_assigned_idx
  on public.crm_candidates(assigned_to, status);
create index if not exists crm_candidates_created_idx
  on public.crm_candidates(created_at desc);
create index if not exists crm_candidates_email_lower_idx
  on public.crm_candidates(lower(email))
  where email is not null;
create index if not exists crm_candidates_phone_idx
  on public.crm_candidates(phone)
  where phone is not null;

-- ------------------------------------------------------------
-- Línea de tiempo / interacciones
-- ------------------------------------------------------------
create table if not exists public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.crm_candidates(id) on delete cascade,
  activity_type text not null default 'note'
    check (activity_type in ('note','call','email','whatsapp','meeting','status_change','task','system')),
  direction text not null default 'internal'
    check (direction in ('inbound','outbound','internal')),
  subject text,
  body text,
  occurred_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists crm_activities_candidate_idx
  on public.crm_activities(candidate_id, occurred_at desc);

-- ------------------------------------------------------------
-- Tareas y seguimientos
-- ------------------------------------------------------------
create table if not exists public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  candidate_id uuid not null references public.crm_candidates(id) on delete cascade,
  title text not null,
  description text,
  task_type text not null default 'follow_up'
    check (task_type in ('follow_up','call','email','whatsapp','meeting','other')),
  status text not null default 'pending'
    check (status in ('pending','done','cancelled')),
  priority text not null default 'medium'
    check (priority in ('low','medium','high','urgent')),
  due_at timestamptz not null,
  assigned_to uuid references public.profiles(id) on delete set null,
  completed_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists crm_tasks_due_idx
  on public.crm_tasks(status, due_at);
create index if not exists crm_tasks_candidate_idx
  on public.crm_tasks(candidate_id, created_at desc);
create index if not exists crm_tasks_assigned_idx
  on public.crm_tasks(assigned_to, status, due_at);

-- ------------------------------------------------------------
-- Permisos CRM
-- ------------------------------------------------------------
create or replace function private.can_use_crm()
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
      from public.crm_team_members m
      where m.user_id = auth.uid()
        and m.active = true
    );
$$;

revoke all on function private.can_use_crm() from public;
grant execute on function private.can_use_crm() to authenticated;

create or replace function private.can_manage_crm()
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
      from public.crm_team_members m
      where m.user_id = auth.uid()
        and m.active = true
        and m.crm_role in ('manager','advisor')
    );
$$;

revoke all on function private.can_manage_crm() from public;
grant execute on function private.can_manage_crm() to authenticated;

alter table public.crm_team_members enable row level security;
alter table public.crm_candidates enable row level security;
alter table public.crm_activities enable row level security;
alter table public.crm_tasks enable row level security;

drop policy if exists "crm_team_read_self_or_admin" on public.crm_team_members;
create policy "crm_team_read_self_or_admin"
on public.crm_team_members
for select
to authenticated
using (
  user_id = auth.uid()
  or (select private.is_admin())
);

drop policy if exists "crm_team_admin_insert" on public.crm_team_members;
create policy "crm_team_admin_insert"
on public.crm_team_members
for insert
to authenticated
with check ((select private.is_admin()));

drop policy if exists "crm_team_admin_update" on public.crm_team_members;
create policy "crm_team_admin_update"
on public.crm_team_members
for update
to authenticated
using ((select private.is_admin()))
with check ((select private.is_admin()));

drop policy if exists "crm_team_admin_delete" on public.crm_team_members;
create policy "crm_team_admin_delete"
on public.crm_team_members
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "crm_candidates_team_read" on public.crm_candidates;
create policy "crm_candidates_team_read"
on public.crm_candidates
for select
to authenticated
using ((select private.can_use_crm()));

drop policy if exists "crm_candidates_team_insert" on public.crm_candidates;
create policy "crm_candidates_team_insert"
on public.crm_candidates
for insert
to authenticated
with check ((select private.can_manage_crm()));

drop policy if exists "crm_candidates_team_update" on public.crm_candidates;
create policy "crm_candidates_team_update"
on public.crm_candidates
for update
to authenticated
using ((select private.can_manage_crm()))
with check ((select private.can_manage_crm()));

drop policy if exists "crm_candidates_admin_delete" on public.crm_candidates;
create policy "crm_candidates_admin_delete"
on public.crm_candidates
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "crm_activities_team_read" on public.crm_activities;
create policy "crm_activities_team_read"
on public.crm_activities
for select
to authenticated
using ((select private.can_use_crm()));

drop policy if exists "crm_activities_team_insert" on public.crm_activities;
create policy "crm_activities_team_insert"
on public.crm_activities
for insert
to authenticated
with check ((select private.can_manage_crm()));

drop policy if exists "crm_activities_team_update" on public.crm_activities;
create policy "crm_activities_team_update"
on public.crm_activities
for update
to authenticated
using ((select private.can_manage_crm()))
with check ((select private.can_manage_crm()));

drop policy if exists "crm_activities_admin_delete" on public.crm_activities;
create policy "crm_activities_admin_delete"
on public.crm_activities
for delete
to authenticated
using ((select private.is_admin()));

drop policy if exists "crm_tasks_team_read" on public.crm_tasks;
create policy "crm_tasks_team_read"
on public.crm_tasks
for select
to authenticated
using ((select private.can_use_crm()));

drop policy if exists "crm_tasks_team_insert" on public.crm_tasks;
create policy "crm_tasks_team_insert"
on public.crm_tasks
for insert
to authenticated
with check ((select private.can_manage_crm()));

drop policy if exists "crm_tasks_team_update" on public.crm_tasks;
create policy "crm_tasks_team_update"
on public.crm_tasks
for update
to authenticated
using ((select private.can_manage_crm()))
with check ((select private.can_manage_crm()));

drop policy if exists "crm_tasks_admin_delete" on public.crm_tasks;
create policy "crm_tasks_admin_delete"
on public.crm_tasks
for delete
to authenticated
using ((select private.is_admin()));

revoke all on table public.crm_team_members from anon;
revoke all on table public.crm_candidates from anon;
revoke all on table public.crm_activities from anon;
revoke all on table public.crm_tasks from anon;

grant select, insert, update, delete on table public.crm_team_members to authenticated;
grant select, insert, update, delete on table public.crm_candidates to authenticated;
grant select, insert, update, delete on table public.crm_activities to authenticated;
grant select, insert, update, delete on table public.crm_tasks to authenticated;

-- ------------------------------------------------------------
-- Updated-at
-- ------------------------------------------------------------
create or replace function public.crm_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  if tg_table_name = 'crm_candidates' then
    new.updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists crm_candidates_updated_at on public.crm_candidates;
create trigger crm_candidates_updated_at
before update on public.crm_candidates
for each row execute function public.crm_set_updated_at();

drop trigger if exists crm_tasks_updated_at on public.crm_tasks;
create trigger crm_tasks_updated_at
before update on public.crm_tasks
for each row execute function public.crm_set_updated_at();

-- Registrar cambios de etapa automáticamente.
create or replace function public.crm_log_stage_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.stage is distinct from new.stage then
    insert into public.crm_activities(
      candidate_id, activity_type, direction, subject, body, created_by, metadata
    )
    values (
      new.id,
      'status_change',
      'internal',
      'Cambio de etapa',
      'Etapa: ' || coalesce(old.stage,'—') || ' → ' || coalesce(new.stage,'—'),
      auth.uid(),
      jsonb_build_object('from', old.stage, 'to', new.stage)
    );
  end if;

  if new.stage in ('enrolled','won') and old.stage is distinct from new.stage then
    new.status := 'converted';
    new.converted_at := coalesce(new.converted_at, now());
    new.next_follow_up_at := null;
  elsif new.stage = 'lost' and old.stage is distinct from new.stage then
    new.status := 'lost';
    new.next_follow_up_at := null;
  elsif new.stage not in ('enrolled','won','lost') and new.status in ('converted','lost') then
    new.status := 'active';
  end if;

  return new;
end;
$$;

drop trigger if exists crm_candidates_stage_change on public.crm_candidates;
create trigger crm_candidates_stage_change
before update on public.crm_candidates
for each row execute function public.crm_log_stage_change();

-- Mantiene última interacción de contacto.
create or replace function public.crm_touch_candidate_from_activity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.activity_type in ('call','email','whatsapp','meeting') then
    update public.crm_candidates
      set last_contact_at = greatest(coalesce(last_contact_at, '-infinity'::timestamptz), new.occurred_at)
      where id = new.candidate_id;
  end if;
  return new;
end;
$$;

drop trigger if exists crm_activity_touch_candidate on public.crm_activities;
create trigger crm_activity_touch_candidate
after insert on public.crm_activities
for each row execute function public.crm_touch_candidate_from_activity();

-- ------------------------------------------------------------
-- Captura pública segura
-- El visitante NO obtiene acceso directo a las tablas.
-- ------------------------------------------------------------
create or replace function public.crm_create_public_candidate(
  p_full_name text,
  p_email text default null,
  p_phone text default null,
  p_company text default null,
  p_candidate_type text default 'other',
  p_interest text default null,
  p_message text default null,
  p_source text default 'website',
  p_page_url text default null,
  p_utm jsonb default '{}'::jsonb,
  p_consent boolean default false,
  p_honeypot text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  candidate_id uuid;
  clean_name text := btrim(coalesce(p_full_name,''));
  clean_email text := nullif(lower(btrim(coalesce(p_email,''))), '');
  clean_phone text := nullif(btrim(coalesce(p_phone,'')), '');
  clean_company text := nullif(btrim(coalesce(p_company,'')), '');
  clean_interest text := nullif(btrim(coalesce(p_interest,'')), '');
  clean_message text := nullif(btrim(coalesce(p_message,'')), '');
  clean_source text := coalesce(nullif(btrim(coalesce(p_source,'')), ''), 'website');
  clean_type text := lower(coalesce(nullif(btrim(coalesce(p_candidate_type,'')), ''), 'other'));
begin
  if nullif(btrim(coalesce(p_honeypot,'')), '') is not null then
    raise exception 'Solicitud inválida';
  end if;

  if p_consent is distinct from true then
    raise exception 'Se requiere consentimiento para dar seguimiento';
  end if;

  if char_length(clean_name) < 2 or char_length(clean_name) > 160 then
    raise exception 'Nombre inválido';
  end if;

  if clean_email is null and clean_phone is null then
    raise exception 'Se requiere correo o teléfono';
  end if;

  if clean_email is not null and char_length(clean_email) > 320 then
    raise exception 'Correo inválido';
  end if;

  if clean_phone is not null and char_length(clean_phone) > 80 then
    raise exception 'Teléfono inválido';
  end if;

  if clean_company is not null and char_length(clean_company) > 160 then
    raise exception 'Empresa inválida';
  end if;

  if clean_interest is not null and char_length(clean_interest) > 240 then
    raise exception 'Interés inválido';
  end if;

  if clean_message is not null and char_length(clean_message) > 2000 then
    raise exception 'Mensaje demasiado largo';
  end if;

  if clean_type not in ('course','membership','service','event','provider','partner','other') then
    clean_type := 'other';
  end if;

  insert into public.crm_candidates(
    full_name,
    email,
    phone,
    company,
    candidate_type,
    interest,
    message,
    stage,
    status,
    priority,
    temperature,
    source,
    next_follow_up_at,
    consent,
    consent_at,
    utm,
    metadata
  )
  values (
    clean_name,
    clean_email,
    clean_phone,
    clean_company,
    clean_type,
    clean_interest,
    clean_message,
    'new',
    'active',
    'high',
    'warm',
    clean_source,
    now() + interval '30 minutes',
    true,
    now(),
    coalesce(p_utm, '{}'::jsonb),
    jsonb_build_object('page_url', nullif(btrim(coalesce(p_page_url,'')), ''))
  )
  returning id into candidate_id;

  insert into public.crm_activities(
    candidate_id,
    activity_type,
    direction,
    subject,
    body,
    metadata
  )
  values (
    candidate_id,
    'system',
    'inbound',
    'Nueva solicitud recibida',
    clean_message,
    jsonb_build_object(
      'source', clean_source,
      'interest', clean_interest,
      'candidate_type', clean_type,
      'page_url', nullif(btrim(coalesce(p_page_url,'')), '')
    )
  );

  insert into public.crm_tasks(
    candidate_id,
    title,
    description,
    task_type,
    status,
    priority,
    due_at
  )
  values (
    candidate_id,
    'Primer contacto',
    'Contactar al candidato y registrar el resultado del primer contacto.',
    'follow_up',
    'pending',
    'high',
    now() + interval '30 minutes'
  );

  return candidate_id;
end;
$$;

revoke all on function public.crm_create_public_candidate(
  text,text,text,text,text,text,text,text,text,jsonb,boolean,text
) from public;

grant execute on function public.crm_create_public_candidate(
  text,text,text,text,text,text,text,text,text,jsonb,boolean,text
) to anon, authenticated;

commit;
