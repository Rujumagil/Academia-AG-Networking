-- ============================================================
-- ACADEMIA AG — PARCHE DE SEGURIDAD Y PERMISOS
-- Ejecuta este archivo en Supabase > SQL Editor.
-- ============================================================

begin;

-- Crea perfiles faltantes de usuarios que ya existan en Auth.
insert into public.profiles (id, email, full_name, role)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', ''),
  'student'
from auth.users
on conflict (id) do update
set email = excluded.email;

-- Establece la cuenta principal como administradora.
update public.profiles
set role = 'admin',
    full_name = coalesce(nullif(full_name, ''), 'Administrador AG')
where email = 'TU_CORREO_ADMIN@EJEMPLO.COM';

-- Evita que un alumno pueda cambiar su propia columna role.
revoke update on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;
grant update (full_name, avatar_url) on table public.profiles to authenticated;

-- Permisos necesarios; RLS sigue determinando qué filas puede usar cada persona.
grant select on table
  public.courses,
  public.modules,
  public.lessons,
  public.enrollments,
  public.lesson_progress,
  public.lesson_notes,
  public.resources
to authenticated;

grant insert, update, delete on table
  public.courses,
  public.modules,
  public.lessons,
  public.enrollments,
  public.lesson_progress,
  public.lesson_notes,
  public.resources
to authenticated;

-- Función segura para que únicamente un administrador pueda cambiar roles.
create or replace function public.admin_set_user_role(
  target_user uuid,
  new_role text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not (select private.is_admin()) then
    raise exception 'No autorizado';
  end if;

  if new_role not in ('student', 'admin') then
    raise exception 'Rol inválido';
  end if;

  update public.profiles
  set role = new_role
  where id = target_user;
end;
$$;

revoke all on function public.admin_set_user_role(uuid, text) from public;
grant execute on function public.admin_set_user_role(uuid, text) to authenticated;

commit;
