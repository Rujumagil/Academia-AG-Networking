-- ============================================================
-- ACADEMIA AG — PARCHE DE SEGURIDAD Y PERMISOS
-- Versión productiva: no asigna un administrador por correo de forma automática.
-- El primer administrador se promueve después, de forma explícita, desde SQL Editor.
-- ============================================================

begin;

insert into public.profiles (id, email, full_name, role)
select id, email, coalesce(raw_user_meta_data ->> 'full_name', ''), 'student'
from auth.users
on conflict (id) do update set email = excluded.email;

revoke update on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

grant select on table public.courses, public.modules, public.lessons, public.enrollments, public.lesson_progress, public.lesson_notes, public.resources to authenticated;
grant insert, update, delete on table public.courses, public.modules, public.lessons, public.enrollments, public.lesson_progress, public.lesson_notes, public.resources to authenticated;

create or replace function public.admin_set_user_role(target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then raise exception 'No autorizado'; end if;
  if new_role not in ('student', 'instructor', 'admin') then raise exception 'Rol inválido'; end if;
  update public.profiles set role = new_role where id = target_user;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

create or replace function private.bootstrap_admin_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare target_id uuid;
begin
  select p.id into target_id from public.profiles p where lower(p.email) = lower(target_email) limit 1;
  if target_id is null then raise exception 'No existe un perfil para el correo indicado'; end if;
  update public.profiles
  set role = 'admin', account_status = 'active', full_name = coalesce(nullif(full_name, ''), 'Administrador AG'), updated_at = now()
  where id = target_id;
  return target_id;
end;
$$;

revoke all on function private.bootstrap_admin_by_email(text) from public;
revoke all on function private.bootstrap_admin_by_email(text) from anon;
revoke all on function private.bootstrap_admin_by_email(text) from authenticated;
grant execute on function private.bootstrap_admin_by_email(text) to service_role;

commit;
