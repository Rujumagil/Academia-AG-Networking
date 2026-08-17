-- ============================================================
-- ACADEMIA AG · PASO 23
-- EXÁMENES POR MÓDULO · UTAH DRIVER SUCCESS PROGRAM™
-- Reemplaza la experiencia de una pregunta por cada video por un
-- examen breve al terminar cada módulo. Reutiliza el banco de preguntas
-- ya creado en lesson_quizzes, sin exponer las respuestas correctas.
-- ============================================================

begin;

create table if not exists public.module_exam_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.modules(id) on delete cascade,
  answers jsonb not null default '{}'::jsonb,
  score integer not null default 0,
  total_questions integer not null default 0,
  percentage numeric(5,2) not null default 0,
  passed boolean not null default false,
  attempted_at timestamptz not null default now()
);

create index if not exists module_exam_attempts_user_module_idx
  on public.module_exam_attempts(user_id, module_id, attempted_at desc);

alter table public.module_exam_attempts enable row level security;
revoke all on public.module_exam_attempts from anon, authenticated;

-- Las microevaluaciones dejan de ser obligatorias a nivel de video.
update public.lesson_quizzes q
set required = false,
    updated_at = now()
from public.lessons l
join public.modules m on m.id = l.module_id
join public.courses c on c.id = m.course_id
where q.lesson_id = l.id
  and c.slug = 'utah-driver-success-program';

create or replace function public.get_module_exam(target_module uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  module_title text;
  course_slug text;
  question_payload jsonb := '[]'::jsonb;
  best_percentage numeric(5,2) := 0;
  already_passed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select m.title, c.slug
    into module_title, course_slug
  from public.modules m
  join public.courses c on c.id = m.course_id
  where m.id = target_module;

  if module_title is null then
    return null;
  end if;

  if course_slug <> 'utah-driver-success-program' then
    return null;
  end if;

  with ranked as (
    select
      q.id,
      q.question,
      q.options,
      l.position,
      row_number() over (
        partition by q.question
        order by l.position asc, q.id asc
      ) as rn
    from public.lesson_quizzes q
    join public.lessons l on l.id = q.lesson_id
    where l.module_id = target_module
  ), selected as (
    select id, question, options, position
    from ranked
    where rn = 1
    order by position asc, id asc
    limit 5
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'question', question,
        'options', options
      )
      order by position, id
    ),
    '[]'::jsonb
  )
  into question_payload
  from selected;

  select
    coalesce(max(a.percentage), 0),
    coalesce(bool_or(a.passed), false)
  into best_percentage, already_passed
  from public.module_exam_attempts a
  where a.user_id = auth.uid()
    and a.module_id = target_module;

  return jsonb_build_object(
    'module_id', target_module,
    'module_title', module_title,
    'questions', question_payload,
    'question_count', jsonb_array_length(question_payload),
    'pass_score', 80,
    'best_percentage', best_percentage,
    'passed', already_passed
  );
end;
$$;

create or replace function public.submit_module_exam(
  target_module uuid,
  submitted_answers jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quiz_record record;
  provided_answer text;
  score_value integer := 0;
  total_value integer := 0;
  percentage_value numeric(5,2) := 0;
  passed_value boolean := false;
  module_exists boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if jsonb_typeof(coalesce(submitted_answers, '{}'::jsonb)) <> 'object' then
    raise exception 'Formato de respuestas inválido.';
  end if;

  select exists(
    select 1
    from public.modules m
    join public.courses c on c.id = m.course_id
    where m.id = target_module
      and c.slug = 'utah-driver-success-program'
  ) into module_exists;

  if not module_exists then
    raise exception 'Módulo no encontrado.';
  end if;

  for quiz_record in
    with ranked as (
      select
        q.id,
        q.question,
        q.correct_key,
        l.position,
        row_number() over (
          partition by q.question
          order by l.position asc, q.id asc
        ) as rn
      from public.lesson_quizzes q
      join public.lessons l on l.id = q.lesson_id
      where l.module_id = target_module
    )
    select id, question, correct_key, position
    from ranked
    where rn = 1
    order by position asc, id asc
    limit 5
  loop
    total_value := total_value + 1;
    provided_answer := lower(trim(coalesce(submitted_answers ->> quiz_record.id::text, '')));

    if provided_answer <> ''
       and provided_answer = lower(trim(quiz_record.correct_key)) then
      score_value := score_value + 1;
    end if;
  end loop;

  if total_value = 0 then
    raise exception 'Este módulo todavía no tiene preguntas disponibles.';
  end if;

  percentage_value := round((score_value::numeric * 100.0) / total_value::numeric, 2);
  passed_value := percentage_value >= 80;

  insert into public.module_exam_attempts(
    user_id,
    module_id,
    answers,
    score,
    total_questions,
    percentage,
    passed,
    attempted_at
  ) values (
    auth.uid(),
    target_module,
    submitted_answers,
    score_value,
    total_value,
    percentage_value,
    passed_value,
    now()
  );

  return jsonb_build_object(
    'score', score_value,
    'total', total_value,
    'percentage', percentage_value,
    'passed', passed_value,
    'message', case
      when passed_value then '¡Módulo aprobado! Puedes continuar con la siguiente sección.'
      else 'Repasa los puntos principales del módulo y vuelve a intentarlo.'
    end
  );
end;
$$;

revoke all on function public.get_module_exam(uuid) from public;
revoke all on function public.submit_module_exam(uuid,jsonb) from public;
grant execute on function public.get_module_exam(uuid) to authenticated;
grant execute on function public.submit_module_exam(uuid,jsonb) to authenticated;

commit;
