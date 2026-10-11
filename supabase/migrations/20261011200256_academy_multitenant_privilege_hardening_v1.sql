create or replace function public.academy_can_manage_profile(target_user_id uuid)
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
        from public.academy_profile_workspaces target_link
        join public.workspace_members wm
          on wm.workspace_id=target_link.workspace_id
         and wm.user_id=auth.uid()
         and wm.status='active'
         and wm.role in ('owner','admin','manager')
        where target_link.user_id=target_user_id
          and target_link.status='active'
      )
    );
$$;

revoke all on function public.academy_can_manage_profile(uuid) from public;
grant execute on function public.academy_can_manage_profile(uuid) to authenticated;

create or replace function academy_private.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is not null
     and auth.uid()=old.id
     and not public.is_platform_super_admin()
     and coalesce(current_setting('app.academy_privileged_profile_update',true),'')<>'on'
  then
    if new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.account_status is distinct from old.account_status
       or new.must_change_password is distinct from old.must_change_password
       or new.created_at is distinct from old.created_at
    then
      raise exception 'No puedes modificar campos privilegiados de tu perfil';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists academy_profiles_privileged_fields_guard on public.academy_profiles;
create trigger academy_profiles_privileged_fields_guard
before update on public.academy_profiles
for each row execute function academy_private.protect_profile_privileged_fields();

create or replace function public.complete_first_password_change()
returns boolean
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  perform set_config('app.academy_privileged_profile_update','on',true);

  update public.academy_profiles
  set must_change_password=false,
      updated_at=now()
  where id=auth.uid();

  return found;
end;
$$;

revoke all on function public.complete_first_password_change() from public;
grant execute on function public.complete_first_password_change() to authenticated;

create or replace function public.admin_grant_product_access(
  target_user uuid,
  target_product uuid,
  access_source text default 'manual',
  access_reference text default null,
  access_expires_at timestamptz default null
)
returns uuid
language plpgsql
security definer
set search_path=''
as $$
declare
  aid uuid;
  r record;
  v_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  select p.workspace_id into v_workspace
  from public.academy_products p
  where p.id=target_product;

  if v_workspace is null then
    raise exception 'Producto no encontrado';
  end if;

  if not public.academy_can_manage_workspace(v_workspace) then
    raise exception 'No tienes permisos para administrar este producto';
  end if;

  if not exists(select 1 from public.academy_profiles ap where ap.id=target_user) then
    raise exception 'Perfil académico no encontrado';
  end if;

  insert into public.academy_profile_workspaces(user_id,workspace_id,relationship,status)
  values(target_user,v_workspace,'student','active')
  on conflict(user_id,workspace_id) do update
  set status='active',updated_at=now();

  insert into public.academy_student_access(
    user_id,product_id,status,source,reference,granted_by,granted_at,expires_at,updated_at
  )
  values(
    target_user,target_product,'active',coalesce(access_source,'manual'),
    access_reference,auth.uid(),now(),access_expires_at,now()
  )
  on conflict(user_id,product_id) do update
  set status='active',
      source=excluded.source,
      reference=excluded.reference,
      granted_by=auth.uid(),
      granted_at=now(),
      expires_at=excluded.expires_at,
      updated_at=now()
  returning id into aid;

  for r in
    select *
    from public.academy_product_contents
    where product_id=target_product
  loop
    if r.content_type='course' then
      insert into public.academy_enrollments(user_id,course_id,status,enrolled_at,expires_at)
      values(target_user,r.course_id,'active',now(),access_expires_at)
      on conflict(user_id,course_id) do update
      set status='active',
          enrolled_at=now(),
          expires_at=excluded.expires_at;
    elsif r.content_type='resource' then
      insert into public.academy_resource_access(
        user_id,resource_id,product_id,status,granted_at,expires_at
      )
      values(
        target_user,r.resource_id,target_product,'active',now(),access_expires_at
      )
      on conflict(user_id,resource_id,product_id) do update
      set status='active',
          granted_at=now(),
          expires_at=excluded.expires_at;
    end if;
  end loop;

  insert into public.academy_access_history(
    access_id,user_id,product_id,action,new_status,reference,performed_by
  )
  values(
    aid,target_user,target_product,'granted','active',access_reference,auth.uid()
  );

  return aid;
end;
$$;

revoke all on function public.admin_grant_product_access(uuid,uuid,text,text,timestamptz) from public;
grant execute on function public.admin_grant_product_access(uuid,uuid,text,text,timestamptz) to authenticated;

create or replace function public.admin_change_student_access_status(
  target_access uuid,
  new_status text
)
returns void
language plpgsql
security definer
set search_path=''
as $$
declare
  a public.academy_student_access%rowtype;
  r record;
  old_status text;
  v_workspace uuid;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;

  if new_status not in ('active','suspended','revoked','expired') then
    raise exception 'Estado inválido';
  end if;

  select sa.*
  into a
  from public.academy_student_access sa
  where sa.id=target_access;

  if a.id is null then
    raise exception 'Acceso no encontrado';
  end if;

  select p.workspace_id into v_workspace
  from public.academy_products p
  where p.id=a.product_id;

  if v_workspace is null then
    raise exception 'Producto no encontrado';
  end if;

  if not public.academy_can_manage_workspace(v_workspace) then
    raise exception 'No tienes permisos para administrar este acceso';
  end if;

  old_status:=a.status;

  update public.academy_student_access
  set status=new_status,updated_at=now()
  where id=target_access;

  for r in
    select *
    from public.academy_product_contents
    where product_id=a.product_id
  loop
    if r.content_type='course' then
      update public.academy_enrollments
      set status=case when new_status='active' then 'active' else 'cancelled' end
      where user_id=a.user_id
        and course_id=r.course_id;
    elsif r.content_type='resource' then
      update public.academy_resource_access
      set status=new_status
      where user_id=a.user_id
        and resource_id=r.resource_id
        and product_id=a.product_id;
    end if;
  end loop;

  insert into public.academy_access_history(
    access_id,user_id,product_id,action,previous_status,new_status,performed_by
  )
  values(
    a.id,a.user_id,a.product_id,new_status,old_status,new_status,auth.uid()
  );
end;
$$;

revoke all on function public.admin_change_student_access_status(uuid,text) from public;
grant execute on function public.admin_change_student_access_status(uuid,text) to authenticated;

create or replace function academy_private.set_academy_role(target_user uuid,new_role text)
returns void
language plpgsql
security definer
set search_path=''
as $$
begin
  if not public.is_platform_super_admin() then
    raise exception 'Solo un superadministrador puede modificar el rol académico global';
  end if;

  if new_role not in ('student','instructor','admin') then
    raise exception 'Rol inválido';
  end if;

  perform set_config('app.academy_privileged_profile_update','on',true);

  update public.academy_profiles
  set role=new_role,updated_at=now()
  where id=target_user;

  if not found then
    raise exception 'Perfil académico no encontrado';
  end if;
end;
$$;

drop policy if exists academy_student_access_manager_read on public.academy_student_access;
create policy academy_student_access_manager_read
on public.academy_student_access
for select
to authenticated
using (
  exists(
    select 1
    from public.academy_products p
    where p.id=product_id
      and public.academy_can_manage_workspace(p.workspace_id)
  )
);

drop policy if exists academy_resource_access_manager_read on public.academy_resource_access;
create policy academy_resource_access_manager_read
on public.academy_resource_access
for select
to authenticated
using (
  exists(
    select 1
    from public.academy_products p
    where p.id=product_id
      and public.academy_can_manage_workspace(p.workspace_id)
  )
  or exists(
    select 1
    from public.academy_resources r
    where r.id=resource_id
      and (
        (r.workspace_id is not null and public.academy_can_manage_workspace(r.workspace_id))
        or (r.course_id is not null and public.academy_can_manage_course(r.course_id))
      )
  )
);

drop policy if exists academy_access_history_manager_read on public.academy_access_history;
create policy academy_access_history_manager_read
on public.academy_access_history
for select
to authenticated
using (
  exists(
    select 1
    from public.academy_products p
    where p.id=product_id
      and public.academy_can_manage_workspace(p.workspace_id)
  )
);

drop policy if exists academy_orders_workspace_manage on public.academy_orders;
create policy academy_orders_workspace_manage
on public.academy_orders
for all
to authenticated
using (public.academy_can_manage_workspace(workspace_id))
with check (public.academy_can_manage_workspace(workspace_id));

drop policy if exists academy_support_tickets_manager_read on public.academy_support_tickets;
create policy academy_support_tickets_manager_read
on public.academy_support_tickets
for select
to authenticated
using (public.academy_can_manage_profile(user_id));

drop policy if exists academy_support_tickets_manager_update on public.academy_support_tickets;
create policy academy_support_tickets_manager_update
on public.academy_support_tickets
for update
to authenticated
using (public.academy_can_manage_profile(user_id))
with check (public.academy_can_manage_profile(user_id));

update public.ecosystem_project_registry
set
  metadata=metadata || '{"academy_privilege_escalation_guard":true,"academy_workspace_scoped_access_rpc":true}'::jsonb,
  updated_at=now()
where project_key='ag-business-networking';
