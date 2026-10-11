create table if not exists public.academy_profile_workspaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.academy_profiles(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  relationship text not null default 'student',
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id,workspace_id),
  constraint academy_profile_workspaces_relationship_check
    check (relationship in ('student','instructor','staff','member')),
  constraint academy_profile_workspaces_status_check
    check (status in ('active','inactive'))
);

alter table public.academy_profile_workspaces enable row level security;

insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
select distinct e.user_id,c.workspace_id,'student','active'
from public.academy_enrollments e
join public.academy_courses c on c.id=e.course_id
join public.academy_profiles ap on ap.id=e.user_id
where c.workspace_id is not null
on conflict(user_id,workspace_id) do update
set status='active',updated_at=now();

insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
select distinct ci.user_id,c.workspace_id,'instructor','active'
from public.academy_course_instructors ci
join public.academy_courses c on c.id=ci.course_id
join public.academy_profiles ap on ap.id=ci.user_id
where c.workspace_id is not null
on conflict(user_id,workspace_id) do update
set relationship='instructor',status='active',updated_at=now();

insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
select distinct wm.user_id,wm.workspace_id,
  case when wm.role='instructor' then 'instructor' else 'staff' end,
  'active'
from public.workspace_members wm
join public.academy_profiles ap on ap.id=wm.user_id
where wm.status='active'
  and wm.role in ('owner','admin','manager','instructor')
on conflict(user_id,workspace_id) do update
set relationship=excluded.relationship,status='active',updated_at=now();

insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
select distinct m.target_user_id,'fa4411f8-65c6-4762-8302-50789998e5b7'::uuid,'student','active'
from public.ag_academy_student_migration_map m
join public.academy_profiles ap on ap.id=m.target_user_id
on conflict(user_id,workspace_id) do update
set status='active',updated_at=now();

insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
select u.id,(u.raw_user_meta_data->>'academy_workspace_id')::uuid,'student','active'
from auth.users u
join public.academy_profiles ap on ap.id=u.id
where nullif(u.raw_user_meta_data->>'academy_workspace_id','') is not null
  and exists (
    select 1 from public.workspaces w
    where w.id=(u.raw_user_meta_data->>'academy_workspace_id')::uuid
  )
on conflict(user_id,workspace_id) do update
set status='active',updated_at=now();

create or replace function public.academy_user_in_workspace(target_user_id uuid,target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select exists(
    select 1
    from public.academy_profile_workspaces apw
    where apw.user_id=target_user_id
      and apw.workspace_id=target_workspace_id
      and apw.status='active'
  );
$$;

create or replace function public.academy_can_browse_workspace(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    auth.uid() is not null
    and (
      public.is_platform_super_admin()
      or exists(
        select 1
        from public.workspace_members wm
        where wm.workspace_id=target_workspace_id
          and wm.user_id=auth.uid()
          and wm.status='active'
          and wm.role in ('owner','admin','manager','instructor')
      )
      or public.academy_user_in_workspace(auth.uid(),target_workspace_id)
    );
$$;

create or replace function public.academy_can_view_profile(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select
    auth.uid() is not null
    and (
      target_user_id=auth.uid()
      or public.is_platform_super_admin()
      or exists(
        select 1
        from public.academy_profile_workspaces target_link
        join public.workspace_members wm
          on wm.workspace_id=target_link.workspace_id
         and wm.user_id=auth.uid()
         and wm.status='active'
         and wm.role in ('owner','admin','manager')
        where target_link.user_id=target_user_id
          and target_link.status='active'
      )
      or exists(
        select 1
        from public.academy_enrollments e
        join public.academy_courses c on c.id=e.course_id
        left join public.academy_course_instructors ci
          on ci.course_id=e.course_id and ci.user_id=auth.uid()
        left join public.workspace_members wm
          on wm.workspace_id=c.workspace_id
         and wm.user_id=auth.uid()
         and wm.status='active'
         and wm.role='instructor'
        where e.user_id=target_user_id
          and e.status in ('active','completed')
          and (ci.user_id is not null or wm.user_id is not null)
      )
    );
$$;

revoke all on function public.academy_user_in_workspace(uuid,uuid) from public;
revoke all on function public.academy_can_browse_workspace(uuid) from public;
revoke all on function public.academy_can_view_profile(uuid) from public;
grant execute on function public.academy_user_in_workspace(uuid,uuid) to authenticated;
grant execute on function public.academy_can_browse_workspace(uuid) to authenticated;
grant execute on function public.academy_can_view_profile(uuid) to authenticated;

drop policy if exists academy_profile_workspaces_read on public.academy_profile_workspaces;
create policy academy_profile_workspaces_read
on public.academy_profile_workspaces
for select
to authenticated
using (
  user_id=auth.uid()
  or public.is_platform_super_admin()
  or public.academy_can_manage_workspace(workspace_id)
);

drop policy if exists academy_profile_workspaces_admin_insert on public.academy_profile_workspaces;
create policy academy_profile_workspaces_admin_insert
on public.academy_profile_workspaces
for insert
to authenticated
with check (public.is_platform_super_admin());

drop policy if exists academy_profile_workspaces_admin_update on public.academy_profile_workspaces;
create policy academy_profile_workspaces_admin_update
on public.academy_profile_workspaces
for update
to authenticated
using (public.is_platform_super_admin())
with check (public.is_platform_super_admin());

drop policy if exists academy_profile_workspaces_admin_delete on public.academy_profile_workspaces;
create policy academy_profile_workspaces_admin_delete
on public.academy_profile_workspaces
for delete
to authenticated
using (public.is_platform_super_admin());

create or replace function academy_private.can_read_course(target_course_id uuid)
returns boolean
language sql
stable
security definer
set search_path=''
as $$
  select auth.uid() is not null and exists(
    select 1
    from public.academy_courses c
    where c.id=target_course_id
      and (
        public.is_platform_super_admin()
        or exists(
          select 1
          from public.workspace_members wm
          where wm.workspace_id=c.workspace_id
            and wm.user_id=auth.uid()
            and wm.status='active'
            and wm.role in ('owner','admin','manager','instructor')
        )
        or exists(
          select 1
          from public.academy_enrollments e
          where e.course_id=c.id
            and e.user_id=auth.uid()
            and e.status in ('active','completed')
            and (e.expires_at is null or e.expires_at>now())
        )
      )
  );
$$;

drop policy if exists academy_courses_read on public.academy_courses;
create policy academy_courses_read
on public.academy_courses
for select
to authenticated
using (
  public.academy_can_manage_workspace(workspace_id)
  or academy_private.can_read_course(id)
  or (
    status='published'
    and workspace_id is not null
    and public.academy_can_browse_workspace(workspace_id)
  )
);

drop policy if exists academy_profiles_read on public.academy_profiles;
create policy academy_profiles_read
on public.academy_profiles
for select
to authenticated
using (public.academy_can_view_profile(id));

drop policy if exists academy_products_read on public.academy_products;
create policy academy_products_read
on public.academy_products
for select
to authenticated
using (
  public.academy_can_manage_workspace(workspace_id)
  or (
    status='active'
    and public.academy_can_browse_workspace(workspace_id)
  )
);

drop policy if exists academy_resources_read on public.academy_resources;
create policy academy_resources_read
on public.academy_resources
for select
to authenticated
using (
  (
    course_id is not null
    and academy_private.can_read_course(course_id)
  )
  or (
    workspace_id is not null
    and public.academy_can_manage_workspace(workspace_id)
  )
  or (
    is_public
    and workspace_id is not null
    and public.academy_can_browse_workspace(workspace_id)
  )
);

drop policy if exists academy_community_replies_insert on public.academy_community_replies;
create policy academy_community_replies_insert
on public.academy_community_replies
for insert
to authenticated
with check (
  user_id=auth.uid()
  and exists(
    select 1
    from public.academy_community_threads t
    where t.id=thread_id
      and academy_private.can_read_course(t.course_id)
  )
);

drop policy if exists academy_lesson_notes_own on public.academy_lesson_notes;
create policy academy_lesson_notes_own
on public.academy_lesson_notes
for all
to authenticated
using (
  public.is_platform_super_admin()
  or (
    user_id=auth.uid()
    and exists(
      select 1
      from public.academy_lessons l
      join public.academy_modules m on m.id=l.module_id
      where l.id=lesson_id
        and academy_private.can_read_course(m.course_id)
    )
  )
)
with check (
  public.is_platform_super_admin()
  or (
    user_id=auth.uid()
    and exists(
      select 1
      from public.academy_lessons l
      join public.academy_modules m on m.id=l.module_id
      where l.id=lesson_id
        and academy_private.can_read_course(m.course_id)
    )
  )
);

drop policy if exists academy_block_responses_own on public.academy_block_responses;
create policy academy_block_responses_own
on public.academy_block_responses
for all
to authenticated
using (
  public.is_platform_super_admin()
  or (
    user_id=auth.uid()
    and exists(
      select 1
      from public.academy_lesson_blocks b
      join public.academy_lessons l on l.id=b.lesson_id
      join public.academy_modules m on m.id=l.module_id
      where b.id=block_id
        and academy_private.can_read_course(m.course_id)
    )
  )
)
with check (
  public.is_platform_super_admin()
  or (
    user_id=auth.uid()
    and exists(
      select 1
      from public.academy_lesson_blocks b
      join public.academy_lessons l on l.id=b.lesson_id
      join public.academy_modules m on m.id=l.module_id
      where b.id=block_id
        and academy_private.can_read_course(m.course_id)
    )
  )
);

create or replace function academy_private.sync_profile_workspace_from_enrollment()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_workspace uuid;
begin
  select c.workspace_id into v_workspace
  from public.academy_courses c
  where c.id=new.course_id;

  if v_workspace is not null then
    insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
    values(new.user_id,v_workspace,'student','active')
    on conflict(user_id,workspace_id) do update
    set status='active',updated_at=now();
  end if;

  return new;
end;
$$;

drop trigger if exists academy_enrollment_profile_workspace_sync on public.academy_enrollments;
create trigger academy_enrollment_profile_workspace_sync
after insert or update of user_id,course_id,status
on public.academy_enrollments
for each row execute function academy_private.sync_profile_workspace_from_enrollment();

create or replace function academy_private.sync_profile_workspace_from_instructor()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_workspace uuid;
begin
  select c.workspace_id into v_workspace
  from public.academy_courses c
  where c.id=new.course_id;

  if v_workspace is not null then
    insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
    values(new.user_id,v_workspace,'instructor','active')
    on conflict(user_id,workspace_id) do update
    set relationship='instructor',status='active',updated_at=now();
  end if;

  return new;
end;
$$;

drop trigger if exists academy_instructor_profile_workspace_sync on public.academy_course_instructors;
create trigger academy_instructor_profile_workspace_sync
after insert or update of user_id,course_id
on public.academy_course_instructors
for each row execute function academy_private.sync_profile_workspace_from_instructor();

create or replace function academy_private.sync_profile_workspace_from_workspace_member()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if new.status='active'
     and new.role in ('owner','admin','manager','instructor')
     and exists(select 1 from public.academy_profiles ap where ap.id=new.user_id)
  then
    insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
    values(
      new.user_id,
      new.workspace_id,
      case when new.role='instructor' then 'instructor' else 'staff' end,
      'active'
    )
    on conflict(user_id,workspace_id) do update
    set relationship=excluded.relationship,status='active',updated_at=now();
  end if;

  return new;
end;
$$;

drop trigger if exists academy_workspace_member_profile_workspace_sync on public.workspace_members;
create trigger academy_workspace_member_profile_workspace_sync
after insert or update of user_id,workspace_id,role,status
on public.workspace_members
for each row execute function academy_private.sync_profile_workspace_from_workspace_member();

create or replace function academy_private.sync_profile_workspace_from_profile()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare
  v_workspace uuid;
begin
  select (u.raw_user_meta_data->>'academy_workspace_id')::uuid
  into v_workspace
  from auth.users u
  where u.id=new.id
    and nullif(u.raw_user_meta_data->>'academy_workspace_id','') is not null;

  if v_workspace is not null
     and exists(select 1 from public.workspaces w where w.id=v_workspace)
  then
    insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
    values(new.id,v_workspace,'student','active')
    on conflict(user_id,workspace_id) do update
    set status='active',updated_at=now();
  end if;

  insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
  select new.id,wm.workspace_id,
    case when wm.role='instructor' then 'instructor' else 'staff' end,
    'active'
  from public.workspace_members wm
  where wm.user_id=new.id
    and wm.status='active'
    and wm.role in ('owner','admin','manager','instructor')
  on conflict(user_id,workspace_id) do update
  set relationship=excluded.relationship,status='active',updated_at=now();

  return new;
end;
$$;

drop trigger if exists academy_profile_workspace_sync on public.academy_profiles;
create trigger academy_profile_workspace_sync
after insert
on public.academy_profiles
for each row execute function academy_private.sync_profile_workspace_from_profile();

update public.ecosystem_project_registry
set
  next_action='Validar aislamiento multiempresa de Academia AG con pruebas de administrador, alumno y usuario de otro workspace.',
  metadata=metadata || '{"academy_multitenant_rls":"hardened_v1","academy_profile_workspace_map":true}'::jsonb,
  updated_at=now()
where project_key='ag-business-networking';
