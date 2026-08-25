-- ============================================================
-- ACADEMIA AG BUSINESS NETWORKING · CERTIFICADOS PDF AUTOMÁTICOS
-- Fecha: 2026-08-25
-- Objetivo:
--   1) Guardar la fecha REAL de finalización del programa.
--   2) Congelar nombre del alumno y título del curso al emitir.
--   3) Excluir contenidos opcionales (lesson_kind = promo) del requisito.
--   4) Mantener folio verificable y compatibilidad con certificados existentes.
-- ============================================================

begin;

alter table public.certificates
  add column if not exists completed_at timestamptz,
  add column if not exists student_name_snapshot text,
  add column if not exists course_title_snapshot text,
  add column if not exists pdf_version text not null default 'ag-certificate-v91';

-- Congela los datos visibles de certificados que ya existían.
update public.certificates c
set student_name_snapshot = coalesce(nullif(c.student_name_snapshot,''), nullif(p.full_name,''), 'Alumno de Academia AG'),
    course_title_snapshot = coalesce(nullif(c.course_title_snapshot,''), co.title)
from public.profiles p, public.courses co
where p.id = c.user_id
  and co.id = c.course_id
  and (c.student_name_snapshot is null or c.course_title_snapshot is null);

-- Para certificados previos intenta recuperar la última fecha de finalización
-- de una lección obligatoria. Si no existe historial suficiente conserva issued_at.
update public.certificates c
set completed_at = coalesce(
  (
    select max(lp.completed_at)
    from public.modules m
    join public.lessons l on l.module_id = m.id
    join public.lesson_progress lp on lp.lesson_id = l.id
    where m.course_id = c.course_id
      and lp.user_id = c.user_id
      and lp.completed = true
      and coalesce(to_jsonb(l)->>'lesson_kind','') <> 'promo'
  ),
  c.issued_at
)
where c.completed_at is null;

create index if not exists certificates_completed_at_idx
  on public.certificates(completed_at desc);

-- Emisión segura. Las evaluaciones especializadas del Utah Driver Success Program
-- son opcionales y están modeladas como contenidos promo; no bloquean la constancia.
-- Las evaluaciones genéricas publicadas en public.assessments sí conservan su carácter
-- obligatorio porque el sistema académico ya las trata como requisito formal.
create or replace function public.issue_my_certificate(target_course uuid)
returns public.certificates
language plpgsql
security definer
set search_path = ''
as $$
declare
  lesson_total integer;
  lesson_done integer;
  assessment_total integer;
  assessment_passed integer;
  lesson_completed_at timestamptz;
  assessment_completed_at timestamptz;
  final_completed_at timestamptz;
  cert public.certificates%rowtype;
  code text;
  profile_name text;
  course_name text;
  course_slug text;
begin
  if auth.uid() is null then
    raise exception 'Autenticación requerida';
  end if;
  if not (select private.is_active_user()) then
    raise exception 'Cuenta no activa';
  end if;
  if not (select private.can_view_course(target_course)) then
    raise exception 'No tienes acceso a este curso';
  end if;

  select coalesce(nullif(trim(p.full_name),''), split_part(coalesce(p.email,''),'@',1), 'Alumno de Academia AG')
    into profile_name
  from public.profiles p
  where p.id = auth.uid();

  select c.title, c.slug
    into course_name, course_slug
  from public.courses c
  where c.id = target_course;

  if course_name is null then
    raise exception 'Curso no encontrado';
  end if;

  select count(*)::integer
    into lesson_total
  from public.lessons l
  join public.modules m on m.id = l.module_id
  where m.course_id = target_course
    and coalesce(to_jsonb(l)->>'lesson_kind','') <> 'promo';

  if lesson_total = 0 then
    raise exception 'Este curso todavía no tiene lecciones obligatorias';
  end if;

  select count(*)::integer, max(lp.completed_at)
    into lesson_done, lesson_completed_at
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.lesson_progress lp
    on lp.lesson_id = l.id
   and lp.user_id = auth.uid()
   and lp.completed = true
  where m.course_id = target_course
    and coalesce(to_jsonb(l)->>'lesson_kind','') <> 'promo';

  if lesson_done < lesson_total then
    raise exception 'Aún faltan lecciones obligatorias por completar';
  end if;

  select count(*)::integer
    into assessment_total
  from public.assessments a
  where a.course_id = target_course
    and a.status = 'published';

  select count(*)::integer
    into assessment_passed
  from public.assessments a
  where a.course_id = target_course
    and a.status = 'published'
    and exists (
      select 1
      from public.assessment_attempts at
      where at.assessment_id = a.id
        and at.user_id = auth.uid()
        and at.passed = true
    );

  if assessment_passed < assessment_total then
    raise exception 'Aún faltan evaluaciones obligatorias por aprobar';
  end if;

  select max(at.submitted_at)
    into assessment_completed_at
  from public.assessment_attempts at
  join public.assessments a on a.id = at.assessment_id
  where a.course_id = target_course
    and a.status = 'published'
    and at.user_id = auth.uid()
    and at.passed = true;

  final_completed_at := greatest(
    coalesce(lesson_completed_at, '-infinity'::timestamptz),
    coalesce(assessment_completed_at, '-infinity'::timestamptz)
  );
  if final_completed_at = '-infinity'::timestamptz then
    final_completed_at := now();
  end if;

  select * into cert
  from public.certificates
  where user_id = auth.uid()
    and course_id = target_course;

  if found then
    update public.certificates
    set completed_at = coalesce(completed_at, final_completed_at),
        student_name_snapshot = coalesce(nullif(student_name_snapshot,''), profile_name),
        course_title_snapshot = coalesce(nullif(course_title_snapshot,''), course_name),
        pdf_version = 'ag-certificate-v91'
    where id = cert.id
    returning * into cert;

    update public.enrollments
    set status = 'completed',
        completed_at = coalesce(completed_at, cert.completed_at)
    where user_id = auth.uid()
      and course_id = target_course
      and status in ('active','completed');

    return cert;
  end if;

  if target_course = '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid
     or lower(coalesce(course_slug,'')) like '%utah%driver%' then
    code := 'AG-UDSP-' || to_char(final_completed_at,'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  else
    code := 'AG-CERT-' || to_char(final_completed_at,'YYYY') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,10));
  end if;

  insert into public.certificates(
    user_id,
    course_id,
    credential_code,
    status,
    completed_at,
    student_name_snapshot,
    course_title_snapshot,
    pdf_version,
    metadata
  )
  values(
    auth.uid(),
    target_course,
    code,
    'valid',
    final_completed_at,
    profile_name,
    course_name,
    'ag-certificate-v91',
    jsonb_build_object(
      'lesson_count', lesson_total,
      'assessment_count', assessment_total,
      'completion_source', 'academic_progress'
    )
  )
  returning * into cert;

  update public.enrollments
  set status = 'completed',
      completed_at = coalesce(completed_at, final_completed_at)
  where user_id = auth.uid()
    and course_id = target_course
    and status in ('active','completed');

  -- Aviso interno. No bloquea la emisión si el módulo de notificaciones no estuviera disponible.
  begin
    insert into public.notifications(
      target_user,
      notification_type,
      title,
      message,
      href,
      created_at
    ) values (
      auth.uid(),
      'certificate',
      'Tu certificado ya está disponible',
      'Completaste ' || course_name || '. Ya puedes abrir y descargar tu certificado PDF.',
      '#certificate/' || target_course::text,
      now()
    );
  exception when undefined_table then
    null;
  end;

  return cert;
end;
$$;

create or replace function public.verify_certificate(target_code text)
returns table(
  credential_code text,
  status text,
  issued_at timestamptz,
  completed_at timestamptz,
  student_name text,
  course_title text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    c.credential_code,
    c.status,
    c.issued_at,
    coalesce(c.completed_at,c.issued_at),
    coalesce(nullif(c.student_name_snapshot,''),nullif(p.full_name,''),'Alumno de Academia AG'),
    coalesce(nullif(c.course_title_snapshot,''),co.title)
  from public.certificates c
  join public.profiles p on p.id = c.user_id
  join public.courses co on co.id = c.course_id
  where upper(c.credential_code) = upper(trim(target_code))
  limit 1;
$$;

revoke all on function public.issue_my_certificate(uuid) from public;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.issue_my_certificate(uuid) to authenticated;
grant execute on function public.verify_certificate(text) to anon, authenticated;

commit;
