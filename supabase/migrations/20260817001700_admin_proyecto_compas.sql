-- ============================================================
-- ACADEMIA AG · ADMINISTRADOR PRINCIPAL PROYECTO COMPÁS
-- Promueve de forma automática y segura el correo administrador
-- únicamente cuando la cuenta de Auth ya está confirmada.
-- No contiene contraseñas ni secretos.
-- ============================================================

begin;

create or replace function private.promote_ag_admin_if_confirmed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if lower(coalesce(new.email, '')) = 'proyectocompas.info@gmail.com'
     and new.email_confirmed_at is not null then

    update public.profiles
    set role = 'admin',
        account_status = 'active',
        full_name = coalesce(nullif(full_name, ''), 'Administrador AG'),
        updated_at = now()
    where id = new.id;

    perform private.ensure_default_workspace(new.id);
  end if;

  return new;
end;
$$;

revoke all on function private.promote_ag_admin_if_confirmed() from public;
revoke all on function private.promote_ag_admin_if_confirmed() from anon;
revoke all on function private.promote_ag_admin_if_confirmed() from authenticated;

-- El prefijo zz hace que, en INSERT, este trigger se ejecute después del
-- trigger on_auth_user_created que crea public.profiles.
drop trigger if exists zz_promote_ag_admin_after_signup on auth.users;
create trigger zz_promote_ag_admin_after_signup
after insert on auth.users
for each row execute function private.promote_ag_admin_if_confirmed();

drop trigger if exists zz_promote_ag_admin_after_confirmation on auth.users;
create trigger zz_promote_ag_admin_after_confirmation
after update of email_confirmed_at on auth.users
for each row
when (old.email_confirmed_at is distinct from new.email_confirmed_at)
execute function private.promote_ag_admin_if_confirmed();

-- Si la cuenta ya existiera y estuviera confirmada antes de esta migración,
-- completar también el bootstrap en este momento.
do $$
declare
  target_id uuid;
begin
  select u.id
    into target_id
  from auth.users u
  where lower(coalesce(u.email, '')) = 'proyectocompas.info@gmail.com'
    and u.email_confirmed_at is not null
  order by u.created_at asc
  limit 1;

  if target_id is not null then
    update public.profiles
    set role = 'admin',
        account_status = 'active',
        full_name = coalesce(nullif(full_name, ''), 'Administrador AG'),
        updated_at = now()
    where id = target_id;

    perform private.ensure_default_workspace(target_id);
  end if;
end $$;

commit;
