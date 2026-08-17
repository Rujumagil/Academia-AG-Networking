-- ACADEMIA AG · BOOTSTRAP MANUAL DEL PRIMER ADMINISTRADOR
-- Ejecutar únicamente después de que el primer usuario se haya registrado.
-- Reemplaza el correo de ejemplo por el correo real del administrador.

select private.bootstrap_admin_by_email('CORREO_ADMIN@EJEMPLO.COM');

-- Verificación opcional:
select id, email, full_name, role, account_status
from public.profiles
where role = 'admin'
order by created_at asc;

select w.id, w.name, w.slug, wm.user_id, wm.role
from public.workspaces w
left join public.workspace_members wm on wm.workspace_id = w.id
where w.slug = 'ag-business-networking';
