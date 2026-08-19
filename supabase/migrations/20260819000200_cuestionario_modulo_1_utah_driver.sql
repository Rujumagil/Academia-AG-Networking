-- ============================================================
-- ACADEMIA AG · CUESTIONARIO MÓDULO 1
-- UTAH DRIVER SUCCESS PROGRAM™
-- Preguntas proporcionadas por el equipo de AG Business Networking.
-- Las respuestas correctas se validan en servidor.
-- ============================================================

begin;

create temporary table _module1_questions (
  position integer primary key,
  question text not null,
  options jsonb not null,
  correct_key text not null,
  explanation text not null
) on commit drop;

insert into _module1_questions(position,question,options,correct_key,explanation) values
(
  1,
  '¿Qué necesita una persona residente de Utah para conducir legalmente en las vías públicas?',
  '[{"key":"a","text":"Únicamente una identificación con fotografía."},{"key":"b","text":"Una licencia válida de Utah, un Learner Permit o un permiso temporal válido."},{"key":"c","text":"El registro del vehículo, aunque no tenga licencia."},{"key":"d","text":"Una licencia vencida acompañada por un comprobante de domicilio."}]'::jsonb,
  'b',
  'Toda persona residente que conduzca en las vías públicas de Utah debe contar con una licencia válida de Utah, un Learner Permit o un permiso temporal válido, según corresponda.'
),
(
  2,
  'Una persona visita Utah temporalmente y cuenta con una licencia vigente emitida por otro país. ¿Puede conducir durante su visita?',
  '[{"key":"a","text":"No, debe solicitar inmediatamente una licencia de Utah."},{"key":"b","text":"Sí, puede conducir temporalmente si cumple con las condiciones aplicables."},{"key":"c","text":"Sí, pero únicamente durante 24 horas."},{"key":"d","text":"No, las licencias emitidas fuera de Estados Unidos nunca son válidas."}]'::jsonb,
  'b',
  'Una persona no residente con una licencia vigente emitida por otro estado o país puede conducir temporalmente en Utah si cumple con las condiciones aplicables.'
),
(
  3,
  '¿Cuál es la edad mínima para solicitar un Learner Permit en Utah?',
  '[{"key":"a","text":"14 años."},{"key":"b","text":"15 años."},{"key":"c","text":"16 años."},{"key":"d","text":"18 años."}]'::jsonb,
  'b',
  'La edad mínima para solicitar un Learner Permit en Utah es de 15 años.'
),
(
  4,
  '¿Cuál es el propósito principal del Learner Permit?',
  '[{"key":"a","text":"Permitir que una persona conduzca libremente sin supervisión."},{"key":"b","text":"Sustituir permanentemente una licencia Class D."},{"key":"c","text":"Permitir que una persona comience a practicar bajo las condiciones aplicables."},{"key":"d","text":"Servir como identificación oficial para cualquier trámite."}]'::jsonb,
  'c',
  'El Learner Permit permite que una persona aprenda y practique la conducción bajo las condiciones y supervisión que correspondan.'
),
(
  5,
  '¿Cuántas preguntas contiene el examen escrito inicial para solicitar un Learner Permit?',
  '[{"key":"a","text":"20 preguntas."},{"key":"b","text":"25 preguntas."},{"key":"c","text":"30 preguntas."},{"key":"d","text":"50 preguntas."}]'::jsonb,
  'd',
  'Para una persona que nunca ha tenido licencia, el examen escrito inicial es de 50 preguntas y se realiza a libro cerrado.'
),
(
  6,
  'Una persona de 16 o 17 años obtiene un Learner Permit. ¿Cuánto tiempo debe mantenerlo antes de solicitar una licencia?',
  '[{"key":"a","text":"No necesita esperar."},{"key":"b","text":"30 días."},{"key":"c","text":"90 días."},{"key":"d","text":"Al menos 6 meses."}]'::jsonb,
  'd',
  'Las personas de 15 a 17 años deben mantener el Learner Permit durante al menos seis meses antes de solicitar la licencia, además de cumplir los demás requisitos aplicables.'
),
(
  7,
  'Una persona de 19 años o más decide no completar un curso aprobado de educación vial. ¿Cuál es el periodo general durante el que debe mantener su Learner Permit?',
  '[{"key":"a","text":"No necesita esperar."},{"key":"b","text":"7 días."},{"key":"c","text":"90 días."},{"key":"d","text":"6 meses."}]'::jsonb,
  'c',
  'Para solicitantes de 19 años o más que no completan un curso de educación vial, el periodo general de posesión del Learner Permit es de 90 días antes de poder solicitar la licencia.'
),
(
  8,
  'Si una persona menor de 18 años practica con un Learner Permit, ¿qué debe recordar?',
  '[{"key":"a","text":"Puede manejar sola si conduce despacio."},{"key":"b","text":"Debe conducir únicamente con la supervisión correspondiente."},{"key":"c","text":"Puede manejar sola si ya aprobó el examen escrito."},{"key":"d","text":"No necesita llevar su Learner Permit durante la práctica."}]'::jsonb,
  'b',
  'Una persona menor de 18 años debe conducir con la supervisión correspondiente y llevar su Learner Permit mientras practica.'
),
(
  9,
  '¿Qué es una licencia Class D?',
  '[{"key":"a","text":"Una licencia común para conducir vehículos personales."},{"key":"b","text":"Una licencia exclusiva para conducir motocicletas."},{"key":"c","text":"Un permiso temporal para visitantes."},{"key":"d","text":"Una licencia obligatoria para camiones comerciales."}]'::jsonb,
  'a',
  'La Class D es la licencia regular más común para conducir vehículos no comerciales y no sustituye una autorización específica para motocicletas o vehículos comerciales.'
),
(
  10,
  '¿Quién recibe una licencia provisional en Utah?',
  '[{"key":"a","text":"Toda persona mayor de 65 años."},{"key":"b","text":"Toda persona que visita Utah temporalmente."},{"key":"c","text":"Una persona menor de 21 años que obtiene una licencia Class D."},{"key":"d","text":"Únicamente una persona menor de 16 años."}]'::jsonb,
  'c',
  'En Utah, una persona de 20 años o menos que obtiene una licencia Class D es considerada conductora provisional.'
);

-- Inserta o actualiza las 10 preguntas usando las primeras 10 lecciones del módulo 1.
insert into public.lesson_quizzes(
  lesson_id, question, options, correct_key, explanation, required, updated_at
)
select
  l.id,
  q.question,
  q.options,
  q.correct_key,
  q.explanation,
  false,
  now()
from public.lessons l
join public.modules m on m.id = l.module_id
join public.courses c on c.id = m.course_id
join _module1_questions q on q.position = l.position
where c.slug = 'utah-driver-success-program'
  and m.id = '11111111-aaaa-4111-8111-111111111111'::uuid
  and l.position between 1 and 10
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

-- Amplía el examen de módulo a un máximo de 10 preguntas.
-- Los demás módulos continúan mostrando las preguntas únicas que tengan disponibles.
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

  if module_title is null or course_slug <> 'utah-driver-success-program' then
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
    limit 10
  )
  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id', id,
        'question', question,
        'options', options
      ) order by position, id
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
    limit 10
  loop
    total_value := total_value + 1;
    provided_answer := lower(trim(coalesce(submitted_answers ->> quiz_record.id::text, '')));

    if provided_answer <> '' and provided_answer = lower(trim(quiz_record.correct_key)) then
      score_value := score_value + 1;
    end if;
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
