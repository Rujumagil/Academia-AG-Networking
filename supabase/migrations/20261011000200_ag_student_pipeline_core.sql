-- AG Business Networking · Pipeline de alumnos en Supabase maestro
-- Fecha: 2026-10-11
-- Mantiene el teléfono en el perfil académico y expone una vista RPC del progreso
-- del workspace oficial de AG.

alter table public.academy_profiles
  add column if not exists phone text;

create index if not exists academy_profiles_email_lower_idx
  on public.academy_profiles(lower(email))
  where email is not null;

create or replace function public.ag_academy_student_pipeline()
returns table (
  user_id uuid,
  full_name text,
  email text,
  phone text,
  course_id uuid,
  course_title text,
  enrollment_status text,
  enrolled_at timestamptz,
  progress_percent integer,
  completed_lessons integer,
  total_lessons integer,
  current_module_position integer,
  current_module_title text,
  started boolean,
  course_completed boolean,
  certificate_issued boolean,
  certificate_code text,
  certificate_issued_at timestamptz,
  pipeline_stage text
)
language sql
stable
security definer
set search_path=''
as $$
  with base as (
    select
      e.user_id,
      ap.full_name,
      ap.email,
      coalesce(
        nullif(btrim(ap.phone),''),
        nullif(btrim(p.phone),''),
        (
          select nullif(btrim(cand.phone),'')
          from public.ag_crm_candidates cand
          where cand.phone is not null
            and lower(coalesce(cand.email,''))=lower(coalesce(ap.email,''))
          order by cand.updated_at desc nulls last, cand.created_at desc
          limit 1
        )
      ) as phone,
      e.course_id,
      c.title as course_title,
      e.status as enrollment_status,
      e.enrolled_at,
      e.completed_at,
      (
        select count(*)::int
        from public.academy_lessons l
        join public.academy_modules m on m.id=l.module_id
        where m.course_id=e.course_id
      ) as total_lessons,
      (
        select count(*)::int
        from public.academy_lessons l
        join public.academy_modules m on m.id=l.module_id
        join public.academy_lesson_progress lp
          on lp.lesson_id=l.id
         and lp.user_id=e.user_id
         and lp.completed=true
        where m.course_id=e.course_id
      ) as completed_lessons,
      exists(
        select 1
        from public.academy_lessons l
        join public.academy_modules m on m.id=l.module_id
        join public.academy_lesson_progress lp
          on lp.lesson_id=l.id
         and lp.user_id=e.user_id
        where m.course_id=e.course_id
          and (lp.completed=true or coalesce(lp.progress_seconds,0)>0)
      ) as started,
      (
        select m.position
        from public.academy_modules m
        where m.course_id=e.course_id
          and exists (
            select 1
            from public.academy_lessons l
            where l.module_id=m.id
              and not exists (
                select 1
                from public.academy_lesson_progress lp
                where lp.user_id=e.user_id
                  and lp.lesson_id=l.id
                  and lp.completed=true
              )
          )
        order by m.position
        limit 1
      ) as current_module_position,
      (
        select m.title
        from public.academy_modules m
        where m.course_id=e.course_id
          and exists (
            select 1
            from public.academy_lessons l
            where l.module_id=m.id
              and not exists (
                select 1
                from public.academy_lesson_progress lp
                where lp.user_id=e.user_id
                  and lp.lesson_id=l.id
                  and lp.completed=true
              )
          )
        order by m.position
        limit 1
      ) as current_module_title,
      (
        select cert.verification_code
        from public.academy_certificates cert
        where cert.user_id=e.user_id
          and cert.course_id=e.course_id
          and cert.revoked_at is null
        order by cert.issued_at desc
        limit 1
      ) as certificate_code,
      (
        select cert.issued_at
        from public.academy_certificates cert
        where cert.user_id=e.user_id
          and cert.course_id=e.course_id
          and cert.revoked_at is null
        order by cert.issued_at desc
        limit 1
      ) as certificate_issued_at
    from public.academy_enrollments e
    join public.academy_courses c on c.id=e.course_id
    left join public.academy_profiles ap on ap.id=e.user_id
    left join public.profiles p on p.id=e.user_id
    where c.workspace_id='fa4411f8-65c6-4762-8302-50789998e5b7'
      and e.status not in ('cancelled','expired')
  )
  select
    b.user_id,
    coalesce(nullif(b.full_name,''),b.email,'Alumno') as full_name,
    b.email,
    b.phone,
    b.course_id,
    b.course_title,
    b.enrollment_status,
    b.enrolled_at,
    case
      when b.total_lessons>0 then least(100,round((b.completed_lessons::numeric/b.total_lessons::numeric)*100)::int)
      when b.enrollment_status='completed' then 100
      else 0
    end as progress_percent,
    b.completed_lessons,
    b.total_lessons,
    b.current_module_position,
    b.current_module_title,
    b.started,
    (b.enrollment_status='completed' or (b.total_lessons>0 and b.completed_lessons>=b.total_lessons)) as course_completed,
    (b.certificate_code is not null) as certificate_issued,
    b.certificate_code,
    b.certificate_issued_at,
    case
      when b.certificate_code is not null then 'certified'
      when b.enrollment_status='completed' or (b.total_lessons>0 and b.completed_lessons>=b.total_lessons) then 'completed'
      when b.started then 'in_progress'
      else 'not_started'
    end as pipeline_stage
  from base b
  where (select public.can_view_ag_crm())
  order by b.enrolled_at desc;
$$;

revoke all on function public.ag_academy_student_pipeline() from public;
grant execute on function public.ag_academy_student_pipeline() to authenticated;
