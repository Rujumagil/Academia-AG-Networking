alter table public.academy_module_exam_attempts enable row level security;

drop policy if exists academy_module_exam_attempts_own_read on public.academy_module_exam_attempts;
create policy academy_module_exam_attempts_own_read
on public.academy_module_exam_attempts
for select
to authenticated
using (user_id=auth.uid());

drop policy if exists academy_module_exam_attempts_manager_read on public.academy_module_exam_attempts;
create policy academy_module_exam_attempts_manager_read
on public.academy_module_exam_attempts
for select
to authenticated
using (
  exists(
    select 1
    from public.academy_modules m
    where m.id=module_id
      and public.academy_can_manage_course(m.course_id)
  )
);

grant select on public.academy_module_exam_attempts to authenticated;

update public.ecosystem_project_registry
set metadata=metadata || '{"academy_module_exam_attempts_read":"workspace_scoped"}'::jsonb,
    updated_at=now()
where project_key='ag-business-networking';
