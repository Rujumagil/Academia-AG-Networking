-- Academia AG · cambio obligatorio de contraseña en primer ingreso
-- Los alumnos creados con contraseña temporal pueden cambiarla al iniciar sesión.

alter table public.profiles
  add column if not exists must_change_password boolean not null default false;

alter table public.profiles
  add column if not exists password_changed_at timestamptz;

comment on column public.profiles.must_change_password is
  'Si es true, la interfaz obliga al usuario a definir una contraseña personal antes de continuar.';

comment on column public.profiles.password_changed_at is
  'Fecha del último cambio de contraseña confirmado por el flujo de primer ingreso.';

create or replace function public.complete_first_password_change()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  update public.profiles
     set must_change_password = false,
         password_changed_at = now()
   where id = auth.uid();
end;
$$;

revoke all on function public.complete_first_password_change() from public;
grant execute on function public.complete_first_password_change() to authenticated;
