create or replace function public.get_certificate_eligibility(target_course uuid)
returns table(
  total_lessons integer,
  completed_lessons integer,
  required_assessments integer,
  passed_assessments integer,
  eligible boolean
)
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
begin
  if uid is null then raise exception 'Autenticación requerida'; end if;

  if not exists(
    select 1 from public.academy_enrollments e
    where e.course_id=target_course
      and e.user_id=uid
      and e.status in ('active','completed')
      and (e.expires_at is null or e.expires_at>now())
  )
  and not public.academy_can_manage_course(target_course)
  then raise exception 'No tienes acceso a este curso'; end if;

  select count(*)::integer into total_lessons
  from public.academy_lessons l
  join public.academy_modules m on m.id=l.module_id
  where m.course_id=target_course
    and coalesce(l.lesson_kind,'lesson')<>'promo';

  select count(distinct lp.lesson_id)::integer into completed_lessons
  from public.academy_lesson_progress lp
  join public.academy_lessons l on l.id=lp.lesson_id
  join public.academy_modules m on m.id=l.module_id
  where m.course_id=target_course
    and coalesce(l.lesson_kind,'lesson')<>'promo'
    and lp.user_id=uid
    and lp.completed=true;

  select count(*)::integer into required_assessments
  from public.academy_assessments a
  where a.course_id=target_course and a.status='published';

  select count(*)::integer into passed_assessments
  from public.academy_assessments a
  where a.course_id=target_course
    and a.status='published'
    and exists(
      select 1 from public.academy_assessment_attempts aa
      where aa.assessment_id=a.id
        and aa.user_id=uid
        and aa.status='graded'
        and aa.passed=true
    );

  eligible:=total_lessons>0
    and completed_lessons>=total_lessons
    and passed_assessments>=required_assessments;
  return next;
end;
$$;

revoke all on function public.get_certificate_eligibility(uuid) from public;
grant execute on function public.get_certificate_eligibility(uuid) to authenticated;

create or replace function private.refresh_academy_course_completion(
  target_user uuid,
  target_course uuid
)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
declare
  c public.academy_courses%rowtype;
  e public.academy_enrollments%rowtype;
  cert public.academy_certificates%rowtype;
  total_lessons integer:=0;
  completed_lessons integer:=0;
  required_assessments integer:=0;
  passed_assessments integer:=0;
  is_eligible boolean:=false;
  display_name text;
  code text;
  code_prefix text;
  cert_created boolean:=false;
begin
  select * into c
  from public.academy_courses
  where id=target_course and status<>'archived';

  if c.id is null then
    return jsonb_build_object('eligible',false,'reason','course_unavailable');
  end if;

  select * into e
  from public.academy_enrollments
  where user_id=target_user
    and course_id=target_course
    and status in ('active','completed')
    and (expires_at is null or expires_at>now())
  limit 1;

  if e.id is null then
    return jsonb_build_object('eligible',false,'reason','no_active_enrollment');
  end if;

  select count(*)::integer into total_lessons
  from public.academy_lessons l
  join public.academy_modules m on m.id=l.module_id
  where m.course_id=target_course
    and coalesce(l.lesson_kind,'lesson')<>'promo';

  select count(distinct lp.lesson_id)::integer into completed_lessons
  from public.academy_lesson_progress lp
  join public.academy_lessons l on l.id=lp.lesson_id
  join public.academy_modules m on m.id=l.module_id
  where m.course_id=target_course
    and coalesce(l.lesson_kind,'lesson')<>'promo'
    and lp.user_id=target_user
    and lp.completed=true;

  select count(*)::integer into required_assessments
  from public.academy_assessments a
  where a.course_id=target_course and a.status='published';

  select count(*)::integer into passed_assessments
  from public.academy_assessments a
  where a.course_id=target_course
    and a.status='published'
    and exists(
      select 1 from public.academy_assessment_attempts aa
      where aa.assessment_id=a.id
        and aa.user_id=target_user
        and aa.status='graded'
        and aa.passed=true
    );

  is_eligible:=total_lessons>0
    and completed_lessons>=total_lessons
    and passed_assessments>=required_assessments;

  if not is_eligible then
    return jsonb_build_object(
      'eligible',false,
      'certificate_created',false,
      'total_lessons',total_lessons,
      'completed_lessons',completed_lessons,
      'required_assessments',required_assessments,
      'passed_assessments',passed_assessments
    );
  end if;

  perform pg_advisory_xact_lock(hashtext(target_user::text||':'||target_course::text));

  update public.academy_enrollments
  set status='completed',completed_at=coalesce(completed_at,now())
  where id=e.id;

  select * into cert
  from public.academy_certificates
  where user_id=target_user and course_id=target_course
  limit 1;

  if cert.id is null then
    select coalesce(
      nullif(trim(p.full_name),''),
      nullif(trim(p.email),''),
      'Alumno Academia AG'
    )
    into display_name
    from public.academy_profiles p
    where p.id=target_user;

    display_name:=coalesce(display_name,'Alumno Academia AG');

    code_prefix:=case
      when c.workspace_id='fa4411f8-65c6-4762-8302-50789998e5b7'::uuid
        then 'AG-'||to_char(now(),'YYYY')||'-'
      else 'CA-'||to_char(now(),'YYYY')||'-'
    end;

    loop
      code:=code_prefix||upper(substr(replace(gen_random_uuid()::text,'-',''),1,12));
      exit when not exists(
        select 1 from public.academy_certificates x
        where coalesce(x.credential_code,x.verification_code)=code
      );
    end loop;

    insert into public.academy_certificates(
      user_id,course_id,issued_at,verification_code,credential_code,recipient_name,
      requirements_snapshot,status,metadata,revoked_at,updated_at
    )
    values(
      target_user,target_course,now(),code,code,display_name,
      jsonb_build_object(
        'required_lessons',total_lessons,
        'completed_lessons',completed_lessons,
        'required_assessments',required_assessments,
        'passed_assessments',passed_assessments,
        'optional_module_exams_required',false,
        'issued_under','academy-auto-completion-v1'
      ),
      'valid',
      jsonb_build_object(
        'auto_issued',true,
        'workspace_id',c.workspace_id,
        'completion_source','lesson_and_assessment_requirements'
      ),
      null,now()
    )
    returning * into cert;

    cert_created:=true;
  end if;

  if cert.revoked_at is null then
    insert into public.academy_certificate_public_registry(
      certificate_id,verification_code,recipient_name,course_title,issued_at,status,updated_at
    )
    values(
      cert.id,coalesce(cert.credential_code,cert.verification_code),
      coalesce(cert.recipient_name,'Alumno Academia AG'),c.title,cert.issued_at,'valid',now()
    )
    on conflict(certificate_id) do update
    set verification_code=excluded.verification_code,
        recipient_name=excluded.recipient_name,
        course_title=excluded.course_title,
        issued_at=excluded.issued_at,
        status='valid',
        updated_at=now();

    insert into public.academy_notifications(
      user_id,notification_type,title,body,target_path,entity_type,entity_id,dedupe_key,
      target_user,message,href,created_at
    )
    values(
      target_user,'certificate','¡Curso completado!',
      'Completaste '||c.title||'. Tu certificado ya está disponible.',
      'certificate/'||target_course::text,'certificate',cert.id,
      'certificate-issued:'||target_course::text,target_user,
      'Completaste '||c.title||'. Tu certificado ya está disponible.',
      '#certificate/'||target_course::text,now()
    )
    on conflict(user_id,dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'eligible',true,
    'certificate_created',cert_created,
    'certificate_id',cert.id,
    'credential_code',coalesce(cert.credential_code,cert.verification_code),
    'enrollment_status','completed',
    'total_lessons',total_lessons,
    'completed_lessons',completed_lessons,
    'required_assessments',required_assessments,
    'passed_assessments',passed_assessments
  );
end;
$$;

revoke all on function private.refresh_academy_course_completion(uuid,uuid) from public,anon,authenticated;

create or replace function public.refresh_my_academy_completion(target_course uuid)
returns jsonb
language plpgsql
security definer
set search_path=''
as $$
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;
  if not exists(
    select 1 from public.academy_enrollments e
    where e.user_id=auth.uid()
      and e.course_id=target_course
      and e.status in ('active','completed')
  ) then raise exception 'No tienes acceso a este curso'; end if;
  return private.refresh_academy_course_completion(auth.uid(),target_course);
end;
$$;

revoke all on function public.refresh_my_academy_completion(uuid) from public;
grant execute on function public.refresh_my_academy_completion(uuid) to authenticated;

create or replace function public.issue_academy_certificate(target_course uuid)
returns table(
  certificate_id uuid,
  verification_code text,
  recipient_name text,
  course_title text,
  issued_at timestamptz
)
language plpgsql
security definer
set search_path=''
as $$
declare
  uid uuid:=auth.uid();
  c public.academy_courses%rowtype;
  cert public.academy_certificates%rowtype;
  result jsonb;
begin
  if uid is null then raise exception 'Autenticación requerida'; end if;

  select * into c from public.academy_courses
  where id=target_course and status<>'archived';
  if c.id is null then raise exception 'Curso no disponible'; end if;

  result:=private.refresh_academy_course_completion(uid,target_course);
  if coalesce((result->>'eligible')::boolean,false)=false then
    raise exception 'Aún no cumples los requisitos del certificado';
  end if;

  select * into cert
  from public.academy_certificates
  where user_id=uid and course_id=target_course and revoked_at is null
  limit 1;

  if cert.id is null then raise exception 'No fue posible emitir el certificado'; end if;

  return query
  select cert.id,coalesce(cert.credential_code,cert.verification_code),
         cert.recipient_name,c.title,cert.issued_at;
end;
$$;

revoke all on function public.issue_academy_certificate(uuid) from public;
grant execute on function public.issue_academy_certificate(uuid) to authenticated;

create or replace function public.issue_my_certificate(target_course uuid)
returns public.academy_certificates
language plpgsql
security definer
set search_path=''
as $$
declare
  cert public.academy_certificates%rowtype;
  result jsonb;
begin
  if auth.uid() is null then raise exception 'Autenticación requerida'; end if;

  result:=private.refresh_academy_course_completion(auth.uid(),target_course);
  if coalesce((result->>'eligible')::boolean,false)=false then
    raise exception 'Aún no cumples los requisitos del certificado';
  end if;

  select * into cert
  from public.academy_certificates
  where user_id=auth.uid() and course_id=target_course and revoked_at is null
  limit 1;

  return cert;
end;
$$;

revoke all on function public.issue_my_certificate(uuid) from public;
grant execute on function public.issue_my_certificate(uuid) to authenticated;

create or replace function private.academy_progress_completion_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_course uuid;
begin
  select m.course_id into v_course
  from public.academy_lessons l
  join public.academy_modules m on m.id=l.module_id
  where l.id=new.lesson_id;

  if v_course is not null then
    perform private.refresh_academy_course_completion(new.user_id,v_course);
  end if;
  return new;
end;
$$;

drop trigger if exists academy_progress_auto_completion_insert on public.academy_lesson_progress;
create trigger academy_progress_auto_completion_insert
after insert on public.academy_lesson_progress
for each row when (new.completed=true)
execute function private.academy_progress_completion_trigger();

drop trigger if exists academy_progress_auto_completion_update on public.academy_lesson_progress;
create trigger academy_progress_auto_completion_update
after update of completed on public.academy_lesson_progress
for each row when (new.completed=true and old.completed is distinct from true)
execute function private.academy_progress_completion_trigger();

create or replace function private.academy_assessment_completion_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
declare v_course uuid;
begin
  select a.course_id into v_course
  from public.academy_assessments a
  where a.id=new.assessment_id;

  if v_course is not null then
    perform private.refresh_academy_course_completion(new.user_id,v_course);
  end if;
  return new;
end;
$$;

drop trigger if exists academy_assessment_auto_completion_insert on public.academy_assessment_attempts;
create trigger academy_assessment_auto_completion_insert
after insert on public.academy_assessment_attempts
for each row when (new.status='graded' and new.passed=true)
execute function private.academy_assessment_completion_trigger();

drop trigger if exists academy_assessment_auto_completion_update on public.academy_assessment_attempts;
create trigger academy_assessment_auto_completion_update
after update of status,passed on public.academy_assessment_attempts
for each row
when (
  new.status='graded' and new.passed=true
  and (old.status is distinct from 'graded' or old.passed is distinct from true)
)
execute function private.academy_assessment_completion_trigger();

create or replace function private.academy_enrollment_completion_trigger()
returns trigger
language plpgsql
security definer
set search_path=''
as $$
begin
  perform private.refresh_academy_course_completion(new.user_id,new.course_id);
  return new;
end;
$$;

drop trigger if exists academy_enrollment_auto_completion_insert on public.academy_enrollments;
create trigger academy_enrollment_auto_completion_insert
after insert on public.academy_enrollments
for each row when (new.status='active')
execute function private.academy_enrollment_completion_trigger();

drop trigger if exists academy_enrollment_auto_completion_reactivate on public.academy_enrollments;
create trigger academy_enrollment_auto_completion_reactivate
after update of status on public.academy_enrollments
for each row when (new.status='active' and old.status is distinct from 'active')
execute function private.academy_enrollment_completion_trigger();

update public.ecosystem_project_registry
set
  next_action='Validar finalización automática y emisión de certificado verificable en Academia AG.',
  metadata=metadata || '{
    "academy_auto_completion":"active",
    "academy_auto_certificate":"active",
    "certificate_optional_promo_lessons":true,
    "certificate_optional_module_exams":true
  }'::jsonb,
  updated_at=now()
where project_key='ag-business-networking';
