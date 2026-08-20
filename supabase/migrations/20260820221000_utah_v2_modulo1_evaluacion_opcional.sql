-- ============================================================
-- ACADEMIA AG · UTAH DRIVER SUCCESS PROGRAM V2
-- EVALUACIÓN OPCIONAL · MÓDULO 1
-- Restaura el repaso de 10 preguntas usado antes de la reconstrucción V2.
-- No bloquea el avance del alumno y permite intentos ilimitados.
-- ============================================================

begin;

-- Historial de intentos por módulo. Se conserva separado de las evaluaciones
-- generales para que este repaso no altere requisitos de avance o certificado.
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

-- Banco original de 10 preguntas del Módulo 1, enlazado por lesson_code V2.
create temporary table _utah_v2_m1_questions (
  lesson_code text primary key,
  question text not null,
  options jsonb not null,
  correct_key text not null,
  explanation text not null
) on commit drop;

insert into _utah_v2_m1_questions(lesson_code, question, options, correct_key, explanation)
values
(
  'C1-01',
  '¿Qué necesita una persona residente de Utah para conducir legalmente en las vías públicas?',
  '[{"key":"a","text":"Únicamente una identificación con fotografía."},{"key":"b","text":"Una licencia válida de Utah, un Learner Permit o un permiso temporal válido."},{"key":"c","text":"El registro del vehículo, aunque no tenga licencia."},{"key":"d","text":"Una licencia vencida acompañada por un comprobante de domicilio."}]'::jsonb,
  'b',
  'Toda persona residente que conduzca en las vías públicas de Utah debe contar con una licencia válida de Utah, un Learner Permit o un permiso temporal válido, según corresponda.'
),
(
  'C1-02',
  'Una persona visita Utah temporalmente y cuenta con una licencia vigente emitida por otro país. ¿Puede conducir durante su visita?',
  '[{"key":"a","text":"No, debe solicitar inmediatamente una licencia de Utah."},{"key":"b","text":"Sí, puede conducir temporalmente si cumple con las condiciones aplicables."},{"key":"c","text":"Sí, pero únicamente durante 24 horas."},{"key":"d","text":"No, las licencias emitidas fuera de Estados Unidos nunca son válidas."}]'::jsonb,
  'b',
  'Una persona no residente con una licencia vigente emitida por otro estado o país puede conducir temporalmente en Utah si cumple con las condiciones aplicables.'
),
(
  'C1-03',
  '¿Cuál es la edad mínima para solicitar un Learner Permit en Utah?',
  '[{"key":"a","text":"14 años."},{"key":"b","text":"15 años."},{"key":"c","text":"16 años."},{"key":"d","text":"18 años."}]'::jsonb,
  'b',
  'La edad mínima para solicitar un Learner Permit en Utah es de 15 años.'
),
(
  'C1-04',
  '¿Cuál es el propósito principal del Learner Permit?',
  '[{"key":"a","text":"Permitir que una persona conduzca libremente sin supervisión."},{"key":"b","text":"Sustituir permanentemente una licencia Class D."},{"key":"c","text":"Permitir que una persona comience a practicar bajo las condiciones aplicables."},{"key":"d","text":"Servir como identificación oficial para cualquier trámite."}]'::jsonb,
  'c',
  'El Learner Permit permite que una persona aprenda y practique la conducción bajo las condiciones y supervisión que correspondan.'
),
(
  'C1-05',
  '¿Cuántas preguntas contiene el examen escrito inicial para solicitar un Learner Permit?',
  '[{"key":"a","text":"20 preguntas."},{"key":"b","text":"25 preguntas."},{"key":"c","text":"30 preguntas."},{"key":"d","text":"50 preguntas."}]'::jsonb,
  'd',
  'Para una persona que nunca ha tenido licencia, el examen escrito inicial es de 50 preguntas y se realiza a libro cerrado.'
),
(
  'C1-06',
  'Una persona de 16 o 17 años obtiene un Learner Permit. ¿Cuánto tiempo debe mantenerlo antes de solicitar una licencia?',
  '[{"key":"a","text":"No necesita esperar."},{"key":"b","text":"30 días."},{"key":"c","text":"90 días."},{"key":"d","text":"Al menos 6 meses."}]'::jsonb,
  'd',
  'Las personas de 15 a 17 años deben mantener el Learner Permit durante al menos seis meses antes de solicitar la licencia, además de cumplir los demás requisitos aplicables.'
),
(
  'C1-07',
  'Una persona de 19 años o más decide no completar un curso aprobado de educación vial. ¿Cuál es el periodo general durante el que debe mantener su Learner Permit?',
  '[{"key":"a","text":"No necesita esperar."},{"key":"b","text":"7 días."},{"key":"c","text":"90 días."},{"key":"d","text":"6 meses."}]'::jsonb,
  'c',
  'Para solicitantes de 19 años o más que no completan un curso de educación vial, el periodo general de posesión del Learner Permit es de 90 días antes de poder solicitar la licencia.'
),
(
  'C1-08',
  'Si una persona menor de 18 años practica con un Learner Permit, ¿qué debe recordar?',
  '[{"key":"a","text":"Puede manejar sola si conduce despacio."},{"key":"b","text":"Debe conducir únicamente con la supervisión correspondiente."},{"key":"c","text":"Puede manejar sola si ya aprobó el examen escrito."},{"key":"d","text":"No necesita llevar su Learner Permit durante la práctica."}]'::jsonb,
  'b',
  'Una persona menor de 18 años debe conducir con la supervisión correspondiente y llevar su Learner Permit mientras practica.'
),
(
  'C1-09',
  '¿Qué es una licencia Class D?',
  '[{"key":"a","text":"Una licencia común para conducir vehículos personales."},{"key":"b","text":"Una licencia exclusiva para conducir motocicletas."},{"key":"c","text":"Un permiso temporal para visitantes."},{"key":"d","text":"Una licencia obligatoria para camiones comerciales."}]'::jsonb,
  'a',
  'La Class D es la licencia regular más común para conducir vehículos no comerciales y no sustituye una autorización específica para motocicletas o vehículos comerciales.'
),
(
  'C1-10',
  '¿Quién recibe una licencia provisional en Utah?',
  '[{"key":"a","text":"Toda persona mayor de 65 años."},{"key":"b","text":"Toda persona que visita Utah temporalmente."},{"key":"c","text":"Una persona menor de 21 años que obtiene una licencia Class D."},{"key":"d","text":"Únicamente una persona menor de 16 años."}]'::jsonb,
  'c',
  'En Utah, una persona de 20 años o menos que obtiene una licencia Class D es considerada conductora provisional.'
);

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
join _utah_v2_m1_questions q on q.lesson_code = l.lesson_code
where l.module_id = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

-- El navegador recibe preguntas y opciones, pero nunca correct_key.
create or replace function public.get_module_exam(target_module uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  module_title text;
  course_id_value uuid;
  course_slug text;
  question_payload jsonb := '[]'::jsonb;
  best_percentage numeric(5,2) := 0;
  already_passed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select m.title, c.id, c.slug
    into module_title, course_id_value, course_slug
  from public.modules m
  join public.courses c on c.id = m.course_id
  where m.id = target_module;

  if module_title is null
     or course_slug <> 'utah-driver-success-program'
     or course_id_value <> '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid then
    return null;
  end if;

  if not private.can_view_course(course_id_value) then
    raise exception 'No tienes acceso a este curso.';
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
        'options', options,
        'position', position
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
    'optional', true,
    'unlimited_attempts', true,
    'best_percentage', best_percentage,
    'passed', already_passed
  );
end;
$$;

-- Calificación segura en Supabase. Después de enviar un intento sí se devuelve
-- retroalimentación completa para que el alumno pueda reforzar lo incorrecto.
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
  selected_text_value text;
  correct_text_value text;
  is_correct boolean;
  score_value integer := 0;
  total_value integer := 0;
  percentage_value numeric(5,2) := 0;
  passed_value boolean := false;
  course_id_value uuid;
  course_slug text;
  review_payload jsonb := '[]'::jsonb;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  if jsonb_typeof(coalesce(submitted_answers, '{}'::jsonb)) <> 'object' then
    raise exception 'Formato de respuestas inválido.';
  end if;

  select c.id, c.slug
    into course_id_value, course_slug
  from public.modules m
  join public.courses c on c.id = m.course_id
  where m.id = target_module;

  if course_id_value is null
     or course_slug <> 'utah-driver-success-program'
     or course_id_value <> '7c4d9f60-8b0a-4b7b-9f2c-2d5e1a8c4f01'::uuid then
    raise exception 'Módulo no encontrado.';
  end if;

  if not private.can_view_course(course_id_value) then
    raise exception 'No tienes acceso a este curso.';
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
    is_correct := provided_answer <> ''
      and provided_answer = lower(trim(quiz_record.correct_key));

    if is_correct then
      score_value := score_value + 1;
    end if;

    select option_item ->> 'text'
      into selected_text_value
    from jsonb_array_elements(quiz_record.options) option_item
    where lower(option_item ->> 'key') = provided_answer
    limit 1;

    select option_item ->> 'text'
      into correct_text_value
    from jsonb_array_elements(quiz_record.options) option_item
    where lower(option_item ->> 'key') = lower(trim(quiz_record.correct_key))
    limit 1;

    review_payload := review_payload || jsonb_build_array(
      jsonb_build_object(
        'question_id', quiz_record.id,
        'position', quiz_record.position,
        'question', quiz_record.question,
        'selected_key', provided_answer,
        'selected_text', coalesce(selected_text_value, ''),
        'correct_key', lower(trim(quiz_record.correct_key)),
        'correct_text', coalesce(correct_text_value, ''),
        'explanation', quiz_record.explanation,
        'correct', is_correct
      )
    );
  end loop;

  if total_value = 0 then
    raise exception 'Este módulo todavía no tiene preguntas disponibles.';
  end if;

  percentage_value := round((score_value::numeric * 100.0) / total_value::numeric, 2);
  passed_value := percentage_value >= 80;

  insert into public.module_exam_attempts(
    user_id, module_id, answers, score, total_questions, percentage, passed, attempted_at
  ) values (
    auth.uid(), target_module, submitted_answers, score_value, total_value,
    percentage_value, passed_value, now()
  );

  return jsonb_build_object(
    'score', score_value,
    'total', total_value,
    'percentage', percentage_value,
    'passed', passed_value,
    'optional', true,
    'unlimited_attempts', true,
    'review', review_payload,
    'message', case
      when percentage_value = 100 then '¡Excelente! Todas tus respuestas son correctas.'
      when passed_value then 'Muy bien. Alcanzaste el nivel recomendado de repaso.'
      else 'Repasa las respuestas marcadas y vuelve a intentarlo cuando quieras.'
    end
  );
end;
$$;

revoke all on function public.get_module_exam(uuid) from public, anon;
revoke all on function public.submit_module_exam(uuid,jsonb) from public, anon;
grant execute on function public.get_module_exam(uuid) to authenticated;
grant execute on function public.submit_module_exam(uuid,jsonb) to authenticated;

commit;

-- VERIFICACIÓN: debe regresar 10 preguntas y 10 opcionales.
select
  count(*) as preguntas_modulo_1,
  count(*) filter (where q.required = false) as preguntas_opcionales
from public.lesson_quizzes q
join public.lessons l on l.id = q.lesson_id
where l.module_id = '7c4d9f60-1001-4b7b-9f2c-2d5e1a8c4001'::uuid
  and l.lesson_code between 'C1-01' and 'C1-10';
