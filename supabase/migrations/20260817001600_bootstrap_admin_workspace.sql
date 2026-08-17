-- ============================================================
-- ACADEMIA AG · BOOTSTRAP DE ADMINISTRADOR Y WORKSPACE PRINCIPAL
-- Esta migración permite completar una instalación nueva después
-- de registrar al primer usuario que será administrador.
-- ============================================================

begin;

create or replace function private.ensure_default_workspace(target_admin uuid)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  default_workspace uuid;
begin
  if target_admin is null then
    raise exception 'Administrador requerido';
  end if;

  if not exists (
    select 1
    from public.profiles p
    where p.id = target_admin
      and p.role = 'admin'
  ) then
    raise exception 'El usuario indicado no es administrador';
  end if;

  insert into public.workspaces (
    name,
    slug,
    description,
    accent_color,
    created_by
  )
  values (
    'AG Business Networking',
    'ag-business-networking',
    'Cursos, evaluaciones, manuales y recursos de Academia AG Business Networking.',
    '#005134',
    target_admin
  )
  on conflict (slug) do update set
    name = excluded.name,
    description = coalesce(public.workspaces.description, excluded.description),
    updated_at = now()
  returning id into default_workspace;

  insert into public.workspace_members (workspace_id,user_id,role)
  values (default_workspace,target_admin,'owner')
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
  where c.created_by is not null
    and c.created_by <> target_admin
  on conflict (workspace_id,user_id) do nothing;

  return default_workspace;
end;
$$;

revoke all on function private.ensure_default_workspace(uuid) from public;
revoke all on function private.ensure_default_workspace(uuid) from anon;
revoke all on function private.ensure_default_workspace(uuid) from authenticated;
grant execute on function private.ensure_default_workspace(uuid) to service_role;

-- Reemplaza el bootstrap anterior para que, además de promover al usuario,
-- cree el espacio principal y asigne el contenido existente.
create or replace function private.bootstrap_admin_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  target_id uuid;
  default_workspace uuid;
begin
  select p.id
    into target_id
  from public.profiles p
  where lower(p.email) = lower(target_email)
  limit 1;

  if target_id is null then
    raise exception 'No existe un perfil para el correo indicado';
  end if;

  update public.profiles
  set role = 'admin',
      account_status = 'active',
      full_name = coalesce(nullif(full_name, ''), 'Administrador AG'),
      updated_at = now()
  where id = target_id;

  default_workspace := private.ensure_default_workspace(target_id);

  return target_id;
end;
$$;

revoke all on function private.bootstrap_admin_by_email(text) from public;
revoke all on function private.bootstrap_admin_by_email(text) from anon;
revoke all on function private.bootstrap_admin_by_email(text) from authenticated;
grant execute on function private.bootstrap_admin_by_email(text) to service_role;

commit;
