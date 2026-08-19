-- ============================================================
-- ACADEMIA AG · CUESTIONARIO DEFINITIVO MÓDULO 3
-- UTAH DRIVER SUCCESS PROGRAM™
-- Manejo básico
-- 10 preguntas · 80% mínimo para aprobar
--
-- Fuente oficial verificada 2026-08-19:
-- Utah Driver Handbook 2025-2026 · Section 8: Basic Driving
-- ============================================================

begin;

create temporary table _module3_questions (
  position integer primary key,
  question text not null,
  options jsonb not null,
  correct_key text not null,
  explanation text not null
) on commit drop;

insert into _module3_questions(position,question,options,correct_key,explanation) values
(
  1,
  'Antes de comenzar a avanzar con un vehículo automático, ¿qué secuencia refleja mejor la preparación indicada por el Utah Driver Handbook?',
  '[{"key":"a","text":"Poner el vehículo en marcha y después revisar espejos."},{"key":"b","text":"Verificar que esté en Park, aplicar el freno, encender, revisar luces e indicadores y hacer la revisión de tráfico antes de avanzar."},{"key":"c","text":"Acelerar primero para comprobar que el motor responde."},{"key":"d","text":"Encender el vehículo sin aplicar el freno si el camino está despejado."}]'::jsonb,
  'b',
  'El handbook indica verificar que el vehículo esté en Park, aplicar el freno, encender y revisar luces e indicadores. Antes de avanzar se debe poner en marcha, revisar el tráfico y el punto ciego, señalizar si es necesario y acelerar suavemente.'
),
(
  2,
  'Al conducir en reversa, ¿por qué no debes depender únicamente de los espejos?',
  '[{"key":"a","text":"Porque los espejos solo funcionan cuando el vehículo está avanzando."},{"key":"b","text":"Porque los espejos no muestran toda el área inmediatamente detrás del vehículo."},{"key":"c","text":"Porque la ley obliga a plegarlos al retroceder."},{"key":"d","text":"Porque únicamente deben usarse en carretera."}]'::jsonb,
  'b',
  'El handbook señala que los espejos no muestran el área directamente detrás del vehículo. Debes mirar hacia atrás por la ventana trasera y retroceder lentamente, realizando revisiones adicionales al frente y a los lados cuando sea necesario.'
),
(
  3,
  '¿Cuál es la secuencia correcta antes de realizar un cambio de carril?',
  '[{"key":"a","text":"Cambiar de carril, después señalizar y finalmente revisar el espejo."},{"key":"b","text":"Revisar espejos, señalizar al menos dos segundos, revisar el punto ciego y cambiar cuando sea seguro."},{"key":"c","text":"Acelerar y cambiar de carril sin mover la cabeza."},{"key":"d","text":"Usar únicamente la cámara del vehículo."}]'::jsonb,
  'b',
  'Utah exige una revisión de tráfico antes del cambio: espejos, señal durante al menos dos segundos, head check del punto ciego y movimiento únicamente cuando pueda completarse con seguridad.'
),
(
  4,
  'Cuando te incorporas a un carril de tráfico, ¿qué regla se aplica al área conocida como “gore area”?',
  '[{"key":"a","text":"Puede usarse brevemente para ganar velocidad."},{"key":"b","text":"Puede cruzarse si no vienen vehículos."},{"key":"c","text":"No debes cruzarla ni conducir dentro de ella; además debes ceder a los vehículos del carril continuo que representen una amenaza inmediata."},{"key":"d","text":"Solo está prohibida para vehículos comerciales."}]'::jsonb,
  'c',
  'El handbook establece que es ilegal cruzar o conducir por el gore area, ubicada entre líneas blancas sólidas asociadas con carriles de entrada, salida o separación. Al incorporarte debes ceder a los vehículos del carril continuo cuando corresponda.'
),
(
  5,
  'En una zona congestionada donde dos carriles se reducen a uno, ¿cómo funciona el método “zipper”?',
  '[{"key":"a","text":"Todos deben abandonar un carril mucho antes del punto de unión."},{"key":"b","text":"Se usan ambos carriles hasta el punto de unión y luego los vehículos se alternan para incorporarse al único carril."},{"key":"c","text":"El carril derecho siempre tiene prioridad absoluta."},{"key":"d","text":"Solo pueden incorporarse los vehículos que circulan más rápido."}]'::jsonb,
  'b',
  'El zipper method consiste en utilizar ambos carriles hasta llegar al punto de incorporación y, allí, alternarse para entrar al carril único.'
),
(
  6,
  'Al estacionarte cuesta abajo junto a una banqueta, ¿cómo debes orientar las ruedas delanteras?',
  '[{"key":"a","text":"Hacia la banqueta."},{"key":"b","text":"Alejadas de la banqueta."},{"key":"c","text":"Rectas en todos los casos."},{"key":"d","text":"Hacia el centro de la calle."}]'::jsonb,
  'a',
  'Para estacionar cuesta abajo, el handbook indica girar las ruedas hacia la banqueta y asegurar el vehículo colocando la transmisión en Park y aplicando el freno de estacionamiento.'
),
(
  7,
  'En una carretera de varios carriles, ¿qué afirmación sobre el rebase es correcta?',
  '[{"key":"a","text":"El hombro de la carretera puede usarse para rebasar cuando el tránsito es lento."},{"key":"b","text":"El carril izquierdo se utiliza para rebasar vehículos más lentos y nunca debes rebasar usando el hombro."},{"key":"c","text":"Siempre debes permanecer junto al vehículo que rebasas durante varios segundos."},{"key":"d","text":"Puedes rebasar en una zona marcada como no passing si no se aproxima tráfico."}]'::jsonb,
  'b',
  'El handbook indica que, en vías de varios carriles, el carril izquierdo se utiliza para rebasar vehículos más lentos. Nunca se debe rebasar por el hombro y el rebase debe completarse de forma segura sin permanecer innecesariamente junto al otro vehículo.'
),
(
  8,
  '¿Con cuánta anticipación debes señalizar antes de un giro o de comenzar un cambio de carril?',
  '[{"key":"a","text":"Al menos dos segundos."},{"key":"b","text":"Exactamente cinco segundos."},{"key":"c","text":"Solo cuando otro vehículo está cerca."},{"key":"d","text":"No es necesario señalizar un cambio de carril."}]'::jsonb,
  'a',
  'El Utah Driver Handbook establece que las señales deben utilizarse durante al menos dos segundos antes de girar y durante al menos dos segundos antes de iniciar un cambio de carril.'
),
(
  9,
  '¿Cuál es la recomendación principal del handbook para controlar el volante?',
  '[{"key":"a","text":"Mantener ambas manos en la parte exterior del volante, excepto cuando sea necesario operar otros controles."},{"key":"b","text":"Conducir con una sola mano en todo momento."},{"key":"c","text":"Sujetar el interior del volante para tener más fuerza."},{"key":"d","text":"Cruzar los brazos continuamente para corregir la dirección."}]'::jsonb,
  'a',
  'El handbook recomienda mantener ambas manos en la parte exterior del volante. Métodos como hand-over-hand o push/pull son aceptables siempre que se mantenga control adecuado del vehículo.'
),
(
  10,
  'Al detenerte ante una señal de STOP o una luz roja, ¿qué debes hacer?',
  '[{"key":"a","text":"Reducir mucho la velocidad, pero continuar si no viene nadie."},{"key":"b","text":"Hacer un alto completo y no detenerte sobre la línea marcada, el cruce peatonal o dentro de la intersección."},{"key":"c","text":"Detenerte únicamente si hay peatones."},{"key":"d","text":"Detenerte después de haber cruzado la línea de alto para mejorar la visibilidad."}]'::jsonb,
  'b',
  'Utah exige un alto completo en las señales y semáforos que lo requieren. El vehículo no debe quedar sobre la línea de alto, el cruce peatonal, la banqueta ni dentro de la intersección.'
);

-- Sustituye las preguntas genéricas usadas por el examen del módulo 3.
-- El RPC get_module_exam toma las primeras diez preguntas únicas del módulo,
-- por lo que se enlazan a las primeras diez lecciones sin exponer la respuesta
-- correcta al navegador.
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
join _module3_questions q on q.position = l.position
where l.module_id = '11111111-cccc-4111-8111-111111111111'::uuid
  and l.position between 1 and 10
on conflict (lesson_id) do update set
  question = excluded.question,
  options = excluded.options,
  correct_key = excluded.correct_key,
  explanation = excluded.explanation,
  required = false,
  updated_at = now();

commit;