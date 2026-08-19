-- ============================================================
-- ACADEMIA AG · VALIDACIÓN PRODUCTIVA DE CUESTIONARIOS
-- UTAH DRIVER SUCCESS PROGRAM™
-- Verifica 6 módulos × 10 preguntas definitivas = 60 preguntas.
-- Si algún banco está incompleto o mal formado, la migración falla.
-- ============================================================

do $$
declare
  target record;
  question_count integer;
  unique_question_count integer;
  malformed_count integer;
begin
  for target in
    select * from (values
      ('11111111-aaaa-4111-8111-111111111111'::uuid, 'Módulo 1 · Licencias, permisos y documentación'),
      ('11111111-bbbb-4111-8111-111111111111'::uuid, 'Módulo 2 · Salud, exámenes y preparación del vehículo'),
      ('11111111-cccc-4111-8111-111111111111'::uuid, 'Módulo 3 · Manejo básico'),
      ('11111111-dddd-4111-8111-111111111111'::uuid, 'Módulo 4 · Reglas del camino y señales'),
      ('11111111-eeee-4111-8111-111111111111'::uuid, 'Módulo 5 · Alcohol, drogas y retos al manejar'),
      ('11111111-ffff-4111-8111-111111111111'::uuid, 'Módulo 6 · Emergencias, compartir el camino y tu récord')
    ) as modules(module_id, module_label)
  loop
    -- El examen productivo toma las primeras 10 lecciones del módulo.
    select count(*), count(distinct q.question)
      into question_count, unique_question_count
    from public.lesson_quizzes q
    join public.lessons l on l.id = q.lesson_id
    where l.module_id = target.module_id
      and l.position between 1 and 10;

    if question_count <> 10 then
      raise exception '% debe tener 10 preguntas en posiciones 1–10; encontradas: %',
        target.module_label, question_count;
    end if;

    if unique_question_count <> 10 then
      raise exception '% debe tener 10 preguntas únicas; encontradas: %',
        target.module_label, unique_question_count;
    end if;

    select count(*)
      into malformed_count
    from public.lesson_quizzes q
    join public.lessons l on l.id = q.lesson_id
    where l.module_id = target.module_id
      and l.position between 1 and 10
      and (
        nullif(btrim(q.question), '') is null
        or jsonb_typeof(q.options) <> 'array'
        or jsonb_array_length(q.options) <> 4
        or lower(btrim(q.correct_key)) not in ('a','b','c','d')
        or not exists (
          select 1
          from jsonb_array_elements(q.options) option
          where lower(btrim(option->>'key')) = lower(btrim(q.correct_key))
        )
        or exists (
          select 1
          from jsonb_array_elements(q.options) option
          where nullif(btrim(option->>'key'), '') is null
             or nullif(btrim(option->>'text'), '') is null
        )
      );

    if malformed_count <> 0 then
      raise exception '% contiene % pregunta(s) con estructura inválida.',
        target.module_label, malformed_count;
    end if;
  end loop;

  -- Verifica el total definitivo utilizado por los seis exámenes.
  select count(*)
    into question_count
  from public.lesson_quizzes q
  join public.lessons l on l.id = q.lesson_id
  where l.module_id in (
    '11111111-aaaa-4111-8111-111111111111'::uuid,
    '11111111-bbbb-4111-8111-111111111111'::uuid,
    '11111111-cccc-4111-8111-111111111111'::uuid,
    '11111111-dddd-4111-8111-111111111111'::uuid,
    '11111111-eeee-4111-8111-111111111111'::uuid,
    '11111111-ffff-4111-8111-111111111111'::uuid
  )
  and l.position between 1 and 10;

  if question_count <> 60 then
    raise exception 'El banco definitivo debe contener 60 preguntas; encontradas: %', question_count;
  end if;

  raise notice 'Validación correcta: 60 preguntas definitivas, 10 por módulo, con 4 opciones válidas cada una.';
end;
$$;