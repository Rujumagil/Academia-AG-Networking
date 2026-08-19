-- ============================================================
-- ACADEMIA AG · CUESTIONARIO DEFINITIVO MÓDULO 4
-- UTAH DRIVER SUCCESS PROGRAM™
-- Reglas del camino y señales
-- 10 preguntas · 80% mínimo para aprobar
--
-- Fuente oficial verificada 2026-08-19:
-- Utah Driver Handbook 2025-2026 · Section 9: Rules of the Road
-- ============================================================

begin;

create temporary table _module4_questions (
  position integer primary key,
  question text not null,
  options jsonb not null,
  correct_key text not null,
  explanation text not null
) on commit drop;

insert into _module4_questions(position,question,options,correct_key,explanation) values
(
  1,
  'En una Flex Lane, ¿qué significa una flecha verde sobre el carril?',
  '[{"key":"a","text":"Que el carril está cerrado."},{"key":"b","text":"Que puedes usar ese carril en ese momento."},{"key":"c","text":"Que debes detenerte antes de entrar."},{"key":"d","text":"Que el carril es únicamente para vehículos de emergencia."}]'::jsonb,
  'b',
  'En las Flex Lanes, una flecha verde indica que el carril puede utilizarse en ese momento; una X roja indica que no debe usarse.'
),
(
  2,
  'En condiciones normales de freeway, ¿qué distancia mínima de seguimiento recomienda el handbook?',
  '[{"key":"a","text":"Al menos un segundo."},{"key":"b","text":"Al menos dos segundos."},{"key":"c","text":"Al menos cinco segundos en todo momento."},{"key":"d","text":"No establece ninguna distancia."}]'::jsonb,
  'b',
  'El handbook recomienda mantener al menos dos segundos de distancia con el vehículo de adelante y aumentar ese tiempo cuando las condiciones son adversas.'
),
(
  3,
  '¿Cuándo puedes cruzar una doble línea blanca para entrar o salir de un Express/Carpool Lane?',
  '[{"key":"a","text":"Cuando no vienen vehículos."},{"key":"b","text":"Solo de noche."},{"key":"c","text":"No debes cruzarla; la entrada y salida se realiza en puntos de acceso con líneas blancas punteadas."},{"key":"d","text":"Siempre que señales durante dos segundos."}]'::jsonb,
  'c',
  'El handbook establece que es ilegal cruzar una doble línea blanca. Los cambios hacia o desde el Express/Carpool Lane se hacen únicamente en los puntos de acceso designados.'
),
(
  4,
  'Cuando un Ramp Meter está activo, ¿cuántos vehículos pasan normalmente por cada luz verde?',
  '[{"key":"a","text":"Uno, salvo que la señal indique otra cosa."},{"key":"b","text":"Dos siempre."},{"key":"c","text":"Todos los que alcancen a pasar antes del rojo."},{"key":"d","text":"Ninguno; la luz verde solo es informativa."}]'::jsonb,
  'a',
  'Los Ramp Meters alternan luces roja y verde y normalmente permiten que pase un solo vehículo por cada luz verde, salvo que se indique algo diferente.'
),
(
  5,
  'Ante una línea de alto o un cruce peatonal marcado, ¿dónde debes detenerte?',
  '[{"key":"a","text":"Después de la línea para tener mejor visibilidad."},{"key":"b","text":"Detrás de la línea de alto o del cruce peatonal."},{"key":"c","text":"Dentro del cruce peatonal si no hay personas."},{"key":"d","text":"En cualquier punto de la intersección."}]'::jsonb,
  'b',
  'El handbook indica que debes detenerte detrás de la línea de alto o del cruce peatonal. Si no hay marcas, debes detenerte antes de entrar a la intersección.'
),
(
  6,
  '¿Qué establece la Basic Speed Law de Utah?',
  '[{"key":"a","text":"Que siempre puedes conducir exactamente al límite publicado."},{"key":"b","text":"Que nunca debes conducir más rápido de lo que sea razonablemente seguro para las condiciones."},{"key":"c","text":"Que debes igualar siempre la velocidad del vehículo más rápido."},{"key":"d","text":"Que los límites dejan de aplicar cuando llueve."}]'::jsonb,
  'b',
  'La Basic Speed Law establece que nunca debes conducir a una velocidad mayor de la que sea razonablemente segura, incluso si estás por debajo del límite publicado.'
),
(
  7,
  'Al aproximarte a un roundabout, ¿qué debes hacer antes de entrar?',
  '[{"key":"a","text":"Acelerar para entrar primero."},{"key":"b","text":"Disminuir la velocidad y ceder el paso al tráfico que corresponda y a los peatones antes de entrar cuando sea seguro."},{"key":"c","text":"Detenerte siempre aunque el camino esté libre."},{"key":"d","text":"Entrar sin revisar porque el tráfico dentro debe cederte."}]'::jsonb,
  'b',
  'El handbook indica reducir la velocidad al aproximarse al roundabout y ceder el paso al tráfico y a los peatones antes de entrar cuando sea seguro.'
),
(
  8,
  '¿Qué significa una flecha amarilla intermitente para realizar un giro?',
  '[{"key":"a","text":"El giro está prohibido."},{"key":"b","text":"Puedes girar, pero primero debes ceder al tráfico que viene de frente y a los peatones."},{"key":"c","text":"Tienes prioridad absoluta."},{"key":"d","text":"Debes esperar una flecha verde obligatoriamente."}]'::jsonb,
  'b',
  'Una flecha amarilla intermitente permite girar, pero exige ceder al tráfico que viene de frente y a los peatones y proceder con precaución.'
),
(
  9,
  'Ante una luz roja sólida, ¿cuándo puede realizarse un giro a la derecha?',
  '[{"key":"a","text":"Sin detenerse si no hay tráfico."},{"key":"b","text":"Después de un alto completo y solo si no existe una señal que lo prohíba y es seguro hacerlo."},{"key":"c","text":"Nunca en Utah."},{"key":"d","text":"Solo si un vehículo detrás toca el claxon."}]'::jsonb,
  'b',
  'Con luz roja debes detenerte completamente. Después puedes girar a la derecha si no existe una prohibición y el movimiento puede hacerse con seguridad.'
),
(
  10,
  'En un four-way stop, si dos vehículos llegan al mismo tiempo, ¿a quién debes ceder el paso?',
  '[{"key":"a","text":"Al vehículo de tu derecha."},{"key":"b","text":"Al vehículo de tu izquierda."},{"key":"c","text":"Al vehículo más grande."},{"key":"d","text":"A quien toque el claxon primero."}]'::jsonb,
  'a',
  'El handbook establece que, cuando dos vehículos llegan al mismo tiempo a un four-way stop, debes ceder el paso al conductor que está a tu derecha.'
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
join _module4_questions q on q.position = l.position
where l.module_id = '11111111-dddd-4111-8111-111111111111'::uuid
  and l.position between 1 and 10
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

commit;