-- ============================================================
-- ACADEMIA AG · PASO 20
-- MICROEVALUACIONES POR VIDEO · UTAH DRIVER SUCCESS PROGRAM™
-- Una evaluación breve por lección/video, con corrección en servidor.
-- Las preguntas se basan en el temario académico de cada módulo.
-- ============================================================

begin;

create table if not exists public.lesson_quizzes (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null unique references public.lessons(id) on delete cascade,
  question text not null,
  options jsonb not null check (jsonb_typeof(options) = 'array'),
  correct_key text not null,
  explanation text not null default '',
  required boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.lesson_quiz_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_id uuid not null references public.lesson_quizzes(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  answer_key text not null,
  correct boolean not null default false,
  attempt_count integer not null default 1,
  attempted_at timestamptz not null default now(),
  unique(user_id, quiz_id)
);

alter table public.lesson_quizzes enable row level security;
alter table public.lesson_quiz_attempts enable row level security;

revoke all on public.lesson_quizzes from anon, authenticated;
revoke all on public.lesson_quiz_attempts from anon, authenticated;

with target_lessons as (
  select
    l.id as lesson_id,
    l.position as lesson_position,
    m.position as module_position
  from public.lessons l
  join public.modules m on m.id = l.module_id
  join public.courses c on c.id = m.course_id
  where c.slug = 'utah-driver-success-program'
), quiz_seed as (
  select
    lesson_id,
    module_position,
    ((greatest(lesson_position,1) - 1) % 5) + 1 as question_number
  from target_lessons
)
insert into public.lesson_quizzes(lesson_id, question, options, correct_key, explanation, required)
select
  q.lesson_id,
  case q.module_position
    when 1 then case q.question_number
      when 1 then 'Antes de iniciar un trámite de licencia o permiso, ¿qué práctica es la más adecuada?'
      when 2 then '¿Para qué sirve un permiso de aprendizaje dentro del proceso de formación de un conductor?'
      when 3 then '¿Por qué es importante identificar correctamente el tipo de licencia o permiso que corresponde a tu situación?'
      when 4 then 'Si te falta un documento solicitado para un trámite, ¿qué debes hacer?'
      else '¿Qué responsabilidad tiene el conductor respecto a sus documentos y permisos?'
    end
    when 2 then case q.question_number
      when 1 then 'Antes de mover el vehículo, ¿qué preparación contribuye a una conducción más segura?'
      when 2 then '¿Cuál es el propósito general de un examen de visión para conducir?'
      when 3 then '¿Qué buscan comprobar los exámenes de conocimiento y seguridad vial?'
      when 4 then '¿Qué se evalúa principalmente durante una prueba práctica de manejo?'
      else 'Si una condición de salud afecta tu capacidad para conducir con seguridad, ¿qué decisión es responsable?'
    end
    when 3 then case q.question_number
      when 1 then 'Antes de iniciar un movimiento con el vehículo, ¿qué debes hacer?'
      when 2 then '¿Cómo deben utilizarse el acelerador y el freno durante una conducción normal?'
      when 3 then 'Antes de cambiar de carril, ¿qué combinación de acciones es la más segura?'
      when 4 then '¿Por qué debes usar las direccionales antes de girar o cambiar de carril?'
      else '¿Por qué es importante conservar espacio suficiente alrededor de tu vehículo?'
    end
    when 4 then case q.question_number
      when 1 then '¿Cuál es la función principal de las señales y dispositivos de tránsito?'
      when 2 then '¿Qué debe hacer un conductor frente a una señal o dispositivo de control vial aplicable?'
      when 3 then 'Cuando corresponde ceder el paso, ¿qué principio debe guiar tu decisión?'
      when 4 then 'Además del límite indicado, ¿qué debe considerar un conductor al elegir una velocidad segura?'
      else '¿Qué información transmite una direccional a otros usuarios del camino?'
    end
    when 5 then case q.question_number
      when 1 then 'Si una persona ha consumido alcohol o una sustancia que afecta su capacidad para conducir, ¿qué debe hacer?'
      when 2 then '¿Por qué debes prestar atención a las advertencias de medicamentos antes de conducir?'
      when 3 then '¿Qué efecto pueden tener la fatiga y el sueño sobre la conducción?'
      when 4 then '¿Cuál es la forma más segura de manejar una distracción causada por el teléfono?'
      else 'Si no estás en condiciones seguras para conducir, ¿cuál es una alternativa responsable?'
    end
    else case q.question_number
      when 1 then 'Ante una situación inesperada en el camino, ¿qué debe priorizar el conductor?'
      when 2 then 'Al compartir el camino con peatones o ciclistas, ¿qué actitud es la más adecuada?'
      when 3 then 'Cuando se aproxima un vehículo de emergencia, ¿qué debe hacer el conductor?'
      when 4 then 'Después de un incidente vial, ¿qué prioridad debe mantenerse primero?'
      else '¿Qué conducta ayuda a proteger tu récord de manejo?'
    end
  end,
  case q.module_position
    when 1 then case q.question_number
      when 1 then '[{"key":"a","text":"Verificar los requisitos y preparar la documentación solicitada."},{"key":"b","text":"Presentarse sin revisar requisitos."},{"key":"c","text":"Usar documentos de otra persona."},{"key":"d","text":"Omitir información que parezca poco importante."}]'::jsonb
      when 2 then '[{"key":"a","text":"Permitir práctica de conducción bajo las condiciones correspondientes antes de una licencia completa."},{"key":"b","text":"Sustituir para siempre una licencia de conducir."},{"key":"c","text":"Eliminar la necesidad de aprender reglas de tránsito."},{"key":"d","text":"Autorizar cualquier tipo de vehículo sin condiciones."}]'::jsonb
      when 3 then '[{"key":"a","text":"Porque los requisitos y restricciones pueden variar según el tipo de licencia o permiso."},{"key":"b","text":"Porque todos los permisos tienen exactamente los mismos requisitos."},{"key":"c","text":"Solo por el color del documento."},{"key":"d","text":"No es importante identificarlo."}]'::jsonb
      when 4 then '[{"key":"a","text":"Revisar qué documentos o alternativas acepta la autoridad antes de continuar."},{"key":"b","text":"Inventar un documento equivalente."},{"key":"c","text":"Usar una copia perteneciente a otra persona."},{"key":"d","text":"Ignorar el requisito."}]'::jsonb
      else '[{"key":"a","text":"Mantenerlos vigentes y disponibles según corresponda."},{"key":"b","text":"Prestar su licencia a otra persona."},{"key":"c","text":"Ignorar fechas o restricciones."},{"key":"d","text":"Modificar los documentos por cuenta propia."}]'::jsonb
    end
    when 2 then case q.question_number
      when 1 then '[{"key":"a","text":"Ajustar asiento y espejos, colocarse el cinturón y revisar el entorno."},{"key":"b","text":"Ajustar los espejos después de empezar a avanzar."},{"key":"c","text":"Conducir sin cinturón si el trayecto es corto."},{"key":"d","text":"Comenzar a moverse antes de revisar alrededor."}]'::jsonb
      when 2 then '[{"key":"a","text":"Comprobar que la persona puede ver lo suficiente para conducir de manera segura."},{"key":"b","text":"Medir la fuerza física del conductor."},{"key":"c","text":"Evaluar conocimientos de mecánica."},{"key":"d","text":"Determinar la velocidad preferida del conductor."}]'::jsonb
      when 3 then '[{"key":"a","text":"Que comprendas reglas, señales y principios de seguridad vial."},{"key":"b","text":"Que puedas reparar el motor de un vehículo."},{"key":"c","text":"Que memorices únicamente nombres de carreteras."},{"key":"d","text":"Que puedas conducir sin observar señales."}]'::jsonb
      when 4 then '[{"key":"a","text":"Control del vehículo y decisiones seguras durante la conducción."},{"key":"b","text":"Solo la capacidad de encender el vehículo."},{"key":"c","text":"La velocidad máxima que puedes alcanzar."},{"key":"d","text":"Únicamente el conocimiento de piezas del motor."}]'::jsonb
      else '[{"key":"a","text":"Evitar conducir hasta estar en condiciones seguras y seguir la orientación correspondiente."},{"key":"b","text":"Conducir más rápido para terminar antes."},{"key":"c","text":"Ignorar los síntomas."},{"key":"d","text":"Conducir solo de noche sin considerar la condición."}]'::jsonb
    end
    when 3 then case q.question_number
      when 1 then '[{"key":"a","text":"Observar el entorno y confirmar que el movimiento puede realizarse con seguridad."},{"key":"b","text":"Moverse inmediatamente sin revisar alrededor."},{"key":"c","text":"Mirar únicamente el tablero."},{"key":"d","text":"Usar el teléfono antes de avanzar."}]'::jsonb
      when 2 then '[{"key":"a","text":"De forma progresiva y controlada, según las condiciones."},{"key":"b","text":"Con cambios bruscos siempre."},{"key":"c","text":"Usando ambos pedales al máximo al mismo tiempo."},{"key":"d","text":"Sin prestar atención al tránsito."}]'::jsonb
      when 3 then '[{"key":"a","text":"Revisar espejos, señalizar y comprobar los puntos ciegos antes de moverse."},{"key":"b","text":"Cambiar de carril primero y señalizar después."},{"key":"c","text":"Mirar únicamente hacia adelante."},{"key":"d","text":"Acelerar sin revisar el carril contiguo."}]'::jsonb
      when 4 then '[{"key":"a","text":"Para comunicar tu intención y permitir que otros anticipen tu movimiento."},{"key":"b","text":"Solo para iluminar el tablero."},{"key":"c","text":"Para reemplazar la observación del camino."},{"key":"d","text":"No tienen utilidad durante un cambio de carril."}]'::jsonb
      else '[{"key":"a","text":"Porque da tiempo y espacio para reaccionar ante cambios inesperados."},{"key":"b","text":"Porque permite conducir sin mirar espejos."},{"key":"c","text":"Porque elimina la necesidad de frenar."},{"key":"d","text":"Porque obliga a otros a apartarse."}]'::jsonb
    end
    when 4 then case q.question_number
      when 1 then '[{"key":"a","text":"Regular, advertir e informar a los usuarios del camino."},{"key":"b","text":"Decorar las carreteras."},{"key":"c","text":"Sustituir la atención del conductor."},{"key":"d","text":"Aplicarse únicamente a peatones."}]'::jsonb
      when 2 then '[{"key":"a","text":"Obedecerlo y adaptar su conducción a la situación."},{"key":"b","text":"Ignorarlo si conoce la zona."},{"key":"c","text":"Seguir al vehículo de adelante sin observarlo."},{"key":"d","text":"Decidir que no aplica sin verificar."}]'::jsonb
      when 3 then '[{"key":"a","text":"Ceder cuando corresponde y evitar crear un conflicto o riesgo de choque."},{"key":"b","text":"Acelerar para pasar primero siempre."},{"key":"c","text":"Usar el claxon como sustituto de ceder."},{"key":"d","text":"Ignorar a los demás usuarios."}]'::jsonb
      when 4 then '[{"key":"a","text":"Las condiciones del camino, tránsito, clima y visibilidad."},{"key":"b","text":"Solo la prisa que tenga el conductor."},{"key":"c","text":"La velocidad del vehículo más rápido."},{"key":"d","text":"Únicamente la potencia del motor."}]'::jsonb
      else '[{"key":"a","text":"La intención de girar o cambiar de carril."},{"key":"b","text":"La cantidad de combustible disponible."},{"key":"c","text":"La edad del vehículo."},{"key":"d","text":"Que el conductor dejará de observar el camino."}]'::jsonb
    end
    when 5 then case q.question_number
      when 1 then '[{"key":"a","text":"No conducir y buscar una alternativa segura de transporte."},{"key":"b","text":"Conducir más rápido para llegar antes."},{"key":"c","text":"Conducir solo por calles pequeñas."},{"key":"d","text":"Tomar café y conducir de inmediato."}]'::jsonb
      when 2 then '[{"key":"a","text":"Porque algunos medicamentos pueden afectar atención, coordinación o tiempo de reacción."},{"key":"b","text":"Porque todos los medicamentos mejoran la conducción."},{"key":"c","text":"Solo porque pueden cambiar el color de los ojos."},{"key":"d","text":"No es necesario revisar advertencias."}]'::jsonb
      when 3 then '[{"key":"a","text":"Pueden disminuir la atención y el tiempo de reacción."},{"key":"b","text":"Siempre mejoran los reflejos."},{"key":"c","text":"No tienen ningún efecto sobre la conducción."},{"key":"d","text":"Permiten conducir por más tiempo sin descansar."}]'::jsonb
      when 4 then '[{"key":"a","text":"Evitar usarlo mientras conduces y atenderlo únicamente cuando sea seguro hacerlo."},{"key":"b","text":"Sostenerlo frente al volante."},{"key":"c","text":"Leer mensajes rápidamente mientras avanzas."},{"key":"d","text":"Escribir con una mano y conducir con la otra."}]'::jsonb
      else '[{"key":"a","text":"Usar transporte alternativo o pedir ayuda a una persona en condiciones de conducir."},{"key":"b","text":"Conducir de todos modos pero más despacio."},{"key":"c","text":"Conducir solo si el trayecto parece corto."},{"key":"d","text":"Acelerar para reducir el tiempo en carretera."}]'::jsonb
    end
    else case q.question_number
      when 1 then '[{"key":"a","text":"Mantener el control del vehículo y responder de forma segura al entorno."},{"key":"b","text":"Acelerar sin observar."},{"key":"c","text":"Cerrar los ojos por un momento."},{"key":"d","text":"Discutir con otros conductores."}]'::jsonb
      when 2 then '[{"key":"a","text":"Mantener atención adicional, respetar su espacio y anticipar sus movimientos."},{"key":"b","text":"Pasar lo más cerca posible."},{"key":"c","text":"Usar el claxon continuamente."},{"key":"d","text":"Ignorarlos si circulan despacio."}]'::jsonb
      when 3 then '[{"key":"a","text":"Dar espacio y seguir las reglas aplicables para permitir su paso seguro."},{"key":"b","text":"Competir con el vehículo de emergencia."},{"key":"c","text":"Bloquear su trayectoria."},{"key":"d","text":"Seguirlo de cerca para avanzar más rápido."}]'::jsonb
      when 4 then '[{"key":"a","text":"Proteger la seguridad de las personas y evitar nuevos riesgos."},{"key":"b","text":"Mover inmediatamente todo sin observar el entorno."},{"key":"c","text":"Discutir sobre responsabilidades antes de verificar si alguien necesita ayuda."},{"key":"d","text":"Abandonar el lugar sin considerar la situación."}]'::jsonb
      else '[{"key":"a","text":"Conducir de manera segura y cumplir las reglas de tránsito."},{"key":"b","text":"Acumular infracciones sin atenderlas."},{"key":"c","text":"Ignorar restricciones de conducción."},{"key":"d","text":"Prestar la licencia a otras personas."}]'::jsonb
    end
  end,
  'a',
  case q.module_position
    when 1 then 'Los trámites y documentos deben manejarse de acuerdo con los requisitos aplicables y mantenerse vigentes.'
    when 2 then 'La preparación personal, los exámenes y la revisión del vehículo forman parte de una conducción responsable.'
    when 3 then 'El manejo básico exige observación, control progresivo y comunicación clara con otros usuarios.'
    when 4 then 'Las reglas, señales y dispositivos viales ayudan a ordenar el tránsito y reducir riesgos.'
    when 5 then 'Nunca conduzcas cuando una sustancia, medicamento, fatiga o distracción comprometa tu capacidad para hacerlo con seguridad.'
    else 'En emergencias y al compartir el camino, la prioridad es conservar el control, proteger a las personas y actuar de forma segura.'
  end,
  true
from quiz_seed q
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = excluded.required,
  updated_at = now();

create or replace function public.get_lesson_quiz(target_lesson uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quiz_record public.lesson_quizzes%rowtype;
  has_passed boolean := false;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select * into quiz_record
  from public.lesson_quizzes
  where lesson_id = target_lesson;

  if quiz_record.id is null then
    return null;
  end if;

  select exists(
    select 1 from public.lesson_quiz_attempts a
    where a.user_id = auth.uid()
      and a.quiz_id = quiz_record.id
      and a.correct = true
  ) into has_passed;

  return jsonb_build_object(
    'id', quiz_record.id,
    'lesson_id', quiz_record.lesson_id,
    'question', quiz_record.question,
    'options', quiz_record.options,
    'required', quiz_record.required,
    'passed', has_passed
  );
end;
$$;

create or replace function public.submit_lesson_quiz(target_quiz uuid, answer_key text)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  quiz_record public.lesson_quizzes%rowtype;
  is_correct boolean := false;
  previous_count integer := 0;
begin
  if auth.uid() is null then
    raise exception 'Debes iniciar sesión.';
  end if;

  select * into quiz_record
  from public.lesson_quizzes
  where id = target_quiz;

  if quiz_record.id is null then
    raise exception 'Evaluación no encontrada.';
  end if;

  is_correct := lower(trim(coalesce(answer_key,''))) = lower(trim(quiz_record.correct_key));

  select coalesce(max(attempt_count),0) into previous_count
  from public.lesson_quiz_attempts
  where user_id = auth.uid() and quiz_id = quiz_record.id;

  insert into public.lesson_quiz_attempts(
    user_id, quiz_id, lesson_id, answer_key, correct, attempt_count, attempted_at
  ) values (
    auth.uid(), quiz_record.id, quiz_record.lesson_id, coalesce(answer_key,''), is_correct, previous_count + 1, now()
  )
  on conflict (user_id, quiz_id) do update set
    answer_key = excluded.answer_key,
    correct = public.lesson_quiz_attempts.correct or excluded.correct,
    attempt_count = public.lesson_quiz_attempts.attempt_count + 1,
    attempted_at = now();

  return jsonb_build_object(
    'correct', is_correct,
    'passed', exists(
      select 1 from public.lesson_quiz_attempts a
      where a.user_id = auth.uid() and a.quiz_id = quiz_record.id and a.correct = true
    ),
    'message', case
      when is_correct then '¡Correcto! Puedes marcar esta lección como completada.'
      else 'Esa respuesta no es correcta. Revisa el video y vuelve a intentarlo.'
    end,
    'explanation', case when is_correct then quiz_record.explanation else '' end
  );
end;
$$;

revoke all on function public.get_lesson_quiz(uuid) from public;
revoke all on function public.submit_lesson_quiz(uuid,text) from public;
grant execute on function public.get_lesson_quiz(uuid) to authenticated;
grant execute on function public.submit_lesson_quiz(uuid,text) to authenticated;

commit;
