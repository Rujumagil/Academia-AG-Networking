-- ============================================================
-- ACADEMIA AG BUSINESS NETWORKING · WEB PUSH
-- Suscripciones por dispositivo, configuración VAPID segura e
-- idempotencia de despachos. No contiene secretos predefinidos.
-- ============================================================

begin;
create extension if not exists pgcrypto;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  expiration_time bigint,
  user_agent text,
  platform text,
  enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions(user_id, enabled);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select_own on public.push_subscriptions;
create policy push_subscriptions_select_own
on public.push_subscriptions
for select to authenticated
using (user_id = auth.uid());

drop policy if exists push_subscriptions_delete_own on public.push_subscriptions;
create policy push_subscriptions_delete_own
on public.push_subscriptions
for delete to authenticated
using (user_id = auth.uid());

-- El alta se hace mediante RPC SECURITY DEFINER para que un mismo dispositivo
-- pueda reasignarse de forma segura cuando cambia de usuario.
create or replace function public.save_my_push_subscription(
  target_endpoint text,
  target_p256dh text,
  target_auth text,
  target_expiration_time bigint default null,
  target_user_agent text default null,
  target_platform text default null
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  subscription_id uuid;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if nullif(trim(target_endpoint),'') is null then raise exception 'Endpoint requerido'; end if;
  if nullif(trim(target_p256dh),'') is null then raise exception 'Clave p256dh requerida'; end if;
  if nullif(trim(target_auth),'') is null then raise exception 'Clave auth requerida'; end if;

  insert into public.push_subscriptions(
    user_id, endpoint, p256dh, auth, expiration_time, user_agent, platform,
    enabled, updated_at, last_seen_at
  )
  values(
    auth.uid(), trim(target_endpoint), trim(target_p256dh), trim(target_auth),
    target_expiration_time, nullif(trim(target_user_agent),''),
    nullif(trim(target_platform),''), true, now(), now()
  )
  on conflict(endpoint) do update set
    user_id = auth.uid(),
    p256dh = excluded.p256dh,
    auth = excluded.auth,
    expiration_time = excluded.expiration_time,
    user_agent = excluded.user_agent,
    platform = excluded.platform,
    enabled = true,
    updated_at = now(),
    last_seen_at = now()
  returning id into subscription_id;

  return subscription_id;
end;
$$;

create or replace function public.disable_my_push_subscription(target_endpoint text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  update public.push_subscriptions
  set enabled=false, updated_at=now()
  where endpoint=target_endpoint and user_id=auth.uid();
end;
$$;

revoke all on function public.save_my_push_subscription(text,text,text,bigint,text,text) from public;
revoke all on function public.disable_my_push_subscription(text) from public;
grant execute on function public.save_my_push_subscription(text,text,text,bigint,text,text) to authenticated;
grant execute on function public.disable_my_push_subscription(text) to authenticated;

-- Las claves VAPID se crean dentro de la Edge Function en su primer uso.
-- Esta tabla está expuesta por PostgREST pero sin políticas para usuarios;
-- sólo service_role puede leerla/escribirla al saltar RLS.
create table if not exists public.push_server_config (
  id smallint primary key default 1 check (id=1),
  vapid_public_key text not null,
  vapid_private_key text not null,
  vapid_subject text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_server_config enable row level security;
revoke all on public.push_server_config from anon, authenticated;

-- Evita que reintentos de la interfaz generen notificaciones push duplicadas.
create table if not exists public.push_dispatch_log (
  event_key text primary key,
  status text not null default 'processing' check (status in ('processing','done','failed')),
  recipient_count integer not null default 0,
  success_count integer not null default 0,
  failure_count integer not null default 0,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.push_dispatch_log enable row level security;
revoke all on public.push_dispatch_log from anon, authenticated;

commit;
