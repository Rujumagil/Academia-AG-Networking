
-- PASO 15 · CENTRO DE ACCESOS Y PRODUCTOS
create extension if not exists pgcrypto;

create table if not exists public.products(
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 name text not null, slug text not null unique, product_type text not null default 'bundle',
 description text, price numeric(12,2) not null default 0, currency text not null default 'MXN',
 status text not null default 'active', external_reference text not null unique, payment_url text,
 created_by uuid references auth.users(id), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table if not exists public.product_contents(
 id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
 content_type text not null, course_id uuid references public.courses(id) on delete cascade,
 resource_id uuid references public.resources(id) on delete cascade, event_title text, event_date timestamptz,
 created_at timestamptz not null default now()
);
create table if not exists public.student_access(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 product_id uuid not null references public.products(id) on delete cascade, status text not null default 'active',
 source text not null default 'manual', reference text, granted_by uuid references auth.users(id),
 granted_at timestamptz not null default now(), expires_at timestamptz, updated_at timestamptz not null default now(),
 unique(user_id,product_id)
);
create table if not exists public.resource_access(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 resource_id uuid not null references public.resources(id) on delete cascade, product_id uuid references public.products(id) on delete cascade,
 status text not null default 'active', granted_at timestamptz not null default now(), expires_at timestamptz,
 unique(user_id,resource_id,product_id)
);
create table if not exists public.access_history(
 id uuid primary key default gen_random_uuid(), access_id uuid references public.student_access(id) on delete set null,
 user_id uuid not null references auth.users(id) on delete cascade, product_id uuid not null references public.products(id) on delete cascade,
 action text not null, previous_status text, new_status text, reference text, notes text,
 performed_by uuid references auth.users(id), created_at timestamptz not null default now()
);
create table if not exists public.orders(
 id uuid primary key default gen_random_uuid(), workspace_id uuid not null references public.workspaces(id) on delete cascade,
 product_id uuid references public.products(id), user_id uuid references auth.users(id), provider text not null default 'manual',
 provider_order_id text, external_reference text, payer_email text, amount numeric(12,2), currency text default 'MXN',
 status text not null default 'pending', raw_payload jsonb, approved_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

alter table public.products enable row level security;
alter table public.product_contents enable row level security;
alter table public.student_access enable row level security;
alter table public.resource_access enable row level security;
alter table public.access_history enable row level security;
alter table public.orders enable row level security;

create or replace function public.is_academia_ag_admin() returns boolean language sql stable security definer set search_path=public as $$
 select exists(select 1 from public.profiles where id=auth.uid() and role='admin' and account_status='active');
$$;

drop policy if exists "admin products" on public.products;
create policy "admin products" on public.products for all to authenticated using(public.is_academia_ag_admin()) with check(public.is_academia_ag_admin());
drop policy if exists "admin product contents" on public.product_contents;
create policy "admin product contents" on public.product_contents for all to authenticated using(public.is_academia_ag_admin()) with check(public.is_academia_ag_admin());
drop policy if exists "admin student access" on public.student_access;
create policy "admin student access" on public.student_access for all to authenticated using(public.is_academia_ag_admin()) with check(public.is_academia_ag_admin());
drop policy if exists "own student access" on public.student_access;
create policy "own student access" on public.student_access for select to authenticated using(user_id=auth.uid());
drop policy if exists "admin resource access" on public.resource_access;
create policy "admin resource access" on public.resource_access for all to authenticated using(public.is_academia_ag_admin()) with check(public.is_academia_ag_admin());
drop policy if exists "own resource access" on public.resource_access;
create policy "own resource access" on public.resource_access for select to authenticated using(user_id=auth.uid());
drop policy if exists "admin access history" on public.access_history;
create policy "admin access history" on public.access_history for all to authenticated using(public.is_academia_ag_admin()) with check(public.is_academia_ag_admin());
drop policy if exists "admin orders" on public.orders;
create policy "admin orders" on public.orders for all to authenticated using(public.is_academia_ag_admin()) with check(public.is_academia_ag_admin());

create or replace function public.admin_grant_product_access(target_user uuid,target_product uuid,access_source text default 'manual',access_reference text default null,access_expires_at timestamptz default null)
returns uuid language plpgsql security definer set search_path=public as $$
declare aid uuid; row record;
begin
 if not public.is_academia_ag_admin() then raise exception 'Acceso denegado'; end if;
 insert into public.student_access(user_id,product_id,status,source,reference,granted_by,granted_at,expires_at,updated_at)
 values(target_user,target_product,'active',coalesce(access_source,'manual'),access_reference,auth.uid(),now(),access_expires_at,now())
 on conflict(user_id,product_id) do update set status='active',source=excluded.source,reference=excluded.reference,granted_by=auth.uid(),granted_at=now(),expires_at=excluded.expires_at,updated_at=now()
 returning id into aid;
 for row in select * from public.product_contents where product_id=target_product loop
  if row.content_type='course' then
   insert into public.enrollments(user_id,course_id,status,enrolled_at) values(target_user,row.course_id,'active',now())
   on conflict(user_id,course_id) do update set status='active',enrolled_at=now();
  elsif row.content_type='resource' then
   insert into public.resource_access(user_id,resource_id,product_id,status,granted_at,expires_at)
   values(target_user,row.resource_id,target_product,'active',now(),access_expires_at)
   on conflict(user_id,resource_id,product_id) do update set status='active',granted_at=now(),expires_at=excluded.expires_at;
  end if;
 end loop;
 insert into public.access_history(access_id,user_id,product_id,action,new_status,reference,performed_by)
 values(aid,target_user,target_product,'granted','active',access_reference,auth.uid());
 return aid;
end $$;

create or replace function public.admin_change_student_access_status(target_access uuid,new_status text)
returns void language plpgsql security definer set search_path=public as $$
declare a public.student_access%rowtype; row record; old text;
begin
 if not public.is_academia_ag_admin() then raise exception 'Acceso denegado'; end if;
 if new_status not in ('active','suspended','revoked','expired') then raise exception 'Estado de acceso inválido'; end if;
 select * into a from public.student_access where id=target_access; if not found then raise exception 'Acceso no encontrado'; end if;
 old:=a.status; update public.student_access set status=new_status,updated_at=now() where id=target_access;
 for row in select * from public.product_contents where product_id=a.product_id loop
  if row.content_type='course' then update public.enrollments set status=case when new_status='active' then 'active' else 'cancelled' end where user_id=a.user_id and course_id=row.course_id;
  elsif row.content_type='resource' then update public.resource_access set status=new_status where user_id=a.user_id and resource_id=row.resource_id and product_id=a.product_id;
  end if;
 end loop;
 insert into public.access_history(access_id,user_id,product_id,action,previous_status,new_status,performed_by)
 values(a.id,a.user_id,a.product_id,new_status,old,new_status,auth.uid());
end $$;

grant execute on function public.admin_grant_product_access(uuid,uuid,text,text,timestamptz) to authenticated;
grant execute on function public.admin_change_student_access_status(uuid,text) to authenticated;

grant select,insert,update,delete on public.products,public.product_contents,public.student_access,public.resource_access,public.access_history,public.orders to authenticated;

create index if not exists products_workspace_idx on public.products(workspace_id);
create index if not exists product_contents_product_idx on public.product_contents(product_id);
create index if not exists student_access_product_idx on public.student_access(product_id);
create index if not exists student_access_user_idx on public.student_access(user_id);
