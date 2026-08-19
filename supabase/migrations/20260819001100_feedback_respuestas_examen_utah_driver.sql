-- ============================================================
-- ACADEMIA AG · RETROALIMENTACIÓN DE EXÁMENES UTAH DRIVER
-- Muestra respuestas incorrectas SOLO después de enviar el examen.
-- No expone correct_key en get_module_exam().
-- ============================================================

begin;

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
  selected_text text;
  correct_text text;
  is_correct boolean;
  score_value integer := 0;
  total_value integer := 0;
  percentage_value numeric(5,2) := 0;
  passed_value boolean := false;
  module_exists boolean := false;
  review_payload jsonb := '[]'::jsonb;
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
        q.options,
        q.correct_key,
        q.explanation,
        l.position,
        row_number() over (
          partition by q.question
          order by l.position asc, q.id asc
        ) as rn
      from public.lesson_quizzes q
      join public.lessons l on l.id = q.lesson_id
      where l.module_id = target_module
    )
    select id, question, options, correct_key, explanation, position
    from ranked
    where rn = 1
    order by position asc, id asc
    limit 10
  loop
    total_value := total_value + 1;
    provided_answer := lower(trim(coalesce(submitted_answers ->> quiz_record.id::text, '')));
    is_correct := provided_answer <> '' and provided_answer = lower(trim(quiz_record.correct_key));

    if is_correct then
      score_value := score_value + 1;
    end if;

    selected_text := null;
    correct_text := null;

    select option_item ->> 'text'
      into selected_text
    from jsonb_array_elements(coalesce(quiz_record.options, '[]'::jsonb)) option_item
    where lower(trim(option_item ->> 'key')) = provided_answer
    limit 1;

    select option_item ->> 'text'
      into correct_text
    from jsonb_array_elements(coalesce(quiz_record.options, '[]'::jsonb)) option_item
    where lower(trim(option_item ->> 'key')) = lower(trim(quiz_record.correct_key))
    limit 1;

    review_payload := review_payload || jsonb_build_array(
      jsonb_build_object(
        'question_id', quiz_record.id,
        'position', quiz_record.position,
        'question', quiz_record.question,
        'selected_key', provided_answer,
        'selected_text', coalesce(selected_text, 'Sin respuesta'),
        'correct_key', lower(trim(quiz_record.correct_key)),
        'correct_text', coalesce(correct_text, ''),
        'correct', is_correct,
        'explanation', coalesce(quiz_record.explanation, '')
      )
    );
  end loop;

  if total_value = 0 then
    raise exception 'Este módulo todavía no tiene preguntas disponibles.';
  end if;

  percentage_value := round((score_value::numeric * 100.0) / total_value::numeric, 2);
  passed_value := percentage_value >= 80;

  insert into public.module_exam_attempts(
    user_id,module_id,answers,score,total_questions,percentage,passed,attempted_at
  ) values (
    auth.uid(),target_module,submitted_answers,score_value,total_value,percentage_value,passed_value,now()
  );

  return jsonb_build_object(
    'score', score_value,
    'total', total_value,
    'percentage', percentage_value,
    'passed', passed_value,
    'incorrect_count', total_value - score_value,
    'review', review_payload,
    'message', case
      when passed_value and score_value = total_value then '¡Excelente! Respondiste correctamente todas las preguntas.'
      when passed_value then '¡Módulo aprobado! Revisa las preguntas que fallaste para reforzar esos puntos.'
      else 'Revisa las preguntas que fallaste, refuerza esos puntos y vuelve a intentarlo.'
    end
  );
end;
$$;

revoke all on function public.submit_module_exam(uuid,jsonb) from public;
grant execute on function public.submit_module_exam(uuid,jsonb) to authenticated;

commit;
