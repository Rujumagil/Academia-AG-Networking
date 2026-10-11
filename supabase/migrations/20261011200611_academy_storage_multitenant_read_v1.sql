drop policy if exists academy_digital_products_read on storage.objects;

create policy academy_digital_products_read
on storage.objects
for select
to authenticated
using (
  bucket_id='digital-products'
  and exists(
    select 1
    from public.academy_resources r
    where r.file_path=storage.objects.name
      and (
        public.is_platform_super_admin()
        or (
          r.course_id is not null
          and public.academy_can_read_course(r.course_id)
        )
        or (
          r.workspace_id is not null
          and public.academy_can_manage_workspace(r.workspace_id)
        )
        or (
          r.is_public
          and r.workspace_id is not null
          and public.academy_can_browse_workspace(r.workspace_id)
        )
      )
  )
);

update public.ecosystem_project_registry
set
  metadata=metadata || '{"academy_private_storage_rls":"workspace_scoped"}'::jsonb,
  updated_at=now()
where project_key='ag-business-networking';
