-- Aplicar mediante migración auditada en el Supabase compartido de compas-one.
-- Tabla exclusiva de throttling; no contiene correos ni contraseñas en claro.
create table if not exists public.ag_auth_email_rate_limits (
  rate_key text primary key,
  created_at timestamptz not null default now()
);
alter table public.ag_auth_email_rate_limits enable row level security;
revoke all privileges on table public.ag_auth_email_rate_limits from public, anon, authenticated;
grant select, insert, delete on table public.ag_auth_email_rate_limits to service_role;
-- Tarea opcional de limpieza: DELETE FROM public.ag_auth_email_rate_limits WHERE created_at < now() - interval '30 days';
